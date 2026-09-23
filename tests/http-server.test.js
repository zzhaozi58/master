const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createJsonStore } = require("../backend/storage");
const { createHttpServer } = require("../backend/http-server");

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test("HTTP 后端可通过真实请求推进跨端主流程并持久化", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "jindashi-http-"));
  const store = createJsonStore(path.join(tempDir, "state.json"));
  const server = await listen(createHttpServer({ store }));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const health = await request(baseUrl, "GET", "/health");
    assert.equal(health.status, "ok");

    await request(baseUrl, "POST", "/admin/orders/JD20260921001/quote-draft", {
      adminId: "admin_root",
      quote: { repairFee: 280, visitFee: 50, description: "HTTP 草稿" }
    });
    await request(baseUrl, "POST", "/admin/orders/JD20260921001/quote", {
      adminId: "admin_root",
      quote: { repairFee: 300, visitFee: 50, description: "HTTP 报价" }
    });
    await request(baseUrl, "POST", "/customer/orders/JD20260921001/confirm-quote", { customerId: "c_001" });
    await request(baseUrl, "POST", "/admin/orders/JD20260921001/dispatch", {
      adminId: "admin_root",
      selections: { silver: ["m_silver_1"] },
      note: "HTTP 电话确认派单"
    });
    const masterOrdersAfterDispatch = await request(baseUrl, "GET", "/master/orders?masterId=m_silver_1");
    assert.equal(masterOrdersAfterDispatch.find((order) => order.id === "JD20260921001").note, "HTTP 电话确认派单");
    await request(baseUrl, "POST", "/master/orders/JD20260921001/appoint", { masterId: "m_silver_1" });
    await request(baseUrl, "POST", "/master/orders/JD20260921001/check-in", {
      masterId: "m_silver_1",
      location: { ok: true, latitude: 30.67, longitude: 104.06, accuracy: 12 }
    });
    await request(baseUrl, "POST", "/master/orders/JD20260921001/complete", {
      masterId: "m_silver_1",
      images: ["图"],
      videos: ["视频"],
      note: "HTTP 完工"
    });
    await request(baseUrl, "POST", "/customer/orders/JD20260921001/accept", { customerId: "c_001" });

    const accepted = await request(baseUrl, "GET", "/admin/orders?adminId=admin_root&filter=%E5%B7%B2%E9%AA%8C%E6%94%B6");
    assert(accepted.some((order) => order.id === "JD20260921001"));
    const searched = await request(baseUrl, "GET", "/admin/orders?adminId=admin_root&filter=%E5%85%A8%E9%83%A8&keyword=%E9%94%A6%E7%A6%BE&page=1&pageSize=1");
    assert.equal(searched.items.length, 1);
    assert.equal(searched.hasMore, true);
    const payments = await request(baseUrl, "GET", "/admin/payments?adminId=admin_root&orderId=JD20260921001");
    assert(payments.some((item) => item.type === "客户收款"));

    await close(server);
    const restarted = await listen(createHttpServer({ store }));
    const restartedBaseUrl = `http://127.0.0.1:${restarted.address().port}`;
    const persisted = await request(restartedBaseUrl, "GET", "/customer/orders?customerId=c_001");
    assert.equal(persisted.find((order) => order.id === "JD20260921001").category, "已完成");
    await close(restarted);
  } finally {
    if (server.listening) await close(server);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("HTTP 后端可维护客户资料并持久化", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "jindashi-http-"));
  const store = createJsonStore(path.join(tempDir, "state.json"));
  const server = await listen(createHttpServer({ store }));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    await request(baseUrl, "POST", "/customer/profile", { customerId: "c_001", profile: { phone: "13800002222" } });
    await request(baseUrl, "POST", "/admin/customers/c_001", { adminId: "admin_root", profile: { note: "HTTP 客户备注" } });
    const customer = await request(baseUrl, "GET", "/admin/customers/c_001?adminId=admin_root");
    assert.equal(customer.phone, "13800002222");
    assert.equal(customer.note, "HTTP 客户备注");
    const exported = await request(baseUrl, "GET", "/admin/customers-export?adminId=admin_root");
    assert.equal(exported.count >= 2, true);
  } finally {
    await close(server);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("HTTP 后端拒绝越权和错误角色", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "jindashi-http-"));
  const store = createJsonStore(path.join(tempDir, "state.json"));
  const server = await listen(createHttpServer({ store }));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    await assert.rejects(
      () => request(baseUrl, "POST", "/customer/orders/JD20260921002/confirm-quote", { customerId: "c_001" }),
      /403/
    );
    await assert.rejects(
      () => request(baseUrl, "GET", "/admin/orders?adminId=user_normal"),
      /403/
    );
  } finally {
    await close(server);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("HTTP 后端支持微信身份登录 token 并按角色鉴权", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "jindashi-http-"));
  const store = createJsonStore(path.join(tempDir, "state.json"));
  const server = await listen(createHttpServer({ store }));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const login = await request(baseUrl, "POST", "/auth/login", {
      role: "customer",
      appid: "client-demo-app",
      openid: "client-openid-c001",
      unionid: "union-c001"
    });
    const orders = await request(baseUrl, "GET", "/customer/orders", null, login.token);
    assert(orders.every((order) => order.customerName === "成都锦禾石材有限公司"));
    await assert.rejects(
      () => request(baseUrl, "GET", "/admin/orders", null, login.token),
      /403/
    );
  } finally {
    await close(server);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("HTTP 后端支持通知失败记录与重试", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "jindashi-http-"));
  const store = createJsonStore(path.join(tempDir, "state.json"));
  const server = await listen(createHttpServer({ store }));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    await request(baseUrl, "POST", "/admin/orders/JD20260921001/quote", {
      adminId: "admin_root",
      quote: { repairFee: 300, visitFee: 50, description: "HTTP 通知报价" }
    });
    const notices = await request(baseUrl, "GET", "/admin/notifications?adminId=admin_root");
    const notice = notices.find((item) => item.event === "报价待确认");
    assert(notice);
    await request(baseUrl, "POST", `/admin/notifications/${notice.id}/mark-failed`, {
      adminId: "admin_root",
      reason: "模拟发送失败"
    });
    const failed = await request(baseUrl, "GET", "/admin/notifications?adminId=admin_root&status=%E5%8F%91%E9%80%81%E5%A4%B1%E8%B4%A5");
    assert.equal(failed.length, 1);
    const retried = await request(baseUrl, "POST", `/admin/notifications/${notice.id}/retry`, { adminId: "admin_root" });
    assert.equal(retried.status, "待发送");
    assert.equal(retried.attempts, 1);
  } finally {
    await close(server);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("HTTP 后端支持 idempotencyKey 防止重复提交生成重复记录", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "jindashi-http-"));
  const store = createJsonStore(path.join(tempDir, "state.json"));
  const server = await listen(createHttpServer({ store }));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const body = {
      adminId: "admin_root",
      idempotencyKey: "quote-once-001",
      quote: { repairFee: 300, visitFee: 50, description: "幂等报价" }
    };
    const first = await request(baseUrl, "POST", "/admin/orders/JD20260921001/quote", body);
    const second = await request(baseUrl, "POST", "/admin/orders/JD20260921001/quote", body);
    assert.equal(first.version, second.version);
    assert.equal(first.orderId, "JD20260921001");
    const order = (await request(baseUrl, "GET", "/admin/orders?adminId=admin_root&filter=%E5%85%A8%E9%83%A8"))
      .find((item) => item.id === "JD20260921001");
    assert.equal(order.quoteHistoryCount, 1);
  } finally {
    await close(server);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("HTTP 后端支持验收和付款接口幂等", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "jindashi-http-"));
  const store = createJsonStore(path.join(tempDir, "state.json"));
  const server = await listen(createHttpServer({ store }));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    await request(baseUrl, "POST", "/master/orders/JD20260921004/appoint", { masterId: "m_silver_1" });
    await request(baseUrl, "POST", "/master/orders/JD20260921004/check-in", {
      masterId: "m_silver_1",
      location: { ok: false, reason: "幂等测试定位失败" }
    });
    await request(baseUrl, "POST", "/master/orders/JD20260921004/complete", {
      masterId: "m_silver_1",
      images: ["图"],
      videos: ["视频"],
      note: "幂等验收测试完工"
    });
    const acceptBody = { customerId: "c_002", idempotencyKey: "accept-once-001" };
    const firstAccept = await request(baseUrl, "POST", "/customer/orders/JD20260921004/accept", acceptBody);
    const secondAccept = await request(baseUrl, "POST", "/customer/orders/JD20260921004/accept", acceptBody);
    assert.equal(firstAccept.status, secondAccept.status);
    assert.equal(firstAccept.cycles.length, 1);

    const customerPayBody = { adminId: "admin_root", note: "HTTP 客户已转账", idempotencyKey: "customer-pay-once-001" };
    await request(baseUrl, "POST", "/admin/orders/JD20260921004/confirm-customer-payment", customerPayBody);
    await request(baseUrl, "POST", "/admin/orders/JD20260921004/confirm-customer-payment", customerPayBody);
    const masterPayBody = { adminId: "admin_root", masterId: "m_silver_1", note: "HTTP 师傅已结算", idempotencyKey: "master-pay-once-001" };
    await request(baseUrl, "POST", "/admin/orders/JD20260921004/confirm-master-payment", masterPayBody);
    await request(baseUrl, "POST", "/admin/orders/JD20260921004/confirm-master-payment", masterPayBody);
    const payments = await request(baseUrl, "GET", "/admin/payments?adminId=admin_root&orderId=JD20260921004");
    assert.equal(payments.filter((item) => item.type === "客户收款").length, 1);
    assert.equal(payments.filter((item) => item.type === "师傅付款").length, 1);
    assert(payments.every((item) => item.status === "已完成"));
    assert(payments.some((item) => item.type === "客户收款" && item.note === "HTTP 客户已转账"));
    assert(payments.some((item) => item.type === "师傅付款" && item.note === "HTTP 师傅已结算"));
  } finally {
    await close(server);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("HTTP 后端返回师傅未来 7 天可用时间窗口", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "jindashi-http-"));
  const store = createJsonStore(path.join(tempDir, "state.json"));
  const server = await listen(createHttpServer({ store }));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const rows = await request(baseUrl, "GET", "/master/availability?masterId=m_silver_1");
    assert.equal(rows.length, 14);
    assert.equal(rows[0].date, "2026-09-22");
    assert.equal(rows.some((item) => item.status === "未知"), true);
    await assert.rejects(
      () => request(baseUrl, "POST", "/master/availability", {
        masterId: "m_silver_1",
        rows: [{ date: "2026-10-10", slot: "上午", status: "有空" }]
      }),
      /未来 7 天/
    );
  } finally {
    await close(server);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

run();

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

async function request(baseUrl, method, pathName, body, token) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers: headersFor(method, token),
    body: method === "GET" ? undefined : JSON.stringify(body || {})
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(`${response.status}: ${payload.error || "request failed"}`);
  }
  return payload.data;
}

function headersFor(method, token) {
  const headers = method === "GET" ? {} : { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}
