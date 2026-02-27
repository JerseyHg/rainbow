/**
 * Mock 数据服务
 * 后端未启动时，使用本地模拟数据跑通前端流程
 */

// 模拟延迟
function delay(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms || 300)
  })
}

// ===== 模拟数据库 =====
var mockDB = {
  // 有效邀请码
  validCodes: ['ABC123', 'TEST01', 'DEMO88', 'RAIN66', 'MOCK01', 'MOCK02'],
  usedCodes: [],

  // 用户资料 (openid -> profile)
  profiles: {},

  // 用户邀请码
  userCodes: {},
}

// ===== Mock API 实现 =====

/** 自动登录（检测老用户） */
function autoLogin(wxCode) {
  return delay(300).then(function () {
    var registered = wx.getStorageSync('mock_registered')
    if (registered) {
      var openid = registered.openid || ('mock_openid_' + Date.now())

      // 恢复 mockDB 里的数据
      if (!mockDB.profiles[openid]) {
        mockDB.profiles[openid] = {
          id: Date.now(),
          serial_number: registered.serial_number || '000',
          status: registered.status || 'pending',
          rejection_reason: registered.rejection_reason || '',
          create_time: registered.create_time || _now(),
          published_at: registered.published_at || null,
          invitation_quota: registered.invitation_quota || 0,
          name: registered.name || '测试用户',
          photos: [],
        }
      }

      console.log('[Mock] 自动登录成功，老用户:', openid)

      return {
        success: true,
        message: '自动登录成功',
        openid: openid,
        has_profile: true,
      }
    }

    // 非老用户
    throw new Error('非注册用户')
  })
}

/** 验证邀请码 */
function verifyInvitation(invitationCode, wxCode) {
  return delay(500).then(function () {
    var code = invitationCode.toUpperCase()

    if (mockDB.usedCodes.indexOf(code) >= 0) {
      throw new Error('邀请码已被使用')
    }

    if (mockDB.validCodes.indexOf(code) < 0) {
      throw new Error('邀请码不存在')
    }

    // 标记为已使用
    mockDB.usedCodes.push(code)

    var openid = 'mock_openid_' + Date.now()
    var hasProfile = !!mockDB.profiles[openid]

    console.log('[Mock] 验证邀请码成功:', code, '-> openid:', openid)

    return {
      success: true,
      message: '验证成功',
      openid: openid,
      has_profile: hasProfile,
    }
  })
}

/** 获取我的邀请码 */
function getMyCodes() {
  return delay(300).then(function () {
    var openid = wx.getStorageSync('openid') || ''
    var codes = mockDB.userCodes[openid] || []

    if (codes.length === 0) {
      var profile = mockDB.profiles[openid]
      if (profile && (profile.status === 'approved' || profile.status === 'published')) {
        codes = [
          { code: 'INV' + Math.random().toString(36).substring(2, 5).toUpperCase(), is_used: false, created_at: _now() },
          { code: 'INV' + Math.random().toString(36).substring(2, 5).toUpperCase(), is_used: true, created_at: _now() },
        ]
        mockDB.userCodes[openid] = codes
      }
    }

    var usedCount = 0
    for (var i = 0; i < codes.length; i++) {
      if (codes[i].is_used) usedCount++
    }

    return {
      success: true,
      message: '获取成功',
      data: {
        codes: codes,
        total: codes.length,
        used: usedCount,
        remaining: codes.length - usedCount,
      }
    }
  })
}

/** 提交资料 */
function submitProfile(data) {
  return delay(800).then(function () {
    var openid = wx.getStorageSync('openid') || ''

    if (mockDB.profiles[openid]) {
      throw new Error('您已经提交过资料，请使用更新接口')
    }

    var serialNumber = String(Math.floor(Math.random() * 900) + 100)

    var profile = {
      id: Date.now(),
      serial_number: serialNumber,
      status: 'pending',
      rejection_reason: '',
      create_time: _now(),
      published_at: null,
      invitation_quota: 0,
      // 存储所有表单字段（编辑模式需要回填）
      name: data.name || '',
      gender: data.gender || '',
      birthday: data.birthday || '',
      age: data.age || 0,
      height: data.height || 0,
      weight: data.weight || 0,
      body_type: data.body_type || '',
      hometown: data.hometown || '',
      work_location: data.work_location || '',
      industry: data.industry || '',
      wechat_id: data.wechat_id || '',
      constellation: data.constellation || '',
      mbti: data.mbti || '',
      health_condition: data.health_condition || '',
      hobbies: data.hobbies || [],
      lifestyle: data.lifestyle || '',
      activity_expectation: data.activity_expectation || '',
      special_requirements: data.special_requirements || '',
      photos: data.photos || [],
    }

    mockDB.profiles[openid] = profile

    // 保存标记到 localStorage，退出后自动登录用
    wx.setStorageSync('mock_registered', {
      openid: openid,
      serial_number: serialNumber,
      status: 'pending',
      name: data.name,
      create_time: _now(),
    })

    console.log('[Mock] 提交资料成功:', serialNumber, data.name)

    return {
      success: true,
      message: '提交成功，等待审核',
      data: {
        profile_id: profile.id,
        serial_number: serialNumber,
      }
    }
  })
}

