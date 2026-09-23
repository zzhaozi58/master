const STATUS = {
  QUOTING: "待报价",
  QUOTE_CONFIRMING: "待客户确认报价",
  DISPATCHING: "待派单",
  APPOINTING: "待预约",
  APPOINTED: "已预约",
  WORKING: "施工中",
  ACCEPTING: "待验收",
  ACCEPT_REJECTED: "验收不通过待处理",
  REWORKING: "返修中",
  ACCEPTED: "已验收",
  CANCELED: "已取消"
};

const LEVELS = ["金牌", "银牌", "铜牌"];
const LEVEL_BY_SELECTION_KEY = { gold: "金牌", silver: "银牌", bronze: "铜牌" };
const AVAILABILITY_STATUSES = ["未知", "有空", "无空"];
const AVAILABILITY_SLOTS = ["上午", "下午"];
const AVAILABILITY_RANK = { "有空": 0, "未知": 1, "无空": 2 };

function createInitialState() {
  const customers = [
    {
      id: "c_001",
      name: "成都锦禾石材有限公司",
      contact: "周经理",
      type: "企业客户",
      wechat: "jinhe_zhou",
      phone: "13800001001",
      address: "成都市金牛区金府路 88 号",
      note: "长期合作客户"
    },
    {
      id: "c_002",
      name: "青羊区样板间项目",
      contact: "李工",
      type: "工程客户",
      wechat: "li_gong_26",
      phone: "13800001002",
      address: "成都市青羊区光华大道 16 号",
      note: "常有瓷砖与岩板修复"
    }
  ];

  const masters = [
    master("m_gold_1", "王志强", "男", "金牌", 96, "13800002601", "jindashi_wang", "成都市", "金牛区", "金府路", "岩板、石材、复杂纹理", "接单中", "已通过", 0),
    master("m_gold_2", "陈明远", "男", "金牌", 92, "13800002602", "jindashi_chen", "成都市", "武侯区", "武侯大道", "木门、实木、色差修复", "接单中", "已通过", 0),
    master("m_silver_1", "李建军", "男", "银牌", 90, "13800002603", "jindashi_li", "成都市", "成华区", "建设路", "瓷砖、缺角、拼缝", "接单中", "已通过", 180),
    master("m_silver_2", "赵瑞峰", "男", "银牌", 87, "13800002604", "jindashi_zhao", "成都市", "锦江区", "三圣乡", "补漆、划痕、坑洞", "接单中", "已通过", 0),
    master("m_bronze_1", "刘海涛", "男", "铜牌", 82, "13800002605", "jindashi_liu", "成都市", "双流区", "东升街道", "木材、补漆、日常维修", "接单中", "已通过", 0),
    master("m_pending_1", "张新宇", "男", "铜牌", 80, "13800002606", "jindashi_zhang", "成都市", "郫都区", "犀浦街道", "新注册师傅，擅长家具补漆", "待审核", "待审核", 0)
  ];

  const orders = [
    order({
      id: "JD20260921001",
      customerId: "c_001",
      status: STATUS.QUOTING,
      material: "岩板",
      types: ["缺角", "拼缝"],
      woundCount: 3,
      woundLength: 18,
      visitTime: "2026-09-22 10:00",
      durationDays: 1,
      address: "成都市金牛区金府路 88 号 3 楼",
      requestedMasters: { gold: 0, silver: 1, bronze: 0 },
      media: { images: ["客户现场图 1"], videos: [] },
      note: "前台岩板边角破损"
    }),
    order({
      id: "JD20260921002",
      customerId: "c_002",
      status: STATUS.QUOTE_CONFIRMING,
      material: "瓷砖",
      types: ["裂缝"],
      woundCount: 2,
      woundLength: 25,
      visitTime: "2026-09-23 15:00",
      durationDays: 1,
      address: "成都市青羊区光华大道 16 号",
      requestedMasters: { gold: 0, silver: 1, bronze: 1 },
      quote: quote(1, 430, 50, "瓷砖裂缝两处，含基础调色。", "待客户确认")
    }),
    order({
      id: "JD20260921003",
      customerId: "c_001",
      status: STATUS.DISPATCHING,
      material: "木材",
      types: ["划痕", "补漆"],
      woundCount: 5,
      woundLength: 32,
      visitTime: "2026-09-24 09:00",
      durationDays: 1,
      address: "成都市金牛区金府路 88 号",
      requestedMasters: { gold: 1, silver: 0, bronze: 1 },
      quote: quote(1, 680, 50, "木饰面多处划痕补色。", "已确认"),
      orderAmount: 730
    }),
    order({
      id: "JD20260921004",
      customerId: "c_002",
      status: STATUS.APPOINTING,
      material: "大理石",
      types: ["缺角"],
      woundCount: 1,
      woundLength: 6,
      visitTime: "2026-09-25 14:00",
      durationDays: 1,
      address: "成都市青羊区光华大道 16 号",
      requestedMasters: { gold: 0, silver: 1, bronze: 0 },
      quote: quote(1, 240, 50, "大理石缺角修复。", "已确认"),
      orderAmount: 290,
      assignments: [assignment("m_silver_1", "银牌", 261)]
    }),
    order({
      id: "JD20260921005",
      customerId: "c_001",
      status: STATUS.ACCEPTING,
      material: "瓷砖",
      types: ["缺角", "拼缝"],
      woundCount: 2,
      woundLength: 15,
      visitTime: "2026-09-20 09:30",
      durationDays: 1,
      address: "成都市金牛区金府路 88 号",
      requestedMasters: { gold: 0, silver: 1, bronze: 0 },
      quote: quote(1, 320, 50, "瓷砖缺角及拼缝处理。", "已确认"),
      orderAmount: 370,
      assignments: [assignment("m_silver_1", "银牌", 333, "已打卡")],
      cycles: [cycle(1, ["完工图 1", "完工图 2"], ["完工视频 1"], "已完成缺角补色和拼缝压平，边缘已做抛光。")]
    }),
    order({
      id: "JD20260921006",
      customerId: "c_002",
      status: STATUS.ACCEPTED,
      material: "实木",
      types: ["坑洞", "补漆"],
      woundCount: 1,
      woundLength: 4,
      visitTime: "2026-09-18 10:30",
      durationDays: 1,
      address: "成都市青羊区光华大道 16 号",
      requestedMasters: { gold: 1, silver: 0, bronze: 0 },
      quote: quote(1, 480, 50, "实木坑洞修复及补漆。", "已确认"),
      orderAmount: 530,
      assignments: [assignment("m_gold_1", "金牌", 477, "已完工", 477)],
      cycles: [cycle(1, ["完工图 1"], ["完工视频 1"], "表面已补平并完成同色处理。", "通过")],
      payments: { customerPaid: 0, masterPaid: { m_gold_1: 477 } }
    })
  ];
  orders.forEach((item) => {
    if (!item.customerSnapshot) item.customerSnapshot = clone(findById(customers, item.customerId));
  });

  return {
    currentCustomerId: "c_001",
    currentMasterId: "m_silver_1",
    customers,
    masters,
    orders,
    wechatIdentities: [
      { role: "customer", appid: "client-demo-app", openid: "client-openid-c001", unionid: "union-c001", subjectId: "c_001" },
      { role: "customer", appid: "client-demo-app", openid: "client-openid-c002", unionid: "union-c002", subjectId: "c_002" },
      { role: "master", appid: "master-demo-app", openid: "master-openid-silver1", unionid: "union-master-silver1", subjectId: "m_silver_1" },
      { role: "admin", appid: "admin-demo-app", openid: "admin-openid-root", unionid: "union-admin-root", subjectId: "admin_root" }
    ],
    sessions: [],
    idempotencyRecords: [],
    mediaFiles: [],
    notificationOutbox: [],
    paymentRecords: [],
    paymentAdjustments: [],
    exceptions: [],
    audit: [],
    availability: [
      { masterId: "m_silver_1", date: "2026-09-25", slot: "下午", status: "有空" },
      { masterId: "m_gold_1", date: "2026-09-24", slot: "上午", status: "有空" },
      { masterId: "m_bronze_1", date: "2026-09-24", slot: "上午", status: "未知" }
    ]
  };
}

