const assert = require("assert");
const domain = require("../shared/domain");

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

test("客户询价校验并生成待报价订单", () => {
  const state = domain.createInitialState();
  const order = domain.submitInquiry(state, {
    media: { images: ["现场图"], videos: [] },
    material: "其他",
    materialOther: "科技木饰面",
    types: ["划痕", "其他"],
    typeOther: "烫痕",
    woundCount: 2,
    woundLength: 12,
    visitTime: "2026-09-26 09:30",
    durationDays: 1,
    address: "成都市金牛区一环路 1 号",
    requestedMasters: { gold: 0, silver: 1, bronze: 0 },
    customerName: "测试客户",
    wechat: "test_wechat",
    phone: "13800009999"
  });
  assert.equal(order.status, domain.STATUS.QUOTING);
  assert.equal(domain.getClientOrders(state)[0].category, "待报价");
});

test("报价必须由客户确认后才能进入待派单", () => {
  const state = domain.createInitialState();
  domain.submitQuote(state, "JD20260921001", 300, 50, "岩板缺角处理");
  assert.equal(domain.getAdminOrders(state, "待报价").find((item) => item.id === "JD20260921001").status, domain.STATUS.QUOTE_CONFIRMING);
  const order = domain.confirmQuote(state, "JD20260921001");
  assert.equal(order.status, domain.STATUS.DISPATCHING);
  assert.equal(order.orderAmount, 350);
});

test("修改已提交报价会作废旧版本且客户只能确认最新报价", () => {
  const state = domain.createInitialState();
  const first = domain.submitQuote(state, "JD20260921001", 300, 50, "第一版报价");
  const second = domain.submitQuote(state, "JD20260921001", 360, 50, "第二版报价");
  assert.equal(first.status, "已作废");
  assert.equal(second.version, 2);
  const order = domain.confirmQuote(state, "JD20260921001");
  assert.equal(order.quoteHistory.length, 2);
  assert.equal(order.quoteHistory[0].status, "已作废");
  assert.equal(order.quoteHistory[1].status, "已确认");
  assert.equal(order.orderAmount, 410);
});

test("报价草稿只留管理端记录且不改变订单状态", () => {
  const state = domain.createInitialState();
  const draft = domain.saveQuoteDraft(state, "JD20260921001", 280, 50, "草稿报价");
  const adminOrder = domain.getAdminOrders(state, "待报价").find((item) => item.id === "JD20260921001");
  const clientOrder = domain.getClientOrders(state, "c_001").find((item) => item.id === "JD20260921001");
  assert.equal(draft.status, "草稿");
  assert.equal(adminOrder.status, domain.STATUS.QUOTING);
  assert.equal(adminOrder.quote, null);
  assert.equal(adminOrder.quoteHistoryCount, 1);
  assert.equal(clientOrder.quote, null);
  assert.equal(clientOrder.quoteHistoryCount, 0);
  assert.throws(() => domain.confirmQuote(state, "JD20260921001"), /当前订单不在待客户确认报价状态/);
  assert.equal(domain.listNotifications(state).length, 0);
});

test("关键状态变更生成通知且失败通知可重试", () => {
  const state = domain.createInitialState();
  domain.submitQuote(state, "JD20260921001", 300, 50, "报价通知");
  domain.confirmQuote(state, "JD20260921001");
  domain.dispatchOrder(state, "JD20260921001", { silver: ["m_silver_1"] });
  const reminder = domain.remindAcceptance(state, "JD20260921005");
  assert.equal(reminder.event, "提醒客户验收");
  assert.throws(() => domain.remindAcceptance(state, "JD20260921003"), /只有待验收订单/);
  const events = domain.listNotifications(state).map((item) => item.event);
  assert(events.includes("报价待确认"));
  assert(events.includes("客户已确认报价"));
  assert(events.includes("订单已派单"));
  assert(events.includes("提醒客户验收"));

  const quoteNotice = domain.listNotifications(state).find((item) => item.event === "报价待确认");
  const failed = domain.markNotificationFailed(state, quoteNotice.id, "订阅消息额度不足");
  assert.equal(failed.status, "发送失败");
  assert.equal(domain.listNotifications(state, "发送失败").length, 1);
  const retried = domain.retryNotification(state, quoteNotice.id);
  assert.equal(retried.status, "待发送");
  assert.equal(retried.attempts, 1);
  assert.equal(retried.lastError, "");
});

