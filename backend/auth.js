function login(state, credentials) {
  const role = required(credentials.role, "缺少 role");
  const appid = required(credentials.appid, "缺少 appid");
  const openid = required(credentials.openid, "缺少 openid");
  const unionid = credentials.unionid || "";

  const identity = (state.wechatIdentities || []).find((item) => (
    item.role === role
    && (unionid && item.unionid === unionid || item.appid === appid && item.openid === openid)
  ));

  if (!identity) {
    throw Object.assign(new Error("微信身份未授权或未注册"), { statusCode: 403 });
  }

  const token = `sess_${role}_${identity.subjectId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const session = {
    token,
    role,
    subjectId: identity.subjectId,
    appid,
    openid,
    unionid,
    createdAt: nowText()
  };
  state.sessions = state.sessions || [];
  state.sessions.push(session);
  return {
    token,
    role,
    subjectId: identity.subjectId
  };
}

function authenticate(state, authorizationHeader) {
  const token = parseToken(authorizationHeader);
  if (!token) return null;
  const session = (state.sessions || []).find((item) => item.token === token);
  if (!session) {
    throw Object.assign(new Error("登录已失效"), { statusCode: 401 });
  }
  return session;
}

function parseToken(value) {
  if (!value) return "";
  const text = String(value);
  if (text.startsWith("Bearer ")) return text.slice("Bearer ".length);
  return text;
}

function required(value, message) {
  if (!value) throw Object.assign(new Error(message), { statusCode: 400 });
  return value;
}

function nowText() {
  return "2026-09-21 20:00";
}

module.exports = { login, authenticate };
