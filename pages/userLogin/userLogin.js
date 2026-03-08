const { getStorage, setStorage } = require('../../utils/storage')
const { request } = require('../../utils/api')

Page({
  data: { 
    account: '',
    password: '',
    loading: false,
    passwordVisible: false
  },
  onLoad(options) {
    // 初始加载时先渲染空表单，避免页面闪烁
    this.setData({
      account: '',
      password: '',
      passwordVisible: false
    })
    
    // 延迟读取数据，避免初始渲染闪烁
    setTimeout(() => {
      // 优先使用URL参数（来自注册页跳转）
      if (options.account) {
        this.setData({
          account: decodeURIComponent(options.account),
          password: decodeURIComponent(options.password || '')
        })
      }
    }, 100)
  },
  onAccount(e) { this.setData({ account: e.detail.value }) },
  onPassword(e) { this.setData({ password: e.detail.value }) },
  togglePasswordVisibility() {
    this.setData({
      passwordVisible: !this.data.passwordVisible
    })
  },
  /**
   * 验证输入安全性
   * @param {string} input - 用户输入
   * @param {string} type - 输入类型（account/password）
   * @returns {boolean} 输入是否安全
   */
  validateInput(input, type) {
    if (!input || typeof input !== 'string') {
      return false
    }
    
    // 移除前后空格
    const trimmedInput = input.trim()
    
    // 检查长度
    if (trimmedInput.length === 0 || trimmedInput.length > 50) {
      return false
    }
    
    // 根据输入类型进行验证
    if (type === 'account') {
      // 账号验证：只允许字母、数字、下划线
      return /^[a-zA-Z0-9_]+$/.test(trimmedInput)
    } else if (type === 'password') {
      // 密码验证：允许字母、数字、特殊字符，但排除危险字符
      return !/[<>"'&]/.test(trimmedInput)
    }
    
    return true
  },
  
  /**
   * 安全过滤错误信息
   * @param {string} message - 原始错误信息
   * @returns {string} 过滤后的错误信息
   */
  sanitizeErrorMessage(message) {
    if (typeof message !== 'string') {
      return '操作失败'
    }
    
    // 移除HTML标签和危险字符
    return message
      .replace(/<[^>]*>/g, '') // 移除HTML标签
      .replace(/[<>"'&]/g, '') // 移除危险字符
      .substring(0, 100) // 限制长度
  },
  
  submitLogin() {
    const { account, password } = this.data
    const acc = (account || '').trim(); const pwd = (password || '').trim()
    
    // 输入验证
    if (!acc || !pwd) {
      return wx.showToast({ title: '请输入账号和密码', icon: 'none' })
    }
    
    // 安全性验证
    if (!this.validateInput(acc, 'account')) {
      return wx.showToast({ title: '账号格式不正确', icon: 'none' })
    }
    
    if (!this.validateInput(pwd, 'password')) {
      return wx.showToast({ title: '密码格式不正确', icon: 'none' })
    }
    
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    // 调用后端登录API
    request('/api/user/login', 'POST', { account: acc, password: pwd })
      .then(res => {
        // 登录成功 - 详细检查返回的数据结构
        
        // 确保返回的数据结构正确
        if (!res.account) {
          throw new Error('登录返回数据异常：缺少账户信息')
        }
        
        const userInfo = {
          account: res.account || '',
          token: res.token || '',
          walletBalance: res.walletBalance || 0,
          name: res.name || '',
          phone: res.phone || ''
        }
        
        // 验证用户信息完整性
        if (!userInfo.account || userInfo.account.trim() === '') {
          throw new Error('登录返回的账户信息为空')
        }
        
        setStorage('userInfo', userInfo)
        
        wx.showToast({ title: '登录成功' })
        wx.switchTab({ url: '/pages/index/index' })
      })
      .catch(err => {
        // 登录失败
        console.error('登录错误:', err)
        let errorMsg = '登录失败，请检查账号或密码'
        
        if (err.statusCode === 401) {
          // 401 错误：账号或密码错误
          errorMsg = '账号或密码错误，请检查后重试'
          if (err.data && typeof err.data === 'string') {
            errorMsg = err.data
          } else if (err.data && err.data.message) {
            errorMsg = err.data.message
          }
        } else if (err.statusCode === 404) {
          // 404 错误：后端服务未找到
          errorMsg = '后端服务未启动，请联系管理员'
        } else if (err.statusCode === 500) {
          // 500 错误：服务器内部错误
          errorMsg = '服务器错误，请稍后重试'
        } else if (err.data) {
          errorMsg = this.sanitizeErrorMessage(err.data)
        } else if (err.errMsg) {
          errorMsg = this.sanitizeErrorMessage(err.errMsg)
        }
        
        wx.showToast({ title: errorMsg, icon: 'none' })
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },
  goAdmin() {
    wx.navigateTo({ url: '/pages/adminLogin/adminLogin' })
  },
  goRegister() {
    wx.navigateTo({ url: '/pages/userRegister/userRegister' })
  }
})