test("派单按客户确认等级人数精确匹配并进入待施工", () => {
  const state = domain.createInitialState();
  const ranked = domain.rankCandidates(state, "JD20260921003", "金牌");
  assert.equal(ranked[0].availability, "有空");
  const draft = domain.saveDispatchDraft(state, "JD20260921003", { gold: ["m_gold_1"], bronze: [] });
  assert.equal(draft.status, domain.STATUS.DISPATCHING);
  assert.deepEqual(draft.dispatchDraft, { gold: ["m_gold_1"], silver: [], bronze: [] });
  assert.throws(() => domain.saveDispatchDraft(state, "JD20260921003", { gold: ["m_gold_1", "m_gold_2"], bronze: [] }), /gold 师傅人数不能超过/);
  assert.throws(() => domain.saveDispatchDraft(state, "JD20260921003", { gold: [], bronze: ["m_gold_1"] }), /铜牌师傅只能选择铜牌等级/);
  assert.throws(() => domain.dispatchOrder(state, "JD20260921003", { gold: ["m_gold_1"], bronze: [] }), /bronze/);
  assert.throws(() => domain.dispatchOrder(state, "JD20260921003", { gold: ["m_gold_1"], bronze: ["m_gold_2"] }), /铜牌师傅只能选择铜牌等级/);
  const order = domain.dispatchOrder(state, "JD20260921003", { gold: ["m_gold_1"], bronze: ["m_bronze_1"] });
  assert.equal(order.status, domain.STATUS.APPOINTING);
  assert.deepEqual(order.dispatchDraft, { gold: [], silver: [], bronze: [] });
  assert.equal(domain.getAdminOrders(state, "待施工").some((item) => item.id === order.id), true);
});

test("多人订单允许每位师傅分别确认预约", () => {
  const state = domain.createInitialState();
  domain.dispatchOrder(state, "JD20260921003", { gold: ["m_gold_1"], bronze: ["m_bronze_1"] });

  domain.appointOrder(state, "JD20260921003", "m_gold_1");
  const order = domain.appointOrder(state, "JD20260921003", "m_bronze_1");

  assert.equal(order.status, domain.STATUS.APPOINTED);
  assert.equal(order.assignments.every((item) => item.status === "已预约"), true);
});

test("多人订单每位师傅提交完工前必须本人先打卡", () => {
  const state = domain.createInitialState();
  domain.dispatchOrder(state, "JD20260921003", { gold: ["m_gold_1"], bronze: ["m_bronze_1"] });
  domain.appointOrder(state, "JD20260921003", "m_gold_1");
  domain.appointOrder(state, "JD20260921003", "m_bronze_1");
  domain.checkInOrder(state, "JD20260921003", "m_gold_1", { ok: false, reason: "金牌师傅定位失败" });

  assert.throws(
    () => domain.submitCompletion(state, "JD20260921003", "m_bronze_1", ["图"], ["视频"], "铜牌未打卡完工"),
    /必须先完成到场打卡/
  );
  const bronzeOrder = domain.getMasterOrders(state, "m_bronze_1").find((item) => item.id === "JD20260921003");
  assert.equal(bronzeOrder.canCheckIn, true);
  assert.equal(bronzeOrder.canComplete, false);
});

test("师傅预约、无定位打卡、完工提交和客户验收通过能跨端推进", () => {
  const state = domain.createInitialState();
  domain.appointOrder(state, "JD20260921004", "m_silver_1");
  domain.checkInOrder(state, "JD20260921004", "m_silver_1", { ok: false, reason: "用户拒绝授权" });
  assert.equal(domain.getMasterOrders(state, "m_silver_1").find((item) => item.id === "JD20260921004").checkIn.includes("用户拒绝授权"), true);
  domain.submitCompletion(state, "JD20260921004", "m_silver_1", ["图1"], ["视频1"], "大理石缺角已修复。");
  assert.equal(domain.getClientOrders(state, "c_002").find((item) => item.id === "JD20260921004").category, "待验收");
  domain.acceptOrder(state, "JD20260921004");
  assert.equal(domain.getAdminOrders(state, "已验收").some((item) => item.id === "JD20260921004"), true);
});

