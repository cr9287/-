const { request } = require('../../utils/api')

/**
 * 将日期字符串和时间字符串转换为 Date 对象
 * @param {string} dateStr - YYYY-MM-DD
 * @param {string} hm - HH:mm
 * @returns {Date}
 */
function parseDT(dateStr, hm){ 
  if (!dateStr || !hm) return new Date();
  const d=new Date(dateStr); 
  const [h,m]=(hm||'00:00').split(':').map(Number); 
  d.setHours(h||0); 
  d.setMinutes(m||0); 
  d.setSeconds(0); 
  d.setMilliseconds(0); 
  return d 
}

Page({
  /**
   * 页面的初始数据
   */
  data:{ 
    id:'', 
    startDate:'', 
    startHM:'09:00', 
    endDate:'', 
    endHM:'', 
    account:'', 
    tables:[], 
    tableIndex:-1,
    statusText: '进行中',
    duration: 0,
    estimatedAmount: '0.00'
  },
  
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(query){ 
    const id=query && query.id; 
    this.setData({ id }) 
  },
  
  /**
   * 生命周期函数--监听页面显示
   */
  onShow(){
    // 获取所有球桌信息，用于关联显示
    request('/api/admin/tables', 'GET').then(res => {
      const tables = (res.data || []).map(t => ({ 
        id: t.id, 
        name: `${t.name} (#${t.tableNumber})`,
        pricePerMinute: t.pricePerMinute || (t.pricePerHour/60) || 0.5
      }))
      this.setData({ tables })
      this.loadSession()
    }).catch(err => {
      this.loadSession()
    })
  },
  
  /**
   * 加载会话详情
   * 并初始化页面表单数据
   */
  loadSession() {
    request(`/api/admin/sessions/${this.data.id}`, 'GET')
      .then(res => {
        const s = res.data || res
        if (!s) return wx.showToast({ title:'会话不存在', icon:'none' })
        
        // 格式化开始时间
        let sDate = ''
        let sHM = '09:00'
        
        if (s.startDateTime) {
          const sd = new Date(s.startDateTime); 
          sDate=`${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}-${String(sd.getDate()).padStart(2,'0')}`
          sHM = `${String(sd.getHours()).padStart(2,'0')}:${String(sd.getMinutes()).padStart(2,'0')}`
        }
        
        // 格式化结束时间（如果有）
        let eDate=''; let eHM=''
        if (s.endDateTime){ 
            const ed=new Date(s.endDateTime); 
            eDate=`${ed.getFullYear()}-${String(ed.getMonth()+1).padStart(2,'0')}-${String(ed.getDate()).padStart(2,'0')}`; 
            eHM=`${String(ed.getHours()).padStart(2,'0')}:${String(ed.getMinutes()).padStart(2,'0')}` 
        }
        
        // 匹配关联球桌
        let tableIndex = -1
        if (s.tableId && this.data.tables.length > 0) {
          tableIndex = this.data.tables.findIndex(t => t.id == s.tableId)
        }
        
        this.setData({ 
            startDate:sDate, 
            startHM:sHM, 
            endDate:eDate, 
            endHM:eHM, 
            account:s.account||'', 
            tableIndex 
        })
        
        // 重新计算统计数据（时长、金额）
        this.recalcStats()
      })
      .catch(err => {
        wx.showToast({ title:'获取会话数据失败', icon:'none' })
      })
  },
  
  /**
   * 重新计算会话状态、时长和预估金额
   * 基于当前表单中的时间设置
   */
  recalcStats() {
    const { startDate, startHM, endDate, endHM, tableIndex, tables } = this.data
    
    let statusText = '进行中'
    let duration = 0
    let amount = '0.00'
    
    if (startDate && startHM) {
        const start = parseDT(startDate, startHM)
        let end = new Date() // 如果没有结束时间，默认截止到现在
        
        if (endDate && endHM) {
            end = parseDT(endDate, endHM)
            statusText = '已结束'
        }
        
        const diffMs = end.getTime() - start.getTime()
        if (diffMs > 0) {
            duration = Math.ceil(diffMs / 60000)
            
            if (tableIndex >= 0 && tables[tableIndex]) {
                const price = tables[tableIndex].pricePerMinute
                amount = (duration * price).toFixed(2)
            }
        }
    }
    
    this.setData({ 
        statusText, 
        duration, 
        estimatedAmount: amount 
    })
  },
  
  /**
   * 表单输入监听器集合
   * 输入变化时触发重新计算
   */
  onStartDate(e){ this.setData({ startDate:e.detail.value }); this.recalcStats() },
  onStartHM(e){ this.setData({ startHM:e.detail.value }); this.recalcStats() },
  onEndDate(e){ this.setData({ endDate:e.detail.value }); this.recalcStats() },
  onEndHM(e){ this.setData({ endHM:e.detail.value }); this.recalcStats() },
  onAccount(e){ this.setData({ account:e.detail.value }) },
  onTableChange(e){ this.setData({ tableIndex: e.detail.value }); this.recalcStats() },
  
  /**
   * 保存会话修改
   * 包含时间校验逻辑
   */
  save(){
    const start = parseDT(this.data.startDate, this.data.startHM)
    let endAt=null
    if (this.data.endDate && this.data.endHM){ 
        endAt = parseDT(this.data.endDate, this.data.endHM).toISOString() 
    }
    
    // 校验结束时间不能早于开始时间
    if (endAt && endAt <= start.toISOString()) {
        return wx.showToast({ title:'结束需晚于开始', icon:'none' })
    }
    
    let tableId = null
    if (this.data.tableIndex >= 0) {
      tableId = this.data.tables[this.data.tableIndex].id
    }
    
    // 构造更新数据
    const updateData = {
      startDateTime: start.toISOString(),
      endDateTime: endAt,
      account: this.data.account,
      tableId: tableId
    }
    
    // 提交更新请求
    request(`/api/admin/sessions/${this.data.id}`, 'PUT', updateData)
      .then(() => {
        wx.showToast({ title:'已保存' })
        
        // 刷新上一页数据
        const pages = getCurrentPages()
        if (pages.length > 1) {
          const prevPage = pages[pages.length - 2]
          if (prevPage && typeof prevPage.loadData === 'function') {
            prevPage.loadData()
          }
        }
        
        this.safeNavigateBack()
      })
      .catch(err => {
        wx.showToast({ title:'保存失败', icon:'none' })
      })
  },
  
  cancel(){ this.safeNavigateBack() },
  
  /**
   * 安全返回上一页
   */
  safeNavigateBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 })
    } else {
      wx.redirectTo({ url: '/pages/adminOrders/adminOrders' })
    }
  }
})
