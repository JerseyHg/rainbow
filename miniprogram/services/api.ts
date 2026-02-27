/**
 * API 服务层
 * 封装所有后端接口调用
 *
 * 🔧 Mock 模式：当 app.globalData.mockMode = true 时，
 *    所有接口自动使用本地模拟数据，无需后端服务。
 */

import * as mock from './mock'

// ===== 辅助函数 =====

function getBaseUrl(): string {
  const app = getApp<IAppOption>()
  return app.globalData.baseUrl
}

function getOpenid(): string {
  return wx.getStorageSync('openid') || ''
}

function isMockMode(): boolean {
  const app = getApp<IAppOption>()
  return !!(app.globalData as any).mockMode
}

// ===== 通用请求封装 =====

interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
}

function request<T = any>(options: {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
}): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const openid = getOpenid()

    wx.request({
      url: `${getBaseUrl()}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openid}`,
        ...options.header,
      },
      success(res: any) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as ApiResponse<T>)
        } else if (res.statusCode === 401) {
          wx.removeStorageSync('openid')
          wx.removeStorageSync('hasProfile')
          wx.reLaunch({ url: '/pages/index/index' })
          reject(new Error('未授权，请重新登录'))
        } else {
          const errMsg = res.data?.detail || res.data?.message || '请求失败'
          reject(new Error(errMsg))
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络错误，请检查网络'))
      },
    })
  })
}

// ===== 自动登录（老用户） =====

export interface VerifyResult {
  success: boolean
  message: string
  openid?: string
  has_profile: boolean
}

export function autoLogin(wxCode: string): Promise<VerifyResult> {
  if (isMockMode()) return mock.autoLogin(wxCode)

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${getBaseUrl()}/invitation/auto-login`,
      method: 'POST',
      data: { wx_code: wxCode },
      header: { 'Content-Type': 'application/json' },
      success(res: any) {
        if (res.statusCode === 200) resolve(res.data as VerifyResult)
        else reject(new Error('非注册用户'))
      },
      fail(err) { reject(new Error(err.errMsg || '网络错误')) },
    })
  })
}

// ===== 邀请码相关 =====

export function verifyInvitation(invitationCode: string, wxCode: string): Promise<VerifyResult> {
  if (isMockMode()) return mock.verifyInvitation(invitationCode, wxCode)

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${getBaseUrl()}/invitation/verify`,
      method: 'POST',
      data: { invitation_code: invitationCode, wx_code: wxCode },
      header: { 'Content-Type': 'application/json' },
      success(res: any) {
        if (res.statusCode === 200) {
          resolve(res.data as VerifyResult)
        } else {
          reject(new Error(res.data?.detail || res.data?.message || '验证失败'))
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络错误'))
      },
    })
  })
}

export function getMyCodes(): Promise<ApiResponse> {
  if (isMockMode()) return mock.getMyCodes()
  return request({ url: '/invitation/my-codes' })
}

// ===== 用户资料相关 =====

export interface ProfileData {
  name: string
  gender: string
  birthday?: string              // ★ 新增：生日 YYYY-MM-DD
  age: number
  height: number
  weight: number
  marital_status?: string
  body_type?: string
  hometown?: string
  work_location?: string
  industry?: string
  constellation?: string
  mbti?: string
  health_condition?: string
  housing_status?: string
  dating_purpose?: string
  want_children?: string
  wechat_id?: string
  referred_by?: string
  hobbies: string[]
  lifestyle?: string
  activity_expectation?: string  // ★ 新增：对活动的期望
  coming_out_status?: string
  expectation?: {
    relationship?: string
    body_type?: string
    appearance?: string
    age_range?: string
    habits?: string
    personality?: string
    location?: string
    children?: string
    other?: string
  }
  special_requirements?: string
  photos: string[]
}

export function submitProfile(data: ProfileData): Promise<ApiResponse> {
  if (isMockMode()) return mock.submitProfile(data)
  return request({ url: '/profile/submit', method: 'POST', data })
}

export function getMyProfile(): Promise<ApiResponse> {
  if (isMockMode()) return mock.getMyProfile()
  return request({ url: '/profile/my' })
}

export function updateProfile(data: ProfileData): Promise<ApiResponse> {
  if (isMockMode()) return mock.updateProfile(data)
  return request({ url: '/profile/update', method: 'PUT', data })
}

export function archiveProfile(): Promise<ApiResponse> {
  if (isMockMode()) return mock.archiveProfile()
  return request({ url: '/profile/archive', method: 'POST' })
}

/** 删除资料（仅 pending/rejected 状态） */
export function deleteProfile(): Promise<ApiResponse> {
  if (isMockMode()) return mock.deleteProfile()
  return request({ url: '/profile/delete', method: 'DELETE' })
}

// ===== 文件上传 =====

export function uploadPhoto(filePath: string): Promise<string> {
  if (isMockMode()) return mock.uploadPhoto(filePath)

  return new Promise((resolve, reject) => {
    const openid = getOpenid()

    wx.uploadFile({
      url: `${getBaseUrl()}/upload/photo`,
      filePath,
      name: 'file',
      header: { Authorization: `Bearer ${openid}` },
      success(res) {
        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(res.data)
            if (data.success && data.data?.url) {
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
      fail(err) {
        reject(new Error(err.errMsg || '上传失败'))
      },
    })
  })
}

/** ★ 删除单张照片（从COS删除） */
export function deletePhoto(photoUrl: string): Promise<ApiResponse> {
  if (isMockMode()) {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ success: true, message: '删除成功' }), 100)
    })
  }
  return request({
    url: '/upload/photo/delete',
    method: 'POST',
    data: { url: photoUrl },
  })
}

/** 查询AI自动审核是否开启 */
export function getAiReviewEnabled() {
  if (isMockMode()) {
    return new Promise(function (resolve) {
      resolve({ success: true, data: { enabled: false } })
    })
  }
  return request({ url: '/profile/ai-review-enabled' })
}

export default {
  autoLogin, verifyInvitation, getMyCodes,
  submitProfile, getMyProfile, updateProfile, archiveProfile,
  deleteProfile, uploadPhoto, deletePhoto, getAiReviewEnabled
}
