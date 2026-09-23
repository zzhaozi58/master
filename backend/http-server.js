const http = require("http");
const path = require("path");
const { URL } = require("url");
const { createBackend } = require("./service");
const { createMediaStore } = require("./media-store");

function createHttpServer(options = {}) {
  const state = options.state || (options.store ? options.store.load() : undefined);
  const backend = createBackend(state);
  const store = options.store || null;
  const mediaStore = options.mediaStore || createMediaStore(path.join(__dirname, "..", "data", "media"));

  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");
      const body = await readJsonBody(request);
      const authContext = backend.authenticate(request.headers.authorization);
      const idempotencyKey = idempotencyKeyFor(request, body);
      const idempotencyScope = idempotencyScopeFor(request, url, body, authContext);
      const cached = readIdempotentResult(backend.state, idempotencyKey, idempotencyScope);
      if (cached) {
        sendJson(response, 200, { ok: true, data: cached.result });
        return;
      }
      const result = await route(backend, mediaStore, request.method, url, body, authContext);
      if (result && result.binary) {
        sendBinary(response, result.statusCode || 200, result);
        return;
      }
      writeIdempotentResult(backend.state, idempotencyKey, idempotencyScope, result);
      if (request.method !== "GET" && store) store.save(backend.state);
      sendJson(response, 200, { ok: true, data: result });
    } catch (error) {
      sendJson(response, statusFor(error), { ok: false, error: error.message });
    }
  });
}

async function route(backend, mediaStore, method, url, body, authContext) {
  const parts = url.pathname.split("/").filter(Boolean);

  if (method === "GET" && url.pathname === "/health") {
    return { status: "ok" };
  }
  if (method === "POST" && url.pathname === "/auth/login") {
    return backend.login(body);
  }
  if (parts[0] === "media") return routeMedia(backend, mediaStore, method, parts, url, body, authContext);

  if (parts[0] === "customer") return routeCustomer(backend, method, parts, url, body, authContext);
  if (parts[0] === "master") return routeMaster(backend, method, parts, url, body, authContext);
  if (parts[0] === "admin") return routeAdmin(backend, method, parts, url, body, authContext);

  throw notFound("接口不存在");
}

function routeMedia(backend, mediaStore, method, parts, url, body, authContext) {
  if (method === "POST" && parts[1] === "upload") {
    const actor = mediaActor(backend, authContext, body, url);
    const media = mediaStore.saveUpload(body, actor);
    backend.state.mediaFiles = backend.state.mediaFiles || [];
    backend.state.mediaFiles.push(media);
    return media;
  }
  if (method === "GET" && parts[1]) {
    const media = (backend.state.mediaFiles || []).find((item) => item.id === parts[1]);
    if (!media) throw notFound("媒体文件不存在");
    const actor = mediaActor(backend, authContext, body, url);
    assertMediaAccess(backend.state, media, actor);
    if (url.searchParams.get("meta") === "1") return media;
    return {
      binary: mediaStore.read(media),
      contentType: media.mimeType,
      filename: media.filename
    };
  }
  throw notFound("媒体接口不存在");
}

function mediaActor(backend, authContext, body, url) {
  if (authContext) return { role: authContext.role, subjectId: authContext.subjectId };
  const role = body.ownerRole || url.searchParams.get("ownerRole") || "";
  const subjectId = body.customerId || body.masterId || body.adminId || body.ownerId || url.searchParams.get("customerId") || url.searchParams.get("masterId") || url.searchParams.get("adminId") || url.searchParams.get("ownerId") || "";
  if (role === "admin") {
    backend.asAdmin(required(subjectId, "缺少 adminId"));
    return { role, subjectId };
  }
  if (role === "customer") {
    backend.asCustomer(required(subjectId, "缺少 customerId"));
    return { role, subjectId };
  }
  if (role === "master") {
    backend.asMaster(required(subjectId, "缺少 masterId"));
    return { role, subjectId };
  }
  throw Object.assign(new Error("媒体访问缺少登录身份"), { statusCode: 403 });
}

function assertMediaAccess(state, media, actor) {
  if (actor.role === "admin") return;
  if (media.ownerRole === actor.role && media.ownerId === actor.subjectId) return;
  if (actor.role === "customer" && state.orders.some((order) => order.customerId === actor.subjectId && orderReferencesMedia(order, media.id))) return;
  if (actor.role === "master" && state.orders.some((order) => order.assignments.some((assign) => assign.masterId === actor.subjectId) && orderReferencesMedia(order, media.id))) return;
  throw Object.assign(new Error("无权访问该媒体文件"), { statusCode: 403 });
}

