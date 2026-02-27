/**
 * 小程序入口
 * TBOWO报名助手
 */
App({
  globalData: {
    openid: '',
    hasProfile: false,
    // TODO: 部署前替换为实际域名（必须 HTTPS）
    baseUrl: 'http://111.229.254.50:8000/api/v1',

    // ⬇️ Mock 模式：设为 true 则无需后端，使用本地模拟数据
    // ⬇️ 上线前务必改为 false
    mockMode: true,
  },

  onLaunch: function () {
    var openid = wx.getStorageSync('openid') || ''
    var hasProfile = wx.getStorageSync('hasProfile') || false
    this.globalData.openid = openid
    this.globalData.hasProfile = hasProfile

    if (this.globalData.mockMode) {
      console.log('[App] Mock 模式已开启，所有接口使用模拟数据')
    }

    console.log('[App] onLaunch, openid:', openid ? openid.substring(0, 10) + '...' : '(无)')
  },

  /** 保存登录态 */
  saveLogin: function (openid, hasProfile) {
    this.globalData.openid = openid
    this.globalData.hasProfile = hasProfile
    wx.setStorageSync('openid', openid)
    wx.setStorageSync('hasProfile', hasProfile)
  },

  /** 清除登录态 */
  clearLogin: function () {
    this.globalData.openid = ''
    this.globalData.hasProfile = false
    wx.removeStorageSync('openid')
    wx.removeStorageSync('hasProfile')
  },
})