function master(id, name, gender, level, creditScore, phone, wechat, city, district, street, intro, workStatus, reviewStatus, paidAmount) {
  return {
    id,
    name,
    gender,
    level,
    creditScore,
    phone,
    wechat,
    city,
    district,
    street,
    intro,
    skills: intro.split("、").slice(0, 3),
    workStatus,
    reviewStatus,
    reviewReason: "",
    reviewedBy: "",
    reviewedAt: "",
    reviewNote: "",
    paidAmount
  };
}

function quote(version, repairFee, visitFee, description, status) {
  const total = repairFee + visitFee;
  return {
    id: `q_${version}`,
    version,
    repairFee,
    repairFeeCents: toCents(repairFee),
    visitFee,
    visitFeeCents: toCents(visitFee),
    total,
    totalCents: toCents(total),
    description,
    status,
    submittedAt: nowText(),
    confirmedAt: ""
  };
}

function assignment(masterId, level, receivableAmount, status = "待预约", paidAmount = 0) {
  return {
    masterId,
    level,
    receivableAmount,
    paidAmount,
    status,
    appointedAt: "",
    checkedInAt: "",
    locationText: "",
    locationOk: null,
    latitude: null,
    longitude: null,
    accuracy: null,
    locationReason: ""
  };
}

function cycle(round, images, videos, completionNote, result = "待确认") {
  return {
    round,
    completionMedia: { images, videos },
    completionNote,
    completedAt: nowText(),
    result,
    customerIssue: null,
    adminResult: null
  };
}

function order(input) {
  const base = {
    id: "",
    customerId: "",
    customerSnapshot: null,
    status: STATUS.QUOTING,
    material: "",
    materialOther: "",
    types: [],
    typeOther: "",
    woundCount: 1,
    woundLength: 0,
    visitTime: "",
    durationDays: 1,
    address: "",
    requestedMasters: { gold: 0, silver: 0, bronze: 0 },
    media: { images: [], videos: [] },
    quote: null,
    quoteHistory: [],
    orderAmount: null,
    orderAmountCents: null,
    dispatchDraft: { gold: [], silver: [], bronze: [] },
    assignments: [],
    cycles: [],
    cancelRequest: null,
    payments: { customerPaid: 0, customerPaidCents: 0, masterPaid: {}, masterPaidCents: {} },
    note: "",
    statusTimes: {},
    createdAt: nowText(),
    updatedAt: nowText()
  };
  const result = Object.assign(base, input);
  result.statusTimes = Object.assign({}, result.statusTimes || {});
  if (!result.statusTimes[result.status]) result.statusTimes[result.status] = result.createdAt;
  if (result.quote && !result.quoteHistory.length) result.quoteHistory = [result.quote];
  if (result.orderAmount != null && result.orderAmountCents == null) result.orderAmountCents = toCents(result.orderAmount);
  result.payments = Object.assign({ customerPaid: 0, customerPaidCents: 0, masterPaid: {}, masterPaidCents: {} }, result.payments || {});
  if (result.payments.customerPaidCents == null) result.payments.customerPaidCents = toCents(result.payments.customerPaid);
  if (!result.payments.masterPaidCents) {
    result.payments.masterPaidCents = Object.fromEntries(Object.entries(result.payments.masterPaid || {}).map(([masterId, amount]) => [masterId, toCents(amount)]));
  }
  return result;
}

function getClientOrders(state, customerId = state.currentCustomerId) {
  return state.orders.filter((item) => item.customerId === customerId).map((item) => toClientOrder(state, item));
}

function getAdminOrders(state, filter = "全部") {
  return state.orders.filter((item) => filter === "全部" || adminCategory(item) === filter).map((item) => toAdminOrder(state, item));
}

function getAdminMasters(state, filter = "全部") {
  return state.masters
    .filter((masterItem) => matchesMasterFilter(masterItem, filter))
    .map((masterItem) => toAdminMaster(state, masterItem));
}

function getAdminMaster(state, masterId) {
  return toAdminMaster(state, findById(state.masters, masterId));
}

function queryAdminOrders(state, options = {}) {
  const filter = options.filter || "全部";
  const keyword = String(options.keyword || "").trim().toLowerCase();
  const page = Math.max(1, Number(options.page || 1));
  const pageSize = Math.max(1, Math.min(100, Number(options.pageSize || 20)));
  const all = getAdminOrders(state, filter).filter((item) => matchesAdminKeyword(item, keyword));
  const start = (page - 1) * pageSize;
  const items = all.slice(start, start + pageSize);
  return {
    items,
    total: all.length,
    page,
    pageSize,
    hasMore: start + pageSize < all.length,
    counts: adminCounts(state)
  };
}

function getMasterOrders(state, masterId = state.currentMasterId) {
  return state.orders.filter((item) => item.assignments.some((assign) => assign.masterId === masterId)).map((item) => toMasterOrder(state, item, masterId));
}

function toClientOrder(state, item) {
  const customer = orderCustomer(state, item);
  const cycleInfo = latestCycle(item);
  const visibleQuoteHistory = (item.quoteHistory || []).filter((quoteItem) => quoteItem.status !== "草稿").map(clone);
  const visibleQuote = item.quote && item.quote.status !== "草稿" ? clone(item.quote) : null;
  return {
    id: item.id,
    category: clientCategory(item),
    status: item.status,
    title: `${item.material} / ${item.types.join(" / ")}`,
    customerName: customer.name,
    visitTime: item.visitTime,
    durationDays: item.durationDays,
    address: item.address,
    masters: assignmentNames(state, item),
    orderAmount: item.orderAmount,
    orderAmountText: item.orderAmount ? `¥${item.orderAmount}` : "待报价",
    quote: visibleQuote,
    quoteHistory: visibleQuoteHistory,
    quoteHistoryCount: visibleQuoteHistory.length,
    customerPaymentStatus: clientCustomerPaymentStatus(item),
    completedAt: cycleInfo ? cycleInfo.completedAt : "",
    progress: clientProgress(item),
    canCancel: canCancel(item),
    canAccept: item.status === STATUS.ACCEPTING,
    latestCycle: cycleInfo ? clone(cycleInfo) : null
  };
}

function toAdminOrder(state, item) {
  const customer = orderCustomer(state, item);
  return {
    id: item.id,
    category: adminCategory(item),
    status: item.status,
    customerName: customer.name,
    contact: customer.contact,
    phone: customer.phone,
    wechat: customer.wechat,
    title: `${item.material} / ${item.types.join(" / ")}`,
    wound: `${item.woundCount} 处 / ${item.woundLength} 厘米`,
    visitTime: item.visitTime,
    durationDays: item.durationDays,
    address: item.address,
    media: clone(item.media || { images: [], videos: [] }),
    requestedMasters: Object.assign({}, item.requestedMasters),
    requestedMastersText: requestedMastersText(item.requestedMasters),
    orderAmount: item.orderAmount,
    orderAmountText: item.orderAmount ? `¥${item.orderAmount}` : "待确认",
    masterPoolAmount: masterPoolAmount(item.orderAmount),
    masterPoolAmountText: item.orderAmount ? `¥${masterPoolAmount(item.orderAmount)}` : "待确认",
    quote: item.quote,
    quoteHistory: item.quoteHistory,
    quoteHistoryCount: item.quoteHistory.length,
    paymentStatus: paymentStatus(item),
    paymentRecords: listPaymentRecords(state, item.id),
    paymentRecordCount: listPaymentRecords(state, item.id).length,
    statusTimes: clone(item.statusTimes || {}),
    dispatchDraft: normalizeSelections(item.dispatchDraft || {}),
    assignments: item.assignments.map((assign) => withMaster(state, assign)),
    latestCycle: latestCycle(item)
  };
}