/** 获取我的资料 */
function getMyProfile() {
  return delay(300).then(function () {
    var openid = wx.getStorageSync('openid') || ''
    var profile = mockDB.profiles[openid]

    if (!profile) {
      throw new Error('资料不存在')
    }

    return {
      success: true,
      message: '获取成功',
      data: profile,
    }
  })
}

/** 更新资料 */
function updateProfile(data) {
  return delay(600).then(function () {
    var openid = wx.getStorageSync('openid') || ''
    var profile = mockDB.profiles[openid]

    if (!profile) {
      throw new Error('资料不存在')
    }

    // 更新字段
    for (var key in data) {
      if (data.hasOwnProperty(key)) {
        profile[key] = data[key]
      }
    }

    // 重新进入审核
    profile.status = 'pending'
    profile.rejection_reason = ''

    return {
      success: true,
      message: '更新成功',
      data: {
        profile_id: profile.id,
        status: 'pending',
      }
    }
  })
}

/** 下架资料 */
function archiveProfile() {
  return delay(400).then(function () {
    var openid = wx.getStorageSync('openid') || ''
    var profile = mockDB.profiles[openid]

    if (!profile) {
      throw new Error('资料不存在')
    }

    profile.status = 'archived'

    return {
      success: true,
      message: '已下架',
    }
  })
}

/** 删除资料（仅 pending/rejected 状态） */
function deleteProfile() {
  return delay(400).then(function () {
    var openid = wx.getStorageSync('openid') || ''
    var profile = mockDB.profiles[openid]

    if (!profile) {
      throw new Error('资料不存在')
    }

    if (profile.status !== 'pending' && profile.status !== 'rejected') {
      throw new Error('当前状态不允许删除')
    }

    delete mockDB.profiles[openid]
    wx.removeStorageSync('mock_registered')

    return {
      success: true,
      message: '已删除',
    }
  })
}

/** 上传照片 */
function uploadPhoto(filePath) {
  return delay(1000).then(function () {
    var mockUrl = 'https://picsum.photos/400/400?random=' + Date.now()
    console.log('[Mock] 照片上传成功:', mockUrl)
    return mockUrl
  })
}

// ===== 测试辅助 =====

function mockApprove() {
  var openid = wx.getStorageSync('openid') || ''
  var profile = mockDB.profiles[openid]
  if (profile) {
    profile.status = 'approved'
    profile.invitation_quota = 2
    mockDB.userCodes[openid] = [
      { code: 'INV' + Math.random().toString(36).substring(2, 5).toUpperCase(), is_used: false, created_at: _now() },
      { code: 'INV' + Math.random().toString(36).substring(2, 5).toUpperCase(), is_used: false, created_at: _now() },
    ]
    var reg = wx.getStorageSync('mock_registered') || {}
    reg.status = 'approved'
    reg.invitation_quota = 2
    wx.setStorageSync('mock_registered', reg)
    console.log('[Mock] ✅ 已模拟审核通过')
  }
}

function mockReject(reason) {
  var openid = wx.getStorageSync('openid') || ''
  var profile = mockDB.profiles[openid]
  if (profile) {
    profile.status = 'rejected'
    profile.rejection_reason = reason || '资料不完整，请补充照片'
    var reg = wx.getStorageSync('mock_registered') || {}
    reg.status = 'rejected'
    reg.rejection_reason = profile.rejection_reason
    wx.setStorageSync('mock_registered', reg)
    console.log('[Mock] ❌ 已模拟审核拒绝')
  }
}

function mockPublish() {
  var openid = wx.getStorageSync('openid') || ''
  var profile = mockDB.profiles[openid]
  if (profile) {
    profile.status = 'published'
    profile.published_at = _now()
    var reg = wx.getStorageSync('mock_registered') || {}
    reg.status = 'published'
    reg.published_at = profile.published_at
    wx.setStorageSync('mock_registered', reg)
    console.log('[Mock] 🎉 已模拟发布')
  }
}

function mockReset() {
  var openid = wx.getStorageSync('openid') || ''
  delete mockDB.profiles[openid]
  delete mockDB.userCodes[openid]
  mockDB.usedCodes = []
  wx.removeStorageSync('mock_registered')
  console.log('[Mock] 🔄 已重置所有模拟数据')
}

// ===== 辅助函数 =====

function _now() {
  var d = new Date()
  var pad = function (n) { return n < 10 ? '0' + n : '' + n }
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
}

// ===== 导出 =====

module.exports = {
  autoLogin: autoLogin,
  verifyInvitation: verifyInvitation,
  getMyCodes: getMyCodes,
  submitProfile: submitProfile,
  getMyProfile: getMyProfile,
  updateProfile: updateProfile,
  archiveProfile: archiveProfile,
  deleteProfile: deleteProfile,
  uploadPhoto: uploadPhoto,

  // 测试辅助
  mockApprove: mockApprove,
  mockReject: mockReject,
  mockPublish: mockPublish,
  mockReset: mockReset,
  mockDB: mockDB,
}
