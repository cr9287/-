const { request } = require('../../utils/api')
const { getStorage } = require('../../utils/storage')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 支付信息
    payAmount: 0,
    targetAccount: '',
    targetName: '',
    paymentMethod: 'ALIPAY',
    
    // 页面状态
    loading: false,
    paySuccess: false,
    payFailed: false,
    
    // 倒计时
    countdown: 180, // 3分钟
    countdownText: '03:00'
  },

  /**
   * 选择支付方式
   */
  selectPaymentMethod(e) {
    const method = e.currentTarget.dataset.method
    this.setData({ paymentMethod: method })
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { amount, account, name, method, userType } = options
    
    this.setData({
      payAmount: Number(amount) || 0,
      targetAccount: account || '',
      targetName: name || '',
      paymentMethod: method || 'ALIPAY',
      userType: userType || 'user' // 默认为用户充值
    })
    
    // 开始倒计时
    this.startCountdown()
  },

  /**
   * 开始支付倒计时
   */
  startCountdown() {
    this.countdownTimer = setInterval(() => {
      let countdown = this.data.countdown - 1
      
      if (countdown <= 0) {
        clearInterval(this.countdownTimer)
        this.setData({
          payFailed: true
        })
        return
      }
      
      const minutes = Math.floor(countdown / 60).toString().padStart(2, '0')
      const seconds = (countdown % 60).toString().padStart(2, '0')
      
      this.setData({
        countdown: countdown,
        countdownText: `${minutes}:${seconds}`
      })
    }, 1000)
  },

  /**
   * 执行支付操作
   */
  doPayment() {
    this.setData({ loading: true })
    
    // 支付过程
    setTimeout(() => {
      // 根据用户类型调用不同的API
      const apiUrl = this.data.userType === 'admin' ? '/api/admin/recharge-records' : '/api/user/recharge'
      
      request(apiUrl, 'POST', {
        account: this.data.targetAccount,
        amount: this.data.payAmount,
        paymentMethod: this.data.paymentMethod
      })
        .then(res => {
          this.setData({
            loading: false,
            paySuccess: true
          })
          
          // 3秒后自动返回
          setTimeout(() => {
            wx.navigateBack()
          }, 3000)
        })
        .catch(err => {
          this.setData({
            loading: false,
            payFailed: true
          })
        })
    }, 2000) // 支付过程延迟
  },

  /**
   * 重新支付
   */
  retryPayment() {
    this.setData({
      payFailed: false,
      loading: false
    })
    
    // 重新开始倒计时
    this.setData({ countdown: 180, countdownText: '03:00' })
    this.startCountdown()
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack()
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
    }
  }
})