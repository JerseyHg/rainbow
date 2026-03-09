#!/usr/bin/env python3
"""
从微信云开发导出的 user_data.json 导入用户数据到 PostgreSQL

用法: python scripts/import_user_data.py <json_file_path>

功能:
- 读取微信云开发导出的用户数据 JSON
- 转换 cloud:// 照片链接为 https:// 链接
- 映射字段到 user_profiles 表
- 跳过已存在的用户（按 serial_number 去重）
"""
import sys
import os
import json
import re
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base import SessionLocal
from app.models.user_profile import UserProfile


# ===== 照片 URL 转换 =====
PHOTO_BASE_URL = "https://7869-xiaocaiban-3ff264-1253671258.tcb.qcloud.la/"


def convert_photo_url(cloud_url: str) -> str:
    """
    将微信云存储 cloud:// URL 转换为 https:// URL

    cloud://xiaocaiban-3ff264.7869-xiaocaiban-3ff264-1253671258/user_photos/233-01.jpg
    cloud://xiaocaiban-3ff264.7869/user_photos/184-01.jpg
    → https://7869-xiaocaiban-3ff264-1253671258.tcb.qcloud.la/user_photos/233-01.jpg
    """
    if not cloud_url or not cloud_url.startswith("cloud://"):
        return cloud_url

    # 提取 cloud:// 之后的路径
    # 格式: cloud://<env>.<file_id_prefix>/<path>
    after_cloud = cloud_url[len("cloud://"):]

    # 找到第一个 / 之后的路径（即实际文件路径）
    # cloud://xiaocaiban-3ff264.7869-xiaocaiban-3ff264-1253671258/user_photos/...
    # cloud://xiaocaiban-3ff264.7869/user_photos/...
    parts = after_cloud.split("/", 1)
    if len(parts) < 2:
        return cloud_url

    file_path = parts[1]  # user_photos/233-01.jpg
    return PHOTO_BASE_URL + file_path


def extract_serial_number(user_number: str) -> str:
    """
    从 userNumber 中提取编号数字

    "№233" → "233"
    "№测试" → None (跳过)
    """
    if not user_number:
        return None

    # 提取所有数字
    digits = re.findall(r'\d+', user_number)
    if digits:
        return digits[0]  # 返回第一组数字
    return None


def calculate_age(birthday) -> int:
    """
    从生日计算年龄

    支持格式: "1996-12-12" 或 1996 (整数年份) 或 "1996"
    """
    if not birthday:
        return 0

    current_year = 2026  # 当前年份

    if isinstance(birthday, int):
        return current_year - birthday

    birthday_str = str(birthday).strip()

    if '-' in birthday_str:
        # YYYY-MM-DD 格式
        try:
            birth_date = datetime.strptime(birthday_str, "%Y-%m-%d")
            today = datetime(current_year, 3, 8)  # 当前日期
            age = today.year - birth_date.year
            if (today.month, today.day) < (birth_date.month, birth_date.day):
                age -= 1
            return age
        except ValueError:
            pass

    # 尝试只解析年份
    try:
        year = int(birthday_str[:4])
        return current_year - year
    except (ValueError, IndexError):
        return 0


def normalize_birthday(birthday) -> str:
    """将生日标准化为字符串"""
    if not birthday:
        return None

    if isinstance(birthday, int):
        return str(birthday)

    return str(birthday).strip()


def map_coming_out_status(status: str) -> str:
    """映射出柜状态"""
    if not status:
        return None

    mapping = {
        "全面出柜": "已出柜",
        "已出柜": "已出柜",
        "向父母出柜": "半出柜",
        "部分出柜": "半出柜",
        "向朋友出柜": "半出柜",
        "未出柜": "未出柜",
    }
    return mapping.get(status, status)


