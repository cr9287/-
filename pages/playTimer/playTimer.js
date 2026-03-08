const { request, handleError } = require('../../utils/api')

Page({
  data: {
    session: {},
    startText: '',
    elapsedText: '00:00',
    amount: 0,
    amountText: '0.00',
    loading: false,
    timerBarWidth: 0 // 动态计时条宽度，0-100%
  },
  timer: null,
  statusTimer: null,
  onLoad(query) {
    this._unloaded = false
    this.setData({ loading: true })
    // 同时支持id和sessionId两种参数名，确保从不同页面进入都能正确获取会话ID
    const sid = query.id || query.sessionId
    
    // 校验会话ID是否存在
    if (!sid || sid === 'undefined') {
      handleError('无效的会话ID')
      if (!this._unloaded) this.setData({ loading: false })
      // 返回上一页，如果无法返回则跳转到首页
      setTimeout(() => {
        if (this._unloaded) return
        const pages = getCurrentPages()
        if (pages.length > 1) {
          wx.navigateBack({ delta: 1 })
        } else {
          wx.switchTab({ url: '/pages/index/index' })
        }
      }, 1500)
      return
    }
    
    // 从后端获取会话详情
    request(`/api/sessions/${sid}`, 'GET')
      .then(res => {
        if (this._unloaded) return
        const sess = res || {} // 后端直接返回会话对象，不包装在data属性中
        if (!sess || !sess.id) {
          wx.showToast({ title: '会话不存在', icon: 'none' })
          this.setData({ loading: false })
          return
        }
        
        // 使用正确的字段名startDateTime，而不是startAt
        const start = new Date(sess.startDateTime)
        const startText = `${start.getHours().toString().padStart(2,'0')}:${start.getMinutes().toString().padStart(2,'0')}`
        this.setData({ session: sess, startText, loading: false })
        this.startTicker()
        this.startStatusCheck()
      })
      .catch(err => {
        if (this._unloaded) return
        wx.showToast({ title: '获取会话数据失败', icon: 'none' })
        this.setData({ loading: false })
      })
  },
  onShow() { 
    if (this.data.session && this.data.session.id && !this._unloaded) {
      if (!this.timer) this.startTicker()
      if (!this.statusTimer) this.startStatusCheck()
    }
  },
  onHide() {
    if (this.timer) { 
      clearInterval(this.timer)
      this.timer = null 
    }
    if (this.statusTimer) {
      clearInterval(this.statusTimer)
      this.statusTimer = null
    }
  },
  onUnload() { 
    this._unloaded = true
    if (this.timer) { clearInterval(this.timer); this.timer = null } 
    if (this.statusTimer) { clearInterval(this.statusTimer); this.statusTimer = null }
  },

  startStatusCheck() {
    if (this._unloaded) return
    if (this.statusTimer) clearInterval(this.statusTimer)

    this.statusTimer = setInterval(() => {
      if (this._unloaded || !this.data.session || !this.data.session.id) return
      
      request(`/api/sessions/${this.data.session.id}`, 'GET')
        .then(res => {
          if (!res) return
          
          // 检查会话是否已结束（通过 endDateTime 或 status 判断）
          if (res.endDateTime || res.status === 'COMPLETED') {
            // 先停止所有计时器，防止重复触发
            if (this.statusTimer) {
              clearInterval(this.statusTimer)
              this.statusTimer = null
            }
            if (this.timer) {
              clearInterval(this.timer)
              this.timer = null
            }
            
            // 计算消费金额（从后端获取）
            let amountText = '0.00'
            if (res.amount) {
              amountText = Number(res.amount).toFixed(2)
            } else if (res.finalPayAmount) {
              // 兼容字段名
              amountText = Number(res.finalPayAmount).toFixed(2)
            }
            
            // 防止重复弹窗
            if (this._modalShown) return
            this._modalShown = true
            
            wx.showModal({
              title: '会话结束',
              content: `您的订单已自动结算，消费金额：¥${amountText}`,
              showCancel: false,
              confirmText: '我知道了',
              success: () => {
                // 跳转到首页
                wx.switchTab({
                  url: '/pages/index/index'
                })
              }
            })
          }
        })
        .catch(err => {
          // 静默处理错误
        })
    }, 3000) // 每 3 秒检查一次（从 5 秒改为 3 秒，提升响应速度）
  },

  startTicker() {
    if (this._unloaded) return
    if (this.timer) clearInterval(this.timer)
    
    // 使用后端返回的价格，默认30元/小时（0.5元/分钟）
    const pricePerHour = this.data.session.pricePerHour || 30
    const startTime = new Date(this.data.session.startDateTime).getTime()
    
    this.timer = setInterval(() => {
      if (this._unloaded) {
        if (this.timer) clearInterval(this.timer)
        return
      }
      const now = Date.now()
      const diff = now - startTime
      // 计算原始分钟数
      const rawMinutes = diff / 60000.0
      // 按10分钟单位折算，不足10分钟按10分钟计算，至少10分钟
      const minutes = Math.max(10, Math.ceil(rawMinutes / 10.0) * 10)
      
      // 格式化显示时间（hh:mm:ss）
      const totalSeconds = Math.floor(diff / 1000)
      const hours = Math.floor(totalSeconds / 3600)
      const displayMinutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      const elapsedText = `${String(hours).padStart(2,'0')}:${String(displayMinutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`
      
      // 按10分钟单位计算费用
      const amount = (minutes / 60.0) * pricePerHour
      const amountText = Number(amount).toFixed(2)
      
      // 计算动态计时条宽度（每60秒为一个周期，0-100%）
      const timerBarWidth = (seconds / 60) * 100
      
      this.setData({ 
        elapsedText, 
        amount, 
        amountText,
        timerBarWidth
      })
    }, 1000)
  },

  // 确认结算函数，添加二次确认
  confirmSettle() {
    const { session } = this.data
    
    // 检查会话ID是否存在
    if (!session || !session.id) {
      wx.showToast({ title: '会话无效', icon: 'none' })
      return
    }

    // 0. 先检查会话状态，避免重复结算
    wx.showLoading({ title: '检查会话状态...' })
    
    request(`/api/sessions/${session.id}`, 'GET')
      .then(sessionRes => {
        wx.hideLoading()
        
        // 检查会话是否已经结束
        if (sessionRes.endDateTime) {
          wx.showModal({
            title: '会话已结束',
            content: '该会话已经结束，无法重复结算。',
            showCancel: false,
            confirmText: '我知道了',
            success: () => {
              // 返回上一页
              wx.navigateBack({ delta: 1 })
            }
          })
          return
        }

        // 1. 获取结算预览
        wx.showLoading({ title: '计算费用中...' })
        
        request(`/api/sessions/${session.id}/settlement-preview`, 'GET')
          .then(res => {
            wx.hideLoading()
            const { finalPayAmount, insufficientBalance, shortage, durationMinutes, userBalance } = res
            
            // 2. 确认结算弹窗
            wx.showModal({
              title: '确认结算',
              content: `已使用${durationMinutes}分钟，本次消费：¥${finalPayAmount}。\n当前余额：¥${userBalance || 0}。\n确认要结束使用？`,
              success: (modalRes) => {
                if (modalRes.confirm) {
                  if (insufficientBalance) {
                    // 余额不足提示
                    wx.showModal({
                      title: '余额不足',
                      content: `当前余额不足，需支付 ¥${finalPayAmount}，还差 ¥${shortage}。是否前往充值？`,
                      confirmText: '去充值',
                      cancelText: '取消',
                      success: (rechargeRes) => {
                        if (rechargeRes.confirm) {
                          wx.navigateTo({ url: '/pages/walletRecharge/walletRecharge' })
                        }
                      }
                    })
                  } else {
                    // 余额充足，执行结算
                    this.goSettle()
                  }
                }
              }
            })
          })
          .catch(err => {
            wx.hideLoading()
            const errMsg = (err && err.data) ? err.data : '获取结算预览失败'
            wx.showToast({ title: errMsg, icon: 'none' })
          })
      })
      .catch(err => {
        wx.hideLoading()
        const errMsg = (err && err.data) ? err.data : '检查会话状态失败'
        wx.showToast({ title: errMsg, icon: 'none' })
      })
  },
  
  // 实际结束会话逻辑
  goSettle() {
    const { session } = this.data
    
    this.setData({ loading: true })
    
    // 先调用后端API结束会话
    request(`/api/sessions/${session.id}/end`, 'PUT')
      .then(() => {
        // 然后调用结算API
        return request(`/api/sessions/${session.id}/settle`, 'POST', {})
      })
      .then(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '结算成功', icon: 'success' })
        // 结算成功后返回上一页
        setTimeout(() => {
          wx.navigateBack({ delta: 1 })
        }, 1500)
      })
      .catch(err => {
        this.setData({ loading: false })
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
          // 不显示弹窗，直接返回上一页
          wx.navigateBack({ delta: 1 })
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
  },
  goBack() { wx.navigateBack({ delta: 1 }) }
})