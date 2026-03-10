"""
AI 匹配分析结果缓存表
"""
from sqlalchemy import Column, Integer, Text, JSON, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from app.db.base import Base


class MatchAnalysis(Base):
    """AI 匹配分析缓存"""
    __tablename__ = "match_analyses"
    __table_args__ = (
        UniqueConstraint("profile_a_id", "profile_b_id", name="uq_match_pair"),
    )

    id = Column(Integer, primary_key=True, index=True)
    profile_a_id = Column(Integer, nullable=False, index=True, comment="用户A的ID")
    profile_b_id = Column(Integer, nullable=False, index=True, comment="用户B的ID")

    score = Column(Integer, comment="匹配分数 0-100")
    summary = Column(Text, comment="一句话总结")
    strengths = Column(JSON, comment="匹配优势列表")
    concerns = Column(JSON, comment="潜在顾虑列表")
    analysis = Column(JSON, comment="四维详细分析")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), comment="更新时间")

    def __repr__(self):
        return f"<MatchAnalysis(a={self.profile_a_id}, b={self.profile_b_id}, score={self.score})>"
