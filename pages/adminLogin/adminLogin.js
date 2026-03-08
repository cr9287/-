const { request } = require('../../utils/api')
const { setStorage, getStorage } = require('../../utils/storage')

Page({
  data: { 
    account: '', 
    pwd: '', 
    loading: false,
    passwordVisible: false
  },
  togglePasswordVisibility() {
    this.setData({
      passwordVisible: !this.data.passwordVisible
    })
  },
  onAccount(e) { this.setData({ account: e.detail.value }) },
  onPwd(e) { this.setData({ pwd: e.detail.value }) },
  login() {
    const { account, pwd } = this.data
    const acc = (account || '').trim(); 
    const pw = (pwd || '').trim()
    
    // 1. 基础校验
    if (!acc) return wx.showToast({ title: '请输入管理员账号', icon: 'none' })
    if (!pw) return wx.showToast({ title: '请输入管理员密码', icon: 'none' })
    this.setData({ loading: true })

    // 使用封装的 request 函数发送登录请求
    request('/api/admin/login', 'POST', { account: acc, password: pw })
      .then(res => {
        if (res && res.token) {
          // 保存管理员 token
          setStorage('adminToken', res.token)
          
          // 获取管理员信息
          return request('/api/admin/info', 'GET')
        } else {
          wx.showToast({ title: '登录失败，返回数据格式错误', icon: 'none' })
          this.setData({ loading: false })
        }
      })
      .then(infoRes => {
        if (infoRes) {
          // 保存管理员信息到 globalData
          const app = getApp()
          app.globalData.adminInfo = infoRes
          app.globalData.isAdminLoggedIn = true
          
          wx.showToast({ title: '登录成功' })
          // 添加延迟确保数据保存完成后再跳转
          setTimeout(() => {
            wx.navigateTo({ url: '/pages/adminHome/adminHome' })
          }, 500)
        }
      })
      .catch(err => {
        // 优先显示后端返回的错误信息
        const msg = (err && err.data) ? err.data : (err && err.errMsg ? err.errMsg : '登录失败');
        wx.showToast({ title: msg, icon: 'none' })
        this.setData({ loading: false })
      })
  }
})