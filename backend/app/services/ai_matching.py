"""
AI 匹配度分析服务
- Embedding 生成与余弦相似度排序
- 豆包 AI 深度匹配分析
"""
import httpx
import json
import logging
import math
import re
from typing import Dict, Any, Optional, List
from app.core.config import settings

logger = logging.getLogger(__name__)


# ============================================================
# 用户画像文本构建
# ============================================================

def build_profile_summary(profile) -> str:
    """将 UserProfile ORM 对象转成 AI 可读的文本摘要"""
    lines = []
    lines.append(f"编号: {profile.serial_number or '?'}")
    lines.append(f"姓名: {profile.name}")
    lines.append(f"性别: {profile.gender}")
    lines.append(f"年龄: {profile.age}")
    lines.append(f"身高: {profile.height}cm")
    lines.append(f"体重: {profile.weight}kg")

    if profile.body_type:
        lines.append(f"体型: {profile.body_type}")
    if profile.marital_status:
        lines.append(f"感情状态: {profile.marital_status}")
    if profile.hometown:
        lines.append(f"籍贯: {profile.hometown}")
    if profile.work_location:
        lines.append(f"工作地: {profile.work_location}")
    if profile.industry:
        lines.append(f"行业: {profile.industry}")
    if profile.constellation:
        lines.append(f"星座: {profile.constellation}")
    if profile.mbti:
        lines.append(f"MBTI: {profile.mbti}")
    if profile.dating_purpose:
        lines.append(f"交友目的: {profile.dating_purpose}")
    if profile.want_children:
        lines.append(f"是否想要孩子: {profile.want_children}")
    if profile.coming_out_status:
        lines.append(f"出柜状态: {profile.coming_out_status}")

    hobbies = profile.hobbies
    if hobbies and isinstance(hobbies, list):
        lines.append(f"兴趣爱好: {', '.join(hobbies)}")

    if profile.lifestyle:
        lines.append(f"自我描述: {profile.lifestyle}")

    expectation = profile.expectation or {}
    if isinstance(expectation, dict):
        exp_parts = []
        for k, v in expectation.items():
            if v and isinstance(v, str) and v.strip():
                exp_parts.append(f"{k}: {v}")
        if exp_parts:
            lines.append(f"期待对象: {', '.join(exp_parts)}")

    return "\n".join(lines)


# ============================================================
# Embedding 生成
# ============================================================

