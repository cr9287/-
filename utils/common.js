// 公共工具类
// 提供前端常用的公共方法，消除代码重复

const { getStorage, setStorage } = require('./storage')

/**
 * 格式化日期时间
 * @param {Date} date - 日期对象
 * @param {string} format - 格式字符串（yyyy-MM-dd HH:mm:ss）
 * @returns {string} 格式化后的字符串
 */
function formatDate(date, format = 'yyyy-MM-dd HH:mm:ss') {
  if (!date) return ''
  
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  const second = String(d.getSeconds()).padStart(2, '0')
  
  return format
    .replace('yyyy', year)
    .replace('MM', month)
    .replace('dd', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second)
}

/**
 * 格式化金额（保留两位小数）
 * @param {number} amount - 金额
 * @returns {string} 格式化后的金额字符串
 */
function formatAmount(amount) {
  if (amount === null || amount === undefined) return '0.00'
  return parseFloat(amount).toFixed(2)
}

/**
 * 状态文本转换
 * @param {string} status - 状态代码
 * @returns {string} 状态文本
 */
function getStatusText(status) {
  const statusMap = {
    'AVAILABLE': '可用',
    'IN_USE': '使用中',
    'RESERVED': '已预约',
    'FAULT': '故障',
    'PENDING': '待使用',
    'USED': '已使用',
    'EXPIRED': '已过期',
    'CANCELLED': '已取消',
    'SUCCESS': '成功',
    'FAILED': '失败'
  }
  return statusMap[status] || status
}

/**
 * 状态颜色转换
 * @param {string} status - 状态代码
 * @returns {string} 颜色值
 */
function getStatusColor(status) {
  const colorMap = {
    'AVAILABLE': '#07c160',
    'IN_USE': '#ff976a',
    'RESERVED': '#1989fa',
    'FAULT': '#ee0a24',
    'PENDING': '#ff976a',
    'USED': '#07c160',
    'EXPIRED': '#969799',
    'CANCELLED': '#969799',
    'SUCCESS': '#07c160',
    'FAILED': '#ee0a24'
  }
  return colorMap[status] || '#969799'
}

/**
 * 显示成功提示
 * @param {string} title - 提示标题
 * @param {number} duration - 显示时长（毫秒）
 */
function showSuccess(title, duration = 2000) {
  wx.showToast({
    title: title,
    icon: 'success',
    duration: duration
  })
}

/**
 * 显示错误提示
 * @param {string} title - 提示标题
 * @param {number} duration - 显示时长（毫秒）
 */
function showError(title, duration = 2000) {
  wx.showToast({
    title: title,
    icon: 'none',
    duration: duration
  })
}

/**
 * 显示加载提示
 * @param {string} title - 提示标题
 */
function showLoading(title = '加载中...') {
  wx.showLoading({
    title: title,
    mask: true
  })
}

/**
 * 隐藏加载提示
 */
function hideLoading() {
  wx.hideLoading()
}

/**
 * 确认对话框
 * @param {string} content - 对话框内容
 * @param {string} title - 对话框标题
 * @returns {Promise<boolean>} 用户确认结果
 */
function showConfirm(content, title = '提示') {
  return new Promise((resolve) => {
    wx.showModal({
      title: title,
      content: content,
      success: (res) => {
        resolve(res.confirm)
      }
    })
  })
}

/**
 * 验证手机号格式
 * @param {string} phone - 手机号
 * @returns {boolean} 是否有效
 */
function validatePhone(phone) {
  const reg = /^1[3-9]\d{9}$/
  return reg.test(phone)
}

/**
 * 验证密码格式（至少6位）
 * @param {string} password - 密码
 * @returns {boolean} 是否有效
 */
function validatePassword(password) {
  return password && password.length >= 6
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 限制时间（毫秒）
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit) {
  let inThrottle
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * 深拷贝对象
 * @param {Object} obj - 要拷贝的对象
 * @returns {Object} 拷贝后的对象
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime())
  if (obj instanceof Array) return obj.map(item => deepClone(item))
  if (obj instanceof Object) {
    const clonedObj = {}
    Object.keys(obj).forEach(key => {
      clonedObj[key] = deepClone(obj[key])
    })
    return clonedObj
  }
}

/**
 * 获取用户信息
 * @returns {Object|null} 用户信息
 */
function getUserInfo() {
  return getStorage('userInfo', null)
}

/**
 * 设置用户信息
 * @param {Object} userInfo - 用户信息
 */
function setUserInfo(userInfo) {
  setStorage('userInfo', userInfo)
}

/**
 * 清除用户信息
 */
function clearUserInfo() {
  wx.removeStorageSync('userInfo')
}

/**
 * 获取管理员信息
 * @returns {Object|null} 管理员信息
 */
function getAdminInfo() {
  return getStorage('adminInfo', null)
}

/**
 * 设置管理员信息
 * @param {Object} adminInfo - 管理员信息
 */
function setAdminInfo(adminInfo) {
  setStorage('adminInfo', adminInfo)
}

/**
 * 清除管理员信息
 */
function clearAdminInfo() {
  wx.removeStorageSync('adminInfo')
  wx.removeStorageSync('adminToken')
}

module.exports = {
  formatDate,
  formatAmount,
  getStatusText,
  getStatusColor,
  showSuccess,
  showError,
  showLoading,
  hideLoading,
  showConfirm,
  validatePhone,
  validatePassword,
  debounce,
  throttle,
  deepClone,
  getUserInfo,
  setUserInfo,
  clearUserInfo,
  getAdminInfo,
  setAdminInfo,
  clearAdminInfo
}