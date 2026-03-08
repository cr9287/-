const { request, getStorage } = require('../../utils/api')
const { hmToDate } = require('../../utils/time')

Page({
  /**
   * 页面的初始数据
   */
  data:{ 
    id:'', 
    userId:'', 
    date:'', 
    startHM:'09:00', 
    endHM:'10:00', 
    endDate:'', 
    totalAmount:'', 
    depositAmount:'', 
    tables:[], 
    tableIndex:-1, 
    users: [],
    userIndex: -1,
    status:'', 
    statusIndex:-1,
    statusOptions:['PENDING', 'RESERVED', 'COMPLETED', 'CANCELLED', 'REFUNDING', 'REFUNDED'], 
    statusLabels:['待支付', '已预约', '已完成', '已取消', '退款中', '已退款']
  },
  
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(query){ const id=query && query.id; this.setData({ id }) },
  
  /**
   * 生命周期函数--监听页面显示
   * 初始化数据加载流程
   */
  onShow(){ 
    // 获取球桌列表数据
    request('/api/admin/tables', 'GET').then(res => {
      const tables = (res.data || []).map(t => ({ id: t.id, name: `${t.name} (#${t.tableNumber})` }))
      this.setData({ tables })
      this.loadUsers() // 链式加载用户列表
    }).catch(err => {
      this.loadUsers()
    })
  },
  
  /**
   * 加载用户列表（只有管理员才能访问）
   */
  loadUsers() {
    // 只有管理员才能加载用户列表
    const adminToken = getStorage('adminToken', null)
    if (!adminToken) {
      wx.showToast({ title: '请先登录管理员', icon: 'none' })
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/adminLogin/adminLogin' })
      }, 1500)
      return
    }
    
    request('/api/admin/users', 'GET').then(res => {
      const users = (res.data || []).map(u => ({
        ...u,
        displayText: `${u.id} | ${u.name || u.account} | 余额 ¥${Number(u.walletBalance||0).toFixed(2)}`
      }))
      this.setData({ users })
      this.loadReservation()
    }).catch(err => {
      this.loadReservation()
    })
  },
  
  /**
   * 加载预约详情数据
   * 并将后端返回的数据格式转换为前端表单所需的格式
   */
  loadReservation() {
    request(`/api/admin/reservations/${this.data.id}`, 'GET')
      .then(res => {
        const r = res.data || res
        if (!r) {
          wx.showToast({ title:'未找到预约数据', icon:'none' })
          return
        }
        
        // 日期时间格式转换
        let dateStr = ''
        let endDateStr = ''
        let startHM = '09:00'
        let endHM = '10:00'

        if (r.startDateTime) {
          const date = new Date(r.startDateTime)
          dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
          startHM = `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`
        }

        if (r.endDateTime) {
          const endDate = new Date(r.endDateTime)
          endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth()+1).padStart(2,'0')}-${String(endDate.getDate()).padStart(2,'0')}`
          endHM = `${String(endDate.getHours()).padStart(2,'0')}:${String(endDate.getMinutes()).padStart(2,'0')}`
        }
        
        // 匹配球桌索引
        let tableIndex = -1
        if (r.tableId && this.data.tables.length > 0) {
            tableIndex = this.data.tables.findIndex(t => t.id == r.tableId)
        }
        
        // 匹配状态索引
        let statusIndex = this.data.statusOptions.indexOf(r.status)
        
        // 匹配用户索引
        let userIndex = -1
        if (r.account && this.data.users.length > 0) {
            userIndex = this.data.users.findIndex(u => u.account === r.account)
        }
        
        // 更新表单数据
        this.setData({
          userId: r.account || '',
          userIndex,
          date: dateStr,
          endDate: endDateStr,
          startHM: startHM,
          endHM: endHM,
          tableIndex,
          status: r.status,
          statusIndex,
          totalAmount: r.totalAmount !== null && r.totalAmount !== undefined ? r.totalAmount : '',
          depositAmount: r.depositAmount !== null && r.depositAmount !== undefined ? r.depositAmount : ''
        })
      })
      .catch(err => {
        wx.showToast({ title:'获取预约数据失败', icon:'none' })
      })
  },
  
  /**
   * 表单输入处理函数集合
   */
  onUser(e){ this.setData({ userId: e.detail.value }) },
  
  onUserChange(e) {
    const idx = e.detail.value
    if (idx >= 0 && this.data.users[idx]) {
      this.setData({ 
        userIndex: idx, 
        userId: this.data.users[idx].account 
      })
    }
  },
  
  onDate(e){ this.setData({ date: e.detail.value }) },
  onEndDate(e){ this.setData({ endDate: e.detail.value }) },
  onStartHM(e){ this.setData({ startHM: e.detail.value }) },
  onEndHM(e){ this.setData({ endHM: e.detail.value }) },
  onTotalAmount(e){ this.setData({ totalAmount: e.detail.value }) },
  onDepositAmount(e){ this.setData({ depositAmount: e.detail.value }) },
  onTableChange(e){ this.setData({ tableIndex: e.detail.value }) },
  onStatusChange(e){ 
      const idx = e.detail.value
      this.setData({ statusIndex: idx, status: this.data.statusOptions[idx] }) 
  },
  
  /**
   * 保存预约修改
   * 包含时间逻辑校验和数据提交
   */
  save(){ 
    // 校验结束时间必须晚于开始时间
    const start = hmToDate(this.data.startHM, new Date(this.data.date))
    const endBase = new Date(this.data.date); const endDate = (this.data.endDate||this.data.date); const end = hmToDate(this.data.endHM, new Date(endDate))
    if (end <= start) return wx.showToast({ title:'结束时间需晚于开始', icon:'none' })
    
    let tableId = null
    if (this.data.tableIndex >= 0) {
      tableId = this.data.tables[this.data.tableIndex].id
    }
    
    // 构造提交数据对象（遵循ISO时间格式）
    const updateData = {
      account: this.data.userId,
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      status: this.data.status,
      tableId: tableId,
      totalAmount: this.data.totalAmount ? Number(this.data.totalAmount) : null,
      depositAmount: this.data.depositAmount ? Number(this.data.depositAmount) : null
    }
    
    // 提交更新请求
    request(`/api/admin/reservations/${this.data.id}`, 'PUT', updateData)
      .then(() => {
        wx.showToast({ title:'已保存' })
        this.safeNavigateBack()
      })
      .catch(err => {
        wx.showToast({ title:'保存失败', icon:'none' })
      })
  },
  
  cancel(){ this.safeNavigateBack() },
  
  /**
   * 安全导航返回
   */
  safeNavigateBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 })
    } else {
      wx.redirectTo({ url: '/pages/adminOrders/adminOrders' })
    }
  }
})
