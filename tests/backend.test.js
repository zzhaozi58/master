const assert = require("assert");
const { createBackend } = require("../backend/service");

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

test("后端服务按角色限制客户与师傅可见订单", () => {
  const backend = createBackend();
  const customer = backend.asCustomer("c_001");
  const master = backend.asMaster("m_silver_1");
  assert(customer.listOrders().every((order) => order.customerName === "成都锦禾石材有限公司"));
  assert(master.listOrders().every((order) => ["待预约", "施工中", "待验收", "已完成"].includes(order.category)));
  assert.throws(() => backend.asCustomer("c_001").confirmQuote("JD20260921002"), /无权/);
});

test("三端经由同一后端推进报价、派单、预约、完工和验收", () => {
  const backend = createBackend();
  const admin = backend.asAdmin("admin_root");
  const customer = backend.asCustomer("c_001");
  const master = backend.asMaster("m_gold_1");

  admin.submitQuote("JD20260921001", { repairFee: 300, visitFee: 50, description: "岩板缺角修复" });
  customer.confirmQuote("JD20260921001");
  admin.dispatch("JD20260921001", { silver: ["m_silver_1"] });

  const silver = backend.asMaster("m_silver_1");
  silver.appoint("JD20260921001");
  silver.checkIn("JD20260921001", { ok: false, reason: "定位失败" });
  silver.submitCompletion("JD20260921001", { images: ["图"], videos: ["视频"], note: "已修复" });
  customer.acceptOrder("JD20260921001");

  assert(admin.listOrders("已验收").some((order) => order.id === "JD20260921001"));
  assert.equal(customer.listOrders().find((order) => order.id === "JD20260921001").category, "已完成");
  assert.equal(master.listOrders().some((order) => order.id === "JD20260921001"), false);
  for (const action of ["客户确认报价", "管理员确认派单", "师傅到场打卡", "师傅提交完工", "客户通过验收"]) {
    const entry = admin.auditTrail().find((item) => item.action === action && item.objectId === "JD20260921001");
    assert(entry, `缺少审计：${action}`);
    assert(entry.actor && entry.actor !== "system", `缺少操作者：${action}`);
    assert(entry.before, `缺少操作前值：${action}`);
    assert(entry.after, `缺少操作后值：${action}`);
  }
});

test("未审核师傅不能看到订单，管理员审核通过后进入候选池", () => {
  const backend = createBackend();
  assert.equal(backend.asMaster("m_pending_1").listOrders().length, 0);
  backend.asAdmin("admin_root").reviewMaster("m_pending_1", true);
  const candidates = backend.asAdmin("admin_root").rankCandidates("JD20260921003", "铜牌");
  assert(candidates.some((master) => master.id === "m_pending_1"));
});

test("被拒绝师傅修改资料后重新进入待审核且不能查看订单", () => {
  const backend = createBackend();
  const admin = backend.asAdmin("admin_root");
  assert.throws(() => admin.reviewMaster("m_pending_1", false, ""), /必须填写原因/);
  admin.reviewMaster("m_pending_1", false, "资料不完整");
  const rejectedProfile = backend.asMaster("m_pending_1").profile();
  assert.equal(rejectedProfile.reviewReason, "资料不完整");
  assert.equal(rejectedProfile.reviewedBy, "admin_root");
  assert(rejectedProfile.reviewedAt);
  assert.equal(rejectedProfile.reviewNote, "资料不完整");

  assert.throws(() => backend.asMaster("m_pending_1").updateProfile({ phone: "12345" }), /手机号格式不正确/);
  const updated = backend.asMaster("m_pending_1").updateProfile({ intro: "补充完整施工经验" });

  assert.equal(updated.reviewStatus, "待审核");
  assert.equal(updated.workStatus, "待审核");
  assert.equal(updated.reviewReason, "");
  assert.equal(updated.reviewedBy, "");
  assert.equal(updated.reviewedAt, "");
  assert.equal(updated.reviewNote, "");
  assert.equal(backend.asMaster("m_pending_1").listOrders().length, 0);
});

test("管理员白名单形态校验和敏感操作审计", () => {
  const backend = createBackend();
  assert.throws(() => backend.asAdmin("user_normal"), /未授权/);
  const seedOrder = backend.state.orders.find((item) => item.id === "JD20260921006");
  seedOrder.assignments[0].paidAmount = 0;
  seedOrder.payments.masterPaid = {};
  const admin = backend.asAdmin("admin_root");
  admin.confirmCustomerPayment("JD20260921006");
  admin.confirmMasterPayment("JD20260921006", "m_gold_1");
  const paymentRecords = admin.listPaymentRecords("JD20260921006");
  const actions = admin.auditTrail().map((item) => item.action);
  assert(actions.includes("确认已从客户收款"));
  assert(actions.includes("确认已支付给师傅"));
  assert.equal(paymentRecords.some((item) => item.type === "师傅付款" && item.status === "已完成"), true);
  assert(paymentRecords.every((item) => item.confirmedBy === "admin_root"));
  assert(paymentRecords.every((item) => item.confirmedAmount === item.dueAmount));
});

