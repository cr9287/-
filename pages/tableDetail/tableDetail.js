const { request } = require('../../utils/api')

Page({
  data: {
    table: {},
    reservedRanges: [],
    statusText: '',
    todayUsageText: '',
    lastUsedText: '',
    loading: false,
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    startDateDisplay: '',
    endDateDisplay: '',
    minDate: '',
    maxDate: '',
    showTimePickerModal: false,
    timePickerType: 'start',
    hours: [],
    minutes: [],
    hourIndex: 0,
    minuteIndex: 0,
    tempHour: '00',
    tempMinute: '00'
  },
  
  onLoad(query) {
    this.data.tableId = query.id
    this.initTimeArrays()
    this.loadTableDetail()
  },
  
  // 初始化时间数组
  initTimeArrays() {
    const hours = []
    const minutes = []
    
    // 生成 0-23 小时
    for (let i = 0; i < 24; i++) {
      hours.push(i)
    }
    
    // 生成 0-50 分钟（每 10 分钟）
    for (let i = 0; i < 60; i += 10) {
      minutes.push(i)
    }
    
    this.setData({
      hours: hours,
      minutes: minutes
    })
  },

  onShow() {
    this.loadTableDetail()
  },

  loadTableDetail() {
    this.setData({ loading: true })
    // 初始化预约时间数据
    this.initReservationTime()
    const today = new Date()
    const y = today.getFullYear(); const m = String(today.getMonth() + 1).padStart(2,'0'); const d = String(today.getDate()).padStart(2,'0')
    const dateKey = `${y}-${m}-${d}`

    // 获取指定球桌详情
    const id = this.data.tableId
    request(`/api/tables/${id}`, 'GET')
      .then(res => {
        const t = res.data || {}
        // 转换球桌类型
        t.typeText = this.tableTypeTextOf(t.type)
        // 获取该球桌当天的预约情况
        request('/api/reservations', 'GET', { tableId: t.id, date: dateKey })
          .then(resvRes => {
            const reservedRanges = resvRes.data || []
            
            // 获取当前登录用户信息
            const userInfo = wx.getStorageSync('userInfo')
            const currentUserAccount = userInfo ? userInfo.account : wx.getStorageSync('account')
            
            // 检查当前用户是否有该球桌的有效预约
            let canOpenTable = false
            // 如果球桌空闲或已预约，允许用户开台（后续会检查用户是否有有效预约）
            if (t.status === 'AVAILABLE') {
              canOpenTable = true
            } else if (t.status === 'RESERVED') {
              // 对于已预约状态的球桌，默认允许开台，后续会通过后端验证
              canOpenTable = true
            }
            // 获取当前用户的有效预约，用于预约开台或检查预约状态
            request(`/api/user/reservations`, 'GET')
              .then(resvRes => {
                // 后端返回的是{"data": [{...}]}格式，所以需要提取data字段
                const rawReservations = resvRes || {}
                const userReservations = rawReservations.data || []
                const now = new Date()
                 
                // 验证已预约状态的球桌是否有当前用户的有效预约
                if (t.status === 'RESERVED') {
                  let hasValidReservation = false
                  for (const resv of userReservations) {
                    try {
                      const resvTableId = Number(resv.tableId)
                      const tableId = Number(t.id)
                      // 确保日期字符串有效
                      const startDateTime = new Date(resv.startDateTime)
                      const endDateTime = new Date(resv.endDateTime)
                      
                      // 确保日期有效且球桌ID匹配
                      if (!isNaN(resvTableId) && !isNaN(tableId) && 
                          resvTableId === tableId && 
                          (resv.status === 'PENDING' || resv.status === 'USED') &&
                          !isNaN(startDateTime.getTime()) && !isNaN(endDateTime.getTime()) &&
                          now >= startDateTime &&
                          now <= endDateTime) {
                        hasValidReservation = true
                        break
                      }
                    } catch (e) {
                      // 忽略无效日期或类型转换错误
                      continue
                    }
                  }
                  // 如果没有有效预约，不允许开台
                  if (!hasValidReservation) {
                    canOpenTable = false
                  }
                }
                 
                // 如果球桌正在使用中，获取会话详情，判断当前用户是否有结算权限
                if (t.status === 'IN_USE' && t.currentSessionId) {
                  // 获取会话详情
                  return request(`/api/sessions/${t.currentSessionId}`, 'GET')
                    .then(sessionRes => {
                      const session = sessionRes || {}
                      // 判断当前用户是否是会话所有者
                      const canSettle = session.account === currentUserAccount
                      return { canSettle, canOpenTable }
                    })
                } else {
                  return { canSettle: false, canOpenTable }
                }
              })
              .then(result => {
                this.setData({
                  table: { ...t, canSettle: result.canSettle, canOpenTable: result.canOpenTable },
                  statusText: this.statusTextOf(t.status),
                  reservedRanges,
                  loading: false
                })
              })
              .catch(err => {

                // 如果获取失败，根据球桌状态设置默认值
                let defaultCanOpenTable = false
                if (t.status === 'AVAILABLE' || t.status === 'RESERVED') {
                  defaultCanOpenTable = true
                }
                this.setData({
                  table: { ...t, canSettle: false, canOpenTable: defaultCanOpenTable },
                  statusText: this.statusTextOf(t.status),
                  reservedRanges,
                  loading: false
                })
              })
          })
          .catch(err => {
            // 获取球桌当天预约情况失败时，也要设置canOpenTable属性
            let canOpenTable = false
            if (t.status === 'AVAILABLE' || t.status === 'RESERVED') {
              canOpenTable = true
            }

            this.setData({
              table: { ...t, canOpenTable },
              statusText: this.statusTextOf(t.status),
              reservedRanges: [],
              loading: false
            })
          })
      })
      .catch(err => {

        wx.showToast({ title: '获取球桌失败', icon: 'none' })
        // 获取球桌详情失败时，也要确保页面状态正确
        this.setData({ 
          loading: false,
          table: {},
          reservedRanges: [],
          statusText: ''
        })
      })
  },
  statusTextOf(s) {
    return s === 'AVAILABLE' ? '空闲' : 
           s === 'IN_USE' ? '使用中' : 
           s === 'RESERVED' ? '已预约' : 
           s === 'FAULT' ? '故障' : '清洁'
  },
  
  // 球桌类型中文转换
  tableTypeTextOf(type) {
    if (!type) return '普通';
    switch (type.toLowerCase()) {
      case 'high':
        return '高级';
      case 'middle':
        return '中级';
      case 'low':
        return '低级';
      default:
        return type;
    }
  },

  openTable() {
    const t = this.data.table
    if (!t || !t.id) return wx.showToast({ title: '请选择球台', icon: 'none' })
    
    // 允许预约用户在预约时间段内开台，即使球桌状态显示为RESERVED
    if (t.status !== 'AVAILABLE' && t.status !== 'RESERVED') {
      return wx.showToast({ title: '该球桌不可开台', icon: 'none' })
    }
    
    // 判断开台类型：如果球桌状态是RESERVED，说明是预约开台；否则是立即开台
    const openType = t.status === 'RESERVED' ? 'reservation' : 'immediate'
    
    // 添加二次确认弹框
    wx.showModal({
      title: '确认开台',
      content: `确定要开启${t.name}吗？\n单价：¥${t.pricePerHour || 30}/小时`,
      success: (res) => {
        if (res.confirm) {
          this.setData({ loading: true })
          
          // 调用后端API进行开台
          // 不传递userId，由后端从token中获取
          request('/api/sessions', 'POST', {
            tableId: t.id,
            openType: openType // 根据球桌状态自动选择开台类型
          })
            .then(res => {
              // 确保正确获取 sessionId，处理不同的返回格式
              const sessionId = res.sessionId || res.id || res
              wx.showToast({ title: '开台成功' })
              this.setData({ loading: false })
              
              // 通知首页刷新球桌状态
              const pages = getCurrentPages()
              pages.forEach(page => {
                if (page.route === 'pages/index/index' && typeof page.refreshTables === 'function') {
                  page.refreshTables()
                }
              })
              
              // 跳转到计时页面，确保 sessionId 存在
              if (sessionId) {
                wx.navigateTo({ url: `/pages/playTimer/playTimer?id=${sessionId}` })
              } else {
                wx.showToast({ title: '获取会话ID失败', icon: 'none' })
              }
            })
            .catch(err => {

              wx.showToast({ title: err.data || '开台失败', icon: 'none' })
              this.setData({ loading: false })
            })
        }
      }
    })
  },
  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 })
    } else {
      wx.switchTab({ url: '/pages/index/index' })
    }
  },
  
  // 初始化预约时间数据 - 自动设置最近的时间段
  initReservationTime() {
    const now = new Date()
    
    // 自动读取最近的时间段：从当前时间开始，向上取整到最近的 10 分钟
    const startDateTime = new Date(now)
    const minutes = startDateTime.getMinutes()
    const remainder = minutes % 10
    
    // 如果当前时间不是整 10 分钟，则向上取整到下一个 10 分钟
    if (remainder > 0) {
      startDateTime.setMinutes(minutes + (10 - remainder), 0, 0)
    } else {
      // 如果已经是整 10 分钟，则设置为当前时间
      startDateTime.setSeconds(0, 0)
    }
    
    // 默认预约时长为 1 小时
    const endDateTime = new Date(startDateTime)
    endDateTime.setHours(endDateTime.getHours() + 1)
    
    // 格式化日期为 YYYY-MM-DD 格式（picker 使用）
    const formatDatePicker = (date) => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
    
    // 格式化日期为 YYYY 年 MM 月 DD 日格式（显示使用）
    const formatDateDisplay = (date) => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}年${m}月${d}日`
    }
    
    // 格式化时间为 HH:mm 格式
    const formatTime = (date) => {
      const h = String(date.getHours()).padStart(2, '0')
      const m = String(date.getMinutes()).padStart(2, '0')
      return `${h}:${m}`
    }
    
    // 计算最小日期（今天）
    const minDate = formatDatePicker(now)
    // 开始日期最多只能提前 3 天预约
    const startMaxDate = new Date(now)
    startMaxDate.setDate(startMaxDate.getDate() + 3)
    const startMaxDateStr = formatDatePicker(startMaxDate)
    
    // 结束日期限制为开始日期 +3 天
    const endMaxDate = new Date(startDateTime)
    endMaxDate.setDate(endMaxDate.getDate() + 3)
    const endMaxDateStr = formatDatePicker(endMaxDate)
    
    this.setData({
      startDate: formatDatePicker(startDateTime),
      startTime: formatTime(startDateTime),
      endDate: formatDatePicker(endDateTime),
      endTime: formatTime(endDateTime),
      startDateDisplay: formatDateDisplay(startDateTime),
      endDateDisplay: formatDateDisplay(endDateTime),
      minDate: minDate,
      startMaxDate: startMaxDateStr,
      endMaxDate: endMaxDateStr,
      showReservationModal: false,
      reservationConfirmData: {}
    })
  },
  
  // 开始日期变化
  onStartDateChange(e) {
    const dateStr = e.detail.value
    const date = new Date(dateStr)
    
    // 格式化显示日期
    const formatDateDisplay = (date) => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}年${m}月${d}日`
    }
    
    // 格式化日期为YYYY-MM-DD格式
    const formatDatePicker = (date) => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
    
    // 结束日期的最大限制是开始日期+3天，但不能超过总预约提前天数限制（今天+3天）
    const endMaxDate = new Date(date)
    endMaxDate.setDate(endMaxDate.getDate() + 3)
    
    // 总预约提前天数限制（今天+3天）
    const totalMaxDate = new Date()
    totalMaxDate.setDate(totalMaxDate.getDate() + 3)
    
    // 取两者中的较小值作为结束日期的最大限制
    const finalEndMaxDate = endMaxDate > totalMaxDate ? totalMaxDate : endMaxDate
    const finalEndMaxDateStr = formatDatePicker(finalEndMaxDate)
    
    // 如果当前结束日期超过了新的最大限制，调整结束日期
    const currentEndDate = new Date(this.data.endDate)
    if (currentEndDate > finalEndMaxDate) {
      this.setData({
        endDate: finalEndMaxDateStr,
        endDateDisplay: formatDateDisplay(finalEndMaxDate)
      })
    }
    
    this.setData({
      startDate: dateStr,
      startDateDisplay: formatDateDisplay(date),
      endMaxDate: finalEndMaxDateStr
    })
  },
  
  // 结束日期变化
  onEndDateChange(e) {
    const dateStr = e.detail.value
    const date = new Date(dateStr)
    
    // 格式化显示日期
    const formatDateDisplay = (date) => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}年${m}月${d}日`
    }
    
    this.setData({
      endDate: dateStr,
      endDateDisplay: formatDateDisplay(date)
    })
  },
  
  // 显示时间选择器 - 使用 picker-view
  showTimePicker(e) {
    const type = e.currentTarget.dataset.type
    const currentTime = type === 'start' ? this.data.startTime : this.data.endTime
    
    const [hour, minute] = currentTime.split(':')
    const hourIndex = parseInt(hour)
    const minuteIndex = Math.floor(parseInt(minute) / 10)
    
    this.setData({
      timePickerType: type,
      hourIndex: hourIndex,
      minuteIndex: minuteIndex,
      tempHour: hour,
      tempMinute: minute,
      showTimePickerModal: true
    })
  },
  
  onPickerChange(e) {
    const [newHourIndex, newMinuteIndex] = e.detail.value
    const newHour = String(newHourIndex).padStart(2, '0')
    const newMinute = String(newMinuteIndex * 10).padStart(2, '0')
    
    this.setData({
      tempHour: newHour,
      tempMinute: newMinute,
      hourIndex: newHourIndex,
      minuteIndex: newMinuteIndex
    })
  },
  
  onPickStart() {
  },
  
  onPickEnd() {
  },
  
  confirmPicker() {
    const time = `${this.data.tempHour}:${this.data.tempMinute}`
    
    if (this.data.timePickerType === 'start') {
      this.setData({ 
        startTime: time,
        showTimePickerModal: false
      }, () => {
        wx.showToast({ title: '已选择开始时间', icon: 'success', duration: 1500 })
      })
    } else {
      this.setData({ 
        endTime: time,
        showTimePickerModal: false
      }, () => {
        wx.showToast({ title: '已选择结束时间', icon: 'success', duration: 1500 })
      })
    }
  },
  
  goReserve() {
    if (!this.data.table || !this.data.table.id) return wx.showToast({ title: '请选择球台', icon: 'none' })
    
    const { startDate, startTime, endDate, endTime, startDateDisplay, endDateDisplay, table } = this.data
    
    // 基本校验
    const start = new Date(`${startDate} ${startTime}`)
    const end = new Date(`${endDate} ${endTime}`)
    
    if (end <= start) {
      return wx.showToast({ title: '结束时间必须晚于开始时间', icon: 'none' })
    }
    
    // 计算预约时长（分钟和小时）
    const durationMinutes = (end.getTime() - start.getTime()) / (60 * 1000)
    const durationHours = (durationMinutes / 60).toFixed(1)
    
    // 获取球台单价，优先使用小时价
    let pricePerHour = table.pricePerHour || 30.0
    // 计算保证金：预约时长×单价×5%
    const depositAmount = Math.round((durationMinutes / 60.0) * pricePerHour * 0.05 * 100.0) / 100.0
    
    // 获取用户当前余额
    wx.showLoading({ title: '查询余额中...' })
    request('/api/user/info', 'GET')
      .then(userInfo => {
        wx.hideLoading()
        const balance = userInfo.walletBalance || 0
        const isBalanceEnough = balance >= depositAmount
        
        // 设置弹框数据并显示
        this.setData({
          reservationConfirmData: {
            tableName: table.name,
            tableType: table.typeText || '美式桌球',
            pricePerHour: pricePerHour.toFixed(2),
            startDisplay: `${startDateDisplay} ${startTime}`,
            endDisplay: `${endDateDisplay} ${endTime}`,
            durationHours: durationHours,
            deposit: depositAmount.toFixed(2),
            balance: balance.toFixed(2),
            isBalanceEnough: isBalanceEnough,
            startIso: start.toISOString(),
            endIso: end.toISOString(),
            account: userInfo.account || wx.getStorageSync('account')
          },
          showReservationModal: true
        })
      })
      .catch(err => {
        wx.hideLoading()
        wx.showToast({ title: '获取用户信息失败', icon: 'none' })
      })
  },
  
  closeReservationModal() {
    this.setData({
      showReservationModal: false
    })
  },
  
  confirmReservation() {
    const data = this.data.reservationConfirmData
    
    if (!data.isBalanceEnough) {
      wx.showModal({
        title: '余额不足',
        content: '当前余额不足以支付保证金，请先充值',
        confirmText: '去充值',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ 
              url: `/pages/walletRecharge/walletRecharge?fromPage=tableDetail&tableId=${this.data.table.id}` 
            })
          }
        }
      })
      return
    }
    
    this.setData({
      showReservationModal: false
    })
    
    wx.showLoading({ title: '预约中...' })
    
    // 准备预约数据
    const reservationData = {
      tableId: this.data.table.id,
      account: data.account,
      startDateTime: data.startIso,
      endDateTime: data.endIso
    }
    
    // 调用预约 API
    request('/api/reservations', 'POST', reservationData)
      .then(res => {
        wx.hideLoading()
        
        // 显示预约成功提示，包含保证金信息
        wx.showModal({
          title: '预约成功',
          content: `已扣除保证金¥${data.deposit}，请在预约时间开始后 20 分钟内开台！`,
          showCancel: false,
          confirmText: '知道了',
          success: () => {
            // 刷新预约记录页面的数据
            const pages = getCurrentPages()
            pages.forEach(page => {
              if (page.route === 'pages/myReservations/myReservations' && typeof page.loadReservations === 'function') {
                page.loadReservations()
              }
            })
            
            // 通知首页刷新球桌状态
            pages.forEach(page => {
              if (page.route === 'pages/index/index' && typeof page.refreshTables === 'function') {
                page.refreshTables()
              }
            })
            
            // 预约成功后跳转到预约记录页面
            setTimeout(() => {
              wx.navigateTo({ url: '/pages/myReservations/myReservations' })
            }, 500)
          }
        })
      })
      .catch(err => {
        wx.hideLoading()

        // 预约失败时显示弹框提醒用户，点击确认后跳转到首页
        wx.showModal({
          title: '预约失败',
          content: err.data || '预约失败',
          showCancel: false,
          success: () => {
            // 留在当前页面，不强制跳转
          }
        })
      })
  },

  goSettle() {
    const { table } = this.data
    if (table && table.currentSessionId) {
      const sessionId = table.currentSessionId
      
      // 0. 先检查会话状态，避免重复结算
      wx.showLoading({ title: '检查会话状态...' })
      
      request(`/api/sessions/${sessionId}`, 'GET')
        .then(sessionRes => {
          wx.hideLoading()
          
          // 检查会话是否已经结束
          if (sessionRes.endDateTime) {
            // 会话已结束，直接重新加载页面，不显示弹窗
            this.loadTableDetail()
            return
          }
          
          // 1. 获取结算预览
          wx.showLoading({ title: '计算费用中...' })
          
          request(`/api/sessions/${sessionId}/settlement-preview`, 'GET')
            .then(res => {
              wx.hideLoading()
              const { finalPayAmount, insufficientBalance, shortage, durationMinutes } = res
              
              // 2. 确认结算弹窗
              wx.showModal({
                title: '确认结算',
                content: `已使用${durationMinutes}分钟，本次消费：¥${finalPayAmount}。确认要结束使用？`,
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    if (insufficientBalance) {
                      // 余额不足提示
                      wx.showModal({
                        title: '余额不足',
                        content: `您的余额不足，还差¥${shortage}，请先充值。`,
                        showCancel: true,
                        cancelText: '取消结算',
                        confirmText: '去充值',
                        success: (rechargeRes) => {
                          if (rechargeRes.confirm) {
                            wx.navigateTo({ 
                              url: `/pages/walletRecharge/walletRecharge?fromSettle=true&sessionId=${sessionId}` 
                            })
                          }
                        }
                      })
                    } else {
                      // 余额充足，执行结算
                      this.doSettle(sessionId)
                    }
                  }
                }
              })
            })
            .catch(err => {
              wx.hideLoading()
              let errMsg = '获取结算信息失败'
              if (err.data) {
                if (typeof err.data === 'string') {
                  errMsg = err.data
                } else if (err.data.message) {
                  errMsg = err.data.message
                }
              }
              wx.showToast({ title: errMsg, icon: 'none' })
            })
        })
        .catch(err => {
          wx.hideLoading()
          let errMsg = '检查会话状态失败'
          if (err.data) {
            if (typeof err.data === 'string') {
              errMsg = err.data
            } else if (err.data.message) {
              errMsg = err.data.message
            }
          }
          wx.showToast({ title: errMsg, icon: 'none' })
        })
    }
  },

  doSettle(sessionId) {
    wx.showLoading({ title: '结算中...' })
    
    // 先调用后端 API 结束会话（如果尚未结束）
    request(`/api/sessions/${sessionId}/end`, 'PUT')
      .then(() => {
        // 然后调用结算 API
        return request(`/api/sessions/${sessionId}/settle`, 'POST', {})
      })
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: '结算成功' })
        
        // 通知首页刷新球桌状态
        const pages = getCurrentPages()
        pages.forEach(page => {
          if (page.route === 'pages/index/index' && typeof page.refreshTables === 'function') {
            page.refreshTables()
          }
        })
        
        // 重新加载球桌详情
        this.loadTableDetail()
      })
      .catch(err => {
        wx.hideLoading()
        let errMsg = '结算失败'
        
        // 解析错误信息
        if (err && err.data) {
          if (typeof err.data === 'string') {
            errMsg = err.data
          } else if (err.data.message) {
            errMsg = err.data.message
          }
        }
        
        // 静默处理会话已结束的情况
        if (errMsg.includes('会话已结束') || errMsg.includes('已结束') || err.statusCode === 400) {
          // 不显示弹窗，直接重新加载球桌详情
          this.loadTableDetail()
        } else {
          // 其他错误，显示错误信息
          wx.showModal({
            title: '结算失败',
            content: '结算过程中出现异常，请稍后重试。',
            showCancel: false,
            confirmText: '我知道了'
          })
        }
      })
  }
})