function orderReferencesMedia(order, mediaId) {
  return mediaListHas(order.media && order.media.images, mediaId)
    || mediaListHas(order.media && order.media.videos, mediaId)
    || (order.cycles || []).some((cycle) => (
      mediaListHas(cycle.completionMedia && cycle.completionMedia.images, mediaId)
      || mediaListHas(cycle.completionMedia && cycle.completionMedia.videos, mediaId)
      || mediaListHas(cycle.customerIssue && cycle.customerIssue.images, mediaId)
      || mediaListHas(cycle.customerIssue && cycle.customerIssue.videos, mediaId)
    ));
}

function mediaListHas(list, mediaId) {
  return (list || []).some((item) => (typeof item === "string" ? item === mediaId : item && item.id === mediaId));
}

function routeCustomer(backend, method, parts, url, body, authContext) {
  const customerId = subjectFromAuth(authContext, "customer") || body.customerId || url.searchParams.get("customerId");
  const api = backend.asCustomer(required(customerId, "缺少 customerId"));

  if (method === "GET" && parts[1] === "orders") return api.listOrders();
  if (method === "GET" && parts[1] === "profile") return api.profile();
  if (method === "POST" && parts[1] === "profile") return api.updateProfile(body.profile || body);
  if (method === "POST" && parts[1] === "inquiries") return api.submitInquiry(body.form || body);
  if (method === "POST" && parts[1] === "orders" && parts[3] === "confirm-quote") return api.confirmQuote(parts[2]);
  if (method === "POST" && parts[1] === "orders" && parts[3] === "cancel") return api.requestCancel(parts[2], body.reason);
  if (method === "POST" && parts[1] === "orders" && parts[3] === "accept") return api.acceptOrder(parts[2]);
  if (method === "POST" && parts[1] === "orders" && parts[3] === "reject") return api.rejectAcceptance(parts[2], body.issue || body);

  throw notFound("客户接口不存在");
}

function routeMaster(backend, method, parts, url, body, authContext) {
  const masterId = subjectFromAuth(authContext, "master") || body.masterId || url.searchParams.get("masterId");
  const api = backend.asMaster(required(masterId, "缺少 masterId"));

  if (method === "GET" && parts[1] === "orders") return api.listOrders();
  if (method === "GET" && parts[1] === "profile") return api.profile();
  if (method === "GET" && parts[1] === "availability") return api.availability();
  if (method === "POST" && parts[1] === "profile") return api.updateProfile(body.form || body);
  if (method === "POST" && parts[1] === "availability") return api.saveAvailability(body.rows || []);
  if (method === "POST" && parts[1] === "orders" && parts[3] === "appoint") return api.appoint(parts[2]);
  if (method === "POST" && parts[1] === "orders" && parts[3] === "check-in") return api.checkIn(parts[2], body.location || body.locationResult || {});
  if (method === "POST" && parts[1] === "orders" && parts[3] === "complete") return api.submitCompletion(parts[2], body);

  throw notFound("师傅接口不存在");
}