def import_users(json_path: str):
    """主导入函数"""
    # 读取 JSON 文件
    print(f"\n📂 读取文件: {json_path}")
    with open(json_path, 'r', encoding='utf-8') as f:
        users = json.load(f)

    print(f"   共 {len(users)} 条用户记录\n")

    db = SessionLocal()
    try:
        # 获取已存在的 serial_number，用于去重
        existing_serials = set()
        existing = db.query(UserProfile.serial_number).filter(
            UserProfile.serial_number.isnot(None)
        ).all()
        for row in existing:
            existing_serials.add(row[0])

        imported = 0
        skipped = 0
        errors = 0

        for i, user in enumerate(users):
            try:
                # 提取编号
                serial = extract_serial_number(user.get("userNumber", ""))
                if not serial:
                    print(f"  ⚠️  跳过: userNumber={user.get('userNumber')} (无法提取编号)")
                    skipped += 1
                    continue

                # 去重检查
                if serial in existing_serials:
                    print(f"  ⏭️  跳过: №{serial} (已存在)")
                    skipped += 1
                    continue

                # 转换照片 URL
                photos = [convert_photo_url(p) for p in user.get("photos", [])]

                # 计算年龄
                birthday_raw = user.get("birthday")
                age = calculate_age(birthday_raw)
                if age <= 0:
                    age = 25  # 默认年龄

                # 构建期望对象 JSON
                partner_desc = user.get("partnerDescription", "")
                expectation = None
                if partner_desc:
                    expectation = {"other": partner_desc}

                # 构建 type 说明
                user_type = user.get("type", "")
                special_req = f"型号: {user_type}" if user_type else None

                # 审核备注
                review_parts = []
                if user.get("remark"):
                    review_parts.append(user["remark"])
                if user.get("evaluation"):
                    review_parts.append(f"评价: {user['evaluation']}")
                review_notes = "\n".join(review_parts) if review_parts else None

                # 确定状态
                is_public = user.get("isPublic", "") == "是"
                status = "published" if is_public else "pending"

                # update_time 转换（毫秒时间戳）
                update_ts = user.get("_updateTime")
                update_time = None
                if update_ts:
                    try:
                        update_time = datetime.fromtimestamp(
                            update_ts / 1000, tz=timezone.utc
                        )
                    except (ValueError, OSError):
                        pass

                # 创建 UserProfile
                profile = UserProfile(
                    openid=user["_id"],  # 用微信云数据库文档 ID 作为 openid
                    serial_number=serial,
                    name=f"用户{serial}",  # 源数据无姓名，用编号作占位
                    gender="男",
                    birthday=normalize_birthday(birthday_raw),
                    age=age,
                    height=user.get("height", 170),
                    weight=user.get("weight", 65),
                    hometown=user.get("hometown"),
                    work_location=user.get("location"),
                    constellation=user.get("constellation"),
                    mbti=user.get("mbti") if user.get("mbti") != "待补充" else None,
                    coming_out_status=map_coming_out_status(user.get("comingOutStatus", "")),
                    wechat_id=user.get("wechatId") if user.get("wechatId") != "待补充" else None,
                    lifestyle=user.get("selfDescription"),
                    expectation=expectation,
                    special_requirements=special_req,
                    photos=photos,
                    status=status,
                    review_notes=review_notes,
                    update_time=update_time,
                    reviewed_by="imported" if status == "published" else None,
                    reviewed_at=update_time if status == "published" else None,
                    published_at=update_time if status == "published" else None,
                    admin_contact="casper_gb",
                )
                db.add(profile)
                db.flush()

                existing_serials.add(serial)
                imported += 1
                print(f"  ✅ №{serial:>3s}  {user.get('location', '未知'):6s}  "
                      f"photos={len(photos)}  status={status}")

            except Exception as e:
                errors += 1
                print(f"  ❌ 错误 (record {i}): {e}")
                continue

        db.commit()

        print(f"\n{'=' * 60}")
        print(f"导入完成!")
        print(f"{'=' * 60}")
        print(f"  成功导入: {imported}")
        print(f"  跳过: {skipped}")
        print(f"  错误: {errors}")
        print(f"  数据库总用户数: {db.query(UserProfile).count()}")
        print(f"{'=' * 60}")

    except Exception as e:
        db.rollback()
        print(f"\n❌ 导入失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python scripts/import_user_data.py <json_file_path>")
        print("示例: python scripts/import_user_data.py /path/to/user_data.json")
        sys.exit(1)

    json_path = sys.argv[1]
    if not os.path.exists(json_path):
        print(f"文件不存在: {json_path}")
        sys.exit(1)

    import_users(json_path)
