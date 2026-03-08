// pages/adminProfile/adminProfile.js
const app = getApp()

Page({
  data: {
    adminInfo: {
      id: null,
      account: '',
      name: '',
      role: '',
      createTime: ''
    }
  },

  onLoad(options) {
    this.loadAdminInfo()
  },

  onShow() {
    this.loadAdminInfo()
  },

  // 加载管理员信息
  loadAdminInfo() {
    const adminInfo = app.globalData.adminInfo
    if (adminInfo) {
      this.setData({
        adminInfo: {
          id: adminInfo.id || null,
          account: adminInfo.account || '',
          name: adminInfo.name || adminInfo.account || '管理员',
          role: adminInfo.role || 'ADMIN',
          createTime: this.formatDate(adminInfo.createTime)
        }
      })
    }
  },

  // 格式化日期
  formatDate(dateString) {
    if (!dateString) return '未知'
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  },

  // 导航到用户管理
  goUsers() {
    wx.navigateTo({
      url: '/pages/adminUsers/adminUsers'
    })
  },

  // 导航到球桌管理
  goTables() {
    wx.navigateTo({
      url: '/pages/adminTables/adminTables'
    })
  },

  // 导航到订单管理
  goOrders() {
    wx.navigateTo({
      url: '/pages/adminOrders/adminOrders'
    })
  },

  // 导航到管理员管理
  goAdmins() {
    wx.navigateTo({
      url: '/pages/adminAdmins/adminAdmins'
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出管理员账号吗？',
      confirmText: '退出',
      confirmColor: '#1677ff',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 清除管理员登录状态
          app.globalData.adminInfo = null
          app.globalData.isAdminLoggedIn = false
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success',
            duration: 1500
          })
          
          setTimeout(() => {
            wx.reLaunch({
              url: '/pages/adminLogin/adminLogin'
            })
          }, 1500)
        }
      }
    })
  },

  // 注销账号
  deleteAccount() {
    if (this.data.adminInfo.role === 'SUPER_ADMIN') {
      wx.showModal({
        title: '操作受限',
        content: '超级管理员账号无法注销，请联系系统管理员。',
        showCancel: false,
        confirmText: '知道了',
        confirmColor: '#1677ff'
      })
      return
    }

    wx.showModal({
      title: '确认注销',
      content: '确定要永久注销此管理员账号吗？此操作不可恢复，将失去所有管理权限。',
      confirmText: '注销',
      confirmColor: '#ff4d4f',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '注销中...' })
          
          request(`/api/admin/admins/${this.data.adminInfo.id}`, 'DELETE')
            .then(() => {
              wx.hideLoading()
              wx.showToast({ title: '注销成功' })
              
              // 清除本地管理员信息
              app.globalData.adminInfo = null
              app.globalData.isAdminLoggedIn = false
              
              // 返回到登录页面
              setTimeout(() => {
                wx.reLaunch({
                  url: '/pages/adminLogin/adminLogin'
                })
              }, 1500)
            })
            .catch(err => {
              wx.hideLoading()
              wx.showToast({ title: '注销失败', icon: 'none' })
            })
        }
      }
    })
  }
})