function toAdminMaster(state, item) {
  const summary = masterPaymentSummary(state, item.id);
  return Object.assign(clone(item), {
    paidAmount: summary.paidAmount,
    dueAmount: summary.dueAmount,
    needPay: summary.needPay
  });
}

function toMasterOrder(state, item, masterId) {
  const customer = findById(state.customers, item.customerId);
  const assign = item.assignments.find((current) => current.masterId === masterId);
  return {
    id: item.id,
    category: masterCategory(item),
    status: item.status,
    title: `${item.material} / ${item.types.join(" / ")}`,
    visitTime: item.visitTime,
    durationDays: item.durationDays,
    receivableAmount: assign.receivableAmount == null ? null : assign.receivableAmount,
    receivableAmountText: assign.receivableAmount == null ? "待分配" : `¥${assign.receivableAmount}`,
    paidAmount: item.status === STATUS.ACCEPTED || item.status === STATUS.CANCELED ? assign.paidAmount || 0 : null,
    paidAmountText: item.status === STATUS.ACCEPTED || item.status === STATUS.CANCELED ? `¥${assign.paidAmount || 0}` : "",
    address: item.address,
    note: item.note || "按客户现场确认为准",
    checkIn: assign.locationText || "未打卡",
    canCheckIn: !assign.checkedInAt && [STATUS.APPOINTED, STATUS.WORKING, STATUS.REWORKING].includes(item.status),
    canComplete: !!assign.checkedInAt && [STATUS.WORKING, STATUS.REWORKING].includes(item.status),
    customerPhone: customer.phone,
    customerName: customer.contact,
    isCanceled: item.status === STATUS.CANCELED,
    latestCycle: latestCycle(item)
  };
}

function submitInquiry(state, form) {
  validateInquiry(form);
  const id = `JD${new Date().toISOString().slice(0, 10).replace(/-/g, "")}${String(state.orders.length + 1).padStart(3, "0")}`;
  const customer = state.customers.find((item) => item.id === state.currentCustomerId);
  customer.name = form.customerName;
  customer.wechat = form.wechat;
  customer.phone = form.phone;
  customer.address = form.address;
  const created = order({
    id,
    customerId: state.currentCustomerId,
    material: form.material,
    materialOther: form.materialOther || "",
    types: form.types,
    typeOther: form.typeOther || "",
    woundCount: Number(form.woundCount),
    woundLength: Number(form.woundLength),
    visitTime: form.visitTime,
    durationDays: Number(form.durationDays),
    address: form.address,
    requestedMasters: form.requestedMasters,
    media: form.media,
    customerSnapshot: clone(customer)
  });
  state.orders.unshift(created);
  audit(state, "客户提交询价", id);
  return created;
}

function submitQuote(state, orderId, repairFee, visitFee, description, actor = "system") {
  const item = orderById(state, orderId);
  assert([STATUS.QUOTING, STATUS.QUOTE_CONFIRMING].includes(item.status), "只有待报价订单可以提交报价");
  assert(Number(repairFee) > 0, "维修报价必须大于 0");
  assert(Number(visitFee) >= 0, "上门费不得小于 0");
  const before = auditSnapshot(item, ["status", "quote", "quoteHistory"]);
  item.quoteHistory = item.quoteHistory || [];
  if (item.quote && item.quote.status === "待客户确认") item.quote.status = "已作废";
  const nextVersion = item.quoteHistory.length ? Math.max(...item.quoteHistory.map((current) => current.version)) + 1 : 1;
  item.quote = quote(nextVersion, Number(repairFee), Number(visitFee), description, "待客户确认");
  item.quoteHistory.push(item.quote);
  setOrderStatus(item, STATUS.QUOTE_CONFIRMING);
  touch(item);
  audit(state, "管理员提交报价", orderId, "", before, auditSnapshot(item, ["status", "quote", "quoteHistory"]), actor);
  enqueueNotification(state, "报价待确认", [{ role: "customer", id: item.customerId }], orderId, { total: item.quote.total });
  return item.quote;
}

function saveQuoteDraft(state, orderId, repairFee, visitFee, description, actor = "system") {
  const item = orderById(state, orderId);
  assert([STATUS.QUOTING, STATUS.QUOTE_CONFIRMING].includes(item.status), "只有待报价订单可以保存报价草稿");
  assert(Number(repairFee) > 0, "维修报价必须大于 0");
  assert(Number(visitFee) >= 0, "上门费不得小于 0");
  const before = auditSnapshot(item, ["status", "quoteHistory"]);
  item.quoteHistory = item.quoteHistory || [];
  const nextVersion = item.quoteHistory.length ? Math.max(...item.quoteHistory.map((current) => current.version)) + 1 : 1;
  const draft = quote(nextVersion, Number(repairFee), Number(visitFee), description, "草稿");
  item.quoteHistory.push(draft);
  touch(item);
  audit(state, "管理员保存报价草稿", orderId, "", before, auditSnapshot(item, ["status", "quoteHistory"]), actor);
  return draft;
}

function confirmQuote(state, orderId, actor = "system") {
  const item = orderById(state, orderId);
  assert(item.status === STATUS.QUOTE_CONFIRMING, "当前订单不在待客户确认报价状态");
  assert(item.quote && item.quote.status === "待客户确认", "没有可确认的最新报价");
  const before = auditSnapshot(item, ["status", "quote", "orderAmount", "orderAmountCents"]);
  item.quote.status = "已确认";
  item.quote.confirmedAt = nowText();
  item.orderAmount = item.quote.total;
  item.orderAmountCents = item.quote.totalCents;
  setOrderStatus(item, STATUS.DISPATCHING);
  touch(item);
  audit(state, "客户确认报价", orderId, "", before, auditSnapshot(item, ["status", "quote", "orderAmount", "orderAmountCents"]), actor);
  enqueueNotification(state, "客户已确认报价", [{ role: "admin", id: "admin_root" }], orderId, { total: item.orderAmount, totalCents: item.orderAmountCents });
  return item;
}

function rankCandidates(state, orderId, level) {
  const item = orderById(state, orderId);
  const slot = slotOf(item.visitTime);
  const date = item.visitTime.slice(0, 10);
  return state.masters
    .filter((candidate) => candidate.level === level && candidate.reviewStatus === "已通过")
    .map((candidate) => {
      const availability = state.availability.find((current) => current.masterId === candidate.id && current.date === date && current.slot === slot);
      const assignedCount = state.orders.filter((orderItem) => orderItem.assignments.some((assign) => assign.masterId === candidate.id)).length;
      const settlementCount = (state.paymentRecords || []).filter((record) => record.type === "师傅付款" && record.targetId === candidate.id).length;
      return {
        ...candidate,
        availability: availability ? availability.status : "未知",
        assignedCount,
        settlementCount,
        fairnessScore: assignedCount + settlementCount
      };
    })
    .sort((left, right) => (
      AVAILABILITY_RANK[left.availability] - AVAILABILITY_RANK[right.availability]
      || left.fairnessScore - right.fairnessScore
      || right.creditScore - left.creditScore
      || left.name.localeCompare(right.name, "zh-Hans-CN")
    ));
}