test("到场打卡保存定位成功详情或失败原因", () => {
  const state = domain.createInitialState();
  domain.appointOrder(state, "JD20260921004", "m_silver_1");
  domain.checkInOrder(state, "JD20260921004", "m_silver_1", { ok: true, latitude: 30.67, longitude: 104.06, accuracy: 18 });
  const assigned = state.orders.find((item) => item.id === "JD20260921004").assignments[0];
  assert.equal(assigned.locationOk, true);
  assert.equal(assigned.latitude, 30.67);
  assert.equal(assigned.longitude, 104.06);
  assert.equal(assigned.accuracy, 18);
  assert.equal(assigned.locationReason, "");

  domain.submitQuote(state, "JD20260921001", 300, 50, "定位失败测试报价");
  domain.confirmQuote(state, "JD20260921001");
  domain.dispatchOrder(state, "JD20260921001", { silver: ["m_silver_1"] });
  domain.appointOrder(state, "JD20260921001", "m_silver_1");
  domain.checkInOrder(state, "JD20260921001", "m_silver_1", { ok: false, reason: "用户拒绝定位授权" });
  const failed = state.orders.find((item) => item.id === "JD20260921001").assignments[0];
  assert.equal(failed.locationOk, false);
  assert.equal(failed.latitude, null);
  assert.equal(failed.locationReason, "用户拒绝定位授权");
});

test("验收不通过进入异常，管理员可安排返修", () => {
  const state = domain.createInitialState();
  const exception = domain.rejectAcceptance(state, "JD20260921005", { images: ["问题图"], videos: [], description: "拼缝仍有高低差" });
  assert.equal(exception.type, "验收不通过");
  assert.equal(domain.getAdminOrders(state, "异常").some((item) => item.id === "JD20260921005"), true);
  const order = domain.arrangeRework(state, exception.id);
  assert.equal(order.status, domain.STATUS.REWORKING);
  assert.equal(exception.handledAt, "2026-09-21 20:00");
});

test("取消申请只能在允许阶段由管理员确认", () => {
  const state = domain.createInitialState();
  const request = domain.requestCancel(state, "JD20260921003", "客户项目延期");
  assert.equal(request.previousStatus, domain.STATUS.DISPATCHING);
  const exception = state.exceptions.find((item) => item.orderId === "JD20260921003");
  assert.equal(exception.statusSnapshot, domain.STATUS.DISPATCHING);
  const order = domain.confirmCancel(state, exception.id, "电话确认客户取消");
  assert.equal(order.status, domain.STATUS.CANCELED);
  assert.equal(exception.adminNote, "电话确认客户取消");
  assert.equal(exception.handledAt, "2026-09-21 20:00");
  assert.throws(() => domain.requestCancel(state, "JD20260921005", "已施工不做"), /不能提交取消/);
});

test("管理员驳回验收异常并强制完成必须填写说明", () => {
  const state = domain.createInitialState();
  const exception = domain.rejectAcceptance(state, "JD20260921005", { images: ["问题图"], videos: [], description: "修补处仍有色差" });

  assert.throws(() => domain.forceCompleteException(state, exception.id, ""), /必须填写处理说明/);
  const order = domain.forceCompleteException(state, exception.id, "复核完工凭证后确认可验收");

  assert.equal(order.status, domain.STATUS.ACCEPTED);
  assert.equal(exception.status, "已驳回并强制完成");
  assert.equal(exception.adminNote, "复核完工凭证后确认可验收");
  assert.equal(exception.handledAt, "2026-09-21 20:00");
  assert.equal(order.cycles[0].adminResult, "管理员强制完成");
});

test("管理员可以驳回取消申请并保留订单", () => {
  const state = domain.createInitialState();
  domain.requestCancel(state, "JD20260921003", "客户误点取消");
  const exception = state.exceptions.find((item) => item.orderId === "JD20260921003");

  const order = domain.keepCancelOrder(state, exception.id, "已联系客户继续施工");

  assert.equal(order.status, domain.STATUS.DISPATCHING);
  assert.equal(order.cancelRequest, null);
  assert.equal(exception.status, "已保留订单");
  assert.equal(exception.adminNote, "已联系客户继续施工");
  assert.equal(state.audit.some((item) => item.action === "管理员保留订单" && item.objectId === "JD20260921003"), true);
  assert.equal(domain.listNotifications(state).some((item) => item.event === "管理员保留订单"), true);
});

