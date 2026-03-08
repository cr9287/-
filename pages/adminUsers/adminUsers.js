const { getStorage } = require('../../utils/storage')
const { request } = require('../../utils/api')

Page({
  /**
   * 页面的初始数据
   * 包含用户列表和批量操作相关状态
   */
  data: { 
    users: [],
    batchMode: false, // 批量操作模式
    selectedCount: 0, // 已选择数量
    isAllSelected: false // 是否全选
  },
  onShow() {
    const adminToken = getStorage('adminToken')
    // 加强权限检查
    if (!adminToken || adminToken === 'null' || adminToken === 'undefined' || adminToken.trim() === '') {
      wx.showToast({ 
        title: '权限不足，请使用管理员账号登录', 
        icon: 'none',
        duration: 2000
      })
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/adminLogin/adminLogin' })
      }, 2000)
      return
    }
    this.fetchUsers()
  },
  /**
   * 获取用户列表
   * 从服务器获取用户数据并进行格式化处理
   */
  fetchUsers() {
    request('/api/admin/users').then(response => {
      // 后端返回的是 { "data": [users] } 结构，需要先取 data 字段
      const users = response.data || []

      const displayUsers = users.map(u => {
        const balance = Number(u.walletBalance || 0);
        let balanceClass = 'text-black';
        if (balance > 1000) balanceClass = 'text-green';
        else if (balance < 100) balanceClass = 'text-orange';
        
        let lastConsumption = '最近消费：暂无';
        if (u.lastConsumptionTime) {
            const d = new Date(u.lastConsumptionTime);
            if (!isNaN(d.getTime())) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                lastConsumption = `最近消费：${year}-${month}-${day}`;
            }
        }

        return {
          ...u,
          displayName: u.name ? u.name : '', // 昵称，如果没有则为空
          walletBalanceText: balance.toFixed(2),
          balanceClass,
          lastConsumption,
          selected: false // 确保每个用户都有selected属性
        }
      })
      
      this.setData({ 
        users: displayUsers,
        selectedCount: 0,
        isAllSelected: false
      })
    }).catch(err => {
      wx.showToast({ title: '获取用户列表失败', icon: 'none' })
    })
  },
  goCreate() { wx.navigateTo({ url: '/pages/adminUserCreate/adminUserCreate' }) },
  goEdit(e) {
    const acc = e.currentTarget.dataset.account
    if (!acc) return
    wx.navigateTo({ url: `/pages/adminUserEdit/adminUserEdit?account=${acc}` })
  },
  deleteUser(e) {
    const user = e.currentTarget.dataset.user
    if (!user || !user.id) return
    wx.showModal({
      title: '确认删除',
      content: `确认删除该用户？操作不可恢复`, // 简化提示语
      confirmColor: '#ff4d4f', // 红色确认按钮
      success: (res) => {
        if (res.confirm) {
          request(`/api/admin/users/${user.id}`, 'DELETE').then(() => {
            wx.showToast({ title: '已删除' })
            this.fetchUsers() // Refresh user list
          }).catch(err => {
            wx.showToast({ title: '删除用户失败', icon: 'none' })
          })
        }
      }
    })
  },

  /**
   * 进入批量操作模式
   */
  enterBatchMode() {
    this.setData({
      batchMode: true,
      selectedCount: 0,
      isAllSelected: false
    })
    
    // 重置所有选择状态
    this.resetAllSelections()
  },

  /**
   * 退出批量操作模式
   */
  exitBatchMode() {
    this.setData({
      batchMode: false,
      selectedCount: 0,
      isAllSelected: false
    })
    
    // 重置所有选择状态
    this.resetAllSelections()
  },

  /**
   * 重置所有选择状态
   */
  resetAllSelections() {
    const { users } = this.data
    
    // 重置用户选择状态
    const resetUsers = users.map(item => ({
      ...item,
      selected: false
    }))
    
    this.setData({
      users: resetUsers
    })
  },

  /**
   * 切换用户选择状态
   */
  toggleSelectUser(e) {
    const index = e.currentTarget.dataset.index
    const { users } = this.data
    
    const updatedUsers = [...users]
    updatedUsers[index].selected = !updatedUsers[index].selected
    
    this.setData({
      users: updatedUsers
    })
    
    this.updateSelectionCount()
  },

  /**
   * 更新选择数量
   */
  updateSelectionCount() {
    const { users } = this.data
    
    const selectedCount = users.filter(item => item.selected).length
    const totalCount = users.length
    
    this.setData({
      selectedCount,
      isAllSelected: selectedCount === totalCount && totalCount > 0
    })
  },

  /**
   * 切换全选状态
   */
  toggleSelectAll() {
    const { users, isAllSelected } = this.data
    
    const updatedUsers = users.map(item => ({
      ...item,
      selected: !isAllSelected
    }))
    
    this.setData({
      users: updatedUsers
    })
    
    this.updateSelectionCount()
  },

  /**
   * 批量删除
   */
  batchDelete() {
    const { users, selectedCount } = this.data
    
    if (selectedCount === 0) {
      wx.showToast({ title: '请先选择要删除的用户', icon: 'none' })
      return
    }
    
    wx.showModal({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedCount} 个用户吗？此操作不可恢复。`,
      success: (res) => {
        if (res.confirm) {
          this.performBatchDelete()
        }
      }
    })
  },

  /**
   * 执行批量删除
   */
  performBatchDelete() {
    const { users } = this.data
    
    const selectedUsers = users.filter(item => item.selected)
    const deletePromises = selectedUsers.map(item => 
      request(`/api/admin/users/${item.id}`, 'DELETE')
    )
    
    wx.showLoading({ title: '删除中...' })
    
    Promise.all(deletePromises)
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: `成功删除 ${selectedUsers.length} 个用户` })
        
        // 退出批量模式并重新加载数据
        this.exitBatchMode()
        this.fetchUsers()
      })
      .catch(err => {
        wx.hideLoading()
        wx.showToast({ title: '删除失败，请重试', icon: 'none' })
      })
  }
})