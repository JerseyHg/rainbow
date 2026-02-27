/**
 * 工具函数
 */

export function showToast(title: string, icon: 'success' | 'error' | 'none' = 'none') {
  wx.showToast({ title, icon, duration: 2000 })
}

export function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true })
}

export function hideLoading() {
  wx.hideLoading()
}

export function showConfirm(content: string, title = '提示'): Promise<boolean> {
  return new Promise((resolve) => {
    wx.showModal({
      title, content,
      success(res) { resolve(res.confirm) },
      fail() { resolve(false) },
    })
  })
}

export function getWxLoginCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) { res.code ? resolve(res.code) : reject(new Error('微信登录失败')) },
      fail(err) { reject(new Error(err.errMsg || '微信登录失败')) },
    })
  })
}

export function isLoggedIn(): boolean {
  return !!wx.getStorageSync('openid')
}

/** 星座列表 */
export const CONSTELLATIONS = [
  '白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座',
  '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座',
]

/** MBTI 列表 */
export const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
]

/** 体型选项 */
export const BODY_TYPES = ['偏瘦', '匀称', '偏壮', '微胖', '较胖']

/** 婚姻状况 */
export const MARITAL_STATUSES = ['未婚', '离异', '丧偶', '保密']

/** 兴趣爱好标签 */
export const HOBBY_TAGS = [
  '健身', '运动', '旅行', '摄影', '音乐', '电影',
  '阅读', '游戏', '美食', '烹饪', '画画', '舞蹈',
  '徒步', '骑行', '游泳', '瑜伽', '滑板', '冲浪',
  '露营', '钓鱼', '桌游', '剧本杀', '宠物', '园艺',
]