function routeAdmin(backend, method, parts, url, body, authContext) {
  const adminId = subjectFromAuth(authContext, "admin") || body.adminId || url.searchParams.get("adminId") || "admin_root";
  const api = backend.asAdmin(adminId);

  if (method === "GET" && parts[1] === "orders" && hasPagedQuery(url)) {
    return api.queryOrders({
      filter: url.searchParams.get("filter") || "全部",
      keyword: url.searchParams.get("keyword") || "",
      page: url.searchParams.get("page") || 1,
      pageSize: url.searchParams.get("pageSize") || 20
    });
  }
  if (method === "GET" && parts[1] === "orders") return api.listOrders(url.searchParams.get("filter") || "全部");
  if (method === "POST" && parts[1] === "orders" && parts[3] === "quote-draft") return api.saveQuoteDraft(parts[2], body.quote || body);
  if (method === "POST" && parts[1] === "orders" && parts[3] === "quote") return api.submitQuote(parts[2], body.quote || body);
  if (method === "GET" && parts[1] === "orders" && parts[3] === "candidates") return api.rankCandidates(parts[2], required(url.searchParams.get("level"), "缺少 level"));
  if (method === "POST" && parts[1] === "orders" && parts[3] === "dispatch-draft") return api.saveDispatchDraft(parts[2], body.selections || body);
  if (method === "POST" && parts[1] === "orders" && parts[3] === "dispatch") return api.dispatch(parts[2], body.selections || body);
  if (method === "POST" && parts[1] === "orders" && parts[3] === "acceptance-reminder") return api.remindAcceptance(parts[2]);
  if (method === "POST" && parts[1] === "orders" && parts[3] === "confirm-customer-payment") return api.confirmCustomerPayment(parts[2], body.note || "");
  if (method === "POST" && parts[1] === "orders" && parts[3] === "confirm-master-payment") return api.confirmMasterPayment(parts[2], required(body.masterId, "缺少 masterId"), body.note || "");
  if (method === "POST" && parts[1] === "orders" && parts[3] === "allocate-master-amounts") return api.allocateMasterAmounts(parts[2], body.amounts || {});
  if (method === "GET" && parts[1] === "payments") return api.listPaymentRecords(url.searchParams.get("orderId") || "");

  if (method === "GET" && parts[1] === "exceptions") return api.listExceptions();
  if (method === "POST" && parts[1] === "exceptions" && parts[3] === "confirm-cancel") return api.confirmCancel(parts[2], body.reason);
  if (method === "POST" && parts[1] === "exceptions" && parts[3] === "keep-order") return api.keepCancelOrder(parts[2], body.reason);
  if (method === "POST" && parts[1] === "exceptions" && parts[3] === "arrange-rework") return api.arrangeRework(parts[2]);
  if (method === "POST" && parts[1] === "exceptions" && parts[3] === "force-complete") return api.forceCompleteException(parts[2], body.description);

  if (method === "GET" && parts[1] === "masters") return api.listMasters(url.searchParams.get("filter") || "全部");
  if (method === "POST" && parts[1] === "masters" && parts[3] === "review") return api.reviewMaster(parts[2], !!body.approved, body.reason || "");
  if (method === "POST" && parts[1] === "masters" && parts[3] === "update") return api.updateMasterAdminFields(parts[2], body.fields || body);
  if (method === "GET" && parts[1] === "customers" && parts[2]) return api.getCustomer(parts[2]);
  if (method === "POST" && parts[1] === "customers" && parts[2]) return api.updateCustomer(parts[2], body.profile || body);
  if (method === "GET" && parts[1] === "customers-export") return api.exportCustomers();
  if (method === "GET" && parts[1] === "customers") return api.listCustomers();
  if (method === "GET" && parts[1] === "audit") return api.auditTrail();
  if (method === "GET" && parts[1] === "notifications") return api.listNotifications(url.searchParams.get("status") || "全部");
  if (method === "POST" && parts[1] === "notifications" && parts[3] === "mark-failed") return api.markNotificationFailed(parts[2], body.reason || "");
  if (method === "POST" && parts[1] === "notifications" && parts[3] === "retry") return api.retryNotification(parts[2]);

  throw notFound("管理接口不存在");
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    if (request.method === "GET") {
      resolve({});
      return;
    }
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2_000_000) {
        reject(Object.assign(new Error("请求体过大"), { statusCode: 413 }));
        request.destroy();
      }
    });
    request.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(Object.assign(new Error("JSON 格式错误"), { statusCode: 400 }));
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function sendBinary(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": payload.contentType || "application/octet-stream",
    "cache-control": "private, max-age=300",
    "content-disposition": `inline; filename="${encodeURIComponent(payload.filename || "media")}"`
  });
  response.end(payload.binary);
}

function statusFor(error) {
  return error.statusCode || (/无权|未授权/.test(error.message) ? 403 : /不存在|未找到/.test(error.message) ? 404 : 400);
}

function subjectFromAuth(authContext, role) {
  if (!authContext) return "";
  if (authContext.role !== role) {
    throw Object.assign(new Error("登录角色无权访问该接口"), { statusCode: 403 });
  }
  return authContext.subjectId;
}

function required(value, message) {
  if (!value) throw Object.assign(new Error(message), { statusCode: 400 });
  return value;
}

function hasPagedQuery(url) {
  return url.searchParams.has("keyword") || url.searchParams.has("page") || url.searchParams.has("pageSize");
}

function notFound(message) {
  return Object.assign(new Error(message), { statusCode: 404 });
}

function idempotencyKeyFor(request, body) {
  if (request.method !== "POST") return "";
  return request.headers["idempotency-key"] || body.idempotencyKey || "";
}

function idempotencyScopeFor(request, url, body, authContext) {
  const subject = authContext
    ? `${authContext.role}:${authContext.subjectId}`
    : body.adminId
      ? `admin:${body.adminId}`
      : body.customerId
        ? `customer:${body.customerId}`
        : body.masterId
          ? `master:${body.masterId}`
          : "anonymous";
  return `${subject}:${request.method}:${url.pathname}`;
}

function readIdempotentResult(state, key, scope) {
  if (!key) return null;
  state.idempotencyRecords = state.idempotencyRecords || [];
  return state.idempotencyRecords.find((item) => item.key === key && item.scope === scope) || null;
}

function writeIdempotentResult(state, key, scope, result) {
  if (!key) return;
  state.idempotencyRecords = state.idempotencyRecords || [];
  if (state.idempotencyRecords.some((item) => item.key === key && item.scope === scope)) return;
  state.idempotencyRecords.push({ key, scope, result: clone(result), createdAt: "2026-09-21 20:00" });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = { createHttpServer };
