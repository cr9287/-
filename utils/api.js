const { getStorage } = require('./storage')
const { BASE_URL } = require('./constants')

/**
 * 统一的错误处理函数
 * @param {string} message - 错误信息
 * @param {boolean} silent - 是否静默处理
 */
const handleError = (message, silent = false) => {
  if (!silent) {
    wx.showToast({ 
      title: message || '操作失败', 
      icon: 'none',
      duration: 2000
    })
  }
}

/**
 * 验证token格式和基本有效性
 * @param {string} token - JWT token
 * @returns {boolean} token是否有效
 */
const validateToken = (token) => {
  if (!token || typeof token !== 'string') {
    return false
  }
  
  // 检查token长度（JWT token通常较长）
  const tokenValue = token.startsWith('Bearer ') ? token.replace('Bearer ', '') : token
  if (tokenValue.length < 10) {
    return false
  }
  
  return true
}

/**
 * 解析JWT token获取用户信息
 * @param {string} token - JWT token
 * @returns {object} 用户信息
 */
const parseToken = (token) => {
  if (!token || !token.startsWith('Bearer ')) {
    return null
  }
  
  const tokenValue = token.replace('Bearer ', '')
  
  // 解析token（需要后端支持完整的token验证）
  // 这里应该调用后端API验证token有效性
  try {
    // 验证token格式
    if (tokenValue.length < 10) {
      return null
    }
    
    // 返回用户信息
    // 实际项目中应该从token中解析出用户角色等信息
    return {
      username: 'user',
      role: tokenValue.includes('admin') ? 'ADMIN' : 'USER',
      expired: false // 需要实际验证过期时间
    }
  } catch (error) {
    return null
  }
}

/**
 * 验证用户权限
 * @param {string} token - 用户token
 * @param {boolean} isAdminUrl - 是否为管理员接口
 * @returns {boolean} 是否有权限访问
 */
const verifyPermission = (token, isAdminUrl) => {
  if (!validateToken(token)) {
    return false
  }
  
  // 如果是管理员接口，需要验证是否为管理员token
  if (isAdminUrl) {
    const adminToken = getStorage('adminToken')
    return token === adminToken
  }
  
  // 普通用户接口，只要token格式正确就允许访问
  return true
}

const request = (url, method = 'GET', data = {}, options = {}) => {
  return new Promise((resolve, reject) => {
    // 根据请求 URL 决定使用哪种 token
    const isAdminUrl = url.startsWith('/api/admin/')
    const isPublicUrl = url.startsWith('/api/tables') || url.startsWith('/api/reservations') || url.startsWith('/api/user/login') || url.startsWith('/api/user/register') || url.startsWith('/api/user/reset-password') || url.startsWith('/api/admin/login')
    
    // 获取对应的 token
    let token = null
    if (isAdminUrl) {
      token = getStorage('adminToken')
    } else if (!isPublicUrl) {
      // 只有非公共 API 才需要用户 token
      const userInfo = getStorage('userInfo', null)
      token = userInfo ? userInfo.token : null
    }
    
    // 验证权限（公共 API 不需要验证）
    if (token && !isPublicUrl && !verifyPermission(token, isAdminUrl)) {
      handleError('权限不足')
      reject({ statusCode: 403, data: '权限不足' })
      return
    }
    
    const header = {
      'Content-Type': 'application/json'
    }
    
    if (token && !isPublicUrl) {
      // 确保 token 格式正确（添加 Bearer 前缀）
      const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`
      header['Authorization'] = formattedToken
    }

    wx.request({
      url: `${BASE_URL}${url}`,
      method: method,
      data: data,
      header: header,
      timeout: 10000,  // 设置 10 秒超时
      success: (res) => {
        if (res.statusCode === 401) {
          // 对于登录接口，401 表示账号密码错误，不需要跳转
          if (url.includes('/login')) {
            reject(res)
            return
          }

          // 如果配置了不跳转，直接 reject
          if (options.redirectOn401 === false) {
            reject(res)
            return
          }

          handleError('登录过期，请重新登录')
          // 根据 URL 类型跳转到正确的登录页面
          if (isAdminUrl) {
            wx.redirectTo({ url: '/pages/adminLogin/adminLogin' })
          } else {
            wx.redirectTo({ url: '/pages/userLogin/userLogin' })
          }
          reject(res)
        } else if (res.statusCode === 403) {
          // 权限不足
          handleError('权限不足')
          reject(res)
        } else if (res.statusCode >= 200 && res.statusCode < 300) {
          // 统一处理后端返回的业务错误（status=200 但 success=false）
          if (res.data && res.data.success === false) {
            if (!options.silent) {
              handleError(res.data.message || '操作失败')
            }
            // 保持 catch 块逻辑兼容
            // 原有的错误处理通常读取 err.data 作为错误信息
            reject({ data: res.data.message })
            return
          }
          
          // 直接返回数据，不使用缓存
          resolve(res.data)
        } else {
          // 直接使用 res.data 作为错误信息，因为后端返回的是字符串错误信息
          if (!options.silent) {
            handleError(res.data || '请求失败')
          }
          reject(res)
        }
      },
      fail: (err) => {
        console.error('请求失败:', {url, method, err})
        let errorMsg = '网络请求失败'
        
        if (err.errMsg && err.errMsg.includes('timeout')) {
          errorMsg = '请求超时，请检查网络连接'
        } else if (err.errMsg && err.errMsg.includes('fail')) {
          // 提取详细错误信息
          const match = err.errMsg.match(/request:fail (.+)/)
          if (match) {
            errorMsg = `请求失败：${match[1]}`
          }
        }
        
        handleError(errorMsg)
        reject(err)
      }
    })
  })
}

module.exports = {
  request,
  getStorage,
  validateToken,
  verifyPermission,
  handleError
}