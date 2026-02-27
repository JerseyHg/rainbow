var api = require('../../services/api')

Page({
  data: { loading: true, codes: [], total: 0, used: 0, remaining: 0, copiedCode: '' },

  onLoad: function () { this._loadCodes() },
  onPullDownRefresh: function () { var that = this; this._loadCodes().then(function () { wx.stopPullDownRefresh() }) },

  _loadCodes: function () {
    var that = this; that.setData({ loading: true })
    return api.getMyCodes().then(function (result) {
      if (result.success && result.data) {
        that.setData({ loading: false, codes: result.data.codes || [], total: result.data.total || 0, used: result.data.used || 0, remaining: result.data.remaining || 0 })
      } else { that.setData({ loading: false }); wx.showToast({ title: result.message || '加载失败', icon: 'none' }) }
    }).catch(function (err) { that.setData({ loading: false }); wx.showToast({ title: err.message || '加载失败', icon: 'none' }) })
  },

  copyCode: function (e) {
    var code = e.currentTarget.dataset.code; var that = this
    wx.setClipboardData({ data: code, success: function () {
      that.setData({ copiedCode: code }); wx.showToast({ title: '已复制', icon: 'success' })
      setTimeout(function () { that.setData({ copiedCode: '' }) }, 2000)
    }})
  },

  onShareAppMessage: function () {
    var availableCode = null
    for (var i = 0; i < this.data.codes.length; i++) {
      if (!this.data.codes[i].is_used) { availableCode = this.data.codes[i]; break }
    }
    if (availableCode) { return { title: '送你一个邀请码，快来报名吧', path: '/pages/index/index?code=' + availableCode.code } }
    return { title: '报名登记 - 记录真实的你', path: '/pages/index/index' }
  },

  goBack: function () { wx.navigateBack() },
})