function dispatchOrder(state, orderId, selections, actor = "system") {
  const item = orderById(state, orderId);
  assert(item.status === STATUS.DISPATCHING, "只有待派单订单可以派单");
  const before = auditSnapshot(item, ["status", "assignments"]);
  const normalized = validateDispatchSelection(state, item, selections, { allowPartial: false });
  const selectedIds = [...normalized.gold, ...normalized.silver, ...normalized.bronze];
  const amount = masterPoolAmount(item.orderAmount);
  const singleAmount = selectedIds.length === 1 ? amount : null;
  item.assignments = selectedIds.map((masterId) => {
    const masterInfo = findById(state.masters, masterId);
    return assignment(masterId, masterInfo.level, singleAmount);
  });
  item.dispatchDraft = normalizeSelections({});
  setOrderStatus(item, STATUS.APPOINTING);
  touch(item);
  audit(state, "管理员确认派单", orderId, "", before, auditSnapshot(item, ["status", "assignments"]), actor);
  enqueueNotification(state, "订单已派单", [{ role: "customer", id: item.customerId }, ...selectedIds.map((id) => ({ role: "master", id }))], orderId, { masters: selectedIds });
  return item;
}

function saveDispatchDraft(state, orderId, selections, actor = "system") {
  const item = orderById(state, orderId);
  assert(item.status === STATUS.DISPATCHING, "只有待派单订单可以保存派单设置");
  const before = auditSnapshot(item, ["dispatchDraft"]);
  const normalized = validateDispatchSelection(state, item, selections, { allowPartial: true });
  item.dispatchDraft = normalized;
  touch(item);
  audit(state, "管理员保存派单设置", orderId, "", before, auditSnapshot(item, ["dispatchDraft"]), actor);
  return item;
}

function validateDispatchSelection(state, order, selections, options = {}) {
  const normalized = normalizeSelections(selections);
  ["gold", "silver", "bronze"].forEach((key) => {
    const count = (normalized[key] || []).length;
    const requiredCount = order.requestedMasters[key] || 0;
    if (options.allowPartial) {
      assert(count <= requiredCount, `${key} 师傅人数不能超过客户确认数量`);
    } else {
      assert(count === requiredCount, `${key} 师傅人数必须与客户确认数量一致`);
    }
    (normalized[key] || []).forEach((masterId) => {
      const masterInfo = findById(state.masters, masterId);
      assert(masterInfo.level === LEVEL_BY_SELECTION_KEY[key], `${LEVEL_BY_SELECTION_KEY[key]}师傅只能选择${LEVEL_BY_SELECTION_KEY[key]}等级`);
      assert(masterInfo.reviewStatus === "已通过", "未审核通过的师傅不能派单");
    });
  });
  const selectedIds = [...normalized.gold, ...normalized.silver, ...normalized.bronze];
  assert(new Set(selectedIds).size === selectedIds.length, "同一师傅不能重复选择");
  return normalized;
}

function appointOrder(state, orderId, masterId, actor = masterId) {
  const item = orderById(state, orderId);
  const assign = assignmentByMaster(item, masterId);
  assert([STATUS.APPOINTING, STATUS.APPOINTED].includes(item.status), "只有待预约订单可以确认预约");
  if (assign.appointedAt) return item;
  const before = auditSnapshot(item, ["status", "assignments"]);
  assign.status = "已预约";
  assign.appointedAt = nowText();
  setOrderStatus(item, STATUS.APPOINTED);
  touch(item);
  audit(state, "师傅确认预约", orderId, masterId, before, auditSnapshot(item, ["status", "assignments"]), actor);
  enqueueNotification(state, "师傅已确认预约", [{ role: "customer", id: item.customerId }, { role: "admin", id: "admin_root" }], orderId, { masterId });
  return item;
}

function checkInOrder(state, orderId, masterId, locationResult, actor = masterId) {
  const item = orderById(state, orderId);
  const assign = assignmentByMaster(item, masterId);
  assert([STATUS.APPOINTED, STATUS.WORKING, STATUS.REWORKING].includes(item.status), "当前状态不能到场打卡");
  if (assign.checkedInAt) return item;
  const before = auditSnapshot(item, ["status", "assignments"]);
  assign.checkedInAt = nowText();
  assign.status = "已打卡";
  assign.locationOk = !!(locationResult && locationResult.ok);
  assign.latitude = locationResult && locationResult.ok ? Number(locationResult.latitude) : null;
  assign.longitude = locationResult && locationResult.ok ? Number(locationResult.longitude) : null;
  assign.accuracy = locationResult && locationResult.ok ? Number(locationResult.accuracy || 0) : null;
  assign.locationReason = locationResult && locationResult.ok ? "" : String(locationResult && locationResult.reason ? locationResult.reason : "定位失败");
  assign.locationText = assign.locationOk
    ? `定位成功 ${assign.checkedInAt}（${assign.latitude}, ${assign.longitude}，精度 ${assign.accuracy}m）`
    : `（无定位：${assign.locationReason}）${assign.checkedInAt}`;
  setOrderStatus(item, STATUS.WORKING);
  touch(item);
  audit(state, "师傅到场打卡", orderId, assign.locationText, before, auditSnapshot(item, ["status", "assignments"]), actor);
  enqueueNotification(state, "师傅已到场打卡", [{ role: "admin", id: "admin_root" }], orderId, { masterId, locationOk: assign.locationOk });
  return item;
}

function submitCompletion(state, orderId, masterId, images, videos, note, actor = masterId) {
  const item = orderById(state, orderId);
  const assign = assignmentByMaster(item, masterId);
  assert([STATUS.WORKING, STATUS.REWORKING].includes(item.status), "只有施工中或返修中可以提交完工");
  assert(assign.checkedInAt, "提交完工前必须先完成到场打卡");
  assert(images.length >= 1 && images.length <= 5, "完工图片必须 1-5 张");
  assert(videos.length >= 1 && videos.length <= 2, "完工视频必须 1-2 个");
  const before = auditSnapshot(item, ["status", "cycles"]);
  item.cycles.push(cycle(item.cycles.length + 1, images, videos, note || ""));
  setOrderStatus(item, STATUS.ACCEPTING);
  touch(item);
  audit(state, "师傅提交完工", orderId, masterId, before, auditSnapshot(item, ["status", "cycles"]), actor);
  enqueueNotification(state, "师傅已提交完工", [{ role: "customer", id: item.customerId }, { role: "admin", id: "admin_root" }], orderId, { masterId });
  return latestCycle(item);
}

function acceptOrder(state, orderId, actor = "system") {
  const item = orderById(state, orderId);
  assert(item.status === STATUS.ACCEPTING, "当前订单不在待验收状态");
  const current = latestCycle(item);
  assert(current, "缺少完工轮次");
  const before = auditSnapshot(item, ["status", "cycles", "payments", "assignments"]);
  current.result = "通过";
  setOrderStatus(item, STATUS.ACCEPTED);
  item.payments.customerPaid = item.payments.customerPaid || 0;
  item.assignments.forEach((assign) => {
    if (assign.receivableAmount == null && item.assignments.length === 1) assign.receivableAmount = masterPoolAmount(item.orderAmount);
  });
  ensureCustomerPaymentRecord(state, item);
  item.assignments.forEach((assign) => {
    if (assign.receivableAmount != null) ensureMasterPaymentRecord(state, item, assign);
  });
  touch(item);
  audit(state, "客户通过验收", orderId, "", before, auditSnapshot(item, ["status", "cycles", "payments", "assignments"]), actor);
  enqueueNotification(state, "客户已通过验收", [{ role: "admin", id: "admin_root" }, ...item.assignments.map((assign) => ({ role: "master", id: assign.masterId }))], orderId, {});
  return item;
}

