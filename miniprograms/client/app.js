const domain = require("./utils/domain");
const config = require("./utils/config");
const { createClientApi, createRemoteClientApi } = require("./utils/api");

const state = domain.createInitialState();
const api = config.backendBaseUrl ? createRemoteClientApi(config) : createClientApi(state, domain);

App({
  globalData: {
    state,
    domain,
    api,
    servicePhone: config.servicePhone
  }
});
