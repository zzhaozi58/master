# 金大师本地后端

本目录提供 MVP 当前阶段的本地 Node.js 后端，用于承接三端小程序后续 `wx.request`
接入。当前实现只使用 Node.js 内置模块，不依赖外部框架。

## 启动

在项目根目录执行：

```sh
npm run start:backend
```

默认监听：

```text
http://localhost:8787
```

默认数据文件：

```text
data/jindashi-state.json
```

默认媒体目录：

```text
data/media
```

可通过环境变量覆盖：

```sh
PORT=8790 JINDASHI_DATA_FILE=/tmp/jindashi-state.json JINDASHI_MEDIA_DIR=/tmp/jindashi-media npm run start:backend
```

## 角色参数

- 客户接口需要 `customerId`
- 师傅接口需要 `masterId`
- 管理接口需要 `adminId`，当前本地校验要求以 `admin_` 开头

正式开发时，以上 ID 应由微信登录态和服务端鉴权解析，不能由前端任意传入。

## 本地登录鉴权

本地后端提供模拟微信登录接口：

```text
POST /auth/login
```

示例：

```json
{
  "role": "customer",
  "appid": "client-demo-app",
  "openid": "client-openid-c001",
  "unionid": "union-c001"
}
```

返回：

```json
{
  "token": "sess_customer_c_001_...",
  "role": "customer",
  "subjectId": "c_001"
}
```

后续请求可使用：

```text
Authorization: Bearer <token>
```

本地 Demo 身份：

- 客户端：`client-demo-app / client-openid-c001 / union-c001`
- 师傅端：`master-demo-app / master-openid-silver1 / union-master-silver1`
- 管理端：`admin-demo-app / admin-openid-root / union-admin-root`

注意：这只是本地模拟。正式微信小程序不能由前端直接提交 `openid`；前端应提交 `wx.login` 返回的 `code`，服务端用 AppID/AppSecret 向微信换取 `openid/unionid`，再按白名单和绑定关系签发自己的登录态。

## 幂等提交

所有 `POST` 接口可通过以下任一方式传入幂等键：

- Header：`Idempotency-Key: <key>`
- JSON body：`"idempotencyKey": "<key>"`

同一操作者、同一路径、同一 key 的重复请求会直接返回第一次结果，不重复创建报价、派单、验收或款项记录。正式上线时建议使用客户端生成的 UUID，并对幂等记录设置合理保留期限。

## 媒体上传

本地后端提供 JSON/base64 形式的媒体上传接口，供客户询价现场图、师傅完工凭证、客户验收问题凭证复用：

- `POST /media/upload`
- `GET /media/:mediaId`
- `GET /media/:mediaId?meta=1`

上传示例：

```json
{
  "mediaType": "image",
  "filename": "现场.jpg",
  "mimeType": "image/jpeg",
  "purpose": "客户询价现场",
  "contentBase64": "..."
}
```

返回的媒体对象可直接放入订单表单的 `media.images/videos`、完工凭证或验收问题凭证中。当前实现将文件保存到本地目录，并在状态 JSON 中保存元数据。上传和读取都需要登录态，或在本地 Demo 模式传入 `ownerRole + customerId/masterId/adminId`；管理员可读全部媒体，客户和师傅只能读取自己上传或自己订单关联的媒体。正式上线建议替换为私有对象存储、临时访问 URL、文件类型校验和更完整的服务端鉴权策略。

## 主要接口

客户：

- `GET /customer/orders?customerId=c_001`
- `GET /customer/profile?customerId=c_001`
- `POST /customer/profile`
- `POST /customer/inquiries`
- `POST /customer/orders/:orderId/confirm-quote`
- `POST /customer/orders/:orderId/cancel`
- `POST /customer/orders/:orderId/accept`
- `POST /customer/orders/:orderId/reject`

师傅：

- `GET /master/orders?masterId=m_silver_1`
- `GET /master/profile?masterId=m_silver_1`
- `GET /master/availability?masterId=m_silver_1`
- `POST /master/profile`
- `POST /master/availability`
- `POST /master/orders/:orderId/appoint`
- `POST /master/orders/:orderId/check-in`
- `POST /master/orders/:orderId/complete`

管理：

- `GET /admin/orders?adminId=admin_root&filter=待报价`
- `GET /admin/orders?adminId=admin_root&filter=全部&keyword=锦禾&page=1&pageSize=20`
- `POST /admin/orders/:orderId/quote-draft`
- `POST /admin/orders/:orderId/quote`
- `GET /admin/orders/:orderId/candidates?adminId=admin_root&level=银牌`
- `POST /admin/orders/:orderId/dispatch`
- `POST /admin/orders/:orderId/confirm-customer-payment`
- `POST /admin/orders/:orderId/confirm-master-payment`
- `POST /admin/orders/:orderId/allocate-master-amounts`
- `GET /admin/payments?adminId=admin_root&orderId=JD20260921001`
- `GET /admin/exceptions?adminId=admin_root`
- `POST /admin/exceptions/:exceptionId/confirm-cancel`
- `POST /admin/exceptions/:exceptionId/keep-order`
- `POST /admin/exceptions/:exceptionId/arrange-rework`
- `POST /admin/exceptions/:exceptionId/force-complete`
- `GET /admin/masters?adminId=admin_root&filter=铜牌`
- `POST /admin/masters/:masterId/review`
- `POST /admin/masters/:masterId/update`
- `GET /admin/customers?adminId=admin_root`
- `GET /admin/customers-export?adminId=admin_root`
- `GET /admin/customers/:customerId?adminId=admin_root`
- `POST /admin/customers/:customerId`
- `GET /admin/audit?adminId=admin_root`
- `GET /admin/notifications?adminId=admin_root&status=全部`
- `POST /admin/notifications/:notificationId/mark-failed`
- `POST /admin/notifications/:notificationId/retry`

媒体：

- `POST /media/upload`
- `GET /media/:mediaId`
- `GET /media/:mediaId?meta=1`

## 验证

```sh
npm run verify
```

其中：

- `tests/http-server.test.js` 会启动真实 HTTP 服务到随机端口，通过请求推进跨端流程，并验证 JSON 文件持久化后重启仍能读到最新状态。
- `tests/remote-miniprogram-api.test.js` 会让三端 `createRemote...Api` 通过真实 HTTP 服务推进订单流程，证明小程序 API 层可切换到网络传输。
- 两组 HTTP 测试均覆盖 token 登录或鉴权拒绝，防止只依赖前端传业务 ID。
- `tests/media-upload.test.js` 会上传真实字节到本地媒体目录，并验证媒体对象可用于客户询价和师傅完工凭证。
- 通知测试覆盖关键状态变更写入本地 `notificationOutbox`、发送失败记录和重试入口。正式上线时该队列应接入微信订阅消息或其他消息服务。
- 款项测试覆盖验收后生成客户收款 / 师傅付款明细、多师傅金额分配生成应付记录、人工确认收付款和重复确认幂等。
- 客户导出测试覆盖管理端导出接口及审计日志。
- 管理端订单查询测试覆盖状态筛选、关键词搜索和分页返回；不带分页参数时仍兼容返回订单数组。
- 幂等测试覆盖重复提交报价不会生成重复报价版本，HTTP 和远程 API 均可使用 `idempotencyKey`。
- 师傅可用时间测试覆盖未来 7 天上午 / 下午窗口、默认未知和非法日期拒绝。