test("多师傅金额按订单金额 90% 总池分配，付款需手动确认", () => {
  const state = domain.createInitialState();
  domain.dispatchOrder(state, "JD20260921003", { gold: ["m_gold_1"], bronze: ["m_bronze_1"] });
  assert.throws(() => domain.allocateMasterAmounts(state, "JD20260921003", { m_gold_1: 400, m_bronze_1: 257 }), /完工后/);
  domain.appointOrder(state, "JD20260921003", "m_gold_1");
  domain.checkInOrder(state, "JD20260921003", "m_gold_1", { ok: false, reason: "测试定位失败" });
  domain.submitCompletion(state, "JD20260921003", "m_gold_1", ["图"], ["视频"], "多人订单完工");
  assert.throws(() => domain.allocateMasterAmounts(state, "JD20260921003", { m_gold_1: 300, m_bronze_1: 300 }), /必须等于/);
  domain.allocateMasterAmounts(state, "JD20260921003", { m_gold_1: 400, m_bronze_1: 257 });
  domain.allocateMasterAmounts(state, "JD20260921003", { m_gold_1: 390, m_bronze_1: 267 }, "admin_root");
  assert.equal(state.paymentAdjustments.some((item) => item.orderId === "JD20260921003" && item.beforeAmount === 400 && item.afterAmount === 390 && item.actor === "admin_root" && item.source === "管理员分配师傅金额"), true);
  assert.equal(domain.listPaymentRecords(state, "JD20260921003").filter((item) => item.type === "师傅付款").length, 2);
  domain.acceptOrder(state, "JD20260921003");
  domain.confirmCustomerPayment(state, "JD20260921003");
  domain.confirmMasterPayment(state, "JD20260921003", "m_gold_1");
  const adminOrder = domain.getAdminOrders(state, "已验收").find((item) => item.id === "JD20260921003");
  assert.equal(adminOrder.paymentStatus, "收/付款未完成");
  assert.equal(domain.listPaymentRecords(state, "JD20260921003").find((item) => item.targetId === "m_gold_1").status, "已完成");
});

test("验收后生成款项明细且重复确认收付款保持幂等", () => {
  const state = domain.createInitialState();
  domain.appointOrder(state, "JD20260921004", "m_silver_1");
  domain.checkInOrder(state, "JD20260921004", "m_silver_1", { ok: false, reason: "测试定位失败" });
  domain.submitCompletion(state, "JD20260921004", "m_silver_1", ["图"], ["视频"], "完工");
  domain.acceptOrder(state, "JD20260921004");
  const records = domain.listPaymentRecords(state, "JD20260921004");
  assert.equal(records.length, 2);
  assert(records.some((item) => item.type === "客户收款" && item.dueAmount === 290));
  assert(records.some((item) => item.type === "师傅付款" && item.dueAmount === 261));

  domain.confirmCustomerPayment(state, "JD20260921004");
  domain.confirmCustomerPayment(state, "JD20260921004");
  domain.confirmMasterPayment(state, "JD20260921004", "m_silver_1");
  domain.confirmMasterPayment(state, "JD20260921004", "m_silver_1");
  const after = domain.listPaymentRecords(state, "JD20260921004");
  assert.equal(after.length, 2);
  assert(after.every((item) => item.status === "已完成"));
  assert.equal(domain.listNotifications(state).filter((item) => item.event === "平台已确认师傅付款").length, 1);
});

test("待审核师傅默认铜牌，审核后才能进入候选池", () => {
  const state = domain.createInitialState();
  assert.equal(domain.rankCandidates(state, "JD20260921003", "铜牌").some((item) => item.id === "m_pending_1"), false);
  domain.reviewMaster(state, "m_pending_1", true);
  assert.equal(domain.rankCandidates(state, "JD20260921003", "铜牌").some((item) => item.id === "m_pending_1"), true);
  domain.updateMasterAdminFields(state, "m_pending_1", { level: "银牌", creditScore: 88 });
  const updated = state.masters.find((item) => item.id === "m_pending_1");
  assert.equal(updated.level, "银牌");
  assert.equal(updated.creditScore, 88);
  const audit = state.audit.find((item) => item.action === "管理员修改师傅管理字段");
  assert.equal(audit.before.level, "铜牌");
  assert.equal(audit.after.level, "银牌");
  assert.equal(audit.before.creditScore, 80);
  assert.equal(audit.after.creditScore, 88);
});

