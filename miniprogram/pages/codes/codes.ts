import { getMyCodes } from '../../services/api'

Page({
  data: {
    loading: true,
    codes: [] as Array<{ code: string; is_used: boolean; created_at: string }>,
    total: 0,
    used: 0,
    remaining: 0,
    copiedCode: '',
  },

  onLoad() { this._loadCodes() },

  onPullDownRefresh() {
    this._loadCodes().then(() => { wx.stopPullDownRefresh() })
  },

  async _loadCodes() {
    this.setData({ loading: true })
    try {
      const result = await getMyCodes()
      if (result.success && result.data) {
        this.setData({
          loading: false, codes: result.data.codes || [],
          total: result.data.total || 0, used: result.data.used || 0,
          remaining: result.data.remaining || 0,
        })
      } else {
        this.setData({ loading: false })
        wx.showToast({ title: result.message || '加载失败', icon: 'none' })
      }
    } catch (err: any) {
      this.setData({ loading: false })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
  },

  copyCode(e: any) {
    const code = e.currentTarget.dataset.code
    const that = this
    wx.setClipboardData({
      data: code,
      success() {
        that.setData({ copiedCode: code })
        wx.showToast({ title: '已复制', icon: 'success' })
        setTimeout(() => { that.setData({ copiedCode: '' }) }, 2000)
      }
    })
  },

  onShareAppMessage() {
    const availableCode = this.data.codes.find((c: any) => !c.is_used)
    if (availableCode) {
      return {
        title: '送你一个TB邀请码，快来报名吧',
        path: `/pages/index/index?code=${availableCode.code}`,
      }
    }
    return {
      title: 'TB报名助手',
      path: '/pages/index/index',
    }
  },

  goBack() { wx.navigateBack() },
})
