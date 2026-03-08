const { request } = require('../../utils/api')

Page({
  data: { 
    ongoingSessions: [], 
    loading: true,
    totalCount: 0
  },
  onShow() {
    this.loadOngoingSessions()
  },
  
  loadOngoingSessions() {
    this.setData({ loading: true })
    
    // 从后端API获取用户的进行中会话
    request('/api/user/sessions', 'GET')
      .then(res => {
        const raw = res.data || []
        
        // 格式化时间显示
        const formattedSessions = raw.map(session => {
          // 处理时间显示 - 显示完整的年月日时分秒
          let displayTime = '时间未知'
          if (session.startDateTime) {
            const startTime = new Date(session.startDateTime)
            
            // 格式化为：YYYY年MM月DD日 HH:mm:ss
            const year = startTime.getFullYear()
            const month = String(startTime.getMonth() + 1).padStart(2, '0')
            const day = String(startTime.getDate()).padStart(2, '0')
            const hours = String(startTime.getHours()).padStart(2, '0')
            const minutes = String(startTime.getMinutes()).padStart(2, '0')
            const seconds = String(startTime.getSeconds()).padStart(2, '0')
            
            displayTime = `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`
          }
          
          return {
            ...session,
            startTime: displayTime,
            startDateTime: session.startDateTime || session.startAt
          }
        })
        
        // 按时间倒序排列
        const sorted = formattedSessions.slice().sort((a,b)=> {
          const timeA = new Date(a.startDateTime || 0).getTime()
          const timeB = new Date(b.startDateTime || 0).getTime()
          return timeB - timeA
        })
        
        const totalCount = sorted.length
        
        this.setData({ 
          ongoingSessions: sorted, 
          loading: false,
          totalCount: totalCount
        })
      })
      .catch(err => {
        this.setData({ 
          ongoingSessions: [], 
          loading: false,
          totalCount: 0
        })
        wx.showToast({ title: '获取会话记录失败', icon: 'none' })
      })
  },
  
  resumeTimer(e) {
    wx.navigateTo({ url: `/pages/playTimer/playTimer?id=${e.currentTarget.dataset.id}` })
  },
  
  // 结算会话
  settleSession(e) {
    const id = e.currentTarget.dataset.id
    
    // 0. 先检查会话状态，避免重复结算
    wx.showLoading({ title: '检查会话状态...' })
    
    request(`/api/sessions/${id}`, 'GET')
      .then(sessionRes => {
        wx.hideLoading()
        
        // 检查会话是否已经结束
        if (sessionRes.endDateTime) {
          // 会话已结束，直接重新加载会话列表，不显示弹窗
          this.loadOngoingSessions()
          return
        }
        
        // 1. 获取结算预览
        wx.showLoading({ title: '计算费用中...' })
        
        request(`/api/sessions/${id}/settlement-preview`, 'GET')
          .then(res => {
            wx.hideLoading()
            // res is the response body
            const { finalPayAmount, insufficientBalance, shortage, durationMinutes, userBalance } = res
            
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
                    this.doSettle(id)
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
  
  doSettle(id) {
    wx.showLoading({ title: '结算中...' })
    
    // 先调用后端API结束会话（如果尚未结束）
    request(`/api/sessions/${id}/end`, 'PUT')
      .then(() => {
        // 然后调用结算API
        return request(`/api/sessions/${id}/settle`, 'POST', {})
      })
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: '结算成功' })
        this.loadOngoingSessions() // 重新加载会话列表
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
          // 不显示弹窗，直接重新加载会话列表
          this.loadOngoingSessions()
        } else if (errMsg.includes('余额不足') || errMsg.includes('请先充值')) {
          // 显示余额不足提示，并提供充值选项
          wx.showModal({
            title: '余额不足',
            content: `您的余额不足，无法完成结算。\n是否立即充值？`,
            confirmText: '立即充值',
            cancelText: '稍后再说',
            success: (res) => {
              if (res.confirm) {
                // 跳转到充值页面，并传递当前会话ID以便充值后返回
                wx.navigateTo({
                  url: `/pages/walletRecharge/walletRecharge?fromSettle=true&sessionId=${id}`
                })
              }
            }
          })
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
  
  // 跳转到首页
  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})