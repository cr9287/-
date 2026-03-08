const { request } = require('../../utils/api')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    walletBalance: 0,
    walletBalanceText: '0.00',
    rechargeAmount: '',
    loading: false,
    targetAccount: '',
    paymentMethod: 'WECHAT',
    
    // 支付弹窗状态
    showWechatPay: false,
    showAlipayPay: false,
    payLoading: false,
    lastPaymentTime: null, // 上次支付时间，用于防止重复支付
    
    // 输入框聚焦状态
    focusedInputId: '',
    
    // 充值快捷金额选项
    quickAmounts: [10, 20, 50, 100, 200, 500],
    
    // 充值历史记录
    rechargeHistory: [],
    showHistory: false,
    
    // 支付安全验证
    paymentPassword: '',
    showPasswordModal: false,
    
    // 支付密码设置
    hasPaymentPassword: false, // 是否已设置支付密码
    
    // 支付重试控制
    paymentRetryCount: 0 // 支付重试次数
  },
  
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 合并setData调用，减少重渲染
    const updateData = {}
    
    // 保存来源页面信息
    if (options.fromPage) {
      updateData.fromPage = options.fromPage
    }
    if (options.tableId) {
      updateData.tableId = options.tableId
    }
    
    // 处理从结算页面跳转过来的情况
    if (options.fromSettle === 'true') {
      updateData.fromSettle = true
      updateData.sessionId = options.sessionId
    }
    
    if (Object.keys(updateData).length > 0) {
      this.setData(updateData)
    }
    
    // 检查支付密码设置状态
    this.checkPaymentPassword()
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 普通用户流程 - 只检查普通用户登录状态
    const user = wx.getStorageSync('userInfo')
    
    if (!user) { 
      wx.showModal({
        title: '未登录',
        content: '请先登录后再进行充值',
        showCancel: false,
        confirmText: '去登录',
        success: () => {
          wx.navigateTo({ url: '/pages/userLogin/userLogin' })
        }
      })
      return 
    }
    
    // 检查 account 字段是否存在且有效
    if (!user.account || user.account.trim() === '') {
      wx.showModal({
        title: '用户信息异常',
        content: '用户账户信息不完整，请重新登录',
        showCancel: false,
        confirmText: '重新登录',
        success: () => {
          // 清除异常的用户信息
          wx.removeStorageSync('userInfo')
          wx.navigateTo({ url: '/pages/userLogin/userLogin' })
        }
      })
      return
    }
    
    // 设置目标账户
    this.setData({
      targetAccount: user.account.trim(),
      paymentMethod: 'WECHAT' // 确保支付方式被正确设置
    })
    
    // 重新检查支付密码状态（从设置密码页面返回时需要更新）
    this.checkPaymentPassword()
    
    // 每次都从后端获取最新的余额数据，不使用缓存
    this.loadUserInfo()
    this.loadRechargeHistory()
    
    // 恢复输入框焦点
    this.restoreFocus()
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 清理所有定时器，防止内存泄漏
    if (this.paymentTimeout) clearTimeout(this.paymentTimeout)
    if (this.passwordTimeout) clearTimeout(this.passwordTimeout)
  },
  
  /**
   * 加载当前登录用户的个人信息（直接从后端获取，不使用缓存）
   */
  loadUserInfo() {
    const user = wx.getStorageSync('userInfo')
    if (!user || !user.account) {
      return
    }
    
    // 每次都从后端请求最新用户数据，不使用缓存
    request('/api/user/info', 'GET', {}, { cache: false, silent: true })
      .then(res => {
        if (!res || typeof res.walletBalance === 'undefined') {
          return
        }
        
        // 只更新页面显示数据，不更新本地缓存
        const bal = Number(res.walletBalance || 0)
        this.setData({ 
          walletBalance: bal, 
          walletBalanceText: bal.toFixed(2),
          targetAccount: user.account
        })
      })
      .catch(err => {
        // 获取失败时不显示错误提示，避免干扰用户
      })
  },
  
  /**
   * 监听充值金额输入（自动格式化）
   */
  onRechargeInput(e) { 
    let value = e.detail.value
    
    // 金额格式自动修正
    // 1. 移除非数字和小数点
    value = value.replace(/[^0-9.]/g, '')
    
    // 2. 处理多个小数点
    const parts = value.split('.')
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('')
    }
    
    // 3. 限制小数位数（最多2位）
    if (value.includes('.')) {
      const decimalPart = value.split('.')[1]
      if (decimalPart && decimalPart.length > 2) {
        value = value.substring(0, value.length - 1)
      }
    }
    
    // 4. 处理前导0（如 000.12 → 0.12；0123 → 123）
    if (value.startsWith('0') && value.length > 1 && !value.startsWith('0.')) {
      // 去除所有前导0
      value = value.replace(/^0+/, '')
      // 如果去除后为空，保留一个0
      if (value === '') value = '0'
    }
    
    this.setData({ rechargeAmount: value }) 
  },

  // 选择快捷金额（自动聚焦输入框）
  selectQuickAmount(e) {
    const amount = e.currentTarget.dataset.amount
    this.setData({ rechargeAmount: amount.toString() }, () => {
      // 选择后自动聚焦输入框，提升体验
      this.restoreFocus()
    })
  },

  // 加载充值历史记录
  loadRechargeHistory() {
    // 从后端获取充值历史记录
    request('/api/user/recharges', 'GET', {}, { silent: true })
      .then(res => {
        const history = res.data || []
        this.setData({ rechargeHistory: history })
      })
      .catch(err => {
        // 获取失败时显示空列表
        this.setData({ rechargeHistory: [] })
      })
  },

  // 显示/隐藏历史记录
  toggleHistory() {
    this.setData({ showHistory: !this.data.showHistory })
  },

  // 支付密码输入事件
  onPaymentPasswordInput(e) {
    this.setData({ paymentPassword: e.detail.value })
  },

  /**
   * 跳转到设置支付密码页面
   */
  goToSetPassword() {
    wx.navigateTo({ 
      url: '/pages/setPaymentPassword/setPaymentPassword?fromPage=walletRecharge'
    })
  },

  /**
   * 处理支付流程
   */
  processPayment() {
    // 根据支付方式显示对应的半框弹窗
    if (this.data.paymentMethod === 'WECHAT') {
      this.setData({ showWechatPay: true })
    } else if (this.data.paymentMethod === 'ALIPAY') {
      this.setData({ showAlipayPay: true })
    }
  },
  
  /**
   * 输入框聚焦事件
   */
  onInputFocus(e) {
    this.setData({ focusedInputId: e.currentTarget.id })
  },
  
  /**
   * 输入框失焦事件
   */
  onInputBlur(e) {
    if (this.data.focusedInputId === e.currentTarget.id) {
      this.setData({ focusedInputId: '' })
    }
  },
  
  /**
   * 页面显示时恢复焦点（修复聚焦失效问题）
   */
  restoreFocus() {
    if (this.data.focusedInputId) {
      setTimeout(() => {
        wx.createSelectorQuery().in(this)
          .select(`#${this.data.focusedInputId}`)
          .focus()
          .exec()
      }, 100)
    }
  },
  
  /**
   * 选择支付方式
   */
  selectPaymentMethod(e) {
    const method = e.currentTarget.dataset.method
    this.setData({ paymentMethod: method })
  },
  
  /**
   * 验证充值金额（修复修正金额未使用问题）
   */
  validateAmount(amount) {
    // 检查是否为空
    if (amount === '' || amount === null || amount === undefined) {
      return { valid: false, message: '请输入充值金额' }
    }
    
    // 检查是否为数字
    if (isNaN(amount)) {
      return { valid: false, message: '请输入有效数字' }
    }
    
    // 转换为数字
    let numAmount = Number(amount)
    
    // 检查最小值
    if (numAmount <= 0) {
      return { valid: false, message: '充值金额必须大于0' }
    }
    
    // 检查最大值（设置充值上限为10000元）
    if (numAmount > 10000) {
      return { valid: false, message: '单次充值金额不能超过10000元' }
    }
    
    // 检查小数位数并自动修正
    const decimalPart = amount.toString().split('.')[1]
    if (decimalPart && decimalPart.length > 2) {
      // 自动修正为2位小数
      numAmount = Math.round(numAmount * 100) / 100
      return { 
        valid: true, 
        message: '',
        correctedAmount: numAmount.toFixed(2)
      }
    }
    
    // 检查特殊字符
    if (/[^0-9.]/.test(amount.toString())) {
      return { valid: false, message: '金额只能包含数字和小数点' }
    }
    
    // 检查多个小数点
    if ((amount.toString().match(/\./g) || []).length > 1) {
      return { valid: false, message: '金额格式不正确' }
    }
    
    // 检查超小数位（小于0.01元）
    if (numAmount < 0.01 && numAmount > 0) {
      return { 
        valid: true, 
        message: '',
        correctedAmount: '0.01'
      }
    }
    
    return { valid: true, message: '', correctedAmount: amount }
  },
  
  /**
   * 检查用户是否已设置支付密码（直接从后端获取，不使用本地缓存）
   */
  checkPaymentPassword() {
    // 直接调用后端 API 检查支付密码设置状态，不依赖本地缓存
    request('/api/user/payment-password/check', 'GET', {}, { silent: true })
      .then(res => {
        const hasPassword = res?.hasPaymentPassword || false
        this.setData({ 
          hasPaymentPassword: hasPassword
        })
      })
      .catch(err => {
        // 默认设置为未设置支付密码
        this.setData({ hasPaymentPassword: false })
      })
  },

  /**
   * 执行充值操作
   */
  doRecharge() {
    const { rechargeAmount } = this.data
    
    // 使用严格的金额验证
    const validation = this.validateAmount(rechargeAmount)
    if (!validation.valid) {
      return wx.showToast({ title: validation.message, icon: 'none' })
    }
    
    // 应用金额修正
    let finalAmount = rechargeAmount
    if (validation.correctedAmount) {
      finalAmount = validation.correctedAmount
      this.setData({ rechargeAmount: finalAmount })
    }
    
    if (!this.data.targetAccount) {
      return wx.showToast({ title: '未找到充值账户', icon: 'none' })
    }
    
    if (!this.data.paymentMethod) {
      return wx.showToast({ title: '请选择支付方式', icon: 'none' })
    }
    
    // 直接调用后端 API 检查支付密码状态（不依赖本地状态）
    this.setData({ loading: true })
    
    request('/api/user/payment-password/check', 'GET')
      .then(res => {
        this.setData({ loading: false })
        // 注意：request 函数已经返回 res.data，所以直接使用 res.hasPaymentPassword
        const hasPassword = res?.hasPaymentPassword || false
        
        if (!hasPassword) {
          // 第一次充值，提示用户设置支付密码
          wx.showModal({
            title: '首次充值提示',
            content: '首次充值需要先设置支付密码，确保账户安全',
            confirmText: '立即设置',
            cancelText: '取消',
            success: (res) => {
              if (res.confirm) {
                // 跳转到设置支付密码页面
                this.goToSetPassword()
              }
            }
          })
          return
        }
        
        // 已设置支付密码，显示支付弹窗
        this.processPayment()
      })
      .catch(err => {
        this.setData({ loading: false })
        // 如果检查失败，默认需要设置密码
        wx.showModal({
          title: '提示',
          content: '无法验证支付密码状态，请重试',
          showCancel: false
        })
      })
  },
  
  /**
   * 关闭支付弹窗
   */
  closePayModal() {
    this.setData({ 
      showWechatPay: false, 
      showAlipayPay: false,
      payLoading: false,
      paymentPassword: '',
      passwordError: '',
      paymentRetryCount: 0
    })
  },
  
  /**
   * 确认微信支付
   */
  confirmWechatPay() {
    // 防止重复提交
    if (this.data.payLoading) {
      wx.showToast({ title: '支付正在进行中', icon: 'none' })
      return
    }
    this.doPayment('WECHAT')
  },
  
  /**
   * 确认支付宝支付
   */
  confirmAlipayPay() {
    // 防止重复提交
    if (this.data.payLoading) {
      wx.showToast({ title: '支付正在进行中', icon: 'none' })
      return
    }
    this.doPayment('ALIPAY')
  },
  
  /**
   * 执行支付操作（修复语法错误 + 完善重试提示）
   */
  doPayment(method) {
    // 防止重复提交
    if (this.data.payLoading) {
      wx.showToast({ title: '支付正在进行中', icon: 'none' })
      return
    }
    
    // 检查支付间隔（防止快速连续支付）
    const now = Date.now()
    if (this.data.lastPaymentTime && (now - this.data.lastPaymentTime) < 3000) {
      wx.showToast({ title: '操作过于频繁，请 3 秒后再试', icon: 'none' })
      return
    }
    
    const amt = Number(this.data.rechargeAmount)
    const paymentPassword = this.data.paymentPassword
    
    // 验证支付密码格式
    if (!paymentPassword || paymentPassword.length !== 6 || !/^\d{6}$/.test(paymentPassword)) {
      this.setData({ 
        passwordError: '支付密码必须为 6 位数字',
        payLoading: false
      })
      return
    }
    
    this.setData({ 
      payLoading: true,
      lastPaymentTime: now
    })
    
    // 设置支付超时（30 秒，包含密码验证时间）
    this.paymentTimeout = setTimeout(() => {
      if (this.data.payLoading) {
        this.setData({ 
          payLoading: false,
          showWechatPay: false,
          showAlipayPay: false,
          paymentPassword: '',
          passwordError: '',
          paymentRetryCount: 0
        })
        wx.showToast({ title: '支付超时，请重试', icon: 'none' })
      }
    }, 30000)
    
    
    // 第一步：验证支付密码
    request('/api/user/payment-password/verify', 'POST', {
      paymentPassword: paymentPassword
    })
    .then(verifyRes => {
      
      // 第二步：密码验证通过后，调用充值 API
      return request('/api/user/recharge', 'POST', {
        amount: amt,
        paymentMethod: method
      })
    })
    .then(res => {
      // 清除超时定时器
      clearTimeout(this.paymentTimeout)
      this.setData({ payLoading: false })
      
      // 支付成功
      wx.showToast({ 
        title: '充值成功', 
        icon: 'success',
        duration: 2000
      })
      
      // 关闭弹窗
      this.closePayModal()
      
      // 清空充值金额和支付密码
      this.setData({ 
        rechargeAmount: '',
        paymentPassword: ''
      })
      
      // 立即从后端获取最新的余额数据（不使用缓存）
      request('/api/user/info', 'GET', {}, { cache: false })
        .then(infoRes => {
          if (infoRes && typeof infoRes.walletBalance !== 'undefined') {
            // 只更新页面显示数据，不更新本地缓存
            const bal = Number(infoRes.walletBalance || 0)
            this.setData({ 
              walletBalance: bal, 
              walletBalanceText: bal.toFixed(2)
            })
            
            // 通知所有页面刷新余额（解决多页面数据同步问题）
            const pages = getCurrentPages()
            pages.forEach(page => {
              if (typeof page.loadWalletData === 'function') {
                page.loadWalletData()
              }
              if (typeof page.refreshUserInfo === 'function') {
                page.refreshUserInfo()
              }
            })
          }
        })
        .catch(err => {
          // 静默处理错误
        })
      
      // 根据来源页面决定跳转逻辑
      setTimeout(() => {
        if (this.data.fromSettle && this.data.sessionId) {
          // 从结算页面跳转过来，返回结算页面并自动重新结算
          wx.navigateBack({ 
            delta: 1,
            success: () => {
              setTimeout(() => {
                const pages = getCurrentPages()
                const currentPage = pages[pages.length - 1]
                if (currentPage && currentPage.doSettle) {
                  currentPage.doSettle(this.data.sessionId)
                }
              }, 500)
            }
          })
        } else if (this.data.fromPage === 'tableDetail' && this.data.tableId) {
          wx.navigateTo({ url: `/pages/tableDetail/tableDetail?id=${this.data.tableId}` })
        } else if (this.data.fromPage === 'index') {
          wx.switchTab({ url: '/pages/index/index' })
        } else {
          // 返回我的页面，确保显示最新余额
          wx.switchTab({ url: '/pages/profile/profile' })
        }
      }, 2000)
    })
    .catch(err => {
      // 清除超时定时器
      clearTimeout(this.paymentTimeout)
      this.setData({ payLoading: false })
      
      // 判断是密码验证失败还是充值失败
      let errorMsg = '充值失败，请稍后重试'
      let title = '充值失败'
      
      // 密码验证失败
      if (err.data && (err.data.includes('密码错误') || err.data.includes('支付密码'))) {
        title = '密码错误'
        errorMsg = '支付密码错误，请重新输入'
        this.setData({ 
          passwordError: '支付密码错误，请重新输入',
          paymentPassword: ''
        })
      } 
      // 用户不存在
      else if (err.status === 404 || 
          err.statusCode === 404 || 
          (err.data && (err.data.includes('未找到') || err.data.includes('不存在') || err.data.includes('注销')))) {
        title = '用户账户异常'
        errorMsg = `充值账户"${this.data.targetAccount}"不存在或已被注销，请重新注册或联系管理员`
        wx.showModal({
          title: '用户账户异常',
          content: errorMsg,
          showCancel: false,
          confirmText: '重新注册',
          success: () => {
            wx.removeStorageSync('userInfo')
            wx.navigateTo({ url: '/pages/userRegister/userRegister' })
          }
        })
      } 
      // 登录过期
      else if (err.status === 401 || err.statusCode === 401) {
        title = '登录过期'
        errorMsg = '登录已过期，请重新登录'
        wx.showModal({
          title: '登录过期',
          content: errorMsg,
          showCancel: false,
          confirmText: '重新登录',
          success: () => {
            wx.removeStorageSync('userInfo')
            wx.navigateTo({ url: '/pages/userLogin/userLogin' })
          }
        })
      }
      
      // 如果不是上面特殊处理的错误，显示错误提示
      if (title !== '用户账户异常' && title !== '登录过期') {
        const displayError = err.data || err.errMsg || errorMsg
        wx.showModal({
          title: title,
          content: displayError,
          showCancel: false,
          confirmText: '重试',
          success: (res) => {
            if (res.confirm) {
              // 用户选择重试，延迟 1 秒后重试，但最多重试 3 次
              if (this.data.paymentRetryCount < 3) {
                this.setData({ paymentRetryCount: this.data.paymentRetryCount + 1 })
                setTimeout(() => {
                  this.doPayment(method)
                }, 1000)
              } else {
                // 超过重试次数，清空状态
                this.setData({ 
                  paymentRetryCount: 0,
                  paymentPassword: '',
                  passwordError: ''
                })
                wx.showToast({ title: '超过重试次数，请稍后再试', icon: 'none' })
              }
            }
          }
        })
      }
    })
  },
  
  /**
   * 输入支付密码
   */
  onPaymentPasswordInput(e) {
    const value = e.detail.value
    this.setData({ 
      paymentPassword: value,
      passwordError: ''
    })
  },
  
  /**
   * 关闭支付弹窗
   */
  closePayModal() {
    this.setData({ 
      showWechatPay: false, 
      showAlipayPay: false,
      payLoading: false,
      paymentPassword: '',
      passwordError: '',
      paymentRetryCount: 0
    })
  }
})