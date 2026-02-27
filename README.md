# 🌈 Rainbow Register

LGBT+ 交友平台 - 彩虹注册系统

## 项目结构

| 目录 | 说明 | 技术栈 |
|------|------|--------|
| `backend/` | API 后端服务 | Python + FastAPI + PostgreSQL |
| `admin/` | 管理后台前端 | Vite + React + TypeScript |
| `miniprogram/` | 微信小程序 | 原生微信小程序 + TypeScript |

## 快速启动

### 后端
cd backend
python -m venv rainbowEnv
.\rainbowEnv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
python scripts/init_db.py
python run.py

### 管理后台
cd admin
npm install
npm run dev

### 小程序
用微信开发者工具打开 miniprogram/ 目录