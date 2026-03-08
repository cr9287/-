const { request } = require('../../utils/api')

// 格式化时间，处理无效时间
function formatDateTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ''
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${h}:${m}`
}

// 格式化小时分钟，处理无效时间
function formatHM(ts) {
  if (!ts) return '--:--'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return '--:--'
  
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

Page({
  data: {
    consumptions: [], 
    originalConsumptions: [], // 保存原始数据，用于排序和筛选
    loading: true,
    totalAmount: 0,
    totalCount: 0,
    searchKeyword: '',
    showSortMenu: false,
    sortType: 'time', // time, table, amount
    sortOrder: 'desc', // asc, desc
    sortText: '按时间',
    sortIcon: '↓'
  },
  onShow() {
    this.loadConsumptions()
  },
  
  loadConsumptions() {
    this.setData({ loading: true })
    
    request('/api/user/transactions', 'GET')
      .then(res => {
        const raw = res.data || []
        const sorted = raw
        
        const totalAmount = sorted.reduce((sum, c) => sum + Number(c.amount || 0), 0)
        const totalCount = sorted.length
        
        const list = sorted.map(c => {
          const amount = Number(c.amount || 0)
          let periodText = ''
          if (c.type === 'consumption' || c.consumptionType) {
            // 消费记录和保证金记录显示开始和结束时间
            const start = formatDateTime(new Date(c.startDateTime || 0).getTime())
            const end = formatDateTime(new Date(c.endDateTime || 0).getTime())
            periodText = `${start} - ${end}`
          } else {
            // 充值记录显示创建时间
            periodText = formatDateTime(c.createdAt)
          }
          
          // 处理消费类型
          let consumptionTypeText = ''
          if (c.consumptionType === 'deposit') {
            consumptionTypeText = '预约保证金'
          } else if (c.consumptionType === 'deposit_refund') {
            consumptionTypeText = '保证金退款'
          } else if (c.type === 'recharge') {
            consumptionTypeText = '充值'
          } else {
            consumptionTypeText = '消费'
          }
          
          return {
            ...c,
            periodText: periodText,
            tableText: (c.type === 'consumption' || c.consumptionType) ? `球台：${c.tableId || ''}` : '',
            minutesText: (c.type === 'consumption' || c.consumptionType) ? `${c.minutes || 0} 分钟` : '',
            amount: amount,
            amountText: `￥${amount.toFixed(2)}`,
            amountType: c.type === 'recharge' ? 'recharge' : (c.consumptionType === 'deposit_refund' ? 'refund' : (amount > 0 ? 'paid' : 'consumption')),
            consumptionTypeText: consumptionTypeText,
            // 支付渠道信息
            paymentMethodText: this.getPaymentMethodText(c.paymentMethod)
          }
        })
        
        this.setData({ 
          consumptions: list, 
          originalConsumptions: list, // 保存原始数据
          loading: false,
          totalAmount: totalAmount,
          totalCount: totalCount
        })
      })
      .catch(err => {
        this.setData({ 
          consumptions: [], 
          originalConsumptions: [],
          loading: false,
          totalAmount: 0,
          totalCount: 0
        })
        wx.showToast({ title: '获取消费记录失败', icon: 'none' })
      })
  },
  
  // 搜索输入处理
  onSearchInput(e) {
    const keyword = e.detail.value
    this.setData({ searchKeyword: keyword })
    this.filterAndSortConsumptions(keyword)
  },
  
  // 显示排序菜单
  showSortMenu() {
    this.setData({ showSortMenu: !this.data.showSortMenu })
  },
  
  // 按时间排序
  sortByTime() {
    const { sortOrder } = this.data
    const newOrder = sortOrder === 'desc' ? 'asc' : 'desc'
    this.setData({
      sortType: 'time',
      sortOrder: newOrder,
      sortText: '按时间',
      sortIcon: newOrder === 'desc' ? '↓' : '↑',
      showSortMenu: false
    })
    this.filterAndSortConsumptions(this.data.searchKeyword)
  },
  
  // 按球桌排序
  sortByTable() {
    const { sortOrder } = this.data
    const newOrder = sortOrder === 'desc' ? 'asc' : 'desc'
    this.setData({
      sortType: 'table',
      sortOrder: newOrder,
      sortText: '按球桌',
      sortIcon: newOrder === 'desc' ? '↓' : '↑',
      showSortMenu: false
    })
    this.filterAndSortConsumptions(this.data.searchKeyword)
  },
  
  // 按金额排序
  sortByAmount() {
    const { sortOrder } = this.data
    const newOrder = sortOrder === 'desc' ? 'asc' : 'desc'
    this.setData({
      sortType: 'amount',
      sortOrder: newOrder,
      sortText: '按金额',
      sortIcon: newOrder === 'desc' ? '↓' : '↑',
      showSortMenu: false
    })
    this.filterAndSortConsumptions(this.data.searchKeyword)
  },
  
  // 筛选和排序消费记录
  filterAndSortConsumptions(keyword) {
    let filtered = [...this.data.originalConsumptions]
    
    // 筛选
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase()
      filtered = filtered.filter(item => {
        const tableName = (item.tableName || item.tableId).toString().toLowerCase()
        return tableName.includes(lowerKeyword)
      })
    }
    
    // 排序
    const { sortType, sortOrder } = this.data
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortType) {
        case 'time':
          const timeA = new Date(a.startDateTime || 0).getTime()
          const timeB = new Date(b.startDateTime || 0).getTime()
          comparison = timeA - timeB
          break
        case 'table':
          const tableA = (a.tableName || a.tableId).toString()
          const tableB = (b.tableName || b.tableId).toString()
          comparison = tableA.localeCompare(tableB)
          break
        case 'amount':
          comparison = a.amount - b.amount
          break
      }
      
      return sortOrder === 'desc' ? -comparison : comparison
    })
    
    this.setData({
      consumptions: filtered,
      totalCount: filtered.length
    })
  },
  
  /**
   * 获取支付方式显示文本
   * @param {string} paymentMethod - 支付方式代码
   * @returns {string} 支付方式显示文本
   */
  getPaymentMethodText(paymentMethod) {
    if (!paymentMethod) return ''
    
    const methodMap = {
      'WECHAT': '微信支付',
      'ALIPAY': '支付宝',
      'CASH': '现金',
      'BALANCE': '余额支付'
    }
    
    return methodMap[paymentMethod] || paymentMethod
  },
  
  // 跳转到首页
  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },
  
  /**
   * 显示消费详情
   * @param {Object} e - 事件对象
   */
  showConsumptionDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) {
      wx.showToast({ title: '消费记录ID无效', icon: 'none' })
      return
    }
    
    // 查找对应的消费记录
    const consumption = this.data.consumptions.find(item => item.id === id)
    if (!consumption) {
      wx.showToast({ title: '未找到消费记录', icon: 'none' })
      return
    }
    
    // 显示消费详情弹窗
    wx.showModal({
      title: '消费详情',
      content: this.formatConsumptionDetail(consumption),
      showCancel: false,
      confirmText: '确定'
    })
  },
  
  /**
   * 格式化消费详情显示内容
   * @param {Object} consumption - 消费记录对象
   * @returns {string} 格式化后的详情内容
   */
  formatConsumptionDetail(consumption) {
    const details = []
    
    if (consumption.tableName) {
      details.push(`台球桌: ${consumption.tableName}`)
    }
    
    if (consumption.periodText) {
      details.push(`时间段: ${consumption.periodText}`)
    }
    
    if (consumption.amount) {
      details.push(`金额: ¥${consumption.amount.toFixed(2)}`)
    }
    
    if (consumption.paymentMethod) {
      details.push(`支付方式: ${this.getPaymentMethodText(consumption.paymentMethod)}`)
    }
    
    if (consumption.createdAt) {
      details.push(`时间: ${formatDateTime(consumption.createdAt)}`)
    }
    
    if (consumption.type) {
      details.push(`类型: ${consumption.type === 'recharge' ? '充值' : '消费'}`)
    }
    
    return details.join('\n')
  }
})