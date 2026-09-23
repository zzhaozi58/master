const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createJsonStore } = require("../backend/storage");
const { createHttpServer } = require("../backend/http-server");
const { createRemoteClientApi } = require("../miniprograms/client/utils/api");
const { createRemoteAdminApi } = require("../miniprograms/admin/utils/api");
const { createRemoteMasterApi } = require("../miniprograms/master/utils/api");

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test("三端远程 API 可通过 HTTP 后端推进订单主流程", async () => {
  const fixture = await createFixture();
  const client = createRemoteClientApi({ backendBaseUrl: fixture.baseUrl, customerId: "c_001" });
  const admin = createRemoteAdminApi({ backendBaseUrl: fixture.baseUrl, adminId: "admin_root" });
  const master = createRemoteMasterApi({ backendBaseUrl: fixture.baseUrl, masterId: "m_silver_1" });

  try {
    const draft = await admin.saveQuoteDraft("JD20260921001", { repairFee: 300, visitFee: 50, description: "远程 API 草稿" });
    assert.equal(draft.status, "草稿");
    const reminder = await admin.remindAcceptance("JD20260921005");
    assert.equal(reminder.event, "提醒客户验收");
    await admin.submitQuote("JD20260921001", { repairFee: 320, visitFee: 50, description: "远程 API 报价" });
    await client.confirmQuote("JD20260921001");
    const dispatchDraft = await admin.saveDispatchDraft("JD20260921001", { silver: [] });
    assert.equal(dispatchDraft.status, "待派单");
    await admin.dispatch("JD20260921001", { silver: ["m_silver_1"] });
    assert((await admin.listOrders("待施工")).some((order) => order.id === "JD20260921001"));

    await master.appoint("JD20260921001");
    await master.checkIn("JD20260921001", { ok: true, latitude: 30.66, longitude: 104.07, accuracy: 20 });
    await master.submitCompletion("JD20260921001", { images: ["图"], videos: ["视频"], note: "远程 API 完工" });
    assert((await client.listOrders()).find((order) => order.id === "JD20260921001").category === "待验收");

    await client.acceptOrder("JD20260921001");
    assert((await admin.listOrders("已验收")).some((order) => order.id === "JD20260921001"));
    const searched = await admin.queryOrders({ filter: "全部", keyword: "锦禾", page: 1, pageSize: 1 });
    assert.equal(searched.items.length, 1);
    assert.equal(searched.hasMore, true);
    assert((await admin.listPaymentRecords("JD20260921001")).some((item) => item.type === "客户收款"));
  } finally {
    await fixture.close();
  }
});

test("三端远程 API 可维护资料和处理异常", async () => {
  const fixture = await createFixture();
  const client = createRemoteClientApi({ backendBaseUrl: fixture.baseUrl, customerId: "c_001" });
  const admin = createRemoteAdminApi({ backendBaseUrl: fixture.baseUrl, adminId: "admin_root" });

  try {
    await client.updateProfile({ phone: "13800003333", wechat: "remote_client" });
    assert.equal((await client.getProfile()).phone, "13800003333");
    assert.equal((await admin.exportCustomers()).count >= 2, true);

    await client.requestCancel("JD20260921003", "远程 API 客户取消");
    const exception = (await admin.listExceptions()).find((item) => item.orderId === "JD20260921003");
    await admin.confirmCancel(exception.id, "管理员远程确认取消");
    assert.equal((await client.listOrders()).find((order) => order.id === "JD20260921003").category, "已完成");
  } finally {
    await fixture.close();
  }
});