function rejectAcceptance(state, orderId, issue, actor = "system") {
  const item = orderById(state, orderId);
  assert(item.status === STATUS.ACCEPTING, "当前订单不在待验收状态");
  assert(issue && ((issue.images || []).length + (issue.videos || []).length > 0), "不通过时必须上传验收图片或视频");
  assert(issue.description && issue.description.trim(), "不通过时必须填写问题说明");
  const before = auditSnapshot(item, ["status", "cycles"]);
  const current = latestCycle(item);
  current.result = "不通过";
  current.customerIssue = issue;
  setOrderStatus(item, STATUS.ACCEPT_REJECTED);
  const exception = { id: `ex_${state.exceptions.length + 1}`, orderId, type: "验收不通过", status: "待处理", reason: issue.description, statusSnapshot: STATUS.ACCEPTING, mastersSnapshot: assignmentNames(state, item), createdAt: nowText() };
  state.exceptions.unshift(exception);
  touch(item);
  audit(state, "客户验收不通过", orderId, issue.description, before, auditSnapshot(item, ["status", "cycles"]), actor);
  enqueueNotification(state, "客户验收不通过", [{ role: "admin", id: "admin_root" }, ...item.assignments.map((assign) => ({ role: "master", id: assign.masterId }))], orderId, { exceptionId: exception.id });
  return exception;
}

function arrangeRework(state, exceptionId, actor = "system") {
  const exception = findById(state.exceptions, exceptionId);
  const item = orderById(state, exception.orderId);
  assert(item.status === STATUS.ACCEPT_REJECTED, "只有验收不通过待处理订单可以安排返修");
  const before = auditSnapshot(item, ["status"]);
  exception.status = "已安排返修";
  exception.handledAt = nowText();
  setOrderStatus(item, STATUS.REWORKING);
  touch(item);
  audit(state, "管理员安排返修", item.id, exceptionId, before, auditSnapshot(item, ["status"]), actor);
  enqueueNotification(state, "管理员安排返修", [{ role: "customer", id: item.customerId }, ...item.assignments.map((assign) => ({ role: "master", id: assign.masterId }))], item.id, { exceptionId });
  return item;
}

function forceCompleteException(state, exceptionId, description, actor = "system") {
  assert(description && description.trim(), "强制完成必须填写处理说明");
  const exception = findById(state.exceptions, exceptionId);
  const item = orderById(state, exception.orderId);
  const before = auditSnapshot(item, ["status", "cycles", "payments", "assignments"]);
  exception.status = "已驳回并强制完成";
  exception.adminNote = description;
  exception.handledAt = nowText();
  const current = latestCycle(item);
  if (current) current.adminResult = "管理员强制完成";
  setOrderStatus(item, STATUS.ACCEPTED);
  ensureCustomerPaymentRecord(state, item);
  item.assignments.forEach((assign) => {
    if (assign.receivableAmount != null) ensureMasterPaymentRecord(state, item, assign);
  });
  touch(item);
  audit(state, "管理员驳回异常并强制完成", item.id, description, before, auditSnapshot(item, ["status", "cycles", "payments", "assignments"]), actor);
  enqueueNotification(state, "管理员强制完成订单", [{ role: "customer", id: item.customerId }, ...item.assignments.map((assign) => ({ role: "master", id: assign.masterId }))], item.id, { exceptionId });
  return item;
}

function requestCancel(state, orderId, reason, actor = "客户") {
  const item = orderById(state, orderId);
  assert(canCancel(item), "当前订单不能提交取消");
  assert(reason && reason.trim(), "取消必须填写原因");
  const before = auditSnapshot(item, ["status", "cancelRequest"]);
  item.cancelRequest = { actor, reason, requestedAt: nowText(), previousStatus: item.status };
  state.exceptions.unshift({ id: `ex_${state.exceptions.length + 1}`, orderId, type: "客户取消", status: "待处理", reason, statusSnapshot: item.status, mastersSnapshot: assignmentNames(state, item), createdAt: nowText() });
  audit(state, "提交取消申请", orderId, reason, before, auditSnapshot(item, ["status", "cancelRequest"]), actor);
  return item.cancelRequest;
}

function confirmCancel(state, exceptionId, adminReason, actor = "system") {
  const exception = findById(state.exceptions, exceptionId);
  const item = orderById(state, exception.orderId);
  assert(canCancel(item), "当前订单不能确认取消");
  assert(adminReason && adminReason.trim(), "确认取消必须填写原因");
  const before = auditSnapshot(item, ["status", "assignments"]);
  exception.status = "已取消";
  exception.adminNote = adminReason;
  exception.handledAt = nowText();
  setOrderStatus(item, STATUS.CANCELED);
  item.assignments.forEach((assign) => { assign.status = "已取消"; });
  touch(item);
  audit(state, "管理员确认取消", item.id, adminReason, before, auditSnapshot(item, ["status", "assignments"]), actor);
  enqueueNotification(state, "管理员确认取消订单", [{ role: "customer", id: item.customerId }, ...item.assignments.map((assign) => ({ role: "master", id: assign.masterId }))], item.id, { exceptionId });
  return item;
}

function keepCancelOrder(state, exceptionId, adminReason, actor = "system") {
  const exception = findById(state.exceptions, exceptionId);
  assert(exception.type === "客户取消", "只有客户取消异常可以保留订单");
  assert(exception.status === "待处理", "只有待处理取消异常可以保留订单");
  assert(adminReason && adminReason.trim(), "保留订单必须填写原因");
  const item = orderById(state, exception.orderId);
  const before = auditSnapshot(item, ["status", "cancelRequest"]);
  if (item.cancelRequest && item.cancelRequest.previousStatus) setOrderStatus(item, item.cancelRequest.previousStatus);
  item.cancelRequest = null;
  exception.status = "已保留订单";
  exception.adminNote = adminReason;
  exception.handledAt = nowText();
  touch(item);
  audit(state, "管理员保留订单", item.id, adminReason, before, auditSnapshot(item, ["status", "cancelRequest"]), actor);
  enqueueNotification(state, "管理员保留订单", [{ role: "customer", id: item.customerId }, ...item.assignments.map((assign) => ({ role: "master", id: assign.masterId }))], item.id, { exceptionId });
  return item;
}

function allocateMasterAmounts(state, orderId, amounts, actor = "system") {
  const item = orderById(state, orderId);
  assert(item.assignments.length > 1, "单师傅订单无需手工分配");
  assert([STATUS.ACCEPTING, STATUS.ACCEPT_REJECTED, STATUS.ACCEPTED].includes(item.status), "多人订单必须完工后才能分配师傅金额");
  const beforeAmounts = Object.fromEntries(item.assignments.map((assign) => [assign.masterId, assign.receivableAmount]));
  const total = item.assignments.reduce((sum, assign) => {
    const amount = Number(amounts[assign.masterId]);
    assert(amount >= 0, "师傅金额不得小于 0");
    return sum + amount;
  }, 0);
  assert(total === masterPoolAmount(item.orderAmount), "师傅金额之和必须等于师傅金额总池");
  item.assignments.forEach((assign) => {
    const nextAmount = Number(amounts[assign.masterId]);
    if (assign.receivableAmount != null && assign.receivableAmount !== nextAmount) {
      state.paymentAdjustments = state.paymentAdjustments || [];
      state.paymentAdjustments.push({
        orderId,
        masterId: assign.masterId,
        beforeAmount: assign.receivableAmount,
        afterAmount: nextAmount,
        adjustedAt: nowText(),
        actor,
        source: "管理员分配师傅金额"
      });
    }
    assign.receivableAmount = nextAmount;
    ensureMasterPaymentRecord(state, item, assign);
  });
  const afterAmounts = Object.fromEntries(item.assignments.map((assign) => [assign.masterId, assign.receivableAmount]));
  audit(state, "管理员分配师傅金额", orderId, "", beforeAmounts, afterAmounts, actor);
  return item;
}