test("后端管理端可查看通知失败并重新加入重试", () => {
  const backend = createBackend();
  const admin = backend.asAdmin("admin_root");
  admin.submitQuote("JD20260921001", { repairFee: 300, visitFee: 50, description: "通知测试报价" });
  const notice = admin.listNotifications().find((item) => item.event === "报价待确认");
  assert(notice);
  admin.markNotificationFailed(notice.id, "微信订阅消息发送失败");
  assert.equal(admin.listNotifications("发送失败").length, 1);
  const retried = admin.retryNotification(notice.id);
  assert.equal(retried.status, "待发送");
  assert.equal(retried.attempts, 1);
});

test("后端管理端可保留客户取消申请订单", () => {
  const backend = createBackend();
  backend.asCustomer("c_001").requestCancel("JD20260921003", "误点取消");
  const admin = backend.asAdmin("admin_root");
  const exception = admin.listExceptions().find((item) => item.orderId === "JD20260921003");

  const order = admin.keepCancelOrder(exception.id, "电话确认继续处理");

  assert.equal(order.status, "待派单");
  assert.equal(admin.listExceptions().find((item) => item.id === exception.id).status, "已保留订单");
  assert.equal(admin.auditTrail().some((item) => item.action === "管理员保留订单"), true);
});

test("后端管理端可驳回验收异常并强制完成", () => {
  const backend = createBackend();
  const customer = backend.asCustomer("c_001");
  const admin = backend.asAdmin("admin_root");
  const exception = customer.rejectAcceptance("JD20260921005", { images: ["问题图"], videos: [], description: "仍有色差" });

  assert.throws(() => admin.forceCompleteException(exception.id, ""), /必须填写处理说明/);
  const order = admin.forceCompleteException(exception.id, "客服复核后确认结果可接受");

  assert.equal(order.status, "已验收");
  assert.equal(admin.listExceptions().find((item) => item.id === exception.id).adminNote, "客服复核后确认结果可接受");
  assert.equal(admin.listPaymentRecords("JD20260921005").some((item) => item.type === "客户收款"), true);
});

test("客户和管理员可以通过后端服务维护客户资料", () => {
  const backend = createBackend();
  assert.throws(() => backend.asCustomer("c_001").updateProfile({ phone: "12345" }), /联系电话格式不正确/);
  const customer = backend.asCustomer("c_001").updateProfile({ phone: "13800001111", wechat: "updated_client" });
  assert.equal(customer.phone, "13800001111");
  const admin = backend.asAdmin("admin_root");
  assert.throws(() => admin.updateCustomer("c_001", { phone: "bad-phone" }), /联系电话格式不正确/);
  const edited = admin.updateCustomer("c_001", { note: "管理员备注", type: "企业大客户" });
  assert.equal(edited.note, "管理员备注");
  assert.equal(admin.getCustomer("c_001").type, "企业大客户");
  const audit = admin.auditTrail().find((item) => item.action === "管理员修改客户资料");
  assert.equal(audit.before.note, "长期合作客户");
  assert.equal(audit.after.note, "管理员备注");
});

test("订单保留客户提交时的信息快照", () => {
  const backend = createBackend();
  const customer = backend.asCustomer("c_001");
  const order = customer.submitInquiry({
    media: { images: ["现场图"], videos: [] },
    material: "岩板",
    materialOther: "",
    types: ["缺角"],
    typeOther: "",
    woundCount: 1,
    woundLength: 5,
    visitTime: "2026-09-27 10:00",
    durationDays: 1,
    address: "成都市金牛区快照路 1 号",
    requestedMasters: { gold: 0, silver: 1, bronze: 0 },
    customerName: "快照客户公司",
    wechat: "snapshot_wechat",
    phone: "13800007777"
  });

  customer.updateProfile({ name: "更新后的客户公司", wechat: "updated_wechat", phone: "13800008888", address: "成都市更新路 2 号" });

  const clientOrder = customer.listOrders().find((item) => item.id === order.id);
  const adminOrder = backend.asAdmin("admin_root").listOrders("待报价").find((item) => item.id === order.id);
  assert.equal(clientOrder.customerName, "快照客户公司");
  assert.equal(adminOrder.customerName, "快照客户公司");
  assert.equal(adminOrder.wechat, "snapshot_wechat");
  assert.equal(adminOrder.phone, "13800007777");
});

test("管理员导出客户资料会记录审计日志", () => {
  const backend = createBackend();
  const admin = backend.asAdmin("admin_root");
  const exported = admin.exportCustomers();
  assert.equal(exported.count, backend.state.customers.length);
  assert(exported.rows.some((item) => item.id === "c_001"));
  const audit = admin.auditTrail().find((item) => item.action === "管理员导出客户资料");
  assert.equal(audit.objectId, "customers");
  assert.equal(audit.after.count, exported.count);
});

if (process.exitCode) process.exit(process.exitCode);
