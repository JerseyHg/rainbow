var api = require('../../services/api')

Page({
  data: {
    code: '',
    loading: false,
    autoLogging: false,
    devMode: false,

    // 隐私勾选状态
    privacyChecked: false,
  },

  onLoad: function (options) {
    if (options && options.code) {
      this.setData({ code: options.code.toUpperCase().slice(0, 6) })
    }

    this._loadOptions = options || {}

    // 先检查是否已经同意过隐私协议
    this._initPrivacyState()
  },

  /**
   * 初始化隐私状态
   * 如果用户之前已同意过，自动勾选并继续流程
   */
  _initPrivacyState: function () {
    var that = this

    if (wx.getPrivacySetting) {
      wx.getPrivacySetting({
        success: function (res) {
          if (!res.needAuthorization) {
            // 已授权过：如果有登录态直接跳走，否则不预勾选
            var openid = wx.getStorageSync('openid')
            if (openid) {
              that._continueNormalFlow()
            }
          }
        },
        fail: function () {
          var agreed = wx.getStorageSync('privacyAgreed')
          var openid = wx.getStorageSync('openid')
          if (agreed && openid) {
            that._continueNormalFlow()
          }
        }
      })
    } else {
      var agreed = wx.getStorageSync('privacyAgreed')
      var openid = wx.getStorageSync('openid')
      if (agreed && openid) {
        that._continueNormalFlow()
      }
    }
  },

  /**
   * 用户点击勾选框
   */
  togglePrivacyCheck: function () {
    var that = this
    var newVal = !that.data.privacyChecked

    if (newVal) {
      // 勾选 → 触发官方隐私授权
      if (wx.requirePrivacyAuthorize) {
        wx.requirePrivacyAuthorize({
          success: function () {
            wx.setStorageSync('privacyAgreed', true)
            that.setData({ privacyChecked: true })
          },
          fail: function () {
            // 用户在系统弹窗中拒绝了
            that.setData({ privacyChecked: false })
            wx.showToast({ title: '需要同意隐私协议才能使用', icon: 'none' })
          }
        })
      } else {
        // 低版本直接勾选
        wx.setStorageSync('privacyAgreed', true)
        that.setData({ privacyChecked: true })
      }
    } else {
      // 取消勾选
      that.setData({ privacyChecked: false })
    }
  },

  /**
   * 打开隐私协议详情
   */
  openPrivacyDetail: function () {
    if (wx.openPrivacyContract) {
      wx.openPrivacyContract({
        fail: function () {
          wx.navigateTo({ url: '/pages/privacy/privacy' })
        }
      })
    } else {
      wx.navigateTo({ url: '/pages/privacy/privacy' })
    }
  },

  /**
   * 继续正常流程（自动登录等）
   */
  _continueNormalFlow: function () {
    var options = this._loadOptions || {}

    var openid = wx.getStorageSync('openid')
    if (openid) {
      var hasProfile = wx.getStorageSync('hasProfile')
      this._navigateByProfile(hasProfile)
      return
    }

    if (options.from === 'logout') {
      this.setData({ autoLogging: false })
      return
    }

    this._tryAutoLogin()
  },

  _tryAutoLogin: function () {
    var that = this
    that.setData({ autoLogging: true })

    wx.login({
      success: function (loginRes) {
        if (!loginRes.code) {
          that.setData({ autoLogging: false })
          return
        }

        api.autoLogin(loginRes.code).then(function (result) {
          if (result.success && result.openid) {
            var app = getApp()
            app.saveLogin(result.openid, result.has_profile)
            that._navigateByProfile(result.has_profile)
          } else {
            that.setData({ autoLogging: false })
          }
        }).catch(function () {
          console.log('[Index] 非老用户，需要邀请码')
          that.setData({ autoLogging: false })
        })
      },
      fail: function () {
        that.setData({ autoLogging: false })
      }
    })
  },

  onInput: function (e) {
    var val = e.detail.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    this.setData({ code: val })
  },

  onSubmit: function () {
    if (!this.data.privacyChecked) {
      wx.showToast({ title: '请先勾选同意隐私保护指引', icon: 'none' })
      return
    }

    if (this.data.code.length < 6) {
      wx.showToast({ title: '请输入完整的6位邀请码', icon: 'none' })
      return
    }

    var that = this
    that.setData({ loading: true })
    wx.showLoading({ title: '验证中...' })

    wx.login({
      success: function (loginRes) {
        if (!loginRes.code) {
          wx.hideLoading()
          that.setData({ loading: false })
          wx.showToast({ title: '微信登录失败', icon: 'none' })
          return
        }

        api.verifyInvitation(that.data.code, loginRes.code).then(function (result) {
          wx.hideLoading()
          that.setData({ loading: false })

          if (result.success && result.openid) {
            var app = getApp()
            app.saveLogin(result.openid, result.has_profile)
            that._navigateByProfile(result.has_profile)
          } else {
            wx.showToast({ title: result.message || '验证失败', icon: 'none' })
          }
        }).catch(function (err) {
          wx.hideLoading()
          that.setData({ loading: false })
          wx.showToast({ title: err.message || '验证失败', icon: 'none' })
        })
      },
      fail: function () {
        wx.hideLoading()
        that.setData({ loading: false })
        wx.showToast({ title: '微信登录失败', icon: 'none' })
      }
    })
  },

  onRelogin: function () {
    if (!this.data.privacyChecked) {
      wx.showToast({ title: '请先勾选同意隐私保护指引', icon: 'none' })
      return
    }

    var that = this
    that.setData({ loading: true })
    wx.showLoading({ title: '登录中...' })

    wx.login({
      success: function (loginRes) {
        if (!loginRes.code) {
          wx.hideLoading()
          that.setData({ loading: false })
          return
        }

        api.autoLogin(loginRes.code).then(function (result) {
          wx.hideLoading()
          that.setData({ loading: false })

          if (result.success && result.openid) {
            var app = getApp()
            app.saveLogin(result.openid, result.has_profile)
            that._navigateByProfile(result.has_profile)
          } else {
            wx.showToast({ title: '未找到登记记录，请先使用邀请码登记', icon: 'none' })
          }
        }).catch(function () {
          wx.hideLoading()
          that.setData({ loading: false })
          wx.showToast({ title: '未找到登记记录', icon: 'none' })
        })
      }
    })
  },

  _navigateByProfile: function (hasProfile) {
    if (hasProfile) {
      wx.redirectTo({ url: '/pages/status/status' })
    } else {
      wx.redirectTo({ url: '/pages/profile/profile' })
    }
  },

  onDevSkip: function () {
    var app = getApp()
    app.saveLogin('dev_openid_123', false)
    wx.redirectTo({ url: '/pages/profile/profile' })
  },

  onShareAppMessage: function () {
    return {
      title: '送你一个邀请码，来登记个人信息吧',
      path: '/pages/index/index',
    }
  },
})
