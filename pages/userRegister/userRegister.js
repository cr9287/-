const { request } = require('../../utils/api')

Page({
  data: {
    account: '',
    password: '',
    confirm: '',
    name: '',
    phone: '',
    submitting: false,
    canSubmit: false,
    passwordVisible: false,
    confirmPasswordVisible: false,
    errors: {
      account: '',
      password: '',
      confirm: '',
      phone: ''
    }
  },
  
  onLoad() {
    // 初始状态下不能提交
  },
  
  togglePasswordVisibility() {
    this.setData({
      passwordVisible: !this.data.passwordVisible
    })
  },
  
  toggleConfirmPasswordVisibility() {
    this.setData({
      confirmPasswordVisible: !this.data.confirmPasswordVisible
    })
  },
  
  // 获取字段错误信息
  getFieldError(field, value) {
    const { password } = this.data
    let error = ''
    
    switch (field) {
      case 'account':
        if (!value || !value.trim()) {
          error = '请输入用户名'
        }
        break
      case 'password':
        if (!value) {
          error = '请输入密码'
        } else if (value.length < 6 || value.length > 16) {
          error = '密码长度必须为6-16位'
        } else if (!/^[a-zA-Z0-9]+$/.test(value)) {
          error = '密码只能包含字母和数字'
        }
        break
      case 'confirm':
        if (!value) {
          error = '请确认密码'
        } else if (value !== password) {
          error = '两次输入的密码不一致'
        }
        break
      case 'phone':
        if (value && !/^\d{11}$/.test(value)) {
          error = '手机号格式不正确'
        }
        break
    }
    return error
  },

  // 输入事件处理
  onAccount(e) {
    const account = e.detail.value
    const errors = { ...this.data.errors } // 浅拷贝，避免直接修改 data
    errors.account = this.getFieldError('account', account)
    
    this.updateState({ account, errors })
  },
  
  onName(e) {
    this.setData({ name: e.detail.value })
  },
  
  onPhone(e) {
    const phone = e.detail.value
    const errors = { ...this.data.errors } // 浅拷贝
    errors.phone = this.getFieldError('phone', phone)
    
    this.updateState({ phone, errors })
  },
  
  onPassword(e) {
    const password = e.detail.value
    const { confirm } = this.data
    const errors = { ...this.data.errors } // 浅拷贝
    
    // Update password error
    errors.password = this.getFieldError('password', password)
    
    // Re-validate confirm password since it depends on password
    let confirmError = ''
    if (!confirm) {
      confirmError = '请确认密码'
    } else if (confirm !== password) {
      confirmError = '两次输入的密码不一致'
    }
    errors.confirm = confirmError
    
    this.updateState({ password, errors })
  },
  
  onConfirm(e) {
    const confirm = e.detail.value
    const { password } = this.data
    const errors = { ...this.data.errors } // 浅拷贝
    
    let confirmError = ''
    if (!confirm) {
      confirmError = '请确认密码'
    } else if (confirm !== password) {
      confirmError = '两次输入的密码不一致'
    }
    errors.confirm = confirmError
    
    this.updateState({ confirm, errors })
  },
  
  // 统一更新状态并检查是否可以提交
  updateState(updates) {
    // Merge updates into current data to calculate canSubmit
    // Note: updates contains partial updates.
    // We need the FULL state to calculate canSubmit.
    
    const nextData = { ...this.data, ...updates }
    const { account, password, confirm, errors } = nextData
    
    const acc = (account || '').trim()
    const pwd = (password || '').trim()
    const cf = (confirm || '').trim()
    
    // Check if errors exist
    const hasErrors = Object.values(errors).some(error => error !== '')
    
    // Check if required fields are filled
    const canSubmit = acc && pwd && cf && !hasErrors
    
    this.setData({ ...updates, canSubmit })
  },
  
  // 提交注册
  submitRegister() {
    if (!this.data.canSubmit) return
    
    const { account, password, confirm, name, phone } = this.data
    const acc = (account || '').trim()
    const pwd = (password || '').trim()
    const cf = (confirm || '').trim()
    let nickName = (name || '').trim()
    const phoneNum = (phone || '').trim()
    
    // 如果昵称未填写，默认使用用户名
    if (!nickName) {
      nickName = acc
    }
    
    this.setData({ submitting: true })
    
    // 构建注册数据
    const registerData = {
      account: acc,
      password: pwd,
      name: nickName,
      phone: phoneNum
    }
    
    // 注册用户
    request('/api/user/register', 'POST', registerData)
      .then(res => {
        // 注册完成
        wx.showToast({ title: '注册成功' })
        // 跳转到登录页面并传递用户名和密码
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/userLogin/userLogin?account=${encodeURIComponent(acc)}&password=${encodeURIComponent(pwd)}`
          })
        }, 1500)
      })
      .catch(err => {
        // 注册失败
        let errorMsg = '注册失败'
        if (err.data) {
          errorMsg = err.data
        } else if (err.errMsg) {
          errorMsg = err.errMsg
        }
        wx.showToast({ title: errorMsg, icon: 'none' })
        
        // 注册失败后自动刷新页面，重置表单状态
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/userRegister/userRegister'
          })
        }, 1500)
      })
      .finally(() => {
        this.setData({ submitting: false })
      })
  },
  
  goLogin() {
    wx.navigateTo({ url: '/pages/userLogin/userLogin' })
  }
})