function confirmCustomerPayment(state, orderId, actor = "system", note = "") {
  const item = orderById(state, orderId);
  assert(item.status === STATUS.ACCEPTED, "只有已验收订单可以确认客户收款");
  const record = ensureCustomerPaymentRecord(state, item);
  if (record.paidAmount >= record.dueAmount) return item;
  const beforePaid = record.paidAmount;
  record.paidAmount = record.dueAmount;
  record.paidAmountCents = record.dueAmountCents;
  record.confirmedBy = actor;
  record.confirmedAmount = record.dueAmount;
  record.confirmedAmountCents = record.dueAmountCents;
  record.note = note || "管理员确认客户全额收款";
  record.status = "已完成";
  record.confirmedAt = nowText();
  record.updatedAt = nowText();
  item.payments.customerPaid = item.orderAmount;
  item.payments.customerPaidCents = item.orderAmountCents;
  audit(state, "确认已从客户收款", orderId, "", { paidAmount: beforePaid }, { paidAmount: record.paidAmount }, actor);
  return item;
}

function confirmMasterPayment(state, orderId, masterId, actor = "system", note = "") {
  const item = orderById(state, orderId);
  assert(item.status === STATUS.ACCEPTED, "只有已验收订单可以确认师傅付款");
  const assign = assignmentByMaster(item, masterId);
  assert(assign.receivableAmount != null, "师傅金额未分配完成时不得确认师傅付款");
  const record = ensureMasterPaymentRecord(state, item, assign);
  if (record.paidAmount >= record.dueAmount) return item;
  const beforePaid = record.paidAmount;
  record.paidAmount = record.dueAmount;
  record.paidAmountCents = record.dueAmountCents;
  record.confirmedBy = actor;
  record.confirmedAmount = record.dueAmount;
  record.confirmedAmountCents = record.dueAmountCents;
  record.note = note || "管理员确认师傅全额付款";
  record.status = "已完成";
  record.confirmedAt = nowText();
  record.updatedAt = nowText();
  assign.paidAmount = assign.receivableAmount;
  item.payments.masterPaidCents = item.payments.masterPaidCents || {};
  item.payments.masterPaid[masterId] = assign.receivableAmount;
  item.payments.masterPaidCents[masterId] = toCents(assign.receivableAmount);
  syncMasterPaidAmount(state, masterId);
  audit(state, "确认已支付给师傅", orderId, masterId, { paidAmount: beforePaid }, { paidAmount: record.paidAmount }, actor);
  enqueueNotification(state, "平台已确认师傅付款", [{ role: "master", id: masterId }], orderId, { amount: assign.receivableAmount });
  return item;
}

function listPaymentRecords(state, orderId = "") {
  state.paymentRecords = state.paymentRecords || [];
  return state.paymentRecords.filter((item) => !orderId || item.orderId === orderId).map(clone);
}

function reviewMaster(state, masterId, approved, reason = "", actor = "system") {
  const item = findById(state.masters, masterId);
  assert(item.reviewStatus === "待审核", "只有待审核师傅可以审核");
  if (!approved) assert(reason && String(reason).trim(), "拒绝注册必须填写原因");
  const before = auditSnapshot(item, ["reviewStatus", "workStatus", "reviewReason", "reviewedBy", "reviewedAt", "reviewNote"]);
  item.reviewStatus = approved ? "已通过" : "已拒绝";
  item.workStatus = approved ? "接单中" : "审核未通过";
  item.reviewReason = approved ? "" : reason;
  item.reviewedBy = actor;
  item.reviewedAt = nowText();
  item.reviewNote = approved ? String(reason || "") : reason;
  audit(state, approved ? "管理员通过师傅注册" : "管理员拒绝师傅注册", masterId, reason, before, auditSnapshot(item, ["reviewStatus", "workStatus", "reviewReason", "reviewedBy", "reviewedAt", "reviewNote"]), actor);
  enqueueNotification(state, approved ? "师傅注册已通过" : "师傅注册已拒绝", [{ role: "master", id: masterId }], masterId, { reason });
  return item;
}

function listNotifications(state, status = "全部") {
  state.notificationOutbox = state.notificationOutbox || [];
  return state.notificationOutbox.filter((item) => status === "全部" || item.status === status).map(clone);
}

function markNotificationFailed(state, notificationId, reason) {
  const item = findById(state.notificationOutbox, notificationId);
  item.status = "发送失败";
  item.lastError = reason || "发送失败";
  item.updatedAt = nowText();
  audit(state, "通知发送失败", item.objectId, notificationId);
  return item;
}

function retryNotification(state, notificationId) {
  const item = findById(state.notificationOutbox, notificationId);
  assert(item.status === "发送失败", "只有发送失败的通知可以重试");
  item.status = "待发送";
  item.attempts += 1;
  item.lastError = "";
  item.updatedAt = nowText();
  audit(state, "通知加入重试", item.objectId, notificationId);
  return item;
}

function remindAcceptance(state, orderId, actor = "system") {
  const item = orderById(state, orderId);
  assert(item.status === STATUS.ACCEPTING, "只有待验收订单可以发送验收提醒");
  const notification = enqueueNotification(state, "提醒客户验收", [{ role: "customer", id: item.customerId }], orderId, { cycleNo: latestCycle(item).cycleNo });
  audit(state, "管理员发送验收提醒", orderId, notification.id, null, { notificationId: notification.id }, actor);
  return notification;
}

function updateMasterAdminFields(state, masterId, fields, actor = "system") {
  const item = findById(state.masters, masterId);
  const before = pick(item, ["level", "creditScore", "paidAmount"]);
  if (fields.level) {
    assert(LEVELS.includes(fields.level), "师傅等级无效");
    item.level = fields.level;
  }
  if (fields.creditScore != null) {
    const score = Number(fields.creditScore);
    assert(score >= 0 && score <= 100, "信用分必须为 0-100");
    item.creditScore = score;
  }
  if (fields.paidAmount != null) {
    const paid = Number(fields.paidAmount);
    assert(paid >= 0, "已支付金额不能小于 0");
    applyMasterPaidAmountAggregate(state, masterId, paid, actor);
  }
  const after = pick(item, ["level", "creditScore", "paidAmount"]);
  audit(state, "管理员修改师傅管理字段", masterId, "", before, after, actor);
  return item;
}

function saveAvailability(state, masterId, rows) {
  const allowedDates = new Set(availabilityWindowDates());
  const normalized = rows.map((row) => {
    assert(allowedDates.has(row.date), "只能维护未来 7 天可用时间");
    assert(AVAILABILITY_SLOTS.includes(row.slot), "可用时间时段无效");
    assert(AVAILABILITY_STATUSES.includes(row.status), "可用时间状态无效");
    return { masterId, date: row.date, slot: row.slot, status: row.status };
  });
  state.availability = state.availability.filter((item) => item.masterId !== masterId);
  normalized.forEach((row) => state.availability.push(row));
  return getMasterAvailability(state, masterId);
}

function getMasterAvailability(state, masterId) {
  const saved = state.availability.filter((item) => item.masterId === masterId);
  const rows = [];
  availabilityWindowDates().forEach((date) => {
    AVAILABILITY_SLOTS.forEach((slot) => {
      const existing = saved.find((item) => item.date === date && item.slot === slot);
      rows.push({ key: `${date}-${slot}`, masterId, date, slot, status: existing ? existing.status : "未知" });
    });
  });
  return rows;
}

function clientCategory(item) {
  if (item.status === STATUS.QUOTING) return "待报价";
  if (item.status === STATUS.QUOTE_CONFIRMING) return "待确认报价";
  if (item.status === STATUS.DISPATCHING) return "待派单";
  if ([STATUS.APPOINTING, STATUS.APPOINTED, STATUS.WORKING, STATUS.REWORKING, STATUS.ACCEPT_REJECTED].includes(item.status)) return "施工中";
  if (item.status === STATUS.ACCEPTING) return "待验收";
  return "已完成";
}

