const domain = require("../shared/domain");
const auth = require("./auth");

function createBackend(seedState) {
  const state = seedState || domain.createInitialState();

  return {
    state,
    login(credentials) {
      return auth.login(state, credentials);
    },
    authenticate(authorizationHeader) {
      return auth.authenticate(state, authorizationHeader);
    },
    asCustomer(customerId) {
      return customerApi(state, customerId);
    },
    asMaster(masterId) {
      return masterApi(state, masterId);
    },
    asAdmin(adminId) {
      assertAdmin(adminId);
      return adminApi(state, adminId);
    }
  };
}

function customerApi(state, customerId) {
  return {
    listOrders() {
      return domain.getClientOrders(state, customerId);
    },
    submitInquiry(form) {
      state.currentCustomerId = customerId;
      return domain.submitInquiry(state, form);
    },
    confirmQuote(orderId) {
      assertOwnCustomerOrder(state, customerId, orderId);
      return domain.confirmQuote(state, orderId, customerId);
    },
    requestCancel(orderId, reason) {
      assertOwnCustomerOrder(state, customerId, orderId);
      return domain.requestCancel(state, orderId, reason, customerId);
    },
    acceptOrder(orderId) {
      assertOwnCustomerOrder(state, customerId, orderId);
      return domain.acceptOrder(state, orderId, customerId);
    },
    rejectAcceptance(orderId, issue) {
      assertOwnCustomerOrder(state, customerId, orderId);
      return domain.rejectAcceptance(state, orderId, issue, customerId);
    },
    profile() {
      return clone(findById(state.customers, customerId));
    },
    updateProfile(profile) {
      domain.validateCustomerProfile(Object.assign({}, findById(state.customers, customerId), profile));
      const customer = findById(state.customers, customerId);
      const before = pick(customer, ["name", "contact", "type", "wechat", "phone", "address", "note"]);
      const allowed = ["name", "contact", "type", "wechat", "phone", "address", "note"];
      for (const key of allowed) {
        if (profile[key] != null) customer[key] = profile[key];
      }
      const after = pick(customer, ["name", "contact", "type", "wechat", "phone", "address", "note"]);
      domain.recordAudit(state, "客户修改资料", customerId, "", before, after, customerId);
      return clone(customer);
    }
  };
}

function masterApi(state, masterId) {
  return {
    profile() {
      return clone(findById(state.masters, masterId));
    },
    listOrders() {
      const master = findById(state.masters, masterId);
      if (master.reviewStatus !== "已通过") return [];
      return domain.getMasterOrders(state, masterId);
    },
    saveAvailability(rows) {
      const before = state.availability.filter((item) => item.masterId === masterId).map(clone);
      const result = domain.saveAvailability(state, masterId, rows);
      domain.recordAudit(state, "师傅修改可用时间", masterId, "", before, result, masterId);
      return result;
    },
    availability() {
      return domain.getMasterAvailability(state, masterId);
    },
    appoint(orderId) {
      assertAssignedMaster(state, masterId, orderId);
      return domain.appointOrder(state, orderId, masterId, masterId);
    },
    checkIn(orderId, locationResult) {
      assertAssignedMaster(state, masterId, orderId);
      return domain.checkInOrder(state, orderId, masterId, locationResult, masterId);
    },
    submitCompletion(orderId, payload) {
      assertAssignedMaster(state, masterId, orderId);
      return domain.submitCompletion(state, orderId, masterId, payload.images || [], payload.videos || [], payload.note || "", masterId);
    },
    updateProfile(form) {
      const master = findById(state.masters, masterId);
      domain.validateMasterProfile(Object.assign({}, master, form));
      const before = pick(master, ["name", "gender", "wechat", "phone", "city", "district", "street", "intro"]);
      const allowed = ["name", "gender", "wechat", "phone", "city", "district", "street", "intro"];
      for (const key of allowed) {
        if (form[key] != null) master[key] = form[key];
      }
      if (!master.level) master.level = "铜牌";
      if (!master.reviewStatus) master.reviewStatus = "待审核";
      if (master.reviewStatus === "已拒绝") {
        master.reviewStatus = "待审核";
        master.workStatus = "待审核";
        master.reviewReason = "";
        master.reviewedBy = "";
        master.reviewedAt = "";
        master.reviewNote = "";
      }
      const after = pick(master, ["name", "gender", "wechat", "phone", "city", "district", "street", "intro"]);
      domain.recordAudit(state, "师傅修改资料", masterId, "", before, after, masterId);
      return clone(master);
    }
  };
}

