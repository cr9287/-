const { getStorage } = require('../../utils/storage')
const { request } = require('../../utils/api')

Page({
  data: { user: null, account: '', username: '', password: '', phone: '', userId: null, passwordVisible: false },
  onLoad(query) {
    const acc = (query && query.account) ? String(query.account) : ''
    this.setData({ account: acc })
  },
  onShow() {
    const adminToken = getStorage('adminToken')
    if (!adminToken) {
      wx.showToast({ title: '请先登录管理员', icon: 'none' })
      return wx.redirectTo({ url: '/pages/adminLogin/adminLogin' })
    }
    this.fetchUser()
  },
  // 获取用户信息
  fetchUser() {
    // 先获取用户列表，找到对应的用户ID
    request('/api/admin/users').then(response => {
      const users = response.data || []
      const user = users.find(u => u.account === this.data.account)
      if (!user) {
        wx.showToast({ title: '用户不存在', icon: 'none' })
        return this.safeNavigateBack()
      }
      this.setData({
        user: user,
        userId: user.id,
        username: user.name || '', // 使用用户昵称
        phone: user.phone || '',
        password: ''
      })
    }).catch(err => {
      wx.showToast({ title: '获取用户信息失败', icon: 'none' })
    })
  },
  onUsername(e){ this.setData({ username: e.detail.value }) },
  onPhone(e){ this.setData({ phone: e.detail.value }) },
  onPassword(e){ this.setData({ password: e.detail.value }) },
  togglePasswordVisibility() {
    this.setData({
      passwordVisible: !this.data.passwordVisible
    })
  },
  // 保存用户信息
  save(){ 
    if (!this.data.userId) {
      return wx.showToast({ title: '用户信息未加载完成', icon: 'none' })
    }
    
    const username = String(this.data.username || '').trim()
    if (!username) {
      return wx.showToast({ title: '用户名不能为空', icon: 'none' })
    }
    
    const pwd = String(this.data.password || '').trim()
    const phone = String(this.data.phone || '').trim()
    
    if (phone && !/^\d{11}$/.test(phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' })
      return
    }

    // 准备请求数据
    const userRequest = {
      name: username, // 发送昵称
      phone: phone
    }
    if (pwd) {
      if (pwd.length < 6) {
        return wx.showToast({ title: '密码至少6位', icon: 'none' })
      }
      userRequest.password = pwd
    }
    
    // 调用后端API更新用户信息
    request(`/api/admin/users/${this.data.userId}`, 'PUT', userRequest)
      .then(() => {
        wx.showToast({ title: '已保存' })
        this.safeNavigateBack()
      })
      .catch(err => {
        wx.showToast({ title: '保存失败', icon: 'none' })
      })
  },
  cancel(){ this.safeNavigateBack() },
  
  // 安全返回上一页，如果无法返回则跳转到管理员首页
  safeNavigateBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 })
    } else {
      wx.redirectTo({ url: '/pages/adminHome/adminHome' })
    }
  }
})