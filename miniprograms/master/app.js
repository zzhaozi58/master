const domain = require("./utils/domain");
const config = require("./utils/config");
const { createMasterApi, createRemoteMasterApi } = require("./utils/api");

const state = domain.createInitialState();
const api = config.backendBaseUrl ? createRemoteMasterApi(config) : createMasterApi(state, domain);

App({
  globalData: {
    state,
    domain,
    api
  }
});
