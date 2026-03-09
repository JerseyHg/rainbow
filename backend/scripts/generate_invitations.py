"""
批量生成邀请码脚本
"""
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.db.base import SessionLocal
from app.services.invitation import generate_invitation_code
from app.crud.crud_invitation import create_invitation_code


def generate_invitations(count: int = 10, notes: str = "脚本生成"):
    """生成邀请码"""
    print("=" * 60)
    print(f"批量生成邀请码 (数量: {count})")
    print("=" * 60)

    db = SessionLocal()
    codes = []

    try:
        for i in range(count):
            code = generate_invitation_code()

            invitation = create_invitation_code(
                db=db,
                code=code,
                created_by=0,
                created_by_type="admin",
                notes=notes,
            )

            codes.append(code)
            print(f"{i + 1}. {code}")

        print("\n✅ 生成成功！")
        print(f"总计: {len(codes)} 个邀请码")
        print(f"邀请码永不过期")

        # 保存到文件
        output_file = project_root / "invitation_codes.txt"
        with open(output_file, "a", encoding="utf-8") as f:
            f.write(f"\n=== {notes} ({len(codes)}个) ===\n")
            for code in codes:
                f.write(f"{code}\n")

        print(f"\n📄 已保存到: {output_file}")

    except Exception as e:
        print(f"\n❌ 生成失败: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="生成邀请码")
    parser.add_argument("-c", "--count", type=int, default=10, help="生成数量")
    parser.add_argument("-n", "--notes", type=str, default="脚本生成", help="备注")

    args = parser.parse_args()

    generate_invitations(args.count, args.notes)