const assert = require("assert");
const clientDomain = require("../miniprograms/client/utils/domain");
const adminDomain = require("../miniprograms/admin/utils/domain");
const masterDomain = require("../miniprograms/master/utils/domain");
const { createClientApi } = require("../miniprograms/client/utils/api");
const { createAdminApi } = require("../miniprograms/admin/utils/api");
const { createMasterApi } = require("../miniprograms/master/utils/api");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error.stack);
    process.exitCode = 1;
  }
}

test("客户端 API 包装隐藏内部状态机并能提交询价", () => {
  const state = clientDomain.createInitialState();
  const api = createClientApi(state, clientDomain);
  const order = api.submitInquiry({
    media: { images: ["图"], videos: [] },
    material: "木材",
    materialOther: "",
    types: ["划痕"],
    typeOther: "",
    woundCount: 1,
    woundLength: 5,
    visitTime: "2026-09-27 10:00",
    durationDays: 1,
    address: "成都市金牛区测试路 1 号",
    requestedMasters: { gold: 0, silver: 1, bronze: 0 },
    customerName: "客户 API 测试",
    wechat: "api_client",
    phone: "13800008888"
  });
  assert.equal(order.status, "待报价");
  assert(api.listOrders().some((item) => item.id === order.id));
});

test("客户端 API 包装校验我的资料必填和联系电话", () => {
  const state = clientDomain.createInitialState();
  const api = createClientApi(state, clientDomain);
  assert.throws(() => api.updateProfile({ phone: "12345" }), /联系电话格式不正确/);
  assert.throws(() => api.updateProfile({ name: "" }), /公司名称/);
  const updated = api.updateProfile({ phone: "13800008889", address: "成都市高新区测试路 2 号" });
  assert.equal(updated.phone, "13800008889");
});

test("管理端 API 包装能报价派单并读取待施工", () => {
  const state = adminDomain.createInitialState();
  const api = createAdminApi(state, adminDomain);
  assert.throws(() => api.updateCustomer({ id: "c_001", phone: "bad-phone" }), /联系电话格式不正确/);
  const draft = api.saveQuoteDraft("JD20260921001", { repairFee: 280, visitFee: 50, description: "API 草稿" });
  assert.equal(draft.status, "草稿");
  assert.equal(draft.submittedBy, "admin_root");
  const submitted = api.submitQuote("JD20260921001", { repairFee: 300, visitFee: 50, description: "API 报价" });
  assert.equal(submitted.submittedBy, "admin_root");
  adminDomain.confirmQuote(state, "JD20260921001");
  const dispatchDraft = api.saveDispatchDraft("JD20260921001", { silver: [] });
  assert.equal(dispatchDraft.status, adminDomain.STATUS.DISPATCHING);
  const reminder = api.remindAcceptance("JD20260921005");
  assert.equal(reminder.event, "提醒客户验收");
  api.dispatch("JD20260921001", { silver: ["m_silver_1"] }, "API 电话确认派单");
  assert(api.listOrders("待施工").some((item) => item.id === "JD20260921001"));
  assert.equal(adminDomain.getMasterOrders(state, "m_silver_1").find((item) => item.id === "JD20260921001").note, "API 电话确认派单");
  const searched = api.queryOrders({ filter: "全部", keyword: "锦禾", page: 1, pageSize: 1 });
  assert.equal(searched.items.length, 1);
  assert.equal(searched.hasMore, true);
});

test("管理端 API 包装能在多人订单完工后分配师傅金额", () => {
  const state = adminDomain.createInitialState();
  const api = createAdminApi(state, adminDomain);
  api.dispatch("JD20260921003", { gold: ["m_gold_1"], bronze: ["m_bronze_1"] });
  adminDomain.appointOrder(state, "JD20260921003", "m_gold_1");
  adminDomain.checkInOrder(state, "JD20260921003", "m_gold_1", { ok: false, reason: "API 测试定位失败" });
  adminDomain.submitCompletion(state, "JD20260921003", "m_gold_1", ["图"], ["视频"], "API 多人完工");

  api.allocateMasterAmounts("JD20260921003", { m_gold_1: 400, m_bronze_1: 257 });

  const order = api.getOrder("JD20260921003");
  assert.equal(order.assignments.find((item) => item.masterId === "m_gold_1").receivableAmount, 400);
  assert.equal(order.assignments.find((item) => item.masterId === "m_bronze_1").receivableAmount, 257);
});

test("师傅端 API 包装能保存时间并提交完工", () => {
  const state = masterDomain.createInitialState();
  const api = createMasterApi(state, masterDomain);
  assert.equal(api.getAvailability().length, 14);
  api.saveAvailability([{ date: "2026-09-25", slot: "下午", status: "有空" }]);
  api.appoint("JD20260921004");
  api.checkIn("JD20260921004", { ok: false, reason: "测试无定位" });
  api.submitCompletion("JD20260921004", { images: ["图"], videos: ["视频"], note: "API 完工" });
  assert.equal(api.listOrders().find((item) => item.id === "JD20260921004").category, "待验收");
});

test("师傅端本地 API 支持拒绝后修改资料重新待审核", () => {
  const state = masterDomain.createInitialState();
  state.currentMasterId = "m_pending_1";
  masterDomain.reviewMaster(state, "m_pending_1", false, "资料不完整", "admin_root");
  const api = createMasterApi(state, masterDomain);

  assert.throws(() => api.updateProfile({ phone: "12345" }), /手机号格式不正确/);
  const updated = api.updateProfile({ intro: "补充完整施工经验" });

  assert.equal(updated.reviewStatus, "待审核");
  assert.equal(updated.workStatus, "待审核");
  assert.equal(updated.reviewReason, "");
  assert.equal(updated.reviewedBy, "");
  assert.equal(updated.reviewedAt, "");
  assert.equal(updated.reviewNote, "");
  assert.equal(api.listOrders().length, 0);
});

if (process.exitCode) process.exit(process.exitCode);
