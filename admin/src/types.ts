// ============================================================
// 所有 TypeScript 类型定义
// ============================================================

/** 通用 API 响应 */
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
}

/** 管理员登录响应 */
export interface LoginResponse {
  success: boolean
  message: string
  token?: string
  expires_in?: number
}

/** 待审核列表中的资料摘要 */
export interface ProfileSummary {
  id: number
  serial_number: string | null
  name: string
  gender: string
  age: number
  work_location: string | null
  create_time: string
  status: ProfileStatus
}

/** 资料状态 */
export type ProfileStatus = 'pending' | 'approved' | 'published' | 'rejected' | 'archived'

/** 资料详情 */
export interface ProfileDetail {
  id: number
  openid: string
  serial_number: string | null
  name: string
  gender: string
  age: number
  height: number
  weight: number
  marital_status: string | null
  body_type: string | null
  hometown: string | null
  work_location: string | null
  industry: string | null
  constellation: string | null
  mbti: string | null
  health_condition: string | null
  housing_status: string | null
  hobbies: string[] | null
  lifestyle: string | null
  coming_out_status: string | null
  expectation: Record<string, string> | null
  special_requirements: string | null
  photos: string[] | null
  status: ProfileStatus
  rejection_reason: string | null
  create_time: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  review_notes: string | null
  invitation_code_used: string | null
  admin_contact: string | null
  // ===== 新增字段 =====
  dating_purpose: string | null
  want_children: string | null
  wechat_id: string | null
  referred_by: string | null
}

/** 公众号文案预览 */
export interface PostPreview {
  title: string
  content: string
  photos: string[]
  post_url?: string | null
  ai_generated?: boolean
}

/** 待审核列表分页数据 */
export interface PendingListData {
  total: number
  page: number
  limit: number
  list: ProfileSummary[]
}

/** 生成邀请码结果 */
export interface GenerateCodesData {
  codes: string[]
  count: number
}

/** 仪表盘统计 */
export interface DashboardStats {
  pending: number
  approved: number
  published: number
  totalCodes: number
  usedCodes: number
}

/** 侧边栏导航 key */
export type PageKey = 'dashboard' | 'profiles' | 'invitations' | 'network' | 'map'

/** Toast 类型 */
export type ToastType = 'success' | 'error' | 'warning'

/** Toast 信息 */
export interface ToastInfo {
  message: string
  type: ToastType
  key: number
}
