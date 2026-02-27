/**
 * API 服务层（JS版本）
 * 封装所有后端接口调用
 */

var mock = require('./mock')

function getBaseUrl() {
  return getApp().globalData.baseUrl
}

function getOpenid() {
  return wx.getStorageSync('openid') || ''
}

function isMockMode() {
  return getApp().globalData.mockMode
}

/** 通用请求封装 */
function request(options) {
  return new Promise(function (resolve, reject) {
    var openid = getOpenid()

    wx.request({
      url: getBaseUrl() + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + openid,
      },
      success: function (res) {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          var errMsg = (res.data && (res.data.detail || res.data.message)) || '请求失败'
          reject(new Error(errMsg))
        }
      },
      fail: function (err) {
        reject(new Error(err.errMsg || '网络错误'))
      },
    })
  })
}

// ===== 登录相关 =====

function autoLogin(wxCode) {
  if (isMockMode()) {
    return mock.autoLogin(wxCode)
  }

  return new Promise(function (resolve, reject) {
    wx.request({
      url: getBaseUrl() + '/invitation/auto-login',
      method: 'POST',
      data: { wx_code: wxCode },
      header: { 'Content-Type': 'application/json' },
      success: function (res) {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          reject(new Error('非注册用户'))
        }
      },
      fail: function (err) {
        reject(new Error(err.errMsg || '网络错误'))
      },
    })
  })
}

// ===== 邀请码相关 =====

function verifyInvitation(invitationCode, wxCode) {
  if (isMockMode()) {
    return mock.verifyInvitation(invitationCode, wxCode)
  }

  return new Promise(function (resolve, reject) {
    wx.request({
      url: getBaseUrl() + '/invitation/verify',
      method: 'POST',
      data: {
        invitation_code: invitationCode,
        wx_code: wxCode,
      },
      header: { 'Content-Type': 'application/json' },
      success: function (res) {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          var errMsg = (res.data && (res.data.detail || res.data.message)) || '验证失败'
          reject(new Error(errMsg))
        }
      },
      fail: function (err) {
        reject(new Error(err.errMsg || '网络错误'))
      },
    })
  })
}

function getMyCodes() {
  if (isMockMode()) {
    return mock.getMyCodes()
  }
  return request({ url: '/invitation/my-codes' })
}

// ===== 用户资料相关 =====

function submitProfile(data) {
  if (isMockMode()) {
    return mock.submitProfile(data)
  }
  return request({
    url: '/profile/submit',
    method: 'POST',
    data: data,
  })
}

function getMyProfile() {
  if (isMockMode()) {
    return mock.getMyProfile()
  }
  return request({ url: '/profile/my' })
}

function updateProfile(data) {
  if (isMockMode()) {
    return mock.updateProfile(data)
  }
  return request({
    url: '/profile/update',
    method: 'PUT',
    data: data,
  })
}

function archiveProfile() {
  if (isMockMode()) {
    return mock.archiveProfile()
  }
  return request({
    url: '/profile/archive',
    method: 'POST',
  })
}

/** 删除资料 */
function deleteProfile() {
  if (isMockMode()) {
    return mock.deleteProfile()
  }
  return request({
    url: '/profile/delete',
    method: 'DELETE',
  })
}

// ===== 文件上传 =====

function uploadPhoto(filePath) {
  if (isMockMode()) {
    return mock.uploadPhoto(filePath)
  }

  return new Promise(function (resolve, reject) {
    var openid = getOpenid()

    wx.uploadFile({
      url: getBaseUrl() + '/upload/photo',
      filePath: filePath,
      name: 'file',
      header: {
        Authorization: 'Bearer ' + openid,
      },
      success: function (res) {
        if (res.statusCode === 200) {
          try {
            var data = JSON.parse(res.data)
            if (data.success && data.data && data.data.url) {
              resolve(data.data.url)
            } else {
              reject(new Error(data.message || '上传失败'))
            }
          } catch (e) {
            reject(new Error('解析响应失败'))
          }
        } else {
          reject(new Error('上传失败，状态码: ' + res.statusCode))
        }
      },
      fail: function (err) {
        reject(new Error(err.errMsg || '上传失败'))
      },
    })
  })
}

/** ★ 删除单张照片（从COS删除） */
function deletePhoto(photoUrl) {
  if (isMockMode()) {
    return new Promise(function (resolve) {
      setTimeout(function () { resolve({ success: true }) }, 100)
    })
  }
  return request({
    url: '/upload/photo/delete',
    method: 'POST',
    data: { url: photoUrl },
  })
}

/** 查询AI自动审核是否开启 */
function getAiReviewEnabled() {
  if (isMockMode()) {
    return new Promise(function (resolve) {
      resolve({ success: true, data: { enabled: false } })
    })
  }
  return request({ url: '/profile/ai-review-enabled' })
}

// ===== 导出 =====

module.exports = {
  getBaseUrl: getBaseUrl,
  autoLogin: autoLogin,
  verifyInvitation: verifyInvitation,
  getMyCodes: getMyCodes,
  submitProfile: submitProfile,
  getMyProfile: getMyProfile,
  updateProfile: updateProfile,
  archiveProfile: archiveProfile,
  deleteProfile: deleteProfile,
  uploadPhoto: uploadPhoto,
  deletePhoto: deletePhoto,
  getAiReviewEnabled: getAiReviewEnabled,
}