function adminCategory(item) {
  if ([STATUS.QUOTING, STATUS.QUOTE_CONFIRMING].includes(item.status)) return "待报价";
  if (item.status === STATUS.DISPATCHING) return "待派单";
  if ([STATUS.APPOINTING, STATUS.APPOINTED].includes(item.status)) return "待施工";
  if ([STATUS.WORKING, STATUS.REWORKING].includes(item.status)) return "施工中";
  if (item.status === STATUS.ACCEPTING) return "待验收";
  if (item.status === STATUS.ACCEPTED) return "已验收";
  return "异常";
}

function masterCategory(item) {
  if (item.status === STATUS.APPOINTING) return "待预约";
  if ([STATUS.APPOINTED, STATUS.WORKING, STATUS.REWORKING].includes(item.status)) return "施工中";
  if ([STATUS.ACCEPTING, STATUS.ACCEPT_REJECTED].includes(item.status)) return "待验收";
  return "已完成";
}

function canCancel(item) {
  return [STATUS.QUOTING, STATUS.QUOTE_CONFIRMING, STATUS.DISPATCHING, STATUS.APPOINTING, STATUS.APPOINTED].includes(item.status);
}

function paymentStatus(item) {
  if (item.status !== STATUS.ACCEPTED) return "未进入收付款";
  const customerDone = item.payments.customerPaid >= item.orderAmount;
  const mastersDone = item.assignments.every((assign) => (assign.paidAmount || 0) >= (assign.receivableAmount || 0));
  return customerDone && mastersDone ? "收付款已全部完成" : "收/付款未完成";
}

function masterPaymentSummary(state, masterId) {
  const rows = masterSettlementRows(state, masterId);
  const dueAmount = rows.reduce((sum, row) => sum + row.dueAmount, 0);
  const paidAmount = rows.reduce((sum, row) => sum + row.paidAmount, 0);
  return { dueAmount, paidAmount, needPay: Math.max(0, dueAmount - paidAmount) };
}

function masterSettlementRows(state, masterId) {
  state.paymentRecords = state.paymentRecords || [];
  return state.orders
    .filter((item) => item.status === STATUS.ACCEPTED)
    .map((item) => {
      const assign = item.assignments.find((current) => current.masterId === masterId);
      if (!assign || assign.receivableAmount == null) return null;
      const record = state.paymentRecords.find((current) => current.orderId === item.id && current.type === "师傅付款" && current.targetId === masterId);
      return {
        order: item,
        assign,
        dueAmount: record ? Number(record.dueAmount || 0) : Number(assign.receivableAmount || 0),
        paidAmount: record ? Number(record.paidAmount || 0) : Number(assign.paidAmount || 0)
      };
    })
    .filter(Boolean)
    .sort((left, right) => (
      String(left.order.createdAt || "").localeCompare(String(right.order.createdAt || ""))
      || left.order.id.localeCompare(right.order.id)
    ));
}

function applyMasterPaidAmountAggregate(state, masterId, paidAmount, actor = "system") {
  const masterItem = findById(state.masters, masterId);
  const rows = masterSettlementRows(state, masterId);
  const totalDue = rows.reduce((sum, row) => sum + row.dueAmount, 0);
  assert(paidAmount <= totalDue, "已支付金额不能超过师傅应付总额");
  let remaining = paidAmount;
  state.paymentAdjustments = state.paymentAdjustments || [];
  rows.forEach((row) => {
    const record = ensureMasterPaymentRecord(state, row.order, row.assign);
    const beforePaid = Number(record.paidAmount || 0);
    const nextPaid = Math.min(row.dueAmount, remaining);
    remaining -= nextPaid;
    row.assign.paidAmount = nextPaid;
    row.order.payments.masterPaid[masterId] = nextPaid;
    record.paidAmount = nextPaid;
    record.paidAmountCents = toCents(nextPaid);
    record.status = nextPaid >= record.dueAmount ? "已完成" : nextPaid > 0 ? "部分完成" : "未完成";
    record.confirmedAt = nextPaid >= record.dueAmount ? nowText() : "";
    record.confirmedBy = nextPaid >= record.dueAmount ? actor : "";
    record.confirmedAmount = nextPaid >= record.dueAmount ? nextPaid : 0;
    record.confirmedAmountCents = nextPaid >= record.dueAmount ? toCents(nextPaid) : 0;
    record.note = nextPaid > 0 ? "管理员编辑累计已支付金额" : "";
    record.updatedAt = nowText();
    if (beforePaid !== nextPaid) {
      state.paymentAdjustments.push({
        orderId: row.order.id,
        masterId,
        beforePaid,
        afterPaid: nextPaid,
        adjustedAt: nowText(),
        source: "管理员编辑累计已支付金额"
      });
    }
  });
  masterItem.paidAmount = paidAmount;
}

function syncMasterPaidAmount(state, masterId) {
  const item = findById(state.masters, masterId);
  item.paidAmount = masterPaymentSummary(state, masterId).paidAmount;
}

function ensureCustomerPaymentRecord(state, item) {
  state.paymentRecords = state.paymentRecords || [];
  let record = state.paymentRecords.find((current) => current.orderId === item.id && current.type === "客户收款" && current.targetId === item.customerId);
  if (!record) {
    record = paymentRecord(item.id, "客户收款", item.customerId, item.orderAmount || 0, item.payments.customerPaid || 0);
    state.paymentRecords.push(record);
  } else {
    record.dueAmount = item.orderAmount || 0;
    record.dueAmountCents = toCents(record.dueAmount);
    record.paidAmountCents = toCents(record.paidAmount);
    if (record.note == null) record.note = "";
    record.status = record.paidAmount >= record.dueAmount ? "已完成" : record.paidAmount > 0 ? "部分完成" : "未完成";
  }
  return record;
}

function ensureMasterPaymentRecord(state, item, assign) {
  state.paymentRecords = state.paymentRecords || [];
  let record = state.paymentRecords.find((current) => current.orderId === item.id && current.type === "师傅付款" && current.targetId === assign.masterId);
  if (!record) {
    record = paymentRecord(item.id, "师傅付款", assign.masterId, assign.receivableAmount || 0, assign.paidAmount || 0);
    state.paymentRecords.push(record);
  } else {
    record.dueAmount = assign.receivableAmount || 0;
    record.paidAmount = assign.paidAmount || record.paidAmount || 0;
    record.dueAmountCents = toCents(record.dueAmount);
    record.paidAmountCents = toCents(record.paidAmount);
    if (record.note == null) record.note = "";
    record.status = record.paidAmount >= record.dueAmount ? "已完成" : record.paidAmount > 0 ? "部分完成" : "未完成";
  }
  return record;
}

function paymentRecord(orderId, type, targetId, dueAmount, paidAmount) {
  const status = paidAmount >= dueAmount && dueAmount > 0 ? "已完成" : paidAmount > 0 ? "部分完成" : "未完成";
  return {
    id: `pay_${orderId}_${type === "客户收款" ? "customer" : "master"}_${targetId}`,
    orderId,
    type,
    targetId,
    dueAmount,
    dueAmountCents: toCents(dueAmount),
    paidAmount,
    paidAmountCents: toCents(paidAmount),
    status,
    confirmedBy: "",
    confirmedAmount: status === "已完成" ? paidAmount : 0,
    confirmedAmountCents: status === "已完成" ? toCents(paidAmount) : 0,
    note: "",
    confirmedAt: status === "已完成" ? nowText() : "",
    createdAt: nowText(),
    updatedAt: nowText()
  };
}

function requestedMastersText(value) {
  return `金 ${value.gold || 0} / 银 ${value.silver || 0} / 铜 ${value.bronze || 0}`;
}