test("候选排序公平分包含已分配订单和结算记录", () => {
  const state = domain.createInitialState();
  state.orders.forEach((item) => { item.assignments = []; });
  state.paymentRecords = [{ id: "pay_test_1", orderId: "old_order", type: "师傅付款", targetId: "m_silver_1", dueAmount: 100, paidAmount: 100, status: "已完成" }];

  const ranked = domain.rankCandidates(state, "JD20260921002", "银牌");

  assert.equal(ranked[0].id, "m_silver_2");
  assert.equal(ranked.find((item) => item.id === "m_silver_1").fairnessScore, 1);
  assert.equal(ranked.find((item) => item.id === "m_silver_2").fairnessScore, 0);
});

test("拒绝师傅注册必须填写原因并允许重新提交", () => {
  const state = domain.createInitialState();
  assert.throws(() => domain.reviewMaster(state, "m_pending_1", false, ""), /必须填写原因/);
  const rejected = domain.reviewMaster(state, "m_pending_1", false, "手机号无法联系");
  assert.equal(rejected.reviewStatus, "已拒绝");
  assert.equal(rejected.reviewReason, "手机号无法联系");
});

test("管理员编辑师傅累计已支付金额会按结算记录冲抵", () => {
  const state = domain.createInitialState();
  assert.equal(domain.getAdminMaster(state, "m_gold_1").paidAmount, 477);
  assert.equal(domain.getAdminMaster(state, "m_gold_1").needPay, 0);

  domain.updateMasterAdminFields(state, "m_gold_1", { paidAmount: 300 });

  const master = domain.getAdminMaster(state, "m_gold_1");
  const record = domain.listPaymentRecords(state, "JD20260921006").find((item) => item.type === "师傅付款" && item.targetId === "m_gold_1");
  const assignment = state.orders.find((item) => item.id === "JD20260921006").assignments[0];
  assert.equal(master.paidAmount, 300);
  assert.equal(master.needPay, 177);
  assert.equal(record.paidAmount, 300);
  assert.equal(record.status, "部分完成");
  assert.equal(assignment.paidAmount, 300);
  assert.equal(state.paymentAdjustments.some((item) => item.orderId === "JD20260921006" && item.beforePaid === 477 && item.afterPaid === 300), true);
  assert.throws(() => domain.updateMasterAdminFields(state, "m_gold_1", { paidAmount: 478 }), /不能超过/);
});

test("管理端订单支持关键词搜索和分页", () => {
  const state = domain.createInitialState();
  const searched = domain.queryAdminOrders(state, { filter: "全部", keyword: "锦禾", page: 1, pageSize: 2 });
  assert.equal(searched.items.every((item) => item.customerName.includes("锦禾")), true);
  assert.equal(searched.page, 1);
  assert.equal(searched.pageSize, 2);
  assert(searched.total >= 1);

  const firstPage = domain.queryAdminOrders(state, { filter: "全部", page: 1, pageSize: 2 });
  const secondPage = domain.queryAdminOrders(state, { filter: "全部", page: 2, pageSize: 2 });
  assert.equal(firstPage.items.length, 2);
  assert.equal(secondPage.items.length, 2);
  assert.notEqual(firstPage.items[0].id, secondPage.items[0].id);
  assert.equal(firstPage.counts["待报价"] >= 1, true);
});

test("师傅可用时间限制未来 7 天且未填写显示未知", () => {
  const state = domain.createInitialState();
  const rows = domain.getMasterAvailability(state, "m_silver_1");
  assert.equal(rows.length, 14);
  assert.equal(rows[0].date, "2026-09-22");
  assert.equal(rows[0].slot, "上午");
  assert.equal(rows.some((item) => item.date === "2026-09-25" && item.slot === "下午" && item.status === "有空"), true);
  assert.equal(rows.some((item) => item.status === "未知"), true);

  assert.throws(
    () => domain.saveAvailability(state, "m_silver_1", [{ date: "2026-10-10", slot: "上午", status: "有空" }]),
    /未来 7 天/
  );
  assert.throws(
    () => domain.saveAvailability(state, "m_silver_1", [{ date: "2026-09-22", slot: "晚上", status: "有空" }]),
    /时段无效/
  );
});

if (process.exitCode) process.exit(process.exitCode);
