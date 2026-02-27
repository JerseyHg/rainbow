# 🌈 Rainbow Register

LGBT+ 交友平台 - 彩虹注册系统

## 项目结构

| 目录 | 说明 | 技术栈 |
|------|------|--------|
| `backend/` | API 后端服务 | Python + FastAPI + PostgreSQL |
| `admin/` | 管理后台前端 | Vite + React + TypeScript |
| `miniprogram/` | 微信小程序 | 原生微信小程序 + TypeScript |

## 🐳 启动方式（Docker）

### 后端
```bash
cd backend
cp .env.example .env   # 首次需要，编辑配置
docker compose up -d --build
```

后端运行在容器内 `8000` 端口，映射到宿主机 `127.0.0.1:8003`。

#### 常用 Docker 命令
```bash
# 查看日志
docker logs -f rainbow-backend

# 初始化数据库
docker exec -it rainbow-backend python scripts/init_db.py

# 生成邀请码
docker exec -it rainbow-backend python scripts/generate_invitations.py -c 10 -n "初始邀请码"

# 创建管理员
docker exec -it rainbow-backend python scripts/create_admin.py

# 执行数据库迁移
docker exec -it rainbow-backend python scripts/migrate_add_new_fields.py
docker exec -it rainbow-backend python scripts/add_system_settings.py

# 重启
docker compose restart

# 停止
docker compose down
```

### 管理后台

管理后台需要先构建，然后通过 Nginx 托管静态文件：
```bash
cd admin
npm install
npm run build
# 将 dist/ 目录部署到 Nginx
```

管理后台登录凭据（默认值，来自 `.env`）：
- 用户名：`admin`
- 密码：`change_this_password`

### 小程序

用微信开发者工具打开 `miniprogram/` 目录。