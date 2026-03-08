const { request } = require('../../utils/api')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    newPaymentPassword: '',
    confirmPaymentPassword: '',
    passwordError: '',
    passwordSuccess: false,
    saving: false,
    fromPage: '' // 来源页面
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.fromPage) {
      this.setData({ fromPage: options.fromPage })
    }
  },

  /**
   * 新支付密码输入事件
   */
  onNewPaymentPasswordInput(e) {
    const value = e.detail.value
    // 只允许输入数字
    if (value && !/^\d*$/.test(value)) {
      return
    }
    this.setData({ 
      newPaymentPassword: value,
      passwordError: ''
    })
  },

  /**
   * 确认支付密码输入事件
   */
  onConfirmPaymentPasswordInput(e) {
    const value = e.detail.value
    // 只允许输入数字
    if (value && !/^\d*$/.test(value)) {
      return
    }
    this.setData({ 
      confirmPaymentPassword: value,
      passwordError: ''
    })
  },

  /**
   * 设置支付密码
   */
  setPaymentPassword() {
    const { newPaymentPassword, confirmPaymentPassword } = this.data
    
    // 验证密码格式
    if (!newPaymentPassword || newPaymentPassword.length < 6) {
      this.setData({ 
        passwordError: '支付密码必须为 6 位数字',
        passwordSuccess: false
      })
      return
    }
    
    if (!/^\d{6}$/.test(newPaymentPassword)) {
      this.setData({ 
        passwordError: '支付密码必须为 6 位数字',
        passwordSuccess: false
      })
      return
    }
    
    if (newPaymentPassword !== confirmPaymentPassword) {
      this.setData({ 
        passwordError: '两次输入的密码不一致',
        passwordSuccess: false
      })
      return
    }
    
    // 防止重复提交
    if (this.data.saving) {
      return
    }
    
    this.setData({ saving: true })
    
    // 调用后端 API 设置支付密码
    request('/api/user/payment-password/set', 'POST', {
      paymentPassword: newPaymentPassword
    })
      .then(() => {
        // 显示成功提示
        this.setData({ 
          passwordError: '',
          passwordSuccess: true
        })
        
        // 1. 更新全局状态
        const app = getApp({ allowDefault: true })
        if (app?.globalData?.userInfo) {
          app.globalData.userInfo.hasPaymentPassword = true
        }
        
        // 2. 更新本地存储的用户信息（关键！）
        try {
          const userInfo = wx.getStorageSync('userInfo')
          if (userInfo) {
            userInfo.hasPaymentPassword = true
            wx.setStorageSync('userInfo', userInfo)
            
            // 验证是否真的保存了
            const verify = wx.getStorageSync('userInfo')
          }
        } catch (e) {
          // 静默处理错误
        }
        
        // 3. 强制刷新充值页面的状态（如果存在）
        try {
          const pages = getCurrentPages()
          for (let page of pages) {
            if (page.route === 'pages/walletRecharge/walletRecharge') {
              if (page.checkPaymentPassword) {
                page.checkPaymentPassword()
              }
              break
            }
          }
        } catch (e) {
          // 静默处理错误
        }
        
        // 4. 1.5 秒后返回
        setTimeout(() => {
          wx.showToast({ title: '支付密码设置成功', icon: 'success' })
          
          // 返回上一页
          this.goBack()
        }, 1500)
      })
      .catch(err => {
        this.setData({ saving: false })
        let errorMsg = '设置支付密码失败'
        if (err.data && err.data.message) {
          errorMsg = err.data.message
        }
        this.setData({ 
          passwordError: errorMsg,
          passwordSuccess: false
        })
      })
  },

  /**
   * 返回上一页
   */
  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 })
    } else {
      // 如果没有上一页，跳转到钱包充值页面
      wx.redirectTo({ url: '/pages/walletRecharge/walletRecharge' })
    }
  }
})
