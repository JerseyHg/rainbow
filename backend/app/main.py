"""
Register Backend - FastAPI应用入口
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from app.core.config import settings
from app.api.v1.api import api_router
from app.db.base import SessionLocal


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期"""
    print(f"{settings.APP_NAME} is starting...")
    yield
    print(f"{settings.APP_NAME} is shutting down...")


# 创建FastAPI应用
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="个人信息登记管理服务",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件服务
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# 注册API路由
app.include_router(api_router, prefix="/api/v1")


# 健康检查
@app.get("/health")
async def health_check():
    """健康检查接口（含数据库连通性）"""
    db_ok = True
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception:
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


# 根路径
@app.get("/")
async def root():
    """欢迎页面"""
    return {
        "message": f"欢迎使用 {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
    }
