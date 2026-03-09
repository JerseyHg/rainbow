"""
AI 驱动的公众号文案生成服务
生成精美的 HTML 文案，可直接粘贴到公众号编辑器
★ 使用智谱 GLM 生成文案，然后套入 HTML 模板
"""
import httpx
import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


def _build_profile_summary(profile: Dict[str, Any]) -> str:
    """把用户资料整理成 AI 可读的文本摘要"""
    lines = []
    lines.append(f"编号: {profile.get('serial_number', '???')}")
    lines.append(f"性别: {profile.get('gender', '未知')}")
    lines.append(f"年龄: {profile.get('age', '未知')}")
    lines.append(f"身高: {profile.get('height', '未知')}cm")
    lines.append(f"体重: {profile.get('weight', '未知')}kg")

    if profile.get('body_type'):
        lines.append(f"体型: {profile['body_type']}")
    if profile.get('marital_status'):
        lines.append(f"感情状态: {profile['marital_status']}")
    if profile.get('hometown'):
        lines.append(f"籍贯: {profile['hometown']}")
    if profile.get('work_location'):
        lines.append(f"工作地: {profile['work_location']}")
    if profile.get('industry'):
        lines.append(f"行业: {profile['industry']}")
    if profile.get('constellation'):
        lines.append(f"星座: {profile['constellation']}")
    if profile.get('mbti'):
        lines.append(f"MBTI: {profile['mbti']}")
    if profile.get('health_condition'):
        lines.append(f"健康状况: {profile['health_condition']}")
    if profile.get('housing_status'):
        lines.append(f"住房: {profile['housing_status']}")
    if profile.get('coming_out_status'):
        lines.append(f"出柜状态: {profile['coming_out_status']}")
    if profile.get('dating_purpose'):
        lines.append(f"交友目的: {profile['dating_purpose']}")
    if profile.get('want_children'):
        lines.append(f"是否想要孩子: {profile['want_children']}")

    hobbies = profile.get('hobbies', [])
    if hobbies and isinstance(hobbies, list):
        lines.append(f"兴趣爱好: {', '.join(hobbies)}")

    if profile.get('lifestyle'):
        lines.append(f"自我描述: {profile['lifestyle']}")
    if profile.get('activity_expectation'):
        lines.append(f"对活动的期望: {profile['activity_expectation']}")

    expectation = profile.get('expectation', {})
    if expectation and isinstance(expectation, dict):
        exp_parts = []
        for k, v in expectation.items():
            if v and isinstance(v, str) and v.strip():
                exp_parts.append(f"{k}: {v}")
        if exp_parts:
            lines.append(f"期待对象: {', '.join(exp_parts)}")

    if profile.get('special_requirements'):
        lines.append(f"备注: {profile['special_requirements']}")

    return "\n".join(lines)