async def generate_embedding(text: str) -> Optional[List[float]]:
    """
    调用豆包 Embedding API 生成文本向量

    使用 OpenAI 兼容的 /embeddings 端点
    """
    if not settings.DOUBAO_API_KEY:
        logger.warning("DOUBAO_API_KEY 未配置，跳过 embedding 生成")
        return None

    api_url = settings.DOUBAO_BASE_URL.rstrip("/") + "/embeddings/multimodal"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.DOUBAO_API_KEY}",
    }
    payload = {
        "model": settings.DOUBAO_EMBEDDING_MODEL,
        "input": [
            {"type": "text", "text": text},
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(api_url, headers=headers, json=payload)
            if resp.status_code != 200:
                logger.error(f"Embedding API 返回 {resp.status_code}: {resp.text}")
                return None
            data = resp.json()

        # multimodal 返回 {"data": {"embedding": [...]}}
        # 标准格式返回 {"data": [{"embedding": [...]}]}
        raw = data.get("data")
        if isinstance(raw, dict):
            embedding = raw.get("embedding")
        elif isinstance(raw, list) and len(raw) > 0:
            embedding = raw[0].get("embedding")
        else:
            embedding = None

        if not embedding or not isinstance(embedding, list):
            logger.error(f"Embedding API 返回格式异常: {data}")
            return None

        logger.info(f"Embedding 生成成功，维度: {len(embedding)}")
        return embedding

    except Exception as e:
        logger.error(f"Embedding API 调用失败: {type(e).__name__}: {e}")
        return None


async def generate_profile_embedding(profile) -> Optional[List[float]]:
    """
    为用户画像生成 embedding 向量
    将用户的基本信息、自我描述、期待对象等合并成一段文本后生成向量
    """
    summary = build_profile_summary(profile)
    return await generate_embedding(summary)


# ============================================================
# 余弦相似度计算
# ============================================================

def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """计算两个向量的余弦相似度，返回 0~1"""
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0

    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot_product / (norm_a * norm_b)


# ============================================================
# 匹配分数计算（embedding + 规则混合）
# ============================================================

def compute_match_score(profile_a, profile_b) -> Dict[str, Any]:
    """
    计算匹配分数：
    - 如果双方都有 embedding → 用余弦相似度（权重 60%）+ 规则分（权重 40%）
    - 如果没有 embedding → 纯规则打分
    """
    rule_result = _compute_rule_score(profile_a, profile_b)
    rule_score = rule_result["score"]
    reasons = rule_result["reasons"]

    # 尝试使用 embedding 相似度
    emb_a = profile_a.profile_embedding
    emb_b = profile_b.profile_embedding

    if emb_a and emb_b and isinstance(emb_a, list) and isinstance(emb_b, list):
        similarity = cosine_similarity(emb_a, emb_b)
        emb_score = round(similarity * 100)
        # 混合分数：embedding 60% + 规则 40%
        final_score = round(emb_score * 0.6 + rule_score * 0.4)
        reasons.insert(0, f"AI相似度: {emb_score}%")
        return {"score": min(final_score, 100), "reasons": reasons, "embedding_score": emb_score}
    else:
        return {"score": rule_score, "reasons": reasons, "embedding_score": None}


def _compute_rule_score(profile_a, profile_b) -> Dict[str, Any]:
    """纯规则打分"""
    score = 50
    reasons = []

    # 同城
    if (profile_a.work_location and profile_b.work_location
            and profile_a.work_location.strip()[:2] == profile_b.work_location.strip()[:2]):
        score += 15
        reasons.append("同城")

    # 交友目的一致
    if (profile_a.dating_purpose and profile_b.dating_purpose
            and profile_a.dating_purpose == profile_b.dating_purpose):
        score += 10
        reasons.append("交友目的一致")

    # 孩子意愿一致
    if (profile_a.want_children and profile_b.want_children
            and profile_a.want_children == profile_b.want_children):
        score += 10
        reasons.append("孩子意愿一致")

    # 共同爱好
    hobbies_a = set(profile_a.hobbies or [])
    hobbies_b = set(profile_b.hobbies or [])
    if hobbies_a and hobbies_b:
        overlap = hobbies_a & hobbies_b
        if overlap:
            score += min(len(overlap) * 5, 15)
            reasons.append(f"共同爱好: {', '.join(list(overlap)[:3])}")

    # 年龄在对方期望范围内
    exp_a = profile_a.expectation or {}
    exp_b = profile_b.expectation or {}

    if isinstance(exp_a, dict) and exp_a.get("age_range"):
        try:
            nums = re.findall(r"\d+", exp_a["age_range"])
            if len(nums) >= 2:
                low, high = int(nums[0]), int(nums[1])
                if low <= profile_b.age <= high:
                    score += 10
                    reasons.append("B年龄符合A的期望")
        except Exception:
            pass

    if isinstance(exp_b, dict) and exp_b.get("age_range"):
        try:
            nums = re.findall(r"\d+", exp_b["age_range"])
            if len(nums) >= 2:
                low, high = int(nums[0]), int(nums[1])
                if low <= profile_a.age <= high:
                    score += 10
                    reasons.append("A年龄符合B的期望")
        except Exception:
            pass

    # 地域期望匹配
    if isinstance(exp_a, dict) and exp_a.get("location") and profile_b.work_location:
        if profile_b.work_location.strip()[:2] in exp_a["location"]:
            score += 5
    if isinstance(exp_b, dict) and exp_b.get("location") and profile_a.work_location:
        if profile_a.work_location.strip()[:2] in exp_b["location"]:
            score += 5

    score = min(score, 100)
    return {"score": score, "reasons": reasons}


# ============================================================
# AI 深度匹配分析
# ============================================================

async def analyze_compatibility(profile_a, profile_b) -> Optional[Dict[str, Any]]:
    """
    调用 AI 分析两个用户的匹配度

    Returns:
        {
            "score": 0-100,
            "summary": "一句话总结",
            "strengths": ["优势1", ...],
            "concerns": ["顾虑1", ...],
            "analysis": {
                "basic_compatibility": "...",
                "expectation_alignment": "...",
                "lifestyle_compatibility": "...",
                "personality_fit": "..."
            }
        }
    """
    if not settings.DOUBAO_API_KEY:
        logger.warning("DOUBAO_API_KEY 未配置，跳过匹配分析")
        return None

    summary_a = build_profile_summary(profile_a)
    summary_b = build_profile_summary(profile_b)

    system_prompt = (
        "你是一个专业的婚恋匹配分析师，专门为彩虹社区（LGBTQ+社区）的用户分析匹配度。\n\n"
        "分析原则：\n"
        "1. 综合考虑双方的基本条件、期望匹配度、性格兼容性、生活方式兼容性\n"
        "2. 重点关注：\n"
        "   - 一方的「期待对象」是否与另一方的实际条件吻合（双向检查）\n"
        "   - 年龄、地域、交友目的是否一致或兼容\n"
        "   - 自我描述中反映的性格和生活方式是否互补或相似\n"
        "   - 兴趣爱好是否有交集\n"
        "   - 对孩子的态度是否一致\n"
        "3. 尊重每个人的隐私和选择\n"
        "4. 评分要合理，不要过于乐观也不要过于悲观\n"
        "5. 分析要具体，引用双方的实际信息\n\n"
        "请返回 JSON 格式（只返回 JSON，不要有其他内容）：\n"
        "{\n"
        '    "score": <0-100的整数>,\n'
        '    "summary": "<一句话总结匹配情况>",\n'
        '    "strengths": ["<匹配优势1>", "<匹配优势2>"],\n'
        '    "concerns": ["<潜在顾虑1>", "<潜在顾虑2>"],\n'
        '    "analysis": {\n'
        '        "basic_compatibility": "<基本条件匹配分析>",\n'
        '        "expectation_alignment": "<期望匹配分析>",\n'
        '        "lifestyle_compatibility": "<生活方式兼容性>",\n'
        '        "personality_fit": "<性格匹配分析>"\n'
        "    }\n"
        "}"
    )

    prompt = (
        f"请分析以下两位用户的匹配度：\n\n"
        f"【用户A】\n{summary_a}\n\n"
        f"【用户B】\n{summary_b}\n\n"
        f"请从多个维度分析两人的匹配度，给出0-100分的综合评分和详细分析。"
    )

    api_url = settings.DOUBAO_BASE_URL.rstrip("/") + "/chat/completions"
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
        "temperature": 0.3,
    }

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(api_url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        text = data.get("choices", [{}])[0].get("message", {}).get("content", "")

        # Clean markdown code blocks
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
        cleaned = cleaned.strip()

        parsed = json.loads(cleaned)
        if not isinstance(parsed, dict):
            logger.error(f"AI 返回非 dict: {type(parsed)}")
            return None
        return parsed

    except Exception as e:
        logger.error(f"AI 匹配分析失败: {e}")
        return None
