const { request } = require('../../utils/api')

Page({
  data: {
    account: '',
    phone: '',
    newPassword: '',
    confirmPassword: '',
    newPasswordVisible: false,
    confirmPasswordVisible: false,
    loading: false
  },

  onAccount(e) { this.setData({ account: e.detail.value }) },
  onPhone(e) { this.setData({ phone: e.detail.value }) },
  onNewPassword(e) { this.setData({ newPassword: e.detail.value }) },
  onConfirmPassword(e) { this.setData({ confirmPassword: e.detail.value }) },

  toggleNewPasswordVisibility() {
    this.setData({
      newPasswordVisible: !this.data.newPasswordVisible
    })
  },

  toggleConfirmPasswordVisibility() {
    this.setData({
      confirmPasswordVisible: !this.data.confirmPasswordVisible
    })
  },

  submitReset() {
    const { account, phone, newPassword, confirmPassword } = this.data
    
    if (!account) return wx.showToast({ title: '请输入用户名', icon: 'none' })
    if (!phone) return wx.showToast({ title: '请输入手机号', icon: 'none' })
    if (!newPassword) return wx.showToast({ title: '请输入新密码', icon: 'none' })
    if (newPassword.length < 6) return wx.showToast({ title: '密码长度至少6位', icon: 'none' })
    if (newPassword !== confirmPassword) return wx.showToast({ title: '两次密码不一致', icon: 'none' })
    
    this.setData({ loading: true })

    request('/api/user/reset-password', 'POST', {
      account,
      phone,
      newPassword
    })
    .then(res => {
      wx.showToast({ title: '重置成功', icon: 'success' })
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/userLogin/userLogin' })
      }, 1500)
    })
    .catch(err => {
      let errorMessage = '重置失败，请检查信息'
      
      // 根据错误状态码提供更友好的提示
      if (err && err.statusCode) {
        switch (err.statusCode) {
          case 401:
            errorMessage = '认证失败，请重新登录或联系管理员'
            break
          case 403:
            errorMessage = '权限不足，无法执行此操作'
            break
          case 404:
            errorMessage = '请求的资源不存在'
            break
          case 500:
            errorMessage = '服务器内部错误，请稍后重试'
            break
          default:
            // 尝试从错误响应中获取具体信息
            if (err.data && typeof err.data === 'string') {
              errorMessage = err.data
            } else if (err.data && err.data.message) {
              errorMessage = err.data.message
            }
        }
      }
      
      wx.showToast({ title: errorMessage, icon: 'none' })
    })
    .finally(() => {
      this.setData({ loading: false })
    })
  }
})
