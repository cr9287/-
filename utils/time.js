// 时间相关工具

// 将 "HH:MM" 转 Date（当天）
function hmToDate(hm, baseDate = new Date()) {
  const [h, m] = hm.split(':').map(n => parseInt(n, 10))
  const d = new Date(baseDate)
  d.setHours(h, m, 0, 0)
  return d
}

module.exports = {
  hmToDate
}