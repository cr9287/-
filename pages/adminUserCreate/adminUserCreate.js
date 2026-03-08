const { getStorage } = require('../../utils/storage')
const { request } = require('../../utils/api')

Page({
  data: { account: '', password: '', name: '', phone: '', loading: false, passwordVisible: false },
  onShow() {
    const adminToken = getStorage('adminToken')
    if (!adminToken) {
      wx.showToast({ title: '请先登录管理员', icon: 'none' })
      return wx.redirectTo({ url: '/pages/adminLogin/adminLogin' })
    }
  },
  
  // 安全返回上一页，如果无法返回则跳转到管理员首页
  safeNavigateBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 })
    } else {
      wx.redirectTo({ url: '/pages/adminHome/adminHome' })
    }
  },
  onAccount(e) { this.setData({ account: e.detail.value }) },
  onPassword(e) { this.setData({ password: e.detail.value }) },
  onName(e) { this.setData({ name: e.detail.value }) },
  onPhone(e) { this.setData({ phone: e.detail.value }) },
  togglePasswordVisibility() {
    this.setData({
      passwordVisible: !this.data.passwordVisible
    })
  },
  create() {
    const acc = (this.data.account||'').trim()
    const pwd = (this.data.password||'').trim()
    const name = (this.data.name||'').trim()
    const phone = (this.data.phone||'').trim()
    
    if (!acc) return wx.showToast({ title: '请输入账号', icon: 'none' })
    if (pwd.length < 6) return wx.showToast({ title: '密码至少6位', icon: 'none' })
    if (phone && !/^\d{11}$/.test(phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' })
      return
    }
    
    this.setData({ loading: true })
    
    // 准备请求数据
    const userRequest = {
      account: acc,
      password: pwd,
      name: name,
      phone: phone
    }
    
    // 调用后端API创建用户
    request('/api/admin/users', 'POST', userRequest)
      .then(() => {
        wx.showToast({ title: '创建成功' })
        this.safeNavigateBack()
      })
      .catch(err => {
        let errorMsg = '创建失败'
        if (err.data) {
          errorMsg = err.data
        }
        wx.showToast({ title: errorMsg, icon: 'none' })
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  }
})