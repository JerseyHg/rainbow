/// <reference path="./types/index.d.ts" />

interface IAppOption {
  globalData: {
    openid: string;
    hasProfile: boolean;
    baseUrl: string;
    mockMode?: boolean;
  };
  /** 保存登录态 */
  saveLogin(openid: string, hasProfile: boolean): void;
  /** 清除登录态 */
  clearLogin(): void;
}
