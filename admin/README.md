# 🌈 彩虹注册 - 管理后台

基于 **Vite + React + TypeScript** 的管理后台前端项目，对接 Rainbow Register Backend FastAPI 后端。

---

## 🚀 快速启动（3步）

### 1. 安装依赖

```bash
cd rainbow-admin
npm install
```

### 2. 确保后端已启动

```bash
# 在后端项目目录中
python run.py
# 后端会运行在 http://localhost:8000
```

### 3. 启动前端

```bash
npm run dev
```

浏览器打开 **http://localhost:3000** 即可看到登录页面。

---

## 🔑 登录方式

使用后端配置的管理员账号登录：

| 字段 | 默认值 |
|------|--------|
| 用户名 | `admin` |
| 密码 | `change_this_password` |

> 这些默认值来自后端 `.env` 配置文件中的 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD`。

---

## 📁 项目结构

```
rainbow-admin/
├── index.html              # HTML入口
├── package.json            # 依赖配置
├── vite.config.ts          # Vite配置（含API代理）
├── tsconfig.json           # TypeScript配置
└── src/
    ├── main.tsx            # 应用入口
    ├── App.tsx             # 主组件（路由 & 状态管理）
    ├── api.ts              # API请求层（类型安全）
    ├── types.ts            # 所有TypeScript类型定义
    ├── theme.ts            # 设计系统（颜色常量）
    ├── components/
    │   ├── GlobalStyles.tsx # 全局CSS
    │   ├── Sidebar.tsx     # 侧边栏导航
    │   └── UI.tsx          # 通用组件（Button, Card, Modal...）
    └── pages/
        ├── LoginPage.tsx       # 登录页
        ├── DashboardPage.tsx   # 仪表盘
        ├── ProfilesPage.tsx    # 资料审核页
        └── InvitationsPage.tsx # 邀请码管理页
```

---

## 🛠 功能说明

### 仪表盘
- 数据统计（待审核数、已通过、已发布、邀请码）
- 快速操作入口
- 系统信息

### 资料审核
- 查看待审核列表
- 点击查看完整资料详情
- 预览公众号文案并一键复制
- 通过/拒绝操作

### 邀请码管理
- 批量生成邀请码（可设数量和备注）
- 点击单个邀请码复制
- 一键复制全部

---

## ⚙️ API 代理说明

开发时，Vite 会将 `/api` 开头的请求代理到 `http://localhost:8000`（后端地址）。

如果后端不在 `localhost:8000`，修改 `vite.config.ts`：

```ts
proxy: {
  '/api': {
    target: 'http://你的后端地址:端口',
    changeOrigin: true,
  },
},
```

---

## 📦 构建部署

```bash
# 构建生产包
npm run build

# 产出在 dist/ 目录，可部署到 Nginx 或任何静态服务器
```

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name admin.your-domain.com;

    root /path/to/rainbow-admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
