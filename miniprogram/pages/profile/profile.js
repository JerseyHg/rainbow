var api = require('../../services/api')
var filter = require('../../utils/filter')

Page({
  data: {
    currentStep: 0,
    submitting: false,
    isEditMode: false,
    name: '', gender: '', birthday: '', age: '', height: '', weight: '',
    genderOptions: ['男', '女'],
    bodyType: '', bodyTypeOptions: ['偏瘦', '匀称', '偏壮', '微胖', '较胖'],
    hometown: '', workLocation: '', industry: '',
    wechatId: '',
    constellation: '',
    mbti: '',
    mbtiOptions: ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP','不确定'],
    hobbyTags: ['健身','运动','旅行','摄影','音乐','电影','阅读','游戏','美食','烹饪','画画','舞蹈','徒步','骑行','游泳','瑜伽','露营','钓鱼','桌游','剧本杀','宠物','园艺'],
    selectedHobbies: [],
    customHobby: '',
    lifestyle: '',
    activityExpectation: '',
    specialRequirements: '',
    // ★ photos: 用于界面显示（本地临时路径 或 编辑模式下的COS URL）
    // ★ uploadedPhotos: 已上传的COS URL（用于提交），与photos一一对应
    photos: [],
    uploadedPhotos: [],
    uploadingPhoto: false,
    _photoPrivacyAgreed: false,
  },

  onInput: function (e) {
    var key = e.currentTarget.dataset.key
    var value = e.detail.value
    if (typeof value === 'string' && value.length > 0) {
      var word = filter.detectSensitive(value)
      if (word) { wx.showToast({ title: '请勿输入违规内容', icon: 'none' }); value = filter.filterSensitive(value) }
    }
    var obj = {}; obj[key] = value; this.setData(obj)
  },

  onTagTap: function (e) {
    var obj = {}; obj[e.currentTarget.dataset.key] = e.currentTarget.dataset.val; this.setData(obj)
  },

  onPick: function (e) {
    var key = e.currentTarget.dataset.key
    var map = { maritalStatus: 'maritalOptions', mbti: 'mbtiOptions' }
    var options = this.data[map[key]]
    if (options) {
      var obj = {}; obj[key] = options[e.detail.value]; this.setData(obj)
    }
  },

  onBirthdayChange: function (e) {
    var birthday = e.detail.value
    var parts = birthday.split('-')
    var year = parseInt(parts[0])
    var month = parseInt(parts[1])
    var day = parseInt(parts[2])

    var today = new Date()
    var age = today.getFullYear() - year
    if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) {
      age--
    }

    var constellation = this._getConstellation(month, day)

    this.setData({
      birthday: birthday,
      age: String(age),
      constellation: constellation
    })
  },

  _getConstellation: function (month, day) {
    var dates = [20, 19, 21, 20, 21, 21, 22, 22, 23, 23, 22, 22]
    var names = ['摩羯座', '水瓶座', '双鱼座', '白羊座', '金牛座', '双子座',
      '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座']
    return day < dates[month - 1] ? names[month - 1] : names[month]
  },

  toggleHobby: function (e) {
    var hobby = e.currentTarget.dataset.val
    var selected = this.data.selectedHobbies.slice()
    var idx = selected.indexOf(hobby)
    if (idx >= 0) { selected.splice(idx, 1) }
    else if (selected.length < 10) { selected.push(hobby) }
    else { wx.showToast({ title: '最多选10个', icon: 'none' }); return }
    this.setData({ selectedHobbies: selected })
  },
  removeHobby: function (e) {
    var i = e.currentTarget.dataset.i
    var selected = this.data.selectedHobbies.slice(); selected.splice(i, 1)
    this.setData({ selectedHobbies: selected })
  },
  addCustomHobby: function () {
    var hobby = this.data.customHobby.trim()
    if (!hobby) return
    if (this.data.selectedHobbies.length >= 10) { wx.showToast({ title: '最多10个', icon: 'none' }); return }
    if (this.data.selectedHobbies.indexOf(hobby) >= 0) { wx.showToast({ title: '已添加', icon: 'none' }); return }
    var selected = this.data.selectedHobbies.slice(); selected.push(hobby)
    this.setData({ selectedHobbies: selected, customHobby: '' })
  },

  // ===== 照片上传 =====
  choosePhoto: function () {
    var that = this

    if (that.data.uploadingPhoto) {
      wx.showToast({ title: '照片上传中，请稍候', icon: 'none' })
      return
    }

    if (!that.data._photoPrivacyAgreed) {
      wx.showModal({
        title: '隐私提醒',
        content: '您上传的照片仅用于报名审核，未经您同意不会公开展示。是否继续？',
        confirmText: '同意上传',
        success: function (res) {
          if (res.confirm) {
            that.setData({ _photoPrivacyAgreed: true })
            that._doChoosePhoto()
          }
        }
      })
    } else {
      that._doChoosePhoto()
    }
  },

  _doChoosePhoto: function () {
    var that = this
    var remaining = 6 - that.data.photos.length
    if (remaining <= 0) {
      wx.showToast({ title: '最多上传6张', icon: 'none' })
      return
    }

    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: function (res) {
        var filePaths = []
        for (var i = 0; i < res.tempFiles.length; i++) {
          filePaths.push(res.tempFiles[i].tempFilePath)
        }
        that._handleChosenPhotos(filePaths)
      },
      fail: function (err) {
        if (err.errMsg && err.errMsg.indexOf('cancel') >= 0) return
        console.error('[chooseMedia] fail:', err)
        wx.showToast({ title: '无法选择照片', icon: 'none' })
      }
    })
  },

  // ★ 选好照片后立即上传到COS
  _handleChosenPhotos: function (filePaths) {
    var that = this
    if (!filePaths || filePaths.length === 0) return

    var newPhotos = that.data.photos.slice()
    var newUploaded = that.data.uploadedPhotos.slice()

    for (var i = 0; i < filePaths.length; i++) {
      newPhotos.push(filePaths[i])     // ★ 本地临时路径，用于界面显示
      newUploaded.push(null)            // 还未上传完成
    }

    that.setData({
      photos: newPhotos,
      uploadedPhotos: newUploaded,
      uploadingPhoto: true
    })

    // 逐个上传到COS
    for (var j = 0; j < filePaths.length; j++) {
      (function (path, idx) {
        api.uploadPhoto(path).then(function (url) {
          console.log('[upload] ✅ 第', idx, '张成功:', url)

          // ★ 关键：只更新 uploadedPhotos，不动 photos！
          // photos 保留本地临时路径用于显示，uploadedPhotos 存COS URL用于提交
          var up = that.data.uploadedPhotos.slice()
          up[idx] = url
          that.setData({ uploadedPhotos: up })

          // 检查是否全部完成
          var allDone = true
          for (var k = 0; k < up.length; k++) {
            if (up[k] === null) { allDone = false; break }
          }
          if (allDone) {
            that.setData({ uploadingPhoto: false })
            console.log('[upload] 🎉 全部上传完成')
          }
        }).catch(function (err) {
          console.error('[upload] ❌ 第', idx, '张失败:', err)
          wx.showToast({ title: '照片上传失败', icon: 'none' })

          // 移除失败的照片
          var p = that.data.photos.slice()
          var u = that.data.uploadedPhotos.slice()
          p.splice(idx, 1)
          u.splice(idx, 1)
          that.setData({ photos: p, uploadedPhotos: u })

          var allDone2 = true
          for (var k = 0; k < u.length; k++) {
            if (u[k] === null) { allDone2 = false; break }
          }
          if (allDone2) {
            that.setData({ uploadingPhoto: false })
          }
        })
      })(filePaths[j], that.data.photos.length - filePaths.length + j)
    }
  },

  // ★ 点击 ✕ 删除照片
  removePhoto: function (e) {
    var that = this
    var i = e.currentTarget.dataset.i
    var serverUrl = that.data.uploadedPhotos[i]
    console.log('[removePhoto] index:', i, 'serverUrl:', serverUrl, 'uploadedPhotos:', JSON.stringify(that.data.uploadedPhotos))

    // 先从界面移除
    var photos = that.data.photos.slice(); photos.splice(i, 1)
    var uploaded = that.data.uploadedPhotos.slice(); uploaded.splice(i, 1)
    that.setData({ photos: photos, uploadedPhotos: uploaded })

    // 如果有COS URL，后台静默删除
    if (serverUrl) {
      api.deletePhoto(serverUrl).then(function () {
        console.log('[removePhoto] ✅ COS删除成功')
      }).catch(function (err) {
        console.warn('[removePhoto] ⚠️ COS删除失败（不影响操作）:', err)
      })
    }

    // 更新上传状态
    var allDone = uploaded.length === 0
    if (!allDone) {
      allDone = true
      for (var k = 0; k < uploaded.length; k++) {
        if (uploaded[k] === null) { allDone = false; break }
      }
    }
    if (allDone) {
      that.setData({ uploadingPhoto: false })
    }
  },

  previewPhoto: function (e) {
    wx.previewImage({ current: e.currentTarget.dataset.url, urls: this.data.photos })
  },

  // ===== 步骤导航 =====
  goStep: function (e) {
    var s = parseInt(e.currentTarget.dataset.s)
    if (s <= this.data.currentStep) {
      this.setData({ currentStep: s })
      wx.pageScrollTo({ scrollTop: 0, duration: 200 })
    }
  },

  nextStep: function () {
    if (!this.validateStep()) return
    this.setData({ currentStep: this.data.currentStep + 1 })
    wx.pageScrollTo({ scrollTop: 0, duration: 200 })
  },

  prevStep: function () {
    if (this.data.currentStep > 0) {
      this.setData({ currentStep: this.data.currentStep - 1 })
      wx.pageScrollTo({ scrollTop: 0, duration: 200 })
    }
  },

  validateStep: function () {
    var d = this.data
    if (d.currentStep === 0) {
      if (!d.name.trim()) { wx.showToast({ title: '请输入姓名', icon: 'none' }); return false }
      if (!d.gender) { wx.showToast({ title: '请选择性别', icon: 'none' }); return false }
      if (!d.birthday) { wx.showToast({ title: '请选择生日', icon: 'none' }); return false }
      if (+d.age < 18) { wx.showToast({ title: '您必须年满18岁', icon: 'none' }); return false }
      if (+d.age > 80) { wx.showToast({ title: '年龄需18-80', icon: 'none' }); return false }
      if (!d.height || +d.height < 140 || +d.height > 220) { wx.showToast({ title: '身高需140-220', icon: 'none' }); return false }
      if (!d.weight || +d.weight < 30 || +d.weight > 200) { wx.showToast({ title: '体重需30-200', icon: 'none' }); return false }
    }
    return true
  },

  // ===== 提交 =====
  onSubmit: function () {
    var that = this
    if (that.data.uploadingPhoto) {
      wx.showToast({ title: '照片还在上传中，请稍候', icon: 'none' })
      return
    }
    wx.hideToast()
    wx.hideLoading()
    setTimeout(function() {
      wx.showModal({
        title: that.data.isEditMode ? '确认更新' : '确认提交',
        content: that.data.isEditMode ? '确定要更新您的资料吗？' : '确定要提交吗？',
        success: function (res) {
          if (res.confirm) { that._doSubmit() }
        },
        fail: function (err) {
          console.error('showModal fail:', err)
        }
      })
    }, 500)
  },

  _doSubmit: function () {
    var that = this
    if (that.data.submitting) return
    that.setData({ submitting: true })
    wx.showLoading({ title: '提交中...', mask: true })

    var d = that.data

    // ★ 只提交已成功上传的COS URL
    var validPhotos = []
    for (var i = 0; i < d.uploadedPhotos.length; i++) {
      if (d.uploadedPhotos[i]) {
        validPhotos.push(d.uploadedPhotos[i])
      }
    }

    var profileData = {
      name: d.name.trim(),
      gender: d.gender,
      birthday: d.birthday || undefined,
      age: parseInt(d.age) || 0,
      height: parseInt(d.height) || 0,
      weight: parseInt(d.weight) || 0,
      body_type: d.bodyType || undefined,
      hometown: d.hometown || undefined,
      work_location: d.workLocation || undefined,
      industry: d.industry || undefined,
      constellation: d.constellation || undefined,
      mbti: d.mbti || undefined,
      wechat_id: d.wechatId || undefined,
      hobbies: d.selectedHobbies,
      lifestyle: d.lifestyle || undefined,
      activity_expectation: d.activityExpectation || undefined,
      special_requirements: d.specialRequirements || undefined,
      photos: validPhotos,
    }

    if (!filter.checkBeforeSubmit(profileData)) {
      wx.hideLoading()
      that.setData({ submitting: false })
      return
    }

    var submitFn = that.data.isEditMode ? api.updateProfile : api.submitProfile

    submitFn(profileData).then(function (result) {
      wx.hideLoading()
      if (result.success) {
        var app = getApp()
        app.globalData.hasProfile = true
        wx.setStorageSync('hasProfile', true)

        if (that.data.isEditMode) {
          wx.showToast({ title: '更新成功！', icon: 'success', duration: 1500 })
          setTimeout(function () {
            wx.navigateBack()
          }, 1500)
        } else {
          wx.showToast({ title: '提交成功！', icon: 'success', duration: 2000 })
          var serialNumber = (result.data && result.data.serial_number) || ''
          setTimeout(function () {
            wx.showModal({
              title: '报名成功',
              content: '您的编号为 ' + serialNumber + '，报名信息已进入审核流程，请耐心等待。',
              showCancel: false,
              confirmText: '我知道了',
              success: function () {
                wx.redirectTo({ url: '/pages/status/status' })
              }
            })
          }, 500)
        }
      } else {
        wx.showToast({ title: result.message || '提交失败', icon: 'none' })
      }
    }).catch(function (err) {
      wx.hideLoading()
      var errMsg = err.message || '提交失败，请重试'
      if (errMsg.indexOf('已经提交过') >= 0) {
        wx.showModal({ title: '提示', content: '您已提交过报名信息，无需重复提交。', showCancel: false })
      } else {
        wx.showToast({ title: errMsg, icon: 'none', duration: 3000 })
      }
    }).finally(function () {
      that.setData({ submitting: false })
    })
  },

  // ===== 页面生命周期 =====
  onLoad: function (options) {
    if (!wx.getStorageSync('openid')) {
      wx.redirectTo({ url: '/pages/index/index' })
      return
    }

    if (options && options.mode === 'edit') {
      this.setData({ isEditMode: true })
      this._loadForEdit()
    } else if (options && options.mode === 'view') {
      this._loadExistingProfile()
    }
  },

  _loadForEdit: function () {
    var that = this
    wx.showLoading({ title: '加载中...' })
    api.getMyProfile().then(function (result) {
      wx.hideLoading()
      if (result.success && result.data) {
        var p = result.data
        var serverPhotos = p.photos || []

        that.setData({
          name: p.name || '',
          gender: p.gender || '',
          birthday: p.birthday || '',
          age: p.age ? String(p.age) : '',
          height: p.height ? String(p.height) : '',
          weight: p.weight ? String(p.weight) : '',
          bodyType: p.body_type || '',
          hometown: p.hometown || '',
          workLocation: p.work_location || '',
          industry: p.industry || '',
          wechatId: p.wechat_id || '',
          constellation: p.constellation || '',
          mbti: p.mbti || '',
          selectedHobbies: p.hobbies || [],
          lifestyle: p.lifestyle || '',
          activityExpectation: p.activity_expectation || '',
          specialRequirements: p.special_requirements || '',
          photos: serverPhotos,
          uploadedPhotos: serverPhotos,
        })

        // ★ 被拒绝状态 → 检查AI审核开关 → 追加模板到备注
        if (p.status === 'rejected' && p.rejection_reason) {
          that._tryAppendAiTemplate(p)
        }
      }
    }).catch(function (err) {
      wx.hideLoading()
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  /**
   * ★ 检查AI审核开关，若开启则追加模板到备注末尾
   * - 只在 AI 审核开启时才执行
   * - append 到已有备注后面，不覆盖
   * - 防止重复追加
   */
  _tryAppendAiTemplate: function (profileData) {
    var that = this

    api.getAiReviewEnabled().then(function (res) {
      if (!res.success || !res.data || !res.data.enabled) {
        return  // AI 审核未开启，什么都不做
      }

      // 从拒绝原因中提取模板（两个 --- 之间的内容）
      var reason = profileData.rejection_reason || ''
      var startMark = '---\n'
      var endMark = '\n---'
      var startIdx = reason.indexOf(startMark)
      var endIdx = reason.lastIndexOf(endMark)

      if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
        return  // 没有模板（可能是管理员手动拒绝的），不处理
      }

      var template = reason.substring(startIdx + startMark.length, endIdx)
      if (!template.trim()) {
        return
      }

      // ★ 追加到现有备注末尾，不删除用户已有内容
      var existing = that.data.specialRequirements || ''
      var newContent = ''

      if (existing.trim()) {
        // 防止重复追加：检查是否已包含模板关键词
        if (existing.indexOf('感情状态：') !== -1 || existing.indexOf('健康状况：') !== -1) {
          return
        }
        newContent = existing.trim() + '\n\n--- 请补充以下信息 ---\n' + template
      } else {
        newContent = template
      }

      that.setData({ specialRequirements: newContent })
    }).catch(function (err) {
      console.warn('[AI Review] 查询开关状态失败:', err)
    })
  },

  _loadExistingProfile: function () {
    wx.showLoading({ title: '加载中...' })
    api.getMyProfile().then(function (result) {
      wx.hideLoading()
      if (result.success && result.data) {
        var p = result.data
        if (p.status === 'approved' || p.status === 'published') {
          wx.showModal({ title: '提示', content: '您的报名已通过审核（编号: ' + (p.serial_number || '') + '）', showCancel: false })
        } else if (p.status === 'pending') {
          wx.showModal({ title: '提示', content: '您的报名正在审核中，请耐心等待。', showCancel: false })
        }
      }
    }).catch(function (err) { wx.hideLoading() })
  },
})
