const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createJsonStore } = require("../backend/storage");
const { createMediaStore } = require("../backend/media-store");
const { createHttpServer } = require("../backend/http-server");
const { createRemoteClientApi } = require("../miniprograms/client/utils/api");
const { createRemoteAdminApi } = require("../miniprograms/admin/utils/api");
const { createRemoteMasterApi } = require("../miniprograms/master/utils/api");

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test("媒体上传可生成私有媒体记录并用于询价订单", async () => {
  const fixture = await createFixture();
  const client = createRemoteClientApi({ backendBaseUrl: fixture.baseUrl, customerId: "c_001" });
  const admin = createRemoteAdminApi({ backendBaseUrl: fixture.baseUrl, adminId: "admin_root" });

  try {
    const media = await client.uploadMedia({
      mediaType: "image",
      filename: "现场.jpg",
      mimeType: "image/jpeg",
      purpose: "客户询价现场",
      contentBase64: Buffer.from("customer site image").toString("base64")
    });
    assert.equal(media.mediaType, "image");
    assert.equal(media.ownerRole, "customer");
    assert(media.url.startsWith("/media/"));

    await assert.rejects(
      () => fetchMedia(fixture.baseUrl, media.url),
      /403/
    );
    const response = await fetchMedia(fixture.baseUrl, `${media.url}?ownerRole=customer&customerId=c_001`);
    assert.equal(response.headers.get("content-type"), "image/jpeg");
    assert.equal(Buffer.from(await response.arrayBuffer()).toString("utf8"), "customer site image");

    const order = await client.submitInquiry({
      media: { images: [media], videos: [] },
      material: "岩板",
      materialOther: "",
      types: ["缺角"],
      typeOther: "",
      woundCount: 1,
      woundLength: 8,
      visitTime: "2026-09-26 10:00",
      durationDays: 1,
      address: "成都市金牛区金府路 88 号",
      requestedMasters: { gold: 0, silver: 1, bronze: 0 },
      customerName: "成都锦禾石材有限公司",
      wechat: "jinhe_zhou",
      phone: "13800001001"
    });
    assert.equal(order.media.images[0].id, media.id);
    await admin.submitQuote(order.id, { repairFee: 300, visitFee: 50, description: "媒体权限报价" });
    await client.confirmQuote(order.id);
    await admin.dispatch(order.id, { silver: ["m_silver_1"] });
    const masterRead = await fetchMedia(fixture.baseUrl, `${media.url}?ownerRole=master&masterId=m_silver_1`);
    assert.equal(Buffer.from(await masterRead.arrayBuffer()).toString("utf8"), "customer site image");
    await assert.rejects(
      () => fetchMedia(fixture.baseUrl, `${media.url}?ownerRole=customer&customerId=c_002`),
      /403/
    );

    await fixture.close();
    const persisted = JSON.parse(fs.readFileSync(path.join(fixture.tempDir, "state.json"), "utf8"));
    assert(persisted.mediaFiles.some((item) => item.id === media.id));
  } finally {
    await fixture.cleanup();
  }
});

test("师傅完工凭证可使用上传后的图片和视频媒体对象", async () => {
  const fixture = await createFixture();
  const client = createRemoteClientApi({ backendBaseUrl: fixture.baseUrl, customerId: "c_001" });
  const admin = createRemoteAdminApi({ backendBaseUrl: fixture.baseUrl, adminId: "admin_root" });
  const master = createRemoteMasterApi({ backendBaseUrl: fixture.baseUrl, masterId: "m_silver_1" });

  try {
    await admin.submitQuote("JD20260921001", { repairFee: 300, visitFee: 50, description: "媒体测试报价" });
    await client.confirmQuote("JD20260921001");
    await admin.dispatch("JD20260921001", { silver: ["m_silver_1"] });
    await master.appoint("JD20260921001");
    await master.checkIn("JD20260921001", { ok: false, reason: "测试无定位" });

    const image = await master.uploadMedia({
      mediaType: "image",
      filename: "完工.jpg",
      mimeType: "image/jpeg",
      purpose: "师傅完工凭证",
      contentText: "completion image"
    });
    const video = await master.uploadMedia({
      mediaType: "video",
      filename: "完工.mp4",
      mimeType: "video/mp4",
      purpose: "师傅完工凭证",
      contentText: "completion video"
    });
    const cycle = await master.submitCompletion("JD20260921001", {
      images: [image],
      videos: [video],
      note: "媒体对象完工说明"
    });
    assert.equal(cycle.completionMedia.images[0].id, image.id);
    assert.equal(cycle.completionMedia.videos[0].id, video.id);
    assert.equal(cycle.completionNote, "媒体对象完工说明");
  } finally {
    await fixture.cleanup();
  }
});

run();

async function fetchMedia(baseUrl, pathName) {
  const response = await fetch(`${baseUrl}${pathName}`);
  if (!response.ok) {
    let message = `${response.status}`;
    try {
      const payload = await response.json();
      message = `${response.status}: ${payload.error || "request failed"}`;
    } catch (error) {
      message = `${response.status}: request failed`;
    }
    throw new Error(message);
  }
  return response;
}

async function createFixture() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "jindashi-media-"));
  const store = createJsonStore(path.join(tempDir, "state.json"));
  const server = await listen(createHttpServer({ store, mediaStore: createMediaStore(path.join(tempDir, "media")) }));
  return {
    tempDir,
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    async close() {
      if (server.listening) await close(server);
    },
    async cleanup() {
      if (server.listening) await close(server);
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
