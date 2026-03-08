const { request } = require('../../utils/api')

Page({
  data: { 
    reservations: [], 
    loading: true,
    totalCount: 0
  },
  onShow() {
    this.loadReservations()
  },
  
  loadReservations() {
    this.setData({ loading: true })
    
    // 从后端API获取用户预约记录
    request('/api/user/reservations', 'GET')
      .then(res => {
        const raw = res.data || []
        // 按开始时间倒序排列
        const sorted = raw.slice().sort((a,b)=> {
          // 使用startDateTimeStr进行排序，解决iOS日期格式兼容性问题
          const parseDate = (dateStr) => {
            if (!dateStr) return 0
            // 将日期格式转换为iOS兼容格式
            const iosCompatibleDateStr = dateStr.replace(/[-]/g, '/')
            return new Date(iosCompatibleDateStr).getTime()
          }
          const aTime = parseDate(a.startDateTimeStr)
          const bTime = parseDate(b.startDateTimeStr)
          return bTime - aTime
        })
        
        const totalCount = sorted.length
        
        this.setData({ 
          reservations: sorted, 
          loading: false,
          totalCount: totalCount
        })
      })
      .catch(err => {
        this.setData({ 
          reservations: [], 
          loading: false,
          totalCount: 0
        })
        wx.showToast({ title: '获取预约记录失败', icon: 'none' })
      })
  },
  
  // 预约验证功能
  goVerify(e) { 
    const id = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '验证预约',
      content: '确定要验证该预约吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '验证中...' })
          
          // 调用后端API验证预约
          request(`/api/user/reservations/${id}/verify`, 'POST')
            .then(res => {
              wx.hideLoading()
              wx.showToast({ title: '验证成功' })
              // 跳转到计时页面
              const sessionId = res.sessionId
              if (sessionId) {
                wx.navigateTo({ url: `/pages/playTimer/playTimer?sessionId=${sessionId}` })
              } else {
                this.loadReservations() // 重新加载预约记录
              }
            })
            .catch(err => {
              wx.hideLoading()
              wx.showToast({ title: '验证失败', icon: 'none' })
            })
        }
      }
    })
  },
  
  cancelReserve(e) {
    const id = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '取消预约',
      content: '确定要取消该预约吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '取消中...' })
          
          // 调用后端API取消预约
          request(`/api/user/reservations/${id}/cancel`, 'POST')
            .then(res => {
              wx.hideLoading()
              wx.showToast({ title: '已取消预约' })
              this.loadReservations() // 重新加载预约记录
            })
            .catch(err => {
              wx.hideLoading()
              wx.showToast({ title: '取消预约失败', icon: 'none' })
            })
        }
      }
    })
  },
  
  // 跳转到首页
  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})