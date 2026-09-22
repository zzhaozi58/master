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