function clientProgress(item) {
  if (item.status === STATUS.APPOINTING) return "待预约";
  if (item.status === STATUS.APPOINTED) return "已预约";
  if (item.status === STATUS.ACCEPT_REJECTED) return "待返修";
  if (item.status === STATUS.CANCELED) return "已取消";
  return item.status;
}

function clientCustomerPaymentStatus(item) {
  if (item.status !== STATUS.ACCEPTED) return "未进入收款";
  return item.payments.customerPaid >= item.orderAmount ? "已付款" : "待付款";
}

function masterPoolAmount(orderAmount) {
  if (orderAmount == null) return null;
  return Math.round(orderAmount * 0.9);
}

function toCents(amount) {
  return Math.round(Number(amount || 0) * 100);
}

function latestCycle(item) {
  return item.cycles[item.cycles.length - 1] || null;
}

function assignmentNames(state, item) {
  if (!item.assignments.length) return "待安排";
  return item.assignments.map((assign) => findById(state.masters, assign.masterId).name).join("、");
}

function orderCustomer(state, item) {
  return item.customerSnapshot || findById(state.customers, item.customerId);
}

function withMaster(state, assign) {
  const masterInfo = findById(state.masters, assign.masterId);
  return Object.assign({}, assign, { name: masterInfo.name, phone: masterInfo.phone, level: masterInfo.level });
}

function matchesAdminKeyword(item, keyword) {
  if (!keyword) return true;
  return [
    item.id,
    item.customerName,
    item.contact,
    item.phone,
    item.wechat,
    item.title,
    item.status
  ].some((value) => String(value || "").toLowerCase().includes(keyword));
}

function matchesMasterFilter(masterItem, filter) {
  if (filter === "全部") return masterItem.reviewStatus === "已通过";
  if (filter === "待审核") return masterItem.reviewStatus === "待审核";
  return masterItem.reviewStatus === "已通过" && masterItem.level === filter;
}

function adminCounts(state) {
  const result = {};
  ["待报价", "待派单", "待施工", "施工中", "待验收", "已验收"].forEach((name) => {
    result[name] = getAdminOrders(state, name).length;
  });
  result["全部"] = getAdminOrders(state, "全部").length;
  return result;
}

function validateInquiry(form) {
  assert(form.media && ((form.media.images || []).length + (form.media.videos || []).length > 0), "图片和视频合计至少一项");
  assert(form.material, "修复材质必填");
  assert(form.material !== "其他" || form.materialOther, "其他材质必填");
  assert(form.types && form.types.length > 0, "修复类型必填");
  assert(!form.types.includes("其他") || form.typeOther, "其他类型必填");
  assert(Number(form.woundCount) >= 1, "伤口总数至少为 1");
  assert(Number(form.woundLength) >= 0, "伤口总长度不能小于 0");
  assert(form.visitTime, "期望上门时间必填");
  assert(Number(form.durationDays) >= 1, "预计工期至少为 1 天");
  assert(form.address, "上门地址必填");
  const totalMasters = form.requestedMasters.gold + form.requestedMasters.silver + form.requestedMasters.bronze;
  assert(totalMasters >= 1, "至少选择 1 位师傅");
  assert(form.customerName, "公司名称/用户名字必填");
  assert(form.wechat, "微信号/微信昵称必填");
  assert(isValidPhone(form.phone), "联系电话格式不正确");
}

function validateCustomerProfile(profile) {
  assert(profile.name && String(profile.name).trim(), "公司名称/用户名字必填");
  assert(profile.wechat && String(profile.wechat).trim(), "微信号/微信昵称必填");
  assert(isValidPhone(profile.phone), "联系电话格式不正确");
  assert(profile.address && String(profile.address).trim(), "常用上门地址必填");
}

function validateMasterProfile(profile) {
  assert(profile.name && String(profile.name).trim(), "姓名必填");
  assert(profile.gender && String(profile.gender).trim(), "性别必填");
  assert(profile.wechat && String(profile.wechat).trim(), "微信号必填");
  assert(isValidPhone(profile.phone), "手机号格式不正确");
  assert(profile.city && String(profile.city).trim(), "城市必填");
  assert(profile.district && String(profile.district).trim(), "区/县必填");
  assert(profile.street && String(profile.street).trim(), "街道必填");
}

function normalizeSelections(selections) {
  return {
    gold: selections.gold || [],
    silver: selections.silver || [],
    bronze: selections.bronze || []
  };
}

function slotOf(visitTime) {
  const hour = Number((visitTime.split(" ")[1] || "09:00").slice(0, 2));
  return hour < 12 ? "上午" : "下午";
}

function isValidPhone(value) {
  return /^1\d{10}$/.test(value) || /^0\d{2,3}-?\d{7,8}$/.test(value);
}

function orderById(state, orderId) {
  return findById(state.orders, orderId);
}

function assignmentByMaster(item, masterId) {
  const assign = item.assignments.find((current) => current.masterId === masterId);
  assert(assign, "该师傅未被分配到此订单");
  return assign;
}

function findById(list, id) {
  const item = list.find((current) => current.id === id);
  assert(item, `未找到记录：${id}`);
  return item;
}

function audit(state, action, objectId, detail = "", before = null, after = null, actor = "system") {
  state.audit.push({ action, objectId, detail, before, after, actor, at: nowText() });
}

function recordAudit(state, action, objectId, detail = "", before = null, after = null, actor = "system") {
  audit(state, action, objectId, detail, before, after, actor);
}

function auditSnapshot(value, keys) {
  return clone(pick(value, keys));
}

function enqueueNotification(state, event, recipients, objectId, payload) {
  state.notificationOutbox = state.notificationOutbox || [];
  const notification = {
    id: `nt_${state.notificationOutbox.length + 1}`,
    event,
    recipients,
    objectId,
    payload: payload || {},
    status: "待发送",
    attempts: 0,
    lastError: "",
    createdAt: nowText(),
    updatedAt: nowText()
  };
  state.notificationOutbox.push(notification);
  return notification;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function pick(value, keys) {
  return keys.reduce((result, key) => {
    result[key] = value[key];
    return result;
  }, {});
}

function touch(item) {
  item.updatedAt = nowText();
}

function setOrderStatus(item, status) {
  item.status = status;
  item.statusTimes = Object.assign({}, item.statusTimes || {});
  item.statusTimes[status] = nowText();
}

function nowText() {
  return "2026-09-21 20:00";
}

function availabilityWindowDates() {
  const dates = [];
  const [year, month, day] = nowText().slice(0, 10).split("-").map(Number);
  for (let offset = 1; offset <= 7; offset += 1) {
    const current = new Date(Date.UTC(year, month - 1, day + offset));
    dates.push(current.toISOString().slice(0, 10));
  }
  return dates;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

module.exports = {
  STATUS,
  createInitialState,
  getClientOrders,
  getAdminOrders,
  getAdminMasters,
  getAdminMaster,
  queryAdminOrders,
  getMasterOrders,
  submitInquiry,
  saveQuoteDraft,
  submitQuote,
  confirmQuote,
  rankCandidates,
  saveDispatchDraft,
  dispatchOrder,
  appointOrder,
  checkInOrder,
  submitCompletion,
  acceptOrder,
  rejectAcceptance,
  arrangeRework,
  forceCompleteException,
  requestCancel,
  confirmCancel,
  keepCancelOrder,
  allocateMasterAmounts,
  confirmCustomerPayment,
  confirmMasterPayment,
  listPaymentRecords,
  reviewMaster,
  updateMasterAdminFields,
  saveAvailability,
  getMasterAvailability,
  listNotifications,
  markNotificationFailed,
  retryNotification,
  remindAcceptance,
  recordAudit,
  clientCategory,
  adminCategory,
  masterCategory,
  masterPoolAmount,
  paymentStatus,
  validateInquiry,
  validateCustomerProfile,
  validateMasterProfile
};
