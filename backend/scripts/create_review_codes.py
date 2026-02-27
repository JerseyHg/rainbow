"""
创建审核测试邀请码（放行 + 拒绝）
运行方式: python scripts/create_review_codes.py

读取 .env 中的:
  REVIEW_BYPASS_CODES  → 自动通过审核
  REVIEW_REJECT_CODES  → 自动拒绝审核
"""
import sys
from pathlib import Path
from datetime import timedelta, datetime, timezone

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.db.base import SessionLocal
from app.crud.crud_invitation import create_invitation_code, get_invitation_by_code
from app.core.config import settings


def _process_codes(db, codes, label, notes):
    """处理一组邀请码：不存在则创建，已使用则重置"""
    if not codes:
        print(f"\n⚠️  .env 中未配置 {label}，跳过")
        return

    print(f"\n{'─' * 40}")
    print(f"  {notes}")
    print(f"{'─' * 40}")

    for code in codes:
        existing = get_invitation_by_code(db, code)
        if existing:
            if existing.is_used:
                existing.is_used = False
                existing.used_by = None
                existing.used_by_openid = None
                existing.used_at = None
                existing.expire_at = datetime.now(timezone.utc) + timedelta(days=30)
                db.commit()
                print(f"  🔄 {code} 已重置（有效期延长30天）")
            else:
                print(f"  ⏭  {code} 已存在，无需操作")
        else:
            expire_at = datetime.now(timezone.utc) + timedelta(days=30)
            create_invitation_code(
                db=db, code=code, created_by=0, created_by_type="admin",
                notes=notes, expire_at=expire_at,
            )
            print(f"  ✅ {code} 创建成功（有效期30天）")


def main():
    print("=" * 60)
    print("  创建审核测试邀请码")
    print("=" * 60)

    db = SessionLocal()
    try:
        _process_codes(
            db,
            settings.REVIEW_BYPASS_CODES,
            "REVIEW_BYPASS_CODES",
            "放行邀请码（自动通过审核）",
        )
        _process_codes(
            db,
            settings.REVIEW_REJECT_CODES,
            "REVIEW_REJECT_CODES",
            "拒绝邀请码（自动拒绝审核）",
        )

        print(f"\n{'=' * 60}")
        print("🎉 完成！")
        if settings.REVIEW_BYPASS_CODES:
            print(f"  放行: {', '.join(settings.REVIEW_BYPASS_CODES)}")
        if settings.REVIEW_REJECT_CODES:
            print(f"  拒绝: {', '.join(settings.REVIEW_REJECT_CODES)}")
        print(f"{'=' * 60}")

    except Exception as e:
        print(f"\n❌ 失败: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    main()