test("三端远程 API 可使用登录 token 而不是前端业务 ID", async () => {
  const fixture = await createFixture();
  const loginClient = createRemoteClientApi({ backendBaseUrl: fixture.baseUrl, customerId: "unused" });
  const loginAdmin = createRemoteAdminApi({ backendBaseUrl: fixture.baseUrl, adminId: "unused" });
  const loginMaster = createRemoteMasterApi({ backendBaseUrl: fixture.baseUrl, masterId: "unused" });

  try {
    const clientSession = await loginClient.login({
      role: "customer",
      appid: "client-demo-app",
      openid: "client-openid-c001",
      unionid: "union-c001"
    });
    const adminSession = await loginAdmin.login({
      role: "admin",
      appid: "admin-demo-app",
      openid: "admin-openid-root",
      unionid: "union-admin-root"
    });
    const masterSession = await loginMaster.login({
      role: "master",
      appid: "master-demo-app",
      openid: "master-openid-silver1",
      unionid: "union-master-silver1"
    });

    const client = createRemoteClientApi({ backendBaseUrl: fixture.baseUrl, authToken: clientSession.token });
    const admin = createRemoteAdminApi({ backendBaseUrl: fixture.baseUrl, authToken: adminSession.token });
    const master = createRemoteMasterApi({ backendBaseUrl: fixture.baseUrl, authToken: masterSession.token });

    await admin.submitQuote("JD20260921001", { repairFee: 330, visitFee: 50, description: "token 报价" });
    await client.confirmQuote("JD20260921001");
    await admin.dispatch("JD20260921001", { silver: ["m_silver_1"] });
    await master.appoint("JD20260921001");
    assert((await master.listOrders()).some((order) => order.id === "JD20260921001"));
  } finally {
    await fixture.close();
  }
});

test("管理端远程 API 可管理通知重试队列", async () => {
  const fixture = await createFixture();
  const admin = createRemoteAdminApi({ backendBaseUrl: fixture.baseUrl, adminId: "admin_root" });

  try {
    await admin.submitQuote("JD20260921001", { repairFee: 300, visitFee: 50, description: "远程通知报价" });
    const notice = (await admin.listNotifications()).find((item) => item.event === "报价待确认");
    assert(notice);
    await admin.markNotificationFailed(notice.id, "远程模拟失败");
    assert.equal((await admin.listNotifications("发送失败")).length, 1);
    const retried = await admin.retryNotification(notice.id);
    assert.equal(retried.status, "待发送");
  } finally {
    await fixture.close();
  }
});

test("远程 API 可用 idempotencyKey 防止重复报价", async () => {
  const fixture = await createFixture();
  const admin = createRemoteAdminApi({ backendBaseUrl: fixture.baseUrl, adminId: "admin_root" });

  try {
    const quote = { repairFee: 300, visitFee: 50, description: "远程幂等报价", idempotencyKey: "remote-quote-once-001" };
    const first = await admin.submitQuote("JD20260921001", quote);
    const second = await admin.submitQuote("JD20260921001", quote);
    assert.equal(first.version, second.version);
    assert.equal(first.submittedBy, "admin_root");
    const order = (await admin.listOrders("全部")).find((item) => item.id === "JD20260921001");
    assert.equal(order.quoteHistoryCount, 1);
  } finally {
    await fixture.close();
  }
});

test("师傅远程 API 可读取未来 7 天可用时间窗口", async () => {
  const fixture = await createFixture();
  const master = createRemoteMasterApi({ backendBaseUrl: fixture.baseUrl, masterId: "m_silver_1" });

  try {
    const rows = await master.getAvailability();
    assert.equal(rows.length, 14);
    assert.equal(rows[0].date, "2026-09-22");
  } finally {
    await fixture.close();
  }
});

run();

async function createFixture() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "jindashi-remote-api-"));
  const store = createJsonStore(path.join(tempDir, "state.json"));
  const server = await listen(createHttpServer({ store }));
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    async close() {
      await close(server);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  };
}

async function run() {
  for (const item of tests) {
    try {
      await item.fn();
      console.log(`ok - ${item.name}`);
    } catch (error) {
      console.error(`not ok - ${item.name}`);
      console.error(error.stack);
      process.exitCode = 1;
    }
  }
  if (process.exitCode) process.exit(process.exitCode);
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve(server);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}
