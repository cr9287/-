const { request, getStorage } = require('../../utils/api')

/**
 * 格式化时间为 HH:mm
 */
function formatHM(ts){ 
  if (!ts) return '';
  const d=new Date(ts); 
  const h=String(d.getHours()).padStart(2,'0'); 
  const m=String(d.getMinutes()).padStart(2,'0'); 
  return `${h}:${m}` 
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

Page({
  /**
   * 页面的初始数据
   */
  data:{ 
    id:'', 
    minutes:'', 
    amount:'', 
    originalAmount:0, 
    tableName:'', 
    userId:'', 
    linkWallet:true, 
    tables:[], 
    tableIndex:-1, 
    users: [],
    userIndex: -1,
    status:'', 
    statusIndex:-1, 
    statusOptions:['PENDING', 'PAID', 'COMPLETED', 'CANCELLED', 'REFUNDING', 'REFUNDED'], 
    statusLabels:['待支付', '已支付', '已完成', '已取消', '退款中', '已退款'],
    startDate: '',
    startHM: '',
    endDate: '',
    endHM: ''
  },
  
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(query) {
    if (query && query.id) {
      this.setData({ id: query.id })
    }
  },
  
  /**
   * 生命周期函数--监听页面显示
   * 并行加载球桌和用户数据，然后加载消费记录
   */
  onShow() {
    // 检查管理员权限
    const adminToken = getStorage('adminToken', null)
    if (!adminToken) {
      wx.showToast({ title: '请先登录管理员', icon: 'none' })
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/adminLogin/adminLogin' })
      }, 1500)
      return
    }
    
    const tablesReq = request('/api/admin/tables', 'GET').then(res => {
      const tables = (res.data || []).map(t => ({ id: t.id, name: `${t.name} (#${t.tableNumber})`, pricePerMinute: t.pricePerMinute || (t.pricePerHour/60) || 0.5 }))
      return tables
    }).catch(() => [])
    
    const usersReq = request('/api/admin/users', 'GET').then(res => {
      const users = (res.data || []).map(u => {
        const nick = u.name && u.name.trim() ? u.name : u.account
        const bal = (u.walletBalance || 0).toFixed(2)
        return { account: u.account, name: nick, walletBalance: u.walletBalance || 0, displayText: `${u.account} | ${nick} | 余额 ¥${bal}` }
      })
      return users
    }).catch(() => [])
    
    Promise.all([tablesReq, usersReq]).then(([tables, users]) => {
      this.setData({ tables, users })
      this.loadConsumption()
    }).catch(() => {
      this.loadConsumption()
    })
  },
  
  /**
   * 加载消费记录详情
   * 并初始化表单数据
   */
  loadConsumption() {
    if (!this.data.id) return;
    request(`/api/admin/consumptions/${this.data.id}`, 'GET')
      .then(res => {
        const c = res.data || res || {}
        const start = c.startDateTime ? new Date(c.startDateTime) : (c.createdAt ? new Date(c.createdAt) : new Date());
        const end = c.endDateTime ? new Date(c.endDateTime) : (c.createdAt ? new Date(c.createdAt) : new Date());
        
        let tableIndex = -1
        if (c.tableId && this.data.tables.length > 0) {
            tableIndex = this.data.tables.findIndex(t => t.id == c.tableId)
        }
        
        let statusIndex = this.data.statusOptions.indexOf(c.status)
        if (statusIndex === -1 && c.status) statusIndex = 0; // 默认状态
        
        let userIndex = -1
        if (c.account && this.data.users.length > 0) {
          userIndex = this.data.users.findIndex(u => u.account === c.account)
        }
        
        this.setData({ 
          minutes: String(c.minutes||0), 
          amount: String(c.amount||0), 
          originalAmount: Number(c.amount||0), 
          tableName: c.tableName || c.tableId || '', 
          userId: c.account||c.userId||'',
          userIndex,
          tableIndex,
          status: c.status,
          statusIndex,
          startDate: formatDate(start),
          startHM: formatHM(start),
          endDate: formatDate(end),
          endHM: formatHM(end)
        })
      })
      .catch(err => {
        wx.showToast({ title:'获取消费记录数据失败', icon:'none' })
      })
  },
  
  /**
   * 表单输入处理函数集合
   */
  onMinutes(e){ this.setData({ minutes: e.detail.value }) },
  onAmount(e){ this.setData({ amount: e.detail.value }) },
  onLinkWallet(e){ this.setData({ linkWallet: !!e.detail.value }) },
  onUser(e){ this.setData({ userId: e.detail.value }) },
  
  onUserChange(e){ 
    const idx = Number(e.detail.value)
    if (idx >= 0 && this.data.users[idx]) {
      this.setData({ userIndex: idx, userId: this.data.users[idx].account })
    } else {
      this.setData({ userIndex: -1 })
    }
  },
  
  onTableChange(e){ this.setData({ tableIndex: e.detail.value }) },
  
  onStatusChange(e){ 
      const idx = e.detail.value
      this.setData({ statusIndex: idx, status: this.data.statusOptions[idx] }) 
  },
  
  // 日期/时间选择器处理
  onStartDate(e){ this.setData({ startDate: e.detail.value }); this.recalcMinutes(); },
  onStartHM(e){ this.setData({ startHM: e.detail.value }); this.recalcMinutes(); },
  onEndDate(e){ this.setData({ endDate: e.detail.value }); this.recalcMinutes(); },
  onEndHM(e){ this.setData({ endHM: e.detail.value }); this.recalcMinutes(); },
  
  /**
   * 根据起止时间重新计算时长和金额
   * 当用户修改时间时自动触发
   */
  recalcMinutes() {
    const { startDate, startHM, endDate, endHM } = this.data;
    if (startDate && startHM && endDate && endHM) {
      const start = new Date(`${startDate.replace(/-/g, '/')} ${startHM}`);
      const end = new Date(`${endDate.replace(/-/g, '/')} ${endHM}`);
      
      const diffMs = end.getTime() - start.getTime();
      if (diffMs > 0) {
        const minutes = Math.ceil(diffMs / 60000);
        this.setData({ minutes: String(minutes) });
        
        // 如果关联了球桌，自动计算金额
        if (this.data.tableIndex >= 0) {
            const table = this.data.tables[this.data.tableIndex];
            if (table && table.pricePerMinute) {
                const newAmount = (minutes * table.pricePerMinute).toFixed(2);
                this.setData({ amount: newAmount });
            }
        }
      }
    }
  },
  
  /**
   * 保存消费记录修改
   */
  save(){
    const newMinutes = Number(this.data.minutes||0)
    const newAmount = Number(this.data.amount||0)
    
    let tableId = null
    if (this.data.tableIndex >= 0) {
      tableId = this.data.tables[this.data.tableIndex].id
    }
    
    // 构造时间戳
    const { startDate, startHM, endDate, endHM } = this.data;
    let startDateTime = null;
    let endDateTime = null;
    
    if (startDate && startHM) {
       startDateTime = new Date(`${startDate.replace(/-/g, '/')} ${startHM}`).getTime();
    }
    if (endDate && endHM) {
       endDateTime = new Date(`${endDate.replace(/-/g, '/')} ${endHM}`).getTime();
    }
    
    // 构造更新请求数据
    const updateData = {
      minutes: newMinutes,
      amount: newAmount,
      linkWallet: this.data.linkWallet,
      account: this.data.userId,
      tableId: tableId,
      status: this.data.status,
      startDateTime: startDateTime, 
      endDateTime: endDateTime
    }
    
    // 发送更新请求
    request(`/api/admin/consumptions/${this.data.id}`, 'PUT', updateData)
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
   * 安全返回上一页
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
