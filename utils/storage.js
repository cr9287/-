// 本地存储读写封装
function getStorage(key, defVal) {
  const v = wx.getStorageSync(key)
  return v === '' || v === undefined ? defVal : v
}

function setStorage(key, val) {
  wx.setStorageSync(key, val)
}

module.exports = {
  getStorage,
  setStorage
}