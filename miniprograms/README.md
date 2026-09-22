# 金大师三端小程序工程

本目录包含三个独立微信小程序端：

- `client/`：客户端，面向报修客户。
- `admin/`：管理端，面向平台管理员。
- `master/`：师傅端，面向施工师傅。

每个目录都可以作为独立小程序项目根目录打开。当前 `project.config.json`
使用 `touristappid`，正式开发时需要替换为对应的小程序 AppID。

## 当前实现边界

- 三端页面已按 `../PRD.md` 的 MVP 结构创建。
- 业务状态机源文件为 `../shared/domain.js`。
- 三端运行时各自使用端内 `utils/domain.js` 副本，方便微信开发者工具直接打开单端目录。
- 三端页面只调用端内 `utils/api.js`，不直接调用 `domain/state`。
- `utils/api.js` 支持本地内存模式和远程 HTTP 模式；配置 `utils/config.js` 的 `backendBaseUrl` 后，会通过 `wx.request` 访问后端。
- `npm run verify` 会检查业务状态机测试和三端 `utils/domain.js` 是否与源文件一致。
- `backend/service.js` 提供本地内存后端服务边界，用于验证三端角色权限、共享状态机和审计要求。
- 当前已有本地 HTTP 后端和 JSON 文件持久化，详见 `../backend/README.md`。
- 当前已有本地 JSON/base64 媒体上传模拟；仍不包含生产数据库、生产对象存储、正式微信登录、订阅消息、真实拨号权限处理或支付。

## 切换到本地 HTTP 后端

先启动后端：

```sh
npm run start:backend
```

再分别修改三个端的配置文件：

- `client/utils/config.js`
- `admin/utils/config.js`
- `master/utils/config.js`

将 `backendBaseUrl` 改为：

```js
backendBaseUrl: "http://localhost:8787"
```

微信开发者工具真机预览时，`localhost` 需要替换成开发机在局域网中的地址，并在小程序后台配置合法请求域名；开发者工具里仅用于本地调试时可临时关闭域名校验。

## 登录模式

远程 API 支持两种模式：

- 开发兼容：继续在 `utils/config.js` 中使用 `customerId`、`masterId`、`adminId`。
- 登录态：先调用远程 API 的 `login()` 获取 token，再用 `authToken` 创建 API；此时请求通过 `Authorization` 头鉴权，不需要前端继续传业务 ID。

本地 Demo 登录身份见 `../backend/README.md`。正式上线时，不能让前端传 `openid`；应由前端提交 `wx.login` 的 `code`，服务端换取微信身份后签发 token。

## 媒体上传

三端远程 API 均提供 `uploadMedia()`。客户端询价、客户验收问题、师傅完工凭证页面会优先调用 `wx.chooseMedia` 和 `wx.getFileSystemManager().readFile({ encoding: "base64" })`，再提交到后端 `/media/upload`。

在本地内存模式或测试环境没有 `wx.chooseMedia` 时，页面会使用同形状的演示媒体对象，保证业务表单和状态流转仍可验证。生产开发时应将本地媒体接口替换为私有对象存储或云开发文件能力，并用服务端登录态控制访问权限。

## 验证

在项目根目录执行：

```sh
npm run verify
```

当前验证包含：

- 共享订单状态机测试。
- 本地后端服务角色权限和跨端流程测试。
- 三端端内 API 包装测试。
- 三端远程 API 通过真实 HTTP 后端的集成测试。
- 模拟微信身份登录 token 与角色鉴权测试。
- 本地媒体上传、读取和媒体对象进入订单流程测试。
- 师傅到场打卡定位成功详情与定位失败原因保存测试。
- 关键状态变更通知队列、发送失败记录和重试入口测试。
- 款项明细记录、人工收付款确认和重复确认幂等测试。
- 管理端订单搜索、状态筛选和分页加载测试。
- HTTP / 远程 API 幂等键测试，覆盖重复提交报价不生成重复版本。
- 师傅未来 7 天可用时间窗口、默认未知和非法日期校验测试。
- 三端 `utils/domain.js` 与 `shared/domain.js` 同步检查。
- WXML 静态兼容检查，以及页面层不得直接调用 `globalData.domain/state`、不得漏写 `await` 调用 `app.globalData.api` 的边界检查。

如修改 `shared/domain.js`，需要同步到三个端的 `utils/domain.js` 后再验证。
