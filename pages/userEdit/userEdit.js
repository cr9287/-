const { request } = require('../../utils/api')

Page({
  data: {
    user: {},
    originalUser: {}, // 保存原始用户信息，用于比较是否有修改
    showPasswordForm: false,
    submitting: false,
    canSubmit: false,
    formData: {},
    errors: {},
    currentPasswordVisible: false,
    newPasswordVisible: false
  },

  onLoad() {
    this.loadUserInfo()
  },

  // 加载用户信息
  loadUserInfo() {
    request('/api/user/info', 'GET')
      .then(res => {
        this.setData({
          user: res,
          originalUser: { ...res }, // 深拷贝原始用户信息
          formData: {
            name: res.name || '',
            phone: res.phone || ''
          }
        })
      })
      .catch(err => {
        wx.showToast({ title: '获取用户信息失败', icon: 'none' })
        this.safeNavigateBack()
      })
  },

  // 获取字段错误信息
  getFieldError(name, value) {
    const { showPasswordForm } = this.data
    let error = ''
    
    switch (name) {
      case 'phone':
        if (value && !/^\d{11}$/.test(value)) {
          error = '手机号格式不正确'
        }
        break
      case 'currentPassword':
        if (showPasswordForm && !value) {
          error = '请输入当前密码'
        }
        break
      case 'newPassword':
        if (showPasswordForm) {
          if (!value) {
            error = '请输入新密码'
          } else if (value.length < 6) {
            error = '新密码长度不能少于6位'
          }
        }
        break
    }
    return error
  },

  // 输入变化事件
  onInputChange(e) {
    const name = e.currentTarget.dataset.name
    const value = e.detail.value
    const { originalUser, showPasswordForm } = this.data
    
    // 浅拷贝对象，避免直接修改 data
    const formData = { ...this.data.formData }
    const errors = { ...this.data.errors }
    
    // 更新表单数据
    formData[name] = value
    
    // 验证当前字段
    errors[name] = this.getFieldError(name, value)
    
    // 检查是否可以提交
    const basicInfoChanged = formData.name !== originalUser.name || formData.phone !== originalUser.phone
    
    let passwordFormValid = false
    if (showPasswordForm) {
       // 确保密码字段验证状态是最新的
       const currentError = this.getFieldError('currentPassword', formData.currentPassword)
       const newError = this.getFieldError('newPassword', formData.newPassword)
       errors.currentPassword = currentError
       errors.newPassword = newError
       
       passwordFormValid = !currentError && !newError
    }
    
    // 检查是否有任何修改
    const hasChanges = basicInfoChanged || (showPasswordForm && passwordFormValid)
    
    // 检查是否有错误 (只检查当前显示的字段)
    // 如果 showPasswordForm 为 false，忽略密码错误
    let hasErrors = false
    if (errors.phone) hasErrors = true
    if (showPasswordForm) {
      if (errors.currentPassword || errors.newPassword) hasErrors = true
    }
    
    this.setData({
      formData,
      errors,
      canSubmit: hasChanges && !hasErrors
    })
  },

  // 切换修改密码表单显示
  togglePasswordForm(e) {
    const showPasswordForm = e.detail.value
    const { formData, originalUser } = this.data
    
    // 重置密码相关字段
    const newFormData = {
      ...formData,
      currentPassword: '',
      newPassword: ''
    }
    
    // 重置错误
    const newErrors = {
      ...this.data.errors,
      currentPassword: '',
      newPassword: ''
    }
    
    // 检查是否可以提交
    const basicInfoChanged = newFormData.name !== originalUser.name || newFormData.phone !== originalUser.phone
    const hasErrors = !!newErrors.phone // 只检查手机号错误，因为密码刚重置且为空
    // showPasswordForm 为 true 时，密码为空，valid 为 false (因为必填)，所以 passwordFormValid 为 false
    // 所以 hasChanges 取决于 basicInfoChanged
    
    this.setData({
      showPasswordForm,
      formData: newFormData,
      errors: newErrors,
      currentPasswordVisible: false,
      newPasswordVisible: false,
      canSubmit: basicInfoChanged && !hasErrors
    })
  },
  
  toggleCurrentPasswordVisibility() {
    this.setData({
      currentPasswordVisible: !this.data.currentPasswordVisible
    })
  },
  
  toggleNewPasswordVisibility() {
    this.setData({
      newPasswordVisible: !this.data.newPasswordVisible
    })
  },



  // 提交表单
  submitForm(e) {
    const { formData, showPasswordForm } = this.data
    
    // 验证所有字段
    let isValid = true
    const errors = this.data.errors
    
    // Phone
    const phoneError = this.getFieldError('phone', formData.phone)
    if (phoneError) {
      errors.phone = phoneError
      isValid = false
    }
    
    if (showPasswordForm) {
      const currentError = this.getFieldError('currentPassword', formData.currentPassword)
      const newError = this.getFieldError('newPassword', formData.newPassword)
      
      if (currentError) {
        errors.currentPassword = currentError
        isValid = false
      }
      if (newError) {
        errors.newPassword = newError
        isValid = false
      }
    }
    
    if (!isValid) {
      this.setData({ errors })
      wx.showToast({ title: '请检查表单填写', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    // 构建请求数据
    const requestData = {
      name: formData.name,
      phone: formData.phone
    }

    // 如果需要修改密码，添加密码信息
    if (showPasswordForm) {
      requestData.currentPassword = formData.currentPassword
      requestData.newPassword = formData.newPassword
    }

    // 提交修改
    request('/api/user/update', 'PUT', requestData)
      .then(res => {
        wx.showToast({ title: '修改成功' })
        // 返回上一页并刷新数据
        setTimeout(() => {
          this.safeNavigateBack()
        }, 1500)
      })
      .catch(err => {
        wx.showToast({ title: err.data || '修改失败', icon: 'none' })
      })
      .finally(() => {
        this.setData({ submitting: false })
      })
  },

  // 返回上一页
  goBack() {
    this.safeNavigateBack()
  },
  
  // 安全返回上一页，如果无法返回则跳转到首页
  safeNavigateBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 })
    } else {
      wx.switchTab({ url: '/pages/index/index' })
    }
  }
})