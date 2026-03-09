"""
邀请码生成服务
"""
import random
import string
from app.core.config import settings


def generate_invitation_code() -> str:
    """
    生成邀请码
    排除容易混淆的字符：0O 1Il
    """
    chars = string.ascii_uppercase + string.digits
    chars = chars.replace('0', '').replace('O', '')
    chars = chars.replace('1', '').replace('I', '').replace('l', '')

    code = ''.join(random.choices(chars, k=settings.INVITATION_CODE_LENGTH))
    return code