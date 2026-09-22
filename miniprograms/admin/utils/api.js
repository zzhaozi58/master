const { createRequestClient } = require("./request");

function createAdminApi(state, domain) {
  return {
    listOrders(filter = "全部") {
      return domain.getAdminOrders(state, filter);
    },
    queryOrders(options = {}) {
      return domain.queryAdminOrders(state, options);
    },
    getOrder(orderId) {
      return domain.getAdminOrders(state).find((item) => item.id === orderId);
    },
    submitQuote(orderId, quote) {
      return domain.submitQuote(state, orderId, quote.repairFee, quote.visitFee, quote.description || "");
    },
    saveQuoteDraft(orderId, quote) {
      return domain.saveQuoteDraft(state, orderId, quote.repairFee, quote.visitFee, quote.description || "");
    },
    rankCandidates(orderId, level) {
      return domain.rankCandidates(state, orderId, level);
    },
    dispatch(orderId, selections) {
      return domain.dispatchOrder(state, orderId, selections);
    },
    saveDispatchDraft(orderId, selections) {
      return domain.saveDispatchDraft(state, orderId, selections);
    },
    allocateMasterAmounts(orderId, amounts) {
      return domain.allocateMasterAmounts(state, orderId, amounts);
    },
    listExceptions() {
      return state.exceptions.map(clone);
    },
    confirmCancel(exceptionId, reason) {
      return domain.confirmCancel(state, exceptionId, reason);
    },
    keepCancelOrder(exceptionId, reason) {
      return domain.keepCancelOrder(state, exceptionId, reason);
    },
    arrangeRework(exceptionId) {
      return domain.arrangeRework(state, exceptionId);
    },
    forceCompleteException(exceptionId, description) {
      return domain.forceCompleteException(state, exceptionId, description);
    },
    listMasters(filter = "全部") {
      return domain.getAdminMasters(state, filter);
    },
    getMaster(masterId) {
      return domain.getAdminMaster(state, masterId);
    },
    getMasterOrders(masterId) {
      return domain.getMasterOrders(state, masterId);
    },
    reviewMaster(masterId, approved, reason = "") {
      return domain.reviewMaster(state, masterId, approved, reason, "admin_root");
    },
    updateMasterAdminFields(masterId, fields) {
      return domain.updateMasterAdminFields(state, masterId, fields);
    },
    listCustomers() {
      return state.customers.map((customer) => Object.assign(clone(customer), {
        orderCount: state.orders.filter((order) => order.customerId === customer.id).length
      }));
    },
    exportCustomers() {
      const rows = state.customers.map(clone);
      domain.recordAudit(state, "管理员导出客户资料", "customers", "", null, { count: rows.length }, "admin_root");
      return { exportedAt: "2026-09-21 20:00", count: rows.length, rows };
    },
    getCustomer(customerId) {
      return clone(state.customers.find((item) => item.id === customerId));
    },
    updateCustomer(profile) {
      const customer = state.customers.find((item) => item.id === profile.id);
      domain.validateCustomerProfile(Object.assign({}, customer, profile));
      Object.assign(customer, profile);
      return clone(customer);
    },
    confirmCustomerPayment(orderId) {
      return domain.confirmCustomerPayment(state, orderId);
    },
    confirmMasterPayment(orderId, masterId) {
      return domain.confirmMasterPayment(state, orderId, masterId);
    },
    listPaymentRecords(orderId = "") {
      return domain.listPaymentRecords(state, orderId);
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
      return domain.remindAcceptance(state, orderId);
    },
    uploadMedia(media) {
      return localMedia("admin", "admin_root", media);
    }
  };
}

