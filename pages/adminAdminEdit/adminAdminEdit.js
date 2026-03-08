const { request } = require('../../utils/api')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    id: '', // 编辑模式下的管理员ID
    account: '',
    name: '',
    password: '',
    confirmPassword: '',
    passwordVisible: false,
    confirmPasswordVisible: false,
    isFromUser: false, // 标记是否从现有普通用户升级
    users: [], // 可选的普通用户列表
    selectedUserId: '',
    loading: false
  },
  
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(query) {
    const id = query && query.id
    if (id) {
      this.setData({ id })
      this.loadAdminDetail(id)
    } else {
      this.loadUsers() // 加载候选用户列表
    }
  },
  
  /**
   * 加载管理员详情信息（用于编辑模式）
   * @param {string} id - 管理员ID
   */
  loadAdminDetail(id) {
    wx.showLoading({ title: '加载中...' })
    
    request(`/api/admin/admins/${id}`, 'GET')
      .then(res => {
        wx.hideLoading()
        this.setData({
          account: res.account || '',
          name: res.name || ''
        })
      })
      .catch(err => {
        wx.hideLoading()
        wx.showToast({ title: '获取管理员详情失败', icon: 'none' })
      })
  },
  
  /**
   * 加载普通用户候选列表
   * 用于支持将普通用户升级为管理员的功能
   */
  loadUsers() {
    wx.showLoading({ title: '加载用户列表中...' })
    
    request('/api/admin/user-candidates', 'GET')
      .then(res => {
        wx.hideLoading()
        this.setData({ 
          users: res.data || []
        })
      })
      .catch(err => {
        wx.hideLoading()
        wx.showToast({ title: '获取用户列表失败', icon: 'none' })
      })
  },
  
  /**
   * 表单输入处理函数集合
   */
  onAccount(e) { this.setData({ account: e.detail.value }) },
  onName(e) { this.setData({ name: e.detail.value }) },
  onPassword(e) { this.setData({ password: e.detail.value }) },
  onConfirmPassword(e) { this.setData({ confirmPassword: e.detail.value }) },
  onIsFromUser(e) { 
    // 将字符串转换为布尔值
    this.setData({ isFromUser: e.detail.value === 'true' })
  },
  onUserChange(e) { 
    const index = e.detail.value
    this.setData({ selectedUserId: index })
  },

  /**
   * 切换密码显示/隐藏状态
   */
  togglePasswordVisibility() {
    this.setData({
      passwordVisible: !this.data.passwordVisible
    })
  },

  /**
   * 切换确认密码显示/隐藏状态
   */
  toggleConfirmPasswordVisibility() {
    this.setData({
      confirmPasswordVisible: !this.data.confirmPasswordVisible
    })
  },
  
  /**
   * 保存管理员信息（创建或更新）
   * 包含表单验证逻辑
   */
  save() {
    const { id, account, name, password, confirmPassword, isFromUser, users, selectedUserId } = this.data
    
    // 表单验证逻辑
    if (isFromUser) {
      // 模式：从普通用户添加
      if (selectedUserId === '' || selectedUserId === undefined) {
        return wx.showToast({ title: '请选择用户', icon: 'none' })
      }
      
      const selectedUser = users[selectedUserId]
      if (!selectedUser) {
        return wx.showToast({ title: '选择的用户不存在', icon: 'none' })
      }
      
      this.addAdminFromUser(selectedUser.account)
    } else {
      // 模式：直接创建或编辑
      if (!account) {
        return wx.showToast({ title: '请输入账号', icon: 'none' })
      }
      if (!password && !id) {
        return wx.showToast({ title: '请输入密码', icon: 'none' })
      }
      if (password && password !== confirmPassword) {
        return wx.showToast({ title: '两次输入的密码不一致', icon: 'none' })
      }
      
      if (id) {
        this.updateAdmin()
      } else {
        this.createAdmin()
      }
    }
  },
  
  /**
   * 调用 API 创建新管理员
   */
  createAdmin() {
    const { account, name, password } = this.data
    
    wx.showLoading({ title: '创建中...' })
    
    request('/api/admin/admins', 'POST', {
      account,
      password,
      name
    })
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: '创建成功' })
        setTimeout(() => {
          this.safeNavigateBack()
        }, 1500)
      })
      .catch(err => {
        wx.hideLoading()
        wx.showToast({ title: err.data || '创建失败', icon: 'none' })
      })
  },
  
  /**
   * 调用API更新管理员信息
   */
  updateAdmin() {
    const { id, name, password, account } = this.data
    
    // 保护超级管理员admin账号，不允许修改账号名
    if (account === 'admin') {
      wx.showToast({ title: '超级管理员账号信息无法修改', icon: 'none' })
      return
    }
    
    wx.showLoading({ title: '更新中...' })
    
    request(`/api/admin/admins/${id}`, 'PUT', {
      name,
      password
    })
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: '更新成功' })
        setTimeout(() => {
          this.safeNavigateBack()
        }, 1500)
      })
      .catch(err => {
        wx.hideLoading()
        wx.showToast({ title: err.data || '更新失败', icon: 'none' })
      })
  },
  
  /**
   * 调用API将普通用户升级为管理员
   * @param {string} userAccount - 用户账号
   */
  addAdminFromUser(userAccount) {
    wx.showLoading({ title: '添加中...' })
    
    request('/api/admin/admins/from-user', 'POST', {
      userAccount
    })
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: '添加成功' })
        setTimeout(() => {
          this.safeNavigateBack()
        }, 1500)
      })
      .catch(err => {
        wx.hideLoading()
        wx.showToast({ title: err.data || '添加失败', icon: 'none' })
      })
  },
  
  /**
   * 安全返回上一页
   */
  safeNavigateBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 })
    } else {
      wx.redirectTo({ url: '/pages/adminAdmins/adminAdmins' })
    }
  }
})
