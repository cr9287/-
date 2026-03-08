const { request } = require('../../utils/api')

Page({
  data: {
    user: {},
    walletBalance: 0,
    walletBalanceText: '',
    refreshing: false,
    networkError: false,
    loading: false
  },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      })
    }
    
    // 避免重复加载
    if (!this.data.loading) {
      this.setData({ loading: true })
      this.checkLoginStatus()
      this.setData({ loading: false })
    }
  },
  
  // 下拉刷新
  onRefresh() {
    this.setData({ refreshing: true, networkError: false })
    this.loadUserInfo().then(() => {
      this.setData({ refreshing: false })
      wx.showToast({ title: '刷新成功', icon: 'success' })
    }).catch(() => {
      this.setData({ refreshing: false })
    })
  },
  
  // 检查登录状态（从后端获取最新数据）
  checkLoginStatus() {
    // 直接从后端获取用户信息，不使用本地缓存
    request('/api/user/info', 'GET', {}, { silent: true })
      .then(userInfo => {
        if (userInfo && userInfo.account) {
          this.setData({ 
            user: userInfo,
            walletBalance: Number(userInfo.walletBalance || 0),
            walletBalanceText: Number(userInfo.walletBalance || 0).toFixed(2),
            networkError: false
          })
        } else {
          // 如果没有用户信息，显示未登录状态
          this.setData({ 
            user: { account: '未登录' },
            walletBalance: 0,
            walletBalanceText: '0.00',
            networkError: false
          })
        }
      })
      .catch(err => {
        // 获取失败，显示未登录状态
        this.setData({ 
          user: { account: '未登录' },
          walletBalance: 0,
          walletBalanceText: '0.00',
          networkError: true
        })
      })
  },
  
  loadUserInfo() {
    return new Promise((resolve) => {
      // 直接从后端获取用户信息，不使用本地缓存
      request('/api/user/info', 'GET', {}, { silent: true })
        .then(userInfo => {
          if (userInfo && userInfo.account) {
            const user = {
              account: userInfo.account,
              walletBalance: userInfo.walletBalance,
              name: userInfo.name,
              phone: userInfo.phone
            }
            const walletBalance = Number(userInfo.walletBalance || 0)
            this.setData({ 
              user, 
              walletBalance, 
              walletBalanceText: walletBalance.toFixed(2),
              networkError: false 
            })
          } else {
            // 如果没有用户信息，显示未登录状态
            this.setData({ 
              user: { account: '未登录' },
              walletBalance: 0,
              walletBalanceText: '0.00',
              networkError: false
            })
          }
          resolve()
        })
        .catch(error => {
          // 获取失败，显示默认状态
          this.setData({ 
            user: { account: '未登录' },
            walletBalance: 0,
            walletBalanceText: '0.00',
            networkError: true
          })
          resolve()
        })
    })
  },
  
  // 添加刷新余额方法（供充值成功后调用）
  loadWalletData() {
    return this.loadUserInfo()
  },
  
  // 添加刷新用户信息方法（通用刷新接口）
  refreshUserInfo() {
    return this.loadUserInfo()
  },
  goLogin() { wx.navigateTo({ url: '/pages/userLogin/userLogin' }) },
  // 导航到拆分后的子页面
  goWallet() { wx.navigateTo({ url: '/pages/walletRecharge/walletRecharge' }) },
  editProfile() { wx.navigateTo({ url: '/pages/userEdit/userEdit' }) },
  goReservations() {
    wx.navigateTo({ url: '/pages/myReservations/myReservations' })
  },
  goSessions() {
    wx.navigateTo({ url: '/pages/mySessions/mySessions' })
  },
  goConsumptions() {
    wx.navigateTo({ url: '/pages/myConsumptions/myConsumptions' })
  },
  


  logout() {
    // 添加二次确认
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？退出前系统将自动结算所有进行中的球桌。',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          // 先自动结算所有进行中的会话
          wx.showLoading({ title: '结算中...' })
          
          // 使用正确的自动结算API路径
          request('/api/user/sessions/auto-settle', 'POST', {}, { silent: true })
            .then(result => {
              wx.hideLoading()
              
              // 显示结算结果
              if (result.success || result.settledCount >= 0) {
                if (result.settledCount > 0) {
                  // 构建简洁清晰的结算信息
                  let settlementInfo = `已自动结算 ${result.settledCount} 个球桌`
                  
                  // 显示总消费金额（从后端直接获取）
                  if (result.totalConsumptionAmount && result.totalConsumptionAmount > 0) {
                    settlementInfo += `，总消费金额：¥${result.totalConsumptionAmount.toFixed(2)}`
                  }
                  
                  // 如果有结算详情，显示具体金额信息（最紧凑的格式）
                  if (result.details && result.details.length > 0) {
                    settlementInfo += '\n\n'
                    
                    // 使用最紧凑的格式显示详情，所有信息在一行内
                    result.details.forEach(detail => {
                      // 提取球桌编号和金额信息
                      const tableMatch = detail.match(/球桌 (\d+)/)
                      const amountMatch = detail.match(/消费金额：¥([\d.]+)/)
                      const balanceMatch = detail.match(/结算后余额：¥([\d.]+)/)
                      
                      if (tableMatch && amountMatch && balanceMatch) {
                        // 最紧凑的格式：所有信息在一行内显示
                        settlementInfo += `球桌 ${tableMatch[1]} 已自动结算消费金额：¥${amountMatch[1]}结算后余额：¥${balanceMatch[1]}\n`
                      } else {
                        settlementInfo += `${detail}\n`
                      }
                    })
                  }
                  
                  // 检查是否有余额不足的情况
                  if (result.hasNegativeBalance) {
                    settlementInfo += `您的账户余额不足，部分球桌结算后余额为负。请及时充值！`
                    
                    // 显示结算完成弹窗，并提示充值
                    wx.showModal({
                      title: '结算完成（余额不足）',
                      content: settlementInfo,
                      showCancel: true,
                      cancelText: '稍后充值',
                      confirmText: '立即充值',
                      success: (res) => {
                        if (res.confirm) {
                          // 用户选择立即充值，跳转到充值页面
                          wx.navigateTo({ 
                            url: '/pages/walletRecharge/walletRecharge?from=logout_settle' 
                          })
                        } else {
                          // 用户选择稍后充值，继续退出登录
                          this.doLogout()
                        }
                      }
                    })
                  } else {
                    // 正常结算完成
                    wx.showModal({
                      title: '结算完成',
                      content: settlementInfo,
                      showCancel: false,
                      confirmText: '我知道了',
                      success: () => {
                        // 执行退出登录
                        this.doLogout()
                      }
                    })
                  }
                } else {
                  // 没有需要结算的会话，直接退出
                  this.doLogout()
                }
              } else {
                // 结算失败，但继续退出登录
                wx.showToast({ title: result.message || '结算失败，已退出登录', icon: 'none' })
                this.doLogout()
              }
            })
            .catch(err => {
              wx.hideLoading()
              
              // 即使结算失败，也继续退出登录
              wx.showToast({ title: '结算失败，已退出登录', icon: 'none' })
              this.doLogout()
            })
        }
      }
    })
  },
  
  // 执行退出登录
  doLogout() {
    wx.removeStorageSync('userInfo')
    wx.showToast({ title: '已退出' })
    wx.redirectTo({ url: '/pages/userLogin/userLogin' })
  },
  
  // 注销账号
  deleteAccount() {
    wx.showModal({
      title: '确认注销账号',
      content: '确认注销账号？此操作不可恢复，将清空所有个人信息和余额。',
      confirmColor: '#ff4d4f',
      confirmText: '确认注销',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '注销中...' })
          request('/api/user/deregister', 'DELETE', {}, { silent: true })
            .then(() => {
              wx.hideLoading()
              wx.showToast({ title: '注销成功', icon: 'success' })
              wx.removeStorageSync('userInfo')
              setTimeout(() => {
                wx.redirectTo({ url: '/pages/userLogin/userLogin' })
              }, 1500)
            })
            .catch(err => {
            wx.hideLoading()
            
            // 如果是401，api.js已经处理了跳转，这里不再弹出模态框避免冲突
            if (err.statusCode === 401) {
              return
            }

            let msg = '注销失败，请重试'
            if (err.data) {
              if (typeof err.data === 'string') {
                msg = err.data
              } else if (typeof err.data === 'object') {
                msg = err.data.message || err.data.error || JSON.stringify(err.data)
              }
            } else if (err.errMsg) {
              msg = err.errMsg
            }
            
            // 使用模态框显示具体失败原因，提示用户下一步操作
            wx.showModal({
              title: '无法注销',
              content: msg,
              showCancel: false,
              confirmText: '我知道了'
            })
          })
        }
      }
    })
  },
  
  // 修改资料
  editProfile() {
    wx.navigateTo({ url: '/pages/userEdit/userEdit' })
  },
  

})