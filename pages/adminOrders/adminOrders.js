const { request, handleError } = require('../../utils/api');

/**
 * 格式化时间为 HH:mm 格式
 * @param {string|number} ts - 时间戳
 * @returns {string} 格式化后的时间
 */
function fmtHM(ts){ if(!ts) return '--:--'; const d=new Date(ts); const h=String(d.getHours()).padStart(2,'0'); const m=String(d.getMinutes()).padStart(2,'0'); return `${h}:${m}` }

/**
 * 判断时间戳是否在指定日期范围内
 * @param {string|number} ts - 时间戳
 * @param {string} startDate - 开始日期
 * @param {string} endDate - 结束日期
 * @returns {boolean} 是否在范围内
 */
function withinDate(ts, startDate, endDate){ if(!ts) return false; const d=new Date(ts); const ds=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; if(startDate && ds < startDate) return false; if(endDate && ds > endDate) return false; return true }

/**
 * 获取预约状态的中文描述
 * @param {string} status - 预约状态
 * @returns {string} 中文描述
 */
function getReservationStatusText(status) {
  switch(status) {
    case 'PENDING': return '待支付';
    case 'VERIFIED': return '已验证';
    case 'RESERVED': return '已预约';
    case 'EXPIRED': return '已过期';
    case 'CANCELLED': return '已取消'; 
    case 'CANCELED': return '已取消';
    case 'COMPLETED': return '已完成';
    case 'REFUNDING': return '退款中';
    case 'REFUNDED': return '已退款';
    case 'USED': return '已使用';
    default: return status;
  }
}

/**
 * 获取消费状态的中文描述
 */
function getConsumptionStatusText(status) {
  switch(status) {
    case 'PENDING': return '待支付';
    case 'PAID': return '已支付';
    case 'COMPLETED': return '已完成';
    case 'CANCELLED': return '已取消';
    case 'REFUNDING': return '退款中';
    case 'REFUNDED': return '已退款';
    default: return status || '已支付';
  }
}

/**
 * 格式化完整日期时间
 */
function fmtDateTime(ts){ if(!ts) return '--'; const d=new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }

/**
 * 获取支付方式的中文描述
 */
function getPaymentMethodText(method) {
  switch(method) {
    case 'WECHAT': return '微信支付';
    case 'ALIPAY': return '支付宝';
    case 'CASH': return '现金';
    default: return method || '其他';
  }
}

/**
 * 获取充值状态的中文描述
 */
function getRechargeStatusText(status) {
  switch(status) {
    case 'SUCCESS': return '成功';
    case 'FAILED': return '失败';
    case 'PENDING': return '待处理';
    default: return status || '未知';
  }
}

/**
 * 获取充值状态的CSS类名
 */
function getRechargeStatusClass(status) {
  switch(status) {
    case 'SUCCESS': return 'success';
    case 'FAILED': return 'failed';
    case 'PENDING': return 'pending';
    default: return 'unknown';
  }
}