function adminApi(state, adminId) {
  return {
    listOrders(filter = "全部") {
      return domain.getAdminOrders(state, filter);
    },
    queryOrders(options = {}) {
      return domain.queryAdminOrders(state, options);
    },
    submitQuote(orderId, quote) {
      return domain.submitQuote(state, orderId, quote.repairFee, quote.visitFee, quote.description || "", adminId);
    },
    saveQuoteDraft(orderId, quote) {
      return domain.saveQuoteDraft(state, orderId, quote.repairFee, quote.visitFee, quote.description || "", adminId);
    },
    rankCandidates(orderId, level) {
      return domain.rankCandidates(state, orderId, level);
    },
    dispatch(orderId, selections) {
      return domain.dispatchOrder(state, orderId, selections, adminId);
    },
    saveDispatchDraft(orderId, selections) {
      return domain.saveDispatchDraft(state, orderId, selections, adminId);
    },
    listExceptions() {
      return clone(state.exceptions);
    },
    confirmCancel(exceptionId, reason) {
      return domain.confirmCancel(state, exceptionId, reason, adminId);
    },
    keepCancelOrder(exceptionId, reason) {
      return domain.keepCancelOrder(state, exceptionId, reason, adminId);
    },
    arrangeRework(exceptionId) {
      return domain.arrangeRework(state, exceptionId, adminId);
    },
    forceCompleteException(exceptionId, description) {
      return domain.forceCompleteException(state, exceptionId, description, adminId);
    },
    listMasters(filter = "全部") {
      return domain.getAdminMasters(state, filter);
    },
    reviewMaster(masterId, approved, reason = "") {
      return domain.reviewMaster(state, masterId, approved, reason, adminId);
    },
    updateMasterAdminFields(masterId, fields) {
      return domain.updateMasterAdminFields(state, masterId, fields, adminId);
    },
    listCustomers() {
      return state.customers.map(clone);
    },
    exportCustomers() {
      const rows = state.customers.map(clone);
      domain.recordAudit(state, "管理员导出客户资料", "customers", "", null, { count: rows.length }, adminId);
      return { exportedAt: "2026-09-21 20:00", count: rows.length, rows };
    },
    getCustomer(customerId) {
      return clone(findById(state.customers, customerId));
    },
    updateCustomer(customerId, profile) {
      const customer = findById(state.customers, customerId);
      domain.validateCustomerProfile(Object.assign({}, customer, profile));
      const before = pick(customer, ["name", "contact", "type", "wechat", "phone", "address", "note"]);
      const allowed = ["name", "contact", "type", "wechat", "phone", "address", "note"];
      for (const key of allowed) {
        if (profile[key] != null) customer[key] = profile[key];
      }
      const after = pick(customer, ["name", "contact", "type", "wechat", "phone", "address", "note"]);
      domain.recordAudit(state, "管理员修改客户资料", customerId, "", before, after, adminId);
      return clone(customer);
    },
    confirmCustomerPayment(orderId, note = "") {
      return domain.confirmCustomerPayment(state, orderId, adminId, note);
    },
    confirmMasterPayment(orderId, masterId, note = "") {
      return domain.confirmMasterPayment(state, orderId, masterId, adminId, note);
    },
    allocateMasterAmounts(orderId, amounts) {
      return domain.allocateMasterAmounts(state, orderId, amounts, adminId);
    },
    listPaymentRecords(orderId = "") {
      return domain.listPaymentRecords(state, orderId);
    },
    auditTrail() {
      return state.audit.map(clone);
    },
    listNotifications(status = "全部") {
      return domain.listNotifications(state, status);
    },
    markNotificationFailed(notificationId, reason) {
      return domain.markNotificationFailed(state, notificationId, reason);
    },
    retryNotification(notificationId) {
      return domain.retryNotification(state, notificationId);
    },
    remindAcceptance(orderId) {
      return domain.remindAcceptance(state, orderId, adminId);
    },
    adminId
  };
}

function assertOwnCustomerOrder(state, customerId, orderId) {
  const order = findById(state.orders, orderId);
  if (order.customerId !== customerId) throw new Error("客户无权操作此订单");
}

function assertAssignedMaster(state, masterId, orderId) {
  const order = findById(state.orders, orderId);
  if (!order.assignments.some((assign) => assign.masterId === masterId)) {
    throw new Error("师傅无权操作此订单");
  }
}

function assertAdmin(adminId) {
  if (!adminId || !String(adminId).startsWith("admin_")) {
    throw new Error("管理员未授权");
  }
}

function findById(list, id) {
  const item = list.find((current) => current.id === id);
  if (!item) throw new Error(`未找到记录：${id}`);
  return item;
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

module.exports = { createBackend };
