Page({
  data: {},

  onLoad: function () {
    // 隐私协议详情查看页，不再有授权逻辑
    // 主授权流程已在首页弹窗中通过官方按钮完成
  },

  /** 打开平台配置的隐私协议全文 */
  openPrivacyContract: function () {
    if (wx.openPrivacyContract) {
      wx.openPrivacyContract({
        fail: function () {
          wx.showToast({ title: '打开隐私协议失败', icon: 'none' })
        }
      })
    }
  },
})
