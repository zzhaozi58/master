const { createRequestClient } = require("./request");

function createMasterApi(state, domain) {
  const masterId = state.currentMasterId;

  return {
    getProfile() {
      return clone(state.masters.find((item) => item.id === masterId));
    },
    listOrders() {
      const master = state.masters.find((item) => item.id === masterId);
      if (master.reviewStatus !== "已通过") return [];
      return domain.getMasterOrders(state, masterId);
    },
    saveAvailability(rows) {
      return domain.saveAvailability(state, masterId, rows);
    },
    getAvailability() {
      return domain.getMasterAvailability(state, masterId);
    },
    appoint(orderId) {
      return domain.appointOrder(state, orderId, masterId);
    },
    checkIn(orderId, locationResult) {
      return domain.checkInOrder(state, orderId, masterId, locationResult);
    },
    submitCompletion(orderId, payload) {
      return domain.submitCompletion(state, orderId, masterId, payload.images || [], payload.videos || [], payload.note || "");
    },
    updateProfile(form) {
      const master = state.masters.find((item) => item.id === masterId);
      domain.validateMasterProfile(Object.assign({}, master, form));
      const allowed = ["name", "gender", "wechat", "phone", "city", "district", "street", "intro"];
      allowed.forEach((key) => {
        if (form[key] != null) master[key] = form[key];
      });
      if (!master.level) master.level = "铜牌";
      if (!master.reviewStatus) master.reviewStatus = "待审核";
      if (master.reviewStatus === "已拒绝") {
        master.reviewStatus = "待审核";
        master.workStatus = "待审核";
        master.reviewReason = "";
      }
      return clone(master);
    },
    uploadMedia(media) {
      return localMedia("master", masterId, media);
    }
  };
}

function createRemoteMasterApi(options) {
  const masterId = options.masterId;
  const authToken = options.authToken || "";
  const request = createRequestClient(options.backendBaseUrl, authToken);
  const identity = authToken ? {} : { masterId };

  return {
    login(credentials) {
      return request.post("/auth/login", credentials);
    },
    getProfile() {
      return request.get("/master/profile", identity);
    },
    listOrders() {
      return request.get("/master/orders", identity);
    },
    saveAvailability(rows) {
      return request.post("/master/availability", Object.assign({}, identity, { rows }));
    },
    getAvailability() {
      return request.get("/master/availability", identity);
    },
    appoint(orderId) {
      return request.post(`/master/orders/${orderId}/appoint`, identity);
    },
    checkIn(orderId, locationResult) {
      return request.post(`/master/orders/${orderId}/check-in`, Object.assign({}, identity, { location: locationResult }));
    },
    submitCompletion(orderId, payload) {
      return request.post(`/master/orders/${orderId}/complete`, Object.assign({}, identity, payload));
    },
    updateProfile(form) {
      return request.post("/master/profile", Object.assign({}, identity, { form }));
    },
    uploadMedia(media) {
      return request.post("/media/upload", Object.assign({}, identity, media, { ownerRole: "master" }));
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

module.exports = { createMasterApi, createRemoteMasterApi };
