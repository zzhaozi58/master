const domain = require("./utils/domain");
const config = require("./utils/config");
const { createAdminApi, createRemoteAdminApi } = require("./utils/api");

const state = domain.createInitialState();
const api = config.backendBaseUrl ? createRemoteAdminApi(config) : createAdminApi(state, domain);

App({
  globalData: {
    state,
    domain,
    api,
    currentOrderId: "",
    currentMasterId: ""
  }
});
