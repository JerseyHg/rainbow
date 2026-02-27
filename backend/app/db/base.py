"""
数据库基础配置
支持 PostgreSQL（生产） 和 SQLite（本地开发）
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# 创建数据库引擎
connect_args = {}
engine_kwargs = {
    "echo": settings.DEBUG,  # 开发模式下打印SQL
}

if "sqlite" in settings.DATABASE_URL:
    # SQLite 本地开发模式
    connect_args = {"check_same_thread": False}
else:
    # PostgreSQL 生产模式 — 连接池配置
    engine_kwargs.update({
        "pool_size": 10,           # 连接池大小
        "max_overflow": 20,        # 超出 pool_size 后最多再建 20 个
        "pool_timeout": 30,        # 等待可用连接的最大秒数
        "pool_recycle": 1800,      # 每 30 分钟回收连接，防止被 PG 断开
        "pool_pre_ping": True,     # 使用前先 ping，自动剔除断开的连接
    })

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    **engine_kwargs,
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建基类
Base = declarative_base()


# 依赖注入：获取数据库会话
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