Page({
  /**
   * 页面的初始数据
   */
  data:{
    filterUser:'', startDate:'', endDate:'', activeTab:'reservations',
    reservations:[], sessions:[], consumptions:[], recharges:[],
    displayReservations:[], displaySessions:[], displayConsumptions:[], displayRecharges:[],
    batchMode: false, // 批量操作模式
    selectedCount: 0, // 已选择数量
    isAllSelected: false, // 是否全选
    
    // 统计信息
    stats: {
      totalOrders: 0,
      pendingOrders: 0,
      activeOrders: 0,
      completedOrders: 0
    },
    
    // 充值功能相关数据
    showRechargeModal: false, // 显示充值弹窗
    rechargeAmount: '', // 充值金额
    rechargeTargetAccount: '', // 充值目标账户
    rechargePaymentMethod: 'WECHAT', // 支付方式
    users: [], // 用户列表（用于选择充值目标）
    userIndex: -1, // 选中的用户索引
    canRecharge: false, // 是否可以充值（用于禁用按钮）
    amountError: '' // 金额错误提示
  },

  /**
   * 返回管理员首页
   */
  goBack() {
    wx.navigateBack()
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow(){
    // 检查是否为管理员
    const adminToken = wx.getStorageSync('adminToken')
    if (!adminToken || adminToken === 'null' || adminToken === 'undefined' || adminToken.trim() === '') {
      wx.showToast({
        title: '权限不足，请使用管理员账号登录',
        icon: 'none',
        duration: 2000
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 2000)
      return
    }
    
    // 每次显示页面都重新加载数据，确保数据最新
    this.loadData();
  },

  /**
   * 加载所有订单数据（预约、会话、消费）
   * 并行请求以提高加载效率
   */
  loadData(){
      Promise.all([
        request('/api/admin/reservations', 'GET').catch(err => {
          handleError('获取预约列表失败');
          return { data: [] };
        }),
        request('/api/admin/sessions', 'GET').catch(err => {
          handleError('获取会话列表失败')
          return { data: [] }
        }),
        request('/api/admin/consumptions', 'GET').catch(err => {
          handleError('获取消费记录失败')
          return { data: [] }
        }),
        request('/api/admin/recharge-records', 'GET').catch(err => {
          handleError('获取充值记录失败')
          return { data: [] }
        })
      ]).then(([reservationRes, sessionRes, consumptionRes, rechargeRes]) => {
        // 更新原始数据，并按时间从新到旧排序
        const sessions = sessionRes.data || [];
        const consumptions = consumptionRes.data || [];
        const recharges = rechargeRes.data || [];
        
        // 会话排序：按开始时间从新到旧
        sessions.sort((a, b) => {
          const timeA = a.startAt || a.startDateTime || 0;
          const timeB = b.startAt || b.startDateTime || 0;
          return new Date(timeB) - new Date(timeA);
        });
        
        // 消费记录排序：按结束时间从新到旧
        consumptions.sort((a, b) => {
          const timeA = a.endDateTime || a.endAt || a.startDateTime || a.startAt || 0;
          const timeB = b.endDateTime || b.endAt || b.startDateTime || b.startAt || 0;
          return new Date(timeB) - new Date(timeA);
        });
        
        // 充值记录排序：按创建时间从新到旧
        recharges.sort((a, b) => {
          const timeA = a.createdAt || 0;
          const timeB = b.createdAt || 0;
          return new Date(timeB) - new Date(timeA);
        });
        
        this.setData({
          reservations: reservationRes.data || [],
          sessions: sessions,
          consumptions: consumptions,
          recharges: recharges
        });
        
        // 刷新视图显示
        this.refreshDisplay();
      }).catch(err => {
        wx.showToast({ title: '数据加载失败', icon: 'none' });
      });
    },

  /**
   * 筛选条件变更处理
   */
  onFilterUser(e){ this.setData({ filterUser: (e.detail.value||'').trim() }); this.refreshDisplay() },
  onStartDate(e){ this.setData({ startDate: e.detail.value }); this.refreshDisplay() },
  onEndDate(e){ this.setData({ endDate: e.detail.value }); this.refreshDisplay() },
  clearDates(){ this.setData({ startDate:'', endDate:'' }); this.refreshDisplay() },
  
  /**
   * 切换标签页
   */
  switchTab(e){ const tab=e.currentTarget.dataset.tab; this.setData({ activeTab: tab }); this.refreshDisplay() },
  
  /**
   * 刷新页面显示数据
   * 根据当前标签页和筛选条件过滤数据，并格式化用于展示
   */
  refreshDisplay(){
    const { filterUser, startDate, endDate, activeTab } = this.data
    
    let displayReservations = []
    let displaySessions = []
    let displayConsumptions = []
    let displayRecharges = []
    
    // 优化性能：仅处理当前活动标签页的数据
    if (activeTab === 'reservations' || activeTab === '') {
      // 处理预约数据
      const allReservations = this.data.reservations || [];
      displayReservations = allReservations.filter(x => {
        if (!x || !x.id) return false
        const userOk = !filterUser || (x.account||x.userName||'').includes(filterUser)
        // 日期筛选：任意一个涉及日期在范围内（开始或结束）
        const dateOk = (!startDate && !endDate) || 
                     (x.startDateTime && withinDate(x.startDateTime, startDate, endDate)) || 
                     (x.endDateTime && withinDate(x.endDateTime, startDate, endDate))
        return userOk && dateOk
      }).map(x => ({
        ...x,
        statusText: getReservationStatusText(x.status),
        account: x.account || '--',
        tableName: x.tableName || x.table_id || '--',
        startTime: x.startDateTime ? fmtDateTime(x.startDateTime) : '--',
        endTime: x.endDateTime ? fmtDateTime(x.endDateTime) : '--',
        timeRange: x.startDateTime && x.endDateTime ? `${fmtDateTime(x.startDateTime)} - ${fmtDateTime(x.endDateTime)}` : '--',
        selected: false // 确保每个预约都有selected属性
      }))
    } else if (activeTab === 'sessions') {
      // 处理会话数据 - 只显示进行中的会话（没有结束时间）
      const allSessions = this.data.sessions || [];
      displaySessions = allSessions.filter(x => {
        if (!x || !x.id) return false
        // 只显示没有结束时间的会话（进行中的）
        if (x.endAt || x.endDateTime) return false
        const userOk = !filterUser || (x.account||x.userId||'').includes(filterUser)
        const startTs = x.startAt || x.startDateTime
        const startOk = (!startDate && !endDate) || withinDate(startTs, startDate, endDate)
        return userOk && startOk
      }).map(x => ({ 
          ...x, 
          tableName: x.tableName || '',
          userId: x.account || x.userId || '',
          startText: fmtDateTime(x.startAt || x.startDateTime),
          endText: '--',
          statusText: '进行中',
          selected: false // 确保每个会话都有 selected 属性
      }))
    } else if (activeTab === 'completed') {
      // 处理已完成的会话数据 - 显示有结束时间的会话
      const allSessions = this.data.sessions || [];
      displaySessions = allSessions.filter(x => {
        if (!x || !x.id) return false
        // 只显示有结束时间的会话（已结束的）
        if (!x.endAt && !x.endDateTime) return false
        const userOk = !filterUser || (x.account||x.userId||'').includes(filterUser)
        const endTs = x.endAt || x.endDateTime
        const endOk = (!startDate && !endDate) || withinDate(endTs, startDate, endDate)
        return userOk && endOk
      }).map(x => ({ 
          ...x, 
          tableName: x.tableName || '',
          userId: x.account || x.userId || '',
          startText: fmtDateTime(x.startAt || x.startDateTime),
          endText: fmtDateTime(x.endAt || x.endDateTime),
          statusText: '已完成',
          selected: false // 确保每个会话都有 selected 属性
      }))
    } else if (activeTab === 'consumptions') {
      // 处理消费数据
      const allConsumptions = this.data.consumptions || [];
      displayConsumptions = allConsumptions.filter(x => {
        if (!x || !x.id) return false
        const userOk = !filterUser || (x.account||x.userId||'').includes(filterUser)
        const baseTs = x.endDateTime || x.startDateTime || x.createdAt
        const dateOk = (!startDate && !endDate) || withinDate(baseTs, startDate, endDate)
        return userOk && dateOk
      }).map(x => ({ 
          ...x, 
          tableName: x.tableName || '',
          userId: x.account || x.userId || '',
          amountText: Number(x.amount||0).toFixed(2), 
          periodText: `${fmtDateTime(x.startDateTime||x.startAt)}-${fmtDateTime(x.endDateTime||x.endAt)}`,
          statusText: getConsumptionStatusText(x.status),
          statusClass: x.status ? x.status.toLowerCase() : 'paid',
          selected: false // 确保每个消费记录都有selected属性
      }))
    } else if (activeTab === 'recharges') {
      // 处理充值记录数据
      const allRecharges = this.data.recharges || [];
      displayRecharges = allRecharges.filter(x => {
        if (!x || !x.id) return false
        const userOk = !filterUser || (x.account||x.userName||'').includes(filterUser)
        const dateOk = (!startDate && !endDate) || withinDate(x.rechargeTime, startDate, endDate)
        return userOk && dateOk
      }).map(x => ({ 
          ...x, 
          userName: x.userName || x.account || '未知用户',
          rechargeTime: fmtDateTime(x.rechargeTime),
          paymentMethodText: getPaymentMethodText(x.paymentMethod),
          statusText: getRechargeStatusText(x.status),
          statusClass: getRechargeStatusClass(x.status),
          selected: false // 确保每个充值记录都有selected属性
      }))
    }
    
    // 计算统计信息
    const stats = {
      totalOrders: displayReservations.length + displaySessions.length + displayConsumptions.length,
      pendingOrders: displayReservations.filter(x => x.status === 'PENDING').length,
      activeOrders: displaySessions.length,
      completedOrders: displayConsumptions.filter(x => x.status === 'COMPLETED' || x.status === 'PAID').length
    }
    
    // 更新显示数据 - 修复渲染层错误
    const updateData = {}
    
    if (activeTab === 'reservations' || activeTab === '') {
      updateData.displayReservations = displayReservations
    }
    if (activeTab === 'sessions') {
      updateData.displaySessions = displaySessions
    }
    if (activeTab === 'consumptions') {
      updateData.displayConsumptions = displayConsumptions
    }
    if (activeTab === 'recharges') {
      updateData.displayRecharges = displayRecharges
    }
    
    // 更新统计信息
    updateData.stats = stats
    
    // 只在有数据需要更新时才调用setData
    if (Object.keys(updateData).length > 0) {
      this.setData(updateData)
    }
  },

  /**
   * 跳转至预约编辑页面
   */
  editReservation(e){ 
    const id = e.currentTarget.dataset.id; 
    wx.showModal({
      title: '确认编辑',
      content: '确认编辑该订单？',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: `/pages/adminOrderReservationEdit/adminOrderReservationEdit?id=${id}` })
        }
      }
    })
  },
  
  /**
   * 删除预约记录
   */
  deleteReservation(e){
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确认删除该预约订单？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          request(`/api/admin/reservations/${id}`, 'DELETE').then(() => {
            wx.showToast({ title: '删除成功', icon: 'success' });
            this.loadData();
          }).catch(err => {
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  },

  /**
   * 跳转至会话编辑页面
   */
  editSession(e){ 
    const id = e.currentTarget.dataset.id; 
    wx.showModal({
      title: '确认编辑',
      content: '确认编辑该订单？',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: `/pages/adminOrderSessionEdit/adminOrderSessionEdit?id=${id}` })
        }
      }
    })
  },
  
  /**
   * 删除会话记录
   */
  deleteSession(e){
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确认删除该进行中订单？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          request(`/api/admin/sessions/${id}`, 'DELETE').then(() => {
            wx.showToast({ title: '删除成功', icon: 'success' });
            this.loadData();
          }).catch(err => {
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  },

  /**
   * 跳转至消费记录编辑页面
   */
  editConsumption(e){ 
    const id = e.currentTarget.dataset.id; 
    wx.showModal({
      title: '确认编辑',
      content: '确认编辑该订单？',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: `/pages/adminOrderConsumptionEdit/adminOrderConsumptionEdit?id=${id}` })
        }
      }
    })
  },
  
  /**
   * 删除消费记录
   */
  deleteConsumption(e){
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确认删除该已完成订单？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          request(`/api/admin/consumptions/${id}`, 'DELETE').then(() => {
            wx.showToast({ title: '删除成功', icon: 'success' });
            this.loadData();
          }).catch(err => {
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
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
    const { displayReservations, displaySessions, displayConsumptions } = this.data
    
    // 重置预约选择状态
    const resetReservations = displayReservations.map(item => ({
      ...item,
      selected: false
    }))
    
    // 重置会话选择状态
    const resetSessions = displaySessions.map(item => ({
      ...item,
      selected: false
    }))
    
    // 重置消费选择状态
    const resetConsumptions = displayConsumptions.map(item => ({
      ...item,
      selected: false
    }))
    
    this.setData({
      displayReservations: resetReservations,
      displaySessions: resetSessions,
      displayConsumptions: resetConsumptions
    })
  },

  /**
   * 切换预约选择状态
   */
  toggleSelectReservation(e) {
    const index = e.currentTarget.dataset.index
    const { displayReservations } = this.data
    
    const updatedReservations = [...displayReservations]
    updatedReservations[index].selected = !updatedReservations[index].selected
    
    this.setData({
      displayReservations: updatedReservations
    })
    
    this.updateSelectionCount()
  },

  /**
   * 切换会话选择状态
   */
  toggleSelectSession(e) {
    const index = e.currentTarget.dataset.index
    const { displaySessions } = this.data
    
    const updatedSessions = [...displaySessions]
    updatedSessions[index].selected = !updatedSessions[index].selected
    
    this.setData({
      displaySessions: updatedSessions
    })
    
    this.updateSelectionCount()
  },

  /**
   * 切换消费选择状态
   */
  toggleSelectConsumption(e) {
    const index = e.currentTarget.dataset.index
    const { displayConsumptions } = this.data
    
    const updatedConsumptions = [...displayConsumptions]
    updatedConsumptions[index].selected = !updatedConsumptions[index].selected
    
    this.setData({
      displayConsumptions: updatedConsumptions
    })
    
    this.updateSelectionCount()
  },

  /**
   * 更新选择数量
   */
  updateSelectionCount() {
    const { displayReservations, displaySessions, displayConsumptions, displayRecharges, activeTab } = this.data
    
    let selectedCount = 0
    let totalCount = 0
    
    switch (activeTab) {
      case 'reservations':
        selectedCount = displayReservations.filter(item => item.selected).length
        totalCount = displayReservations.length
        break
      case 'sessions':
        selectedCount = displaySessions.filter(item => item.selected).length
        totalCount = displaySessions.length
        break
      case 'consumptions':
        selectedCount = displayConsumptions.filter(item => item.selected).length
        totalCount = displayConsumptions.length
        break
      case 'recharges':
        selectedCount = displayRecharges.filter(item => item.selected).length
        totalCount = displayRecharges.length
        break
    }
    
    this.setData({
      selectedCount,
      isAllSelected: selectedCount === totalCount && totalCount > 0
    })
  },

  /**
   * 切换全选状态
   */
  toggleSelectAll() {
    const { displayReservations, displaySessions, displayConsumptions, displayRecharges, activeTab, isAllSelected } = this.data
    
    let updatedData = {}
    
    switch (activeTab) {
      case 'reservations':
        updatedData.displayReservations = displayReservations.map(item => ({
          ...item,
          selected: !isAllSelected
        }))
        break
      case 'sessions':
        updatedData.displaySessions = displaySessions.map(item => ({
          ...item,
          selected: !isAllSelected
        }))
        break
      case 'consumptions':
        updatedData.displayConsumptions = displayConsumptions.map(item => ({
          ...item,
          selected: !isAllSelected
        }))
        break
      case 'recharges':
        updatedData.displayRecharges = displayRecharges.map(item => ({
          ...item,
          selected: !isAllSelected
        }))
        break
    }
    
    this.setData(updatedData)
    this.updateSelectionCount()
  },

  /**
   * 验证状态转换是否合法
   * @param {string} currentStatus - 当前状态
   * @param {string} targetStatus - 目标状态
   * @returns {boolean} 转换是否合法
   */
  validateStatusTransition(currentStatus, targetStatus) {
    const validTransitions = {
      'reserved': ['cancelled', 'in_progress'],
      'in_progress': ['completed', 'cancelled'],
      'completed': [], // 已完成状态不可再转换
      'cancelled': []  // 已取消状态不可再转换
    }
    
    return validTransitions[currentStatus]?.includes(targetStatus) || false
  },
  
  /**
   * 批量删除
   */
  batchDelete() {
    const { displayReservations, displaySessions, displayConsumptions, displayRecharges, activeTab, selectedCount } = this.data
    
    if (selectedCount === 0) {
      wx.showToast({ title: '请先选择要删除的记录', icon: 'none' })
      return
    }
    
    wx.showModal({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedCount} 条记录吗？此操作不可恢复。`,
      success: (res) => {
        if (res.confirm) {
          this.performBatchDelete()
        }
      }
    })
  },
  
  /**
   * 修改订单状态
   */
  updateOrderStatus(orderId, newStatus) {
    const order = this.data.displayReservations.find(item => item.id === orderId)
    if (!order) {
      wx.showToast({ title: '订单不存在', icon: 'none' })
      return
    }
    
    // 验证状态转换是否合法
    if (!this.validateStatusTransition(order.status, newStatus)) {
      wx.showToast({ title: '状态转换不合法', icon: 'none' })
      return
    }
    
    // 显示确认对话框
    wx.showModal({
      title: '确认修改状态',
      content: `确定要将订单状态修改为"${this.getStatusText(newStatus)}"吗？`,
      success: (res) => {
        if (res.confirm) {
          this.performStatusUpdate(orderId, newStatus)
        }
      }
    })
  },
  
  /**
   * 执行状态更新操作
   */
  performStatusUpdate(orderId, newStatus) {
    wx.showLoading({ title: '更新中...', mask: true })
    
    request(`/api/admin/reservations/${orderId}/status`, 'PUT', { status: newStatus })
      .then(res => {
        wx.hideLoading()
        wx.showToast({ 
          title: '状态更新成功', 
          icon: 'success',
          duration: 2000
        })
        
        // 刷新数据
        this.loadReservations()
      })
      .catch(err => {
        wx.hideLoading()
        wx.showToast({ 
          title: '状态更新失败', 
          icon: 'none',
          duration: 2000
        })
      })
  },
  
  /**
   * 获取状态显示文本
   */
  getStatusText(status) {
    const statusMap = {
      'reserved': '已预约',
      'in_progress': '进行中',
      'completed': '已完成',
      'cancelled': '已取消'
    }
    return statusMap[status] || status
  },

  /**
   * 执行批量删除
   */
  performBatchDelete() {
    const { displayReservations, displaySessions, displayConsumptions, displayRecharges, activeTab } = this.data
    
    let selectedItems = []
    let deletePromises = []
    
    switch (activeTab) {
      case 'reservations':
        selectedItems = displayReservations.filter(item => item.selected)
        deletePromises = selectedItems.map(item => 
          request(`/api/admin/reservations/${item.id}`, 'DELETE')
        )
        break
      case 'sessions':
        selectedItems = displaySessions.filter(item => item.selected)
        deletePromises = selectedItems.map(item => 
          request(`/api/admin/sessions/${item.id}`, 'DELETE')
        )
        break
      case 'consumptions':
        selectedItems = displayConsumptions.filter(item => item.selected)
        deletePromises = selectedItems.map(item => 
          request(`/api/admin/consumptions/${item.id}`, 'DELETE')
        )
        break
      case 'recharges':
        selectedItems = displayRecharges.filter(item => item.selected)
        deletePromises = selectedItems.map(item => 
          request(`/api/admin/recharge-records/${item.id}`, 'DELETE')
        )
        break
    }
    
    wx.showLoading({ title: '删除中...' })
    
    Promise.all(deletePromises)
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: `成功删除 ${selectedItems.length} 条记录` })
        
        // 退出批量模式并重新加载数据
        this.exitBatchMode()
        this.loadData()
      })
      .catch(err => {
        wx.hideLoading()
        wx.showToast({ title: '批量删除失败', icon: 'none' })
      })
  },

  // ==================== 充值记录相关方法 ====================

  /**
   * 编辑充值记录
   */
  editRecharge(e) {
    const id = e.currentTarget.dataset.id;
    // 跳转到充值记录编辑页面
    wx.navigateTo({
      url: `/pages/adminRechargeEdit/adminRechargeEdit?id=${id}`
    });
  },

  /**
   * 删除充值记录
   */
  deleteRecharge(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条充值记录吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          request(`/api/admin/recharge-records/${id}`, 'DELETE').then(() => {
            wx.showToast({ title: '删除成功', icon: 'success' });
            this.loadData();
          }).catch(err => {
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  },

  /**
   * 切换充值记录选择状态
   */
  toggleSelectRecharge(e) {
    const index = e.currentTarget.dataset.index;
    const { displayRecharges } = this.data;
    
    displayRecharges[index].selected = !displayRecharges[index].selected;
    
    this.setData({
      displayRecharges: displayRecharges
    });
    this.updateSelectionCount();
  },

  // ==================== 管理员充值功能 ====================

  /**
   * 打开充值弹窗
   */
  openRechargeModal() {
    // 加载用户列表
    this.loadUsers().then(() => {
      this.setData({
        showRechargeModal: true,
        rechargeAmount: '',
        rechargeTargetAccount: '',
        rechargePaymentMethod: 'WECHAT',
        userIndex: -1
      })
    }).catch(err => {
      wx.showToast({ title: '加载用户列表失败', icon: 'none' })
    })
  },

  /**
   * 关闭充值弹窗
   */
  closeRechargeModal() {
    this.setData({
      showRechargeModal: false
    })
  },

  /**
   * 加载用户列表
   */
  loadUsers() {
    return new Promise((resolve, reject) => {
      request('/api/admin/users', 'GET')
        .then(res => {
          const users = (res.data || []).map(u => ({
            ...u,
            displayText: `${u.id} | ${u.name || u.account} | 余额 ¥${Number(u.walletBalance||0).toFixed(2)}`
          }))
          this.setData({ 
            users
          })
          resolve(users)
        })
        .catch(err => {
          reject(err)
        })
    })
  },

  /**
   * 选择充值目标用户
   */
  onRechargeUserChange(e) {
    const idx = e.detail.value
    if (idx >= 0 && this.data.users[idx]) {
      const u = this.data.users[idx]
      this.setData({ 
        userIndex: idx, 
        rechargeTargetAccount: u.account
      })
    }
  },

  /**
   * 监听充值金额输入
   */
  onRechargeAmountInput(e) {
    const value = e.detail.value
    this.validateAmount(value)
  },

  /**
   * 选择快捷金额
   */
  selectQuickAmount(e) {
    const amount = e.currentTarget.dataset.amount.toString()
    this.validateAmount(amount)
  },

  /**
   * 验证金额
   */
  validateAmount(value) {
    let amountError = ''
    let canRecharge = false
    
    if (value && value !== '') {
      const amt = Number(value)
      if (isNaN(amt) || amt <= 0) {
        amountError = '充值金额必须大于 0'
      } else if (amt > 10000) {
        amountError = '单次充值金额不能超过 10000 元'
      } else {
        canRecharge = true
      }
    }
    
    this.setData({ 
      rechargeAmount: value,
      amountError: amountError,
      canRecharge: canRecharge
    })
  },

  /**
   * 选择支付方式
   */
  selectRechargePaymentMethod(e) {
    const method = e.currentTarget.dataset.method
    this.setData({ rechargePaymentMethod: method })
  },

  /**
   * 执行充值操作
   */
  doRecharge() {
    // 检查是否可以充值
    if (!this.data.canRecharge) {
      if (!this.data.rechargeAmount) {
        wx.showToast({ title: '请输入充值金额', icon: 'none' })
      } else if (this.data.amountError) {
        wx.showToast({ title: this.data.amountError, icon: 'none' })
      }
      return
    }
    
    if (!this.data.rechargeTargetAccount) return wx.showToast({ title: '请选择充值用户', icon: 'none' })
    
    // 获取选中的用户信息
    const selectedUser = this.data.users[this.data.userIndex]
    const amt = Number(this.data.rechargeAmount)
    
    // 二次确认弹窗
    wx.showModal({
      title: '确认充值',
      content: `用户：${selectedUser.displayText}\n金额：¥${amt.toFixed(2)}\n支付方式：${this.getPaymentMethodName()}\n是否确认充值？`,
      confirmText: '确认',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 用户确认，执行充值
          this.processRecharge(selectedUser, amt)
        }
      }
    })
  },

  /**
   * 获取支付方式名称
   */
  getPaymentMethodName() {
    const methodMap = {
      'WECHAT': '微信支付',
      'ALIPAY': '支付宝',
      'CASH': '现金'
    }
    return methodMap[this.data.rechargePaymentMethod] || '未知'
  },

  /**
   * 处理充值
   */
  processRecharge(selectedUser, amt) {
    // 根据支付方式跳转到不同的仿真支付页面
    if (this.data.rechargePaymentMethod === 'WECHAT') {
      // 跳转到微信支付页面
      wx.navigateTo({
        url: `/pages/wechatPay/wechatPay?amount=${amt}&account=${this.data.rechargeTargetAccount}&name=${selectedUser?.name || ''}&method=WECHAT`
      })
      
      // 关闭充值弹窗
      this.closeRechargeModal()
    } else if (this.data.rechargePaymentMethod === 'ALIPAY') {
      // 跳转到支付宝支付页面
      wx.navigateTo({
        url: `/pages/alipayPay/alipayPay?amount=${amt}&account=${this.data.rechargeTargetAccount}&name=${selectedUser?.name || ''}&method=ALIPAY`
      })
      
      // 关闭充值弹窗
      this.closeRechargeModal()
    } else {
      // 现金支付直接调用 API
      this.performCashRecharge(amt)
    }
  },

  /**
   * 执行现金充值
   */
  performCashRecharge(amt) {
    this.setData({ loading: true })
    
    // 发起充值请求
    request('/api/admin/recharge-records', 'POST', {
      account: this.data.rechargeTargetAccount,
      amount: amt,
      paymentMethod: this.data.rechargePaymentMethod
    })
    .then(res => {
      wx.showToast({ title: '充值成功', icon: 'success' })
      
      // 关闭弹窗并重新加载数据
      this.closeRechargeModal()
      this.loadData()
    })
    .catch(err => {
      let errorMsg = '充值失败'
      if (err.data && err.data.message) {
        errorMsg = err.data.message
      } else if (err.statusCode === 401) {
        errorMsg = '登录已过期，请重新登录'
      } else if (err.statusCode === 403) {
        errorMsg = '权限不足'
      }
      wx.showToast({ title: errorMsg, icon: 'none' })
    })
    .finally(() => {
      this.setData({ loading: false })
    })
  },
})
