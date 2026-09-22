function createRequestClient(baseUrl, authToken) {
  const normalizedBaseUrl = String(baseUrl || "").replace(/\/$/, "");

  return {
    get(path, query) {
      return request("GET", normalizedBaseUrl, path, query || {}, authToken);
    },
    post(path, body) {
      return request("POST", normalizedBaseUrl, path, body || {}, authToken);
    }
  };
}

function request(method, baseUrl, path, payload, authToken) {
  const url = buildUrl(baseUrl, path, method === "GET" ? payload : {});
  if (typeof wx !== "undefined" && wx.request) {
    return requestWithWx(method, url, method === "GET" ? undefined : payload, authToken);
  }
  return requestWithFetch(method, url, method === "GET" ? undefined : payload, authToken);
}

function requestWithWx(method, url, data, authToken) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method,
      data,
      header: headersFor(method, authToken),
      success(response) {
        const body = response.data || {};
        if (response.statusCode < 200 || response.statusCode >= 300 || !body.ok) {
          reject(new Error(body.error || `请求失败 ${response.statusCode}`));
          return;
        }
        resolve(body.data);
      },
      fail(error) {
        reject(new Error(error.errMsg || "网络请求失败"));
      }
    });
  });
}

async function requestWithFetch(method, url, data, authToken) {
  const response = await fetch(url, {
    method,
    headers: headersFor(method, authToken),
    body: method === "GET" ? undefined : JSON.stringify(data || {})
  });
  const body = await response.json();
  if (!response.ok || !body.ok) {
    throw new Error(body.error || `请求失败 ${response.status}`);
  }
  return body.data;
}

function headersFor(method, authToken) {
  const headers = method === "GET" ? {} : { "content-type": "application/json" };
  if (authToken) headers.authorization = `Bearer ${authToken}`;
  return headers;
}

function buildUrl(baseUrl, path, query) {
  const url = `${baseUrl}${path}`;
  const entries = Object.entries(query || {}).filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (!entries.length) return url;
  return `${url}?${entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&")}`;
}

module.exports = { createRequestClient };
