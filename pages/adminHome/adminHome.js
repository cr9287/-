// pages/adminHome/adminHome.js
const app = getApp()
const { request } = require('../../utils/api')

Page({
  data: {
    userCount: 0,
    tableCount: 0,
    orderCount: 0,
    adminCount: 0,
    totalRevenue: 0,
    refreshing: false,
    loading: true,
    isSuperAdmin: false
  },

  onLoad(options) {
    this.loadAdminInfo()
    this.loadStatistics()
  },
  
  onShow() {
    this.loadAdminInfo()
    this.loadStatistics()
  },

  // 检查管理员角色
  checkAdminRole() {
    const adminInfo = app.globalData.adminInfo
    if (adminInfo && adminInfo.role === 'SUPER_ADMIN') {
      this.setData({ isSuperAdmin: true })
    }
  },

  // 下拉刷新
  onRefresh() {
    this.setData({ refreshing: true })
    this.loadStatistics().then(() => {
      this.setData({ refreshing: false })
      wx.showToast({ title: '刷新成功', icon: 'success' })
    })
  },
  
  loadStatistics() {
    return new Promise((resolve) => {
      this.setData({ loading: true })
      
      // 直接调用备用方案，不再依赖 /api/admin/stats 接口
      this.loadStatisticsFallback().then(resolve)
    })
  },
  
  loadStatisticsFallback() {
    return new Promise((resolve) => {
      Promise.all([
        this.loadUsersCount(),
        this.loadTablesCount(),
        this.loadReservationsCount(),
        this.loadAdminsCount(),
        this.loadTotalRevenue()
      ]).then(([userCount, tableCount, reservationCount, adminCount, totalRevenue]) => {
        this.setData({
          userCount: userCount,
          tableCount: tableCount,
          orderCount: reservationCount,
          adminCount: adminCount,
          totalRevenue: totalRevenue,
          loading: false
        })
        resolve()
      }).catch(err => {
        this.setData({ loading: false })
        resolve()
      })
    })
  },
  
  // 加载用户数量
  loadUsersCount() {
    return new Promise((resolve) => {
      request('/api/admin/users', 'GET')
        .then(res => {
          const users = res.data || []
          resolve(users.length)
        })
        .catch(err => {
          resolve(0)
        })
    })
  },
  
  // 加载球桌数量
  loadTablesCount() {
    return new Promise((resolve) => {
      request('/api/tables', 'GET')
        .then(res => {
          const tables = res.data || []
          resolve(tables.length)
        })
        .catch(err => {
          resolve(0)
        })
    })
  },
  
  // 加载预约数量
  loadReservationsCount() {
    return new Promise((resolve) => {
      request('/api/admin/reservations', 'GET')
        .then(res => {
          const reservations = res.data || []
          resolve(reservations.length)
        })
        .catch(err => {
          resolve(0)
        })
    })
  },
  
  // 加载管理员数量
  loadAdminsCount() {
    return new Promise((resolve) => {
      // 检查当前管理员角色
      const adminInfo = app.globalData.adminInfo
      const isSuperAdmin = adminInfo && adminInfo.role === 'SUPER_ADMIN'
      
      if (isSuperAdmin) {
        request('/api/admin/admins', 'GET')
          .then(res => {
            const admins = res.data || []
            resolve(admins.length)
          })
          .catch(err => {
            resolve(0)
          })
      } else {
        resolve(1) // 普通管理员只能看到自己
      }
    })
  },
  
  // 加载总收入
  loadTotalRevenue() {
    return new Promise((resolve) => {
      request('/api/admin/consumptions', 'GET')
        .then(res => {
          const consumptions = res.data || []
          const totalAmount = consumptions.reduce((sum, item) => sum + (item.amount || 0), 0)
          resolve(totalAmount)
        })
        .catch(err => {
          resolve(0)
        })
    })
  },
  
  // 加载管理员信息
  loadAdminInfo() {
    const app = getApp()
    const adminInfo = app.globalData.adminInfo
    if (adminInfo) {
      this.setData({
        isSuperAdmin: adminInfo.role === 'SUPER_ADMIN'
      })
    }
  },
  
  // 降级为普通用户
  demoteToUser() {
    const app = getApp()
    const adminInfo = app.globalData.adminInfo
    
    // 检查是否为超级管理员
    if (adminInfo && adminInfo.account === 'admin') {
      wx.showModal({
        title: '操作禁止',
        content: '超级管理员admin不能被降级为普通用户！',
        showCancel: false,
        confirmText: '知道了',
        confirmColor: '#ff4d4f'
      })
      return
    }
    
    wx.showModal({
      title: '确认降级',
      content: '确定要将此管理员账号降级为普通用户吗？降级后将失去所有管理权限，但可以继续使用普通用户功能。',
      confirmText: '确认降级',
      confirmColor: '#ff4d4f',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.performDemotion()
        }
      }
    })
  },
  
  // 执行降级操作
  performDemotion() {
    wx.showLoading({ title: '降级中...' })
    
    const app = getApp()
    const adminInfo = app.globalData.adminInfo
    
    // 检查 adminInfo 是否存在
    if (!adminInfo || !adminInfo.account) {
      wx.hideLoading()
      wx.showToast({
        title: '管理员信息不存在',
        icon: 'error'
      })
      return
    }
    
    request('/api/admin/demote', 'POST', { account: adminInfo.account })
      .then(res => {
        wx.hideLoading()
        
        if (res.success) {
          wx.showModal({
            title: '降级成功',
            content: '管理员账号已成功降级为普通用户。您将自动退出登录。',
            showCancel: false,
            confirmText: '确定',
            confirmColor: '#1677ff',
            success: () => {
              // 清除管理员登录状态
              app.globalData.adminInfo = null
              app.globalData.isAdminLoggedIn = false
              
              // 跳转到用户登录页面
              wx.reLaunch({
                url: '/pages/userLogin/userLogin'
              })
            }
          })
        } else {
          wx.showToast({
            title: res.message || '降级失败',
            icon: 'error'
          })
        }
      })
      .catch(err => {
        wx.hideLoading()
        wx.showToast({
          title: '后端服务未启动',
          icon: 'error'
        })
      })
  },
  
  // 降级管理
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
          const app = getApp()
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
    const app = getApp()
    const adminInfo = app.globalData.adminInfo
    
    // 检查是否为超级管理员
    if (adminInfo && adminInfo.account === 'admin') {
      wx.showModal({
        title: '操作禁止',
        content: '超级管理员 admin 账号不能注销！',
        showCancel: false,
        confirmText: '知道了',
        confirmColor: '#ff4d4f'
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
          this.performDeleteAccount()
        }
      }
    })
  },
  
  // 执行注销操作
  performDeleteAccount() {
    wx.showLoading({ title: '注销中...' })
    
    const app = getApp()
    const adminInfo = app.globalData.adminInfo
    
    // 检查 adminInfo 是否存在
    if (!adminInfo || !adminInfo.account) {
      wx.hideLoading()
      wx.showToast({
        title: '管理员信息不存在',
        icon: 'error'
      })
      return
    }
    
    request('/api/admin/delete', 'POST', { account: adminInfo.account })
      .then(res => {
        wx.hideLoading()
        
        if (res.success) {
          wx.showModal({
            title: '注销成功',
            content: '管理员账号已永久注销。您将自动退出登录。',
            showCancel: false,
            confirmText: '确定',
            confirmColor: '#1677ff',
            success: () => {
              // 清除管理员登录状态
              app.globalData.adminInfo = null
              app.globalData.isAdminLoggedIn = false
              
              // 跳转到用户登录页面
              wx.reLaunch({
                url: '/pages/userLogin/userLogin'
              })
            }
          })
        } else {
          wx.showToast({
            title: res.message || '注销失败',
            icon: 'error'
          })
        }
      })
      .catch(err => {
        wx.hideLoading()
        wx.showToast({
          title: '后端服务未启动',
          icon: 'error'
        })
      })
  },
  
  // 返回上一页
  goBack() {
    wx.navigateBack()
  },
  
  goUsers() { 
    wx.navigateTo({ url: '/pages/adminUsers/adminUsers' }) 
  },
  
  goTables() { 
    wx.navigateTo({ url: '/pages/adminTables/adminTables' }) 
  },
  
  goOrders() { 
    wx.navigateTo({ url: '/pages/adminOrders/adminOrders' }) 
  },
  
  goAdmins() { 
    wx.navigateTo({ url: '/pages/adminAdmins/adminAdmins' }) 
  }
})