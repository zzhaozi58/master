# 金大师补漆维修小程序原型

本项目包含金大师补漆维修的客户端、管理端、师傅端小程序原型，以及共享业务状态机、Node.js 本地后端和自动化测试。

## 目录

- `miniprograms/client`：客户小程序端
- `miniprograms/admin`：管理端小程序
- `miniprograms/master`：师傅端小程序
- `shared/domain.js`：三端共享订单、报价、派单、验收、结算状态机
- `backend/`：本地 HTTP 后端、登录鉴权、媒体上传和持久化示例
- `tests/`：领域层、后端、HTTP、远程 API 和媒体上传测试
- `index.html` / `admin.html` / `master.html`：早期静态高保真原型
- `PRD.md`：正式开发前的产品需求基线

## 验证

```bash
npm run verify
```

该命令会运行测试、共享文件同步检查和小程序静态结构检查。

## 当前部署状态

- GitHub 仓库：`https://github.com/zzhaozi58/master`
- 腾讯云轻量应用服务器：`106.53.200.63`
- HTTP 健康检查：`http://106.53.200.63/health`
- 原型首页：`http://106.53.200.63/`

`jindashi.cc` 和 `www.jindashi.cc` 已在腾讯云 DNSPod 添加 A 记录并指向
`106.53.200.63`。由于该服务器位于腾讯云中国内地地域，域名访问需要先完成
ICP 备案或接入备案；备案完成前，公网 IP 可用于部署验证，域名访问会被腾讯云
未备案拦截页面阻断。
