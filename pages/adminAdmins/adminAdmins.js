// 管理员管理页面 - 管理管理员账号
const { request } = require('../../utils/api')

Page({
  /**
   * 页面的初始数据
   * 包含管理员列表和加载状态
   */
  data: {
    admins: [],
    loading: true
  },
  
  /**
   * 生命周期函数--监听页面显示
   * 页面显示时自动加载管理员列表
   */
  onShow() {
    this.loadAdmins()
  },
  
  /**
   * 加载管理员列表
   * 从服务器获取管理员数据
   */
  loadAdmins() {
    this.setData({ loading: true })
    
    request('/api/admin/admins', 'GET')
      .then(res => {
        this.setData({ 
          admins: res.data || [],
          loading: false
        })
      })
      .catch(err => {
        wx.showToast({ title: '获取管理员列表失败', icon: 'none' })
        this.setData({ loading: false })
      })
  },
  
  // 创建管理员
  createAdmin() {
    wx.navigateTo({ url: '/pages/adminAdminEdit/adminAdminEdit' })
  },
  
  // 跳转到编辑管理员页面
  goEdit(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/adminAdminEdit/adminAdminEdit?id=${id}` })
  },
  
  // 删除管理员
  deleteAdmin(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    const account = e.currentTarget.dataset.account
    
    // 保护超级管理员admin账号，不允许删除
    if (account === 'admin') {
      wx.showToast({ title: '超级管理员账号无法删除', icon: 'none' })
      return
    }
    
    wx.showModal({
      title: '确认删除',
      content: `确认删除该管理员？操作不可恢复`, // 简化提示语
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          
          request(`/api/admin/admins/${id}`, 'DELETE')
            .then(() => {
              wx.hideLoading()
              wx.showToast({ title: '删除成功' })
              this.loadAdmins() // 重新加载列表
            })
            .catch(err => {
              wx.hideLoading()
              wx.showToast({ title: '删除失败', icon: 'none' })
            })
        }
      }
    })
  },

  // 降级管理员
  demoteAdmin(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    const account = e.currentTarget.dataset.account

    // 保护超级管理员 admin 账号，不允许降级
    if (account === 'admin') {
      wx.showModal({
        title: '操作禁止',
        content: '超级管理员账号无法降级',
        showCancel: false,
        confirmText: '知道了',
        confirmColor: '#ff4d4f'
      })
      return
    }

    wx.showModal({
      title: '确认降级',
      content: `确定要将管理员 ${name} 降级为普通用户吗？\n降级后该账号将变为普通用户权限，历史数据将保留。`,
      confirmText: '确认降级',
      confirmColor: '#fa8c16',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' })
          
          request('/api/admin/admins/demote', 'POST', { adminId: id })
            .then(() => {
              wx.hideLoading()
              wx.showToast({ title: '降级成功' })
              
              // 检查是否降级了自己
              const app = getApp()
              const currentAdmin = app.globalData.adminInfo
              if (currentAdmin && currentAdmin.account === account) {
                // 降级了自己，清除登录状态并跳转到登录页面
                app.globalData.adminInfo = null
                app.globalData.isAdminLoggedIn = false
                setTimeout(() => {
                  wx.reLaunch({
                    url: '/pages/adminLogin/adminLogin'
                  })
                }, 1500)
              } else {
                // 降级了其他人，刷新列表
                this.loadAdmins()
              }
            })
            .catch(err => {
              wx.hideLoading()
              
              let msg = '降级失败'
              if (err.data && err.data.message) {
                msg = err.data.message
              } else if (typeof err.data === 'string') {
                msg = err.data
              }
              
              wx.showModal({
                title: '降级失败',
                content: msg,
                showCancel: false,
                confirmText: '知道了',
                confirmColor: '#ff4d4f'
              })
            })
        }
      }
    })
  }
})