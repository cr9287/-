const { request } = require('../../utils/api')

Page({
  data: {
    hasUserInfo: false,
    tables: [],
    displayTables: [],
    refreshing: false,
    statusPollingTimer: null,
    lastUpdateTime: null
  },

  onLoad() {
    // 启动球桌状态轮询
    this.startStatusPolling()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      })
    }
    this.checkLoginStatus()
  },

  onHide() {
    // 页面隐藏时停止轮询
    this.stopStatusPolling()
  },

  onUnload() {
    // 页面卸载时停止轮询
    this.stopStatusPolling()
  },

  checkLoginStatus() {
    request('/api/user/info', 'GET', {}, { redirectOn401: false })
      .then(res => {
        if (res.account) {
          this.setData({ hasUserInfo: true })
          this.refreshTables()
        } else {
          this.setData({ hasUserInfo: false })
          wx.navigateTo({ url: '/pages/userLogin/userLogin' })
        }
      })
      .catch(err => {
        this.setData({ hasUserInfo: false })
        this.refreshTables()
      })
  },

  refreshTables() {
    request('/api/tables', 'GET')
      .then(res => {
        if (res.data) {
          const tables = res.data
          this.setData({ 
            tables, 
            displayTables: tables 
          })
        }
      })
      .catch(err => {
        wx.showToast({ title: '获取数据失败', icon: 'none' })
      })
      .finally(() => {
        this.setData({ refreshing: false })
      })
  },

  onRefresh() {
    this.setData({ refreshing: true })
    this.refreshTables()
  },

  openDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/tableDetail/tableDetail?id=${id}` })
  },
  
  goAdmin() {
    wx.navigateTo({ url: '/pages/adminLogin/adminLogin' })
  },
  
  goProfile() { 
    wx.switchTab({ url: '/pages/profile/profile' }) 
  },

  // 启动球桌状态轮询
  startStatusPolling() {
    // 清除现有定时器
    this.stopStatusPolling()
    
    // 每 15 秒更新一次球桌状态（从 30 秒改为 15 秒，提升响应速度）
    this.setData({
      statusPollingTimer: setInterval(() => {
        this.refreshTables()
      }, 15000)
    })
    
    // 立即刷新一次
    this.refreshTables()
  },

  // 停止状态轮询
  stopStatusPolling() {
    if (this.data.statusPollingTimer) {
      clearInterval(this.data.statusPollingTimer)
      this.setData({ statusPollingTimer: null })
    }
  },

  // 刷新球桌数据
  refreshTables() {
    this.setData({ refreshing: true })
    
    // 每次都从后端获取最新数据，不使用缓存
    request('/api/tables', 'GET', {}, { cache: false })
      .then(res => {
        // 处理不同的响应数据结构
        let tables = []
        
        if (Array.isArray(res)) {
          // 如果响应是数组，直接使用
          tables = res
        } else if (res && Array.isArray(res.data)) {
          // 如果响应是对象且包含 data 数组
          tables = res.data
        } else if (res && res.data) {
          // 如果 data 不是数组，尝试转换为数组
          tables = Array.isArray(res.data) ? res.data : [res.data]
        }
        
        this.setData({ 
          tables, 
          displayTables: tables,
          lastUpdateTime: Date.now()
        })
      })
      .catch(err => {
        wx.showToast({ title: '获取数据失败', icon: 'none' })
      })
      .finally(() => {
        this.setData({ refreshing: false })
      })
  },
  
  // 添加全局刷新方法（供其他页面调用）
  loadWalletData() {
    this.refreshTables()
  },
  
  // 添加刷新用户信息方法（通用刷新接口）
  refreshUserInfo() {
    this.refreshTables()
  }
})