function createRemoteAdminApi(options) {
  const adminId = options.adminId;
  const authToken = options.authToken || "";
  const request = createRequestClient(options.backendBaseUrl, authToken);
  const identity = authToken ? {} : { adminId };

  return {
    login(credentials) {
      return request.post("/auth/login", credentials);
    },
    listOrders(filter = "全部") {
      return request.get("/admin/orders", Object.assign({}, identity, { filter }));
    },
    queryOrders(options = {}) {
      return request.get("/admin/orders", Object.assign({}, identity, {
        filter: options.filter || "全部",
        keyword: options.keyword || "",
        page: options.page || 1,
        pageSize: options.pageSize || 20
      }));
    },
    async getOrder(orderId) {
      const orders = await request.get("/admin/orders", Object.assign({}, identity, { filter: "全部" }));
      return orders.find((item) => item.id === orderId);
    },
    submitQuote(orderId, quote) {
      return request.post(`/admin/orders/${orderId}/quote`, Object.assign({}, identity, { quote, idempotencyKey: quote.idempotencyKey }));
    },
    saveQuoteDraft(orderId, quote) {
      return request.post(`/admin/orders/${orderId}/quote-draft`, Object.assign({}, identity, { quote, idempotencyKey: quote.idempotencyKey }));
    },
    rankCandidates(orderId, level) {
      return request.get(`/admin/orders/${orderId}/candidates`, Object.assign({}, identity, { level }));
    },
    dispatch(orderId, selections) {
      return request.post(`/admin/orders/${orderId}/dispatch`, Object.assign({}, identity, { selections, idempotencyKey: selections.idempotencyKey }));
    },
    saveDispatchDraft(orderId, selections) {
      return request.post(`/admin/orders/${orderId}/dispatch-draft`, Object.assign({}, identity, { selections }));
    },
    allocateMasterAmounts(orderId, amounts) {
      return request.post(`/admin/orders/${orderId}/allocate-master-amounts`, Object.assign({}, identity, { amounts }));
    },
    listExceptions() {
      return request.get("/admin/exceptions", identity);
    },
    confirmCancel(exceptionId, reason) {
      return request.post(`/admin/exceptions/${exceptionId}/confirm-cancel`, Object.assign({}, identity, { reason }));
    },
    keepCancelOrder(exceptionId, reason) {
      return request.post(`/admin/exceptions/${exceptionId}/keep-order`, Object.assign({}, identity, { reason }));
    },
    arrangeRework(exceptionId) {
      return request.post(`/admin/exceptions/${exceptionId}/arrange-rework`, identity);
    },
    forceCompleteException(exceptionId, description) {
      return request.post(`/admin/exceptions/${exceptionId}/force-complete`, Object.assign({}, identity, { description }));
    },
    listMasters(filter = "全部") {
      return request.get("/admin/masters", Object.assign({}, identity, { filter }));
    },
    async getMaster(masterId) {
      const masters = await request.get("/admin/masters", Object.assign({}, identity, { filter: "全部" }));
      const pending = await request.get("/admin/masters", Object.assign({}, identity, { filter: "待审核" }));
      return masters.concat(pending).find((item) => item.id === masterId);
    },
    async getMasterOrders(masterId) {
      const orders = await request.get("/master/orders", { masterId });
      return orders;
    },
    reviewMaster(masterId, approved, reason = "") {
      return request.post(`/admin/masters/${masterId}/review`, Object.assign({}, identity, { approved, reason }));
    },
    updateMasterAdminFields(masterId, fields) {
      return request.post(`/admin/masters/${masterId}/update`, Object.assign({}, identity, { fields }));
    },
    listCustomers() {
      return request.get("/admin/customers", identity);
    },
    exportCustomers() {
      return request.get("/admin/customers-export", identity);
    },
    getCustomer(customerId) {
      return request.get(`/admin/customers/${customerId}`, identity);
    },
    updateCustomer(profile) {
      return request.post(`/admin/customers/${profile.id}`, Object.assign({}, identity, { profile }));
    },
    confirmCustomerPayment(orderId) {
      return request.post(`/admin/orders/${orderId}/confirm-customer-payment`, identity);
    },
    confirmMasterPayment(orderId, masterId) {
      return request.post(`/admin/orders/${orderId}/confirm-master-payment`, Object.assign({}, identity, { masterId }));
    },
    listPaymentRecords(orderId = "") {
      return request.get("/admin/payments", Object.assign({}, identity, { orderId }));
    },
    listNotifications(status = "全部") {
      return request.get("/admin/notifications", Object.assign({}, identity, { status }));
    },
    markNotificationFailed(notificationId, reason) {
      return request.post(`/admin/notifications/${notificationId}/mark-failed`, Object.assign({}, identity, { reason }));
    },
    retryNotification(notificationId) {
      return request.post(`/admin/notifications/${notificationId}/retry`, identity);
    },
    remindAcceptance(orderId) {
      return request.post(`/admin/orders/${orderId}/acceptance-reminder`, identity);
    },
    uploadMedia(media) {
      return request.post("/media/upload", Object.assign({}, identity, media, { ownerRole: "admin" }));
    }
  };
}

function localMedia(ownerRole, ownerId, media) {
  const id = `local_${ownerRole}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    mediaType: media.mediaType || "image",
    filename: media.filename || "本地演示文件",
    mimeType: media.mimeType || "application/octet-stream",
    size: media.size || 0,
    purpose: media.purpose || "订单凭证",
    ownerRole,
    ownerId,
    url: "",
    createdAt: "2026-09-21 20:00"
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = { createAdminApi, createRemoteAdminApi };
