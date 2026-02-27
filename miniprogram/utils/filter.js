/**
 * 敏感词过滤工具
 * 用于前端输入过滤，后端也应做一层过滤
 */

// 敏感词库（可从后端动态拉取扩展）
var SENSITIVE_WORDS = [
  // 色情/低俗
  '约炮','一夜情','裸照','色情','性行为','援交',
  '卖淫','嫖娼','性交易','裸聊','文爱',
  // 政治敏感
  '翻墙','VPN','代理','科学上网',
  // 违法
  '赌博','毒品','枪支','迷药',
  // 人身攻击
  '傻逼','操你','去死',
]

/**
 * 检测文本是否包含敏感词
 * @param {string} text - 待检测文本
 * @returns {string|null} 返回匹配到的敏感词，无则返回null
 */
function detectSensitive(text) {
  if (!text) return null
  var lower = text.toLowerCase()
  for (var i = 0; i < SENSITIVE_WORDS.length; i++) {
    if (lower.indexOf(SENSITIVE_WORDS[i].toLowerCase()) >= 0) {
      return SENSITIVE_WORDS[i]
    }
  }
  return null
}

/**
 * 过滤敏感词，替换为***
 * @param {string} text - 待过滤文本
 * @returns {string} 过滤后的文本
 */
function filterSensitive(text) {
  if (!text) return text
  var result = text
  for (var i = 0; i < SENSITIVE_WORDS.length; i++) {
    var regex = new RegExp(SENSITIVE_WORDS[i], 'gi')
    result = result.replace(regex, '***')
  }
  return result
}

/**
 * 提交前整体检查所有文本字段
 * @param {object} profileData - 用户提交的资料对象
 * @returns {boolean} true=通过，false=含敏感词
 */
function checkBeforeSubmit(profileData) {
  var fieldsToCheck = [
    profileData.name,
    profileData.lifestyle,
    profileData.activity_expectation,
    profileData.special_requirements,
    profileData.health_condition,
    profileData.hometown,
    profileData.work_location,
    profileData.industry,
  ]

  // 检查期望对象字段
  if (profileData.expectation) {
    var exp = profileData.expectation
    fieldsToCheck.push(
      exp.relationship, exp.body_type, exp.appearance,
      exp.habits, exp.personality, exp.location, exp.other
    )
  }

  for (var i = 0; i < fieldsToCheck.length; i++) {
    if (!fieldsToCheck[i]) continue
    var word = detectSensitive(fieldsToCheck[i])
    if (word) {
      wx.showToast({
        title: '内容包含违规词汇，请修改后重试',
        icon: 'none',
        duration: 2500
      })
      console.warn('[Filter] 检测到敏感词:', word)
      return false
    }
  }
  return true
}

module.exports = {
  detectSensitive: detectSensitive,
  filterSensitive: filterSensitive,
  checkBeforeSubmit: checkBeforeSubmit,
  SENSITIVE_WORDS: SENSITIVE_WORDS,
}