async def _call_ai_for_post(profile_summary: str) -> Optional[Dict[str, str]]:
    """
    调用 AI 生成公众号文案
    返回 {"title": "...", "intro": "...", "body": "...", "closing": "..."}
    """
    if not settings.DOUBAO_API_KEY:
        logger.warning("DOUBAO_API_KEY 未配置")
        return None

    system_prompt = """你是一个专业的公众号文案写手，专门为彩虹社区交友平台撰写温暖、真诚的个人档案推介文案。

写作要求：
1. 语气温暖友好，像一个贴心的朋友在介绍认识的人
2. 不要直接罗列信息，而是用流畅的叙事方式呈现
3. 突出这个人的亮点和特色，让读者产生兴趣
4. 尊重隐私，对于"不想回答""保密"的信息不要提及
5. 文案要有画面感，可以适当使用emoji但不要过多
6. 不要出现任何歧视性或不尊重的表述
7. 注意：出柜状态如果是"未出柜"或"保密"，文案中不要提及此项

请返回 JSON 格式，包含以下字段：
- title: 文案标题（简短有吸引力，15字以内）
- intro: 开头引言（1-2句话，制造悬念或好感）
- body: 正文（3-5段，详细但不冗长地介绍这个人）
- closing: 结尾（1-2句话，鼓励联系）

只返回 JSON，不要有其他内容。"""

    prompt = f"""请根据以下个人资料，生成一篇公众号推介文案：

{profile_summary}

请生成温暖有趣的文案，让读者想要了解这个人。"""

    api_url = settings.DOUBAO_BASE_URL.rstrip('/') + '/chat/completions'
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.DOUBAO_API_KEY}",
    }
    payload = {
        "model": settings.DOUBAO_MODEL,
        "max_tokens": 2000,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.7,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(api_url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        text = data.get("choices", [{}])[0].get("message", {}).get("content", "")

        # 清理
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
        cleaned = cleaned.strip()

        parsed = json.loads(cleaned)
        return parsed

    except Exception as e:
        logger.error(f"AI 生成文案失败: {e}")
        return None


def _generate_html(
    profile: Dict[str, Any],
    ai_content: Optional[Dict[str, str]] = None,
) -> str:
    """
    生成公众号 HTML 文案
    微信公众号编辑器支持内联样式的 HTML
    """
    serial = profile.get('serial_number', '???')
    gender = profile.get('gender', '')
    age = profile.get('age', '')
    height = profile.get('height', '')
    weight = profile.get('weight', '')
    location = profile.get('work_location', '')
    admin_contact = profile.get('admin_contact', 'casper_gb')
    photos = profile.get('photos', [])

    # AI 生成的内容，或 fallback
    if ai_content:
        title = ai_content.get('title', f'档案 №{serial}')
        intro = ai_content.get('intro', '')
        body = ai_content.get('body', '')
        closing = ai_content.get('closing', '')
    else:
        title = f'档案 №{serial}'
        intro = '新朋友来啦，一起认识一下吧~'
        body = _fallback_body(profile)
        closing = f'感兴趣的话，添加管理员微信 {admin_contact} 了解更多哦~'

    # 照片 HTML
    photos_html = ""
    if photos:
        photo_items = ""
        for i, url in enumerate(photos):
            photo_items += f'''
            <div style="margin-bottom: 16px; border-radius: 12px; overflow: hidden;">
                <img src="{url}" style="width: 100%; display: block; border-radius: 12px;" alt="照片{i+1}" />
            </div>'''
        photos_html = f'''
        <div style="margin: 24px 0;">
            {photo_items}
        </div>'''

    # 基本信息标签
    tags = []
    if age:
        tags.append(f"{age}岁")
    if height:
        tags.append(f"{height}cm")
    if weight:
        tags.append(f"{weight}kg")
    if profile.get('body_type'):
        tags.append(profile['body_type'])
    if location:
        tags.append(location)
    if profile.get('constellation'):
        tags.append(profile['constellation'])
    if profile.get('mbti'):
        tags.append(profile['mbti'])

    tags_html = ""
    for tag in tags:
        tags_html += f'<span style="display: inline-block; padding: 4px 12px; margin: 4px; background: #f0f4ff; color: #4A90D9; border-radius: 20px; font-size: 13px;">{tag}</span>'

    # 兴趣爱好标签
    hobbies = profile.get('hobbies', [])
    hobbies_html = ""
    if hobbies and isinstance(hobbies, list):
        for h in hobbies:
            hobbies_html += f'<span style="display: inline-block; padding: 4px 12px; margin: 4px; background: #fff0f5; color: #E8457C; border-radius: 20px; font-size: 13px;">🏷 {h}</span>'

    # 正文段落处理
    body_paragraphs = ""
    if body:
        for p in body.split("\n"):
            p = p.strip()
            if p:
                body_paragraphs += f'<p style="margin: 12px 0; line-height: 1.8; color: #444; font-size: 15px;">{p}</p>'

    html = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; background: #f5f5f5; font-family: -apple-system, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;">

<div style="max-width: 600px; margin: 0 auto; background: #fff;">

    <!-- 头部 -->
    <div style="background: linear-gradient(135deg, #4A90D9, #E8457C); padding: 40px 24px 32px; text-align: center;">
        <div style="color: rgba(255,255,255,0.8); font-size: 14px; margin-bottom: 8px;">🌈 Rainbow Community</div>
        <h1 style="color: #fff; font-size: 22px; margin: 0; font-weight: 700;">{title}</h1>
        <div style="color: rgba(255,255,255,0.7); font-size: 13px; margin-top: 12px;">档案编号 №{serial}</div>
    </div>

    <!-- 照片区域 -->
    {photos_html}

    <!-- 基本信息标签 -->
    <div style="padding: 20px 24px 8px;">
        <div style="font-size: 16px; font-weight: 600; color: #333; margin-bottom: 12px;">📋 基本信息</div>
        <div style="line-height: 2;">
            {tags_html}
        </div>
    </div>

    <!-- 兴趣爱好 -->
    {"<div style='padding: 8px 24px;'><div style='font-size: 16px; font-weight: 600; color: #333; margin-bottom: 12px;'>💫 兴趣爱好</div><div style='line-height: 2;'>" + hobbies_html + "</div></div>" if hobbies_html else ""}

    <!-- 引言 -->
    {"<div style='padding: 16px 24px; margin: 16px 24px; background: #f8f9ff; border-left: 3px solid #4A90D9; border-radius: 4px;'><p style='margin: 0; color: #555; font-size: 15px; line-height: 1.8; font-style: italic;'>" + intro + "</p></div>" if intro else ""}

    <!-- 正文 -->
    <div style="padding: 8px 24px 16px;">
        {body_paragraphs}
    </div>

    <!-- 结尾 -->
    <div style="padding: 20px 24px; margin: 0 24px 24px; background: linear-gradient(135deg, #fff0f5, #f0f4ff); border-radius: 12px; text-align: center;">
        <p style="margin: 0 0 8px; color: #666; font-size: 14px;">{closing}</p>
        <p style="margin: 0; color: #4A90D9; font-size: 15px; font-weight: 600;">📱 管理员微信：{admin_contact}</p>
    </div>

    <!-- 底部 -->
    <div style="padding: 20px 24px; text-align: center; border-top: 1px solid #eee;">
        <p style="margin: 0; color: #bbb; font-size: 12px;">🌈 每个人都值得被温柔以待</p>
    </div>

</div>
</body>
</html>'''

    return html


def _fallback_body(profile: Dict[str, Any]) -> str:
    """当 AI 不可用时，用模板生成正文"""
    lines = []

    gender = profile.get('gender', 'ta')
    age = profile.get('age', '')
    location = profile.get('work_location', '')

    lines.append(f"这是一位来自{location or '未知城市'}的{age}岁{gender}生。")

    if profile.get('industry'):
        lines.append(f"目前从事{profile['industry']}行业。")

    if profile.get('marital_status'):
        lines.append(f"当前感情状态：{profile['marital_status']}。")

    if profile.get('lifestyle'):
        lines.append(f"\n{profile['lifestyle']}")

    if profile.get('dating_purpose'):
        lines.append(f"\n交友意向：{profile['dating_purpose']}。")

    expectation = profile.get('expectation', {})
    if expectation and isinstance(expectation, dict):
        exp_parts = []
        for k, v in expectation.items():
            if v and isinstance(v, str) and v.strip() and v not in ('null', 'None'):
                exp_parts.append(v)
        if exp_parts:
            lines.append(f"对另一半的期待：{'，'.join(exp_parts)}。")

    return "\n".join(lines)


async def generate_ai_post_html(profile: Dict[str, Any]) -> Dict[str, Any]:
    """
    主入口：生成 AI 公众号文案 HTML

    返回:
        {
            "html": "完整HTML字符串",
            "title": "文案标题",
            "ai_generated": True/False,
        }
    """
    summary = _build_profile_summary(profile)

    # 尝试 AI 生成
    ai_content = await _call_ai_for_post(summary)

    html = _generate_html(profile, ai_content)

    return {
        "html": html,
        "title": ai_content.get("title", f"档案 №{profile.get('serial_number', '???')}") if ai_content else f"档案 №{profile.get('serial_number', '???')}",
        "ai_generated": ai_content is not None,
    }
