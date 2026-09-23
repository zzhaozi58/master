const { createRequestClient } = require("./request");

function createClientApi(state, domain) {
  const customerId = state.currentCustomerId;

  return {
    listOrders() {
      return domain.getClientOrders(state, customerId);
    },
    submitInquiry(form) {
      state.currentCustomerId = customerId;
      return domain.submitInquiry(state, form);
    },
    confirmQuote(orderId) {
      return domain.confirmQuote(state, orderId);
    },
    requestCancel(orderId, reason) {
      return domain.requestCancel(state, orderId, reason, "客户");
    },
    acceptOrder(orderId) {
      return domain.acceptOrder(state, orderId);
    },
    rejectAcceptance(orderId, issue) {
      return domain.rejectAcceptance(state, orderId, issue, customerId);
    },
    getProfile() {
      return clone(state.customers.find((item) => item.id === customerId));
    },
    updateProfile(profile) {
      const customer = state.customers.find((item) => item.id === customerId);
      domain.validateCustomerProfile(Object.assign({}, customer, profile));
      Object.assign(customer, profile);
      return clone(customer);
    },
    uploadMedia(media) {
      return localMedia("customer", customerId, media);
    }
  };
}

function createRemoteClientApi(options) {
  const customerId = options.customerId;
  const authToken = options.authToken || "";
  const request = createRequestClient(options.backendBaseUrl, authToken);
  const identity = authToken ? {} : { customerId };

  return {
    login(credentials) {
      return request.post("/auth/login", credentials);
    },
    listOrders() {
      return request.get("/customer/orders", identity);
    },
    submitInquiry(form) {
      return request.post("/customer/inquiries", Object.assign({}, identity, { form }));
    },
    confirmQuote(orderId) {
      return request.post(`/customer/orders/${orderId}/confirm-quote`, identity);
    },
    confirmQuoteWithKey(orderId, idempotencyKey) {
      return request.post(`/customer/orders/${orderId}/confirm-quote`, Object.assign({}, identity, { idempotencyKey }));
    },
    requestCancel(orderId, reason) {
      return request.post(`/customer/orders/${orderId}/cancel`, Object.assign({}, identity, { reason }));
    },
    acceptOrder(orderId) {
      return request.post(`/customer/orders/${orderId}/accept`, identity);
    },
    acceptOrderWithKey(orderId, idempotencyKey) {
      return request.post(`/customer/orders/${orderId}/accept`, Object.assign({}, identity, { idempotencyKey }));
    },
    rejectAcceptance(orderId, issue) {
      return request.post(`/customer/orders/${orderId}/reject`, Object.assign({}, identity, { issue }));
    },
    getProfile() {
      return request.get("/customer/profile", identity);
    },
    updateProfile(profile) {
      return request.post("/customer/profile", Object.assign({}, identity, { profile }));
    },
    uploadMedia(media) {
      return request.post("/media/upload", Object.assign({}, identity, media, { ownerRole: "customer" }));
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

module.exports = { createClientApi, createRemoteClientApi };
