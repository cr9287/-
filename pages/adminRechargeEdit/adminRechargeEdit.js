// 充值记录编辑页面
const { request } = require('../../utils/api')

Page({
  data: {
    rechargeId: null,
    account: '',
    amount: '',
    paymentMethods: [
      { value: 'WECHAT', text: '微信支付' },
      { value: 'ALIPAY', text: '支付宝' },
      { value: 'CASH', text: '现金' },
      { value: 'ADMIN', text: '管理员代充' }
    ],
    paymentMethodIndex: 0,
    paymentMethod: '',
    statusOptions: [
      { value: 'PENDING', text: '待处理' },
      { value: 'SUCCESS', text: '成功' },
      { value: 'FAILED', text: '失败' }
    ],
    statusIndex: 0,
    status: '',
    adminAccount: '',
    rechargeDate: '',
    rechargeTime: ''
  },

  onLoad(query) {
    if (query.id) {
      this.data.rechargeId = query.id
      this.loadRechargeData()
    } else {
      wx.showToast({ title: '缺少参数', icon: 'none' })
    }
  },

  // 加载充值记录数据
  loadRechargeData() {
    wx.showLoading({ title: '加载中...' })
    
    request(`/api/admin/recharge-records/${this.data.rechargeId}`, 'GET')
      .then(res => {
        wx.hideLoading()
        
        // request 函数已经返回了 res.data，所以直接使用 res
        const data = res
        
        if (data && Object.keys(data).length > 0) {
          // 解析日期时间
          const dateTime = data.createdAt || data.rechargeTime
          let date = ''
          let time = ''
          if (dateTime) {
            const d = new Date(dateTime)
            date = this.formatDate(d)
            time = this.formatTime(d)
          }
          
          // 查找支付方式和状态的索引
          let paymentMethodIndex = this.data.paymentMethods.findIndex(x => x.value === data.paymentMethod)
          let statusIndex = this.data.statusOptions.findIndex(x => x.value === data.status)
          
          // 如果找不到对应的索引，使用默认值
          if (paymentMethodIndex < 0) paymentMethodIndex = 0
          if (statusIndex < 0) statusIndex = 0
          
          // 使用 callback 确保数据设置完成后执行
          this.setData({
            account: data.account || '',
            amount: data.amount ? String(data.amount) : '',
            paymentMethod: data.paymentMethod || 'WECHAT',
            paymentMethodIndex: paymentMethodIndex,
            status: data.status || 'PENDING',
            statusIndex: statusIndex,
            adminAccount: data.adminAccount || '',
            rechargeDate: date,
            rechargeTime: time
          })
        } else {
          wx.showToast({ title: '数据加载失败', icon: 'none' })
        }
      })
      .catch(err => {
        wx.hideLoading()
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 格式化时间
  formatTime(date) {
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${hour}:${minute}`
  },

  // 输入充值金额
  onAmountInput(e) {
    this.setData({ amount: e.detail.value })
  },

  // 选择支付方式
  onPaymentMethodChange(e) {
    const index = e.detail.value
    const method = this.data.paymentMethods[index].value
    this.setData({
      paymentMethodIndex: index,
      paymentMethod: method
    })
  },

  // 选择状态
  onStatusChange(e) {
    const index = e.detail.value
    const status = this.data.statusOptions[index].value
    this.setData({
      statusIndex: index,
      status: status
    })
  },

  // 输入管理员账号
  onAdminAccountInput(e) {
    this.setData({ adminAccount: e.detail.value })
  },

  // 选择日期
  onDateChange(e) {
    this.setData({ rechargeDate: e.detail.value })
  },

  // 选择时间
  onTimeChange(e) {
    this.setData({ rechargeTime: e.detail.value })
  },

  // 保存充值记录
  saveRecharge() {
    // 校验数据
    if (!this.data.amount) {
      wx.showToast({ title: '请输入充值金额', icon: 'none' })
      return
    }
    
    const amount = parseFloat(this.data.amount)
    if (isNaN(amount) || amount <= 0) {
      wx.showToast({ title: '充值金额必须大于 0', icon: 'none' })
      return
    }
    
    if (this.data.paymentMethod === 'ADMIN' && !this.data.adminAccount) {
      wx.showToast({ title: '请输入管理员账号', icon: 'none' })
      return
    }
    
    if (!this.data.rechargeDate || !this.data.rechargeTime) {
      wx.showToast({ title: '请选择充值时间', icon: 'none' })
      return
    }
    
    // 准备数据
    const rechargeData = {
      account: this.data.account,
      amount: amount,
      paymentMethod: this.data.paymentMethod,
      status: this.data.status,
      adminAccount: this.data.adminAccount,
      rechargeTime: `${this.data.rechargeDate} ${this.data.rechargeTime}:00`
    }
    
    wx.showLoading({ title: '保存中...' })
    
    // 调用后端 API 更新
    request(`/api/admin/recharge-records/${this.data.rechargeId}`, 'PUT', rechargeData)
      .then(res => {
        wx.hideLoading()
        wx.showToast({ title: '保存成功', icon: 'success' })
        
        setTimeout(() => {
          // 返回上一页并刷新数据
          wx.navigateBack()
        }, 1500)
      })
      .catch(err => {
        wx.hideLoading()
        let msg = '保存失败'
        if (err.data && err.data.message) {
          msg = err.data.message
        }
        wx.showToast({ title: msg, icon: 'none' })
      })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  }
})
