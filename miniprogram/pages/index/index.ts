import { verifyInvitation, autoLogin } from '../../services/api'

Page({
  data: {
    code: '',
    loading: false,
    autoLogging: false,
    devMode: false,

    // 隐私勾选状态
    privacyChecked: false,
  },

  _loadOptions: {} as any,

  onLoad(options: any) {
    if (options && options.code) {
      this.setData({ code: options.code.toUpperCase().slice(0, 6) })
    }

    this._loadOptions = options || {}
    this._initPrivacyState()
  },

  _initPrivacyState() {
    if (wx.getPrivacySetting) {
      wx.getPrivacySetting({
        success: (res: any) => {
          if (!res.needAuthorization) {
            this._continueNormalFlow()
          }
        },
        fail: () => {
          if (wx.getStorageSync('privacyAgreed')) {
            this.setData({ privacyChecked: true })
            this._continueNormalFlow()
          }
        }
      })
    } else {
      if (wx.getStorageSync('privacyAgreed')) {
        this.setData({ privacyChecked: true })
        this._continueNormalFlow()
      }
    }
  },

  togglePrivacyCheck() {
    const newVal = !this.data.privacyChecked

    if (newVal) {
      if (wx.requirePrivacyAuthorize) {
        wx.requirePrivacyAuthorize({
          success: () => {
            wx.setStorageSync('privacyAgreed', true)
            this.setData({ privacyChecked: true })
          },
          fail: () => {
            this.setData({ privacyChecked: false })
            wx.showToast({ title: '需要同意隐私协议才能使用', icon: 'none' })
          }
        })
      } else {
        wx.setStorageSync('privacyAgreed', true)
        this.setData({ privacyChecked: true })
      }
    } else {
      this.setData({ privacyChecked: false })
    }
  },

  openPrivacyDetail() {
    if (wx.openPrivacyContract) {
      wx.openPrivacyContract({
        fail: () => {
          wx.navigateTo({ url: '/pages/privacy/privacy' })
        }
      })
    } else {
      wx.navigateTo({ url: '/pages/privacy/privacy' })
    }
  },

  _continueNormalFlow() {
    const options = this._loadOptions || {}

    const openid = wx.getStorageSync('openid')
    if (openid) {
      const hasProfile = wx.getStorageSync('hasProfile')
      this._navigateByProfile(hasProfile)
      return
    }

    if (options.from === 'logout') {
      this.setData({ autoLogging: false })
      return
    }

    this._tryAutoLogin()
  },

  async _tryAutoLogin() {
    this.setData({ autoLogging: true })

    try {
      const wxCode = await this._getWxLoginCode()
      const result = await autoLogin(wxCode)

      if (result.success && result.openid) {
        const app = getApp<IAppOption>()
        app.saveLogin(result.openid, result.has_profile)
        this._navigateByProfile(result.has_profile)
        return
      }
    } catch (err) {
      console.log('[Index] 非老用户，需要邀请码')
    }

    this.setData({ autoLogging: false })
  },

  onInput(e: any) {
    const val = e.detail.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    this.setData({ code: val })
  },

  async onSubmit() {
    if (!this.data.privacyChecked) {
      wx.showToast({ title: '请先勾选同意隐私保护指引', icon: 'none' })
      return
    }

    if (this.data.code.length < 6) {
      wx.showToast({ title: '请输入完整的6位邀请码', icon: 'none' })
      return
    }

    this.setData({ loading: true })
    wx.showLoading({ title: '验证中...' })

    try {
      const wxCode = await this._getWxLoginCode()
      const result = await verifyInvitation(this.data.code, wxCode)

      wx.hideLoading()
      this.setData({ loading: false })

      if (result.success && result.openid) {
        const app = getApp<IAppOption>()
        app.saveLogin(result.openid, result.has_profile)
        this._navigateByProfile(result.has_profile)
      } else {
        wx.showToast({ title: result.message || '验证失败', icon: 'none' })
      }
    } catch (err: any) {
      wx.hideLoading()
      this.setData({ loading: false })
      wx.showToast({ title: err.message || '验证失败', icon: 'none' })
    }
  },

  async onRelogin() {
    if (!this.data.privacyChecked) {
      wx.showToast({ title: '请先勾选同意隐私保护指引', icon: 'none' })
      return
    }

    this.setData({ loading: true })
    wx.showLoading({ title: '登录中...' })

    try {
      const wxCode = await this._getWxLoginCode()
      const result = await autoLogin(wxCode)

      wx.hideLoading()
      this.setData({ loading: false })

      if (result.success && result.openid) {
        const app = getApp<IAppOption>()
        app.saveLogin(result.openid, result.has_profile)
        this._navigateByProfile(result.has_profile)
      } else {
        wx.showToast({ title: '未找到登记记录，请先使用邀请码登记', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      this.setData({ loading: false })
      wx.showToast({ title: '未找到登记记录', icon: 'none' })
    }
  },

  _navigateByProfile(hasProfile: boolean) {
    if (hasProfile) {
      wx.redirectTo({ url: '/pages/status/status' })
    } else {
      wx.redirectTo({ url: '/pages/profile/profile' })
    }
  },

  _getWxLoginCode(): Promise<string> {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) resolve(res.code)
          else reject(new Error('微信登录失败'))
        },
        fail: () => reject(new Error('微信登录失败'))
      })
    })
  },

  onDevSkip() {
    const app = getApp<IAppOption>()
    app.saveLogin('dev_openid_123', false)
    wx.redirectTo({ url: '/pages/profile/profile' })
  },

  onShareAppMessage() {
    return {
      title: '送你一个TB报名邀请码！',
      path: '/pages/index/index',
    }
  },
})
