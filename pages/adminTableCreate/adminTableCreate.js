const { request } = require('../../utils/api');

Page({
  data: { 
    name: '', 
    price: '30', 
    typeIndex: 0,
    types: ['高级', '中级', '低级'],
    typeValues: ['HIGH', 'MIDDLE', 'LOW']
  },
  onShow(){
    // 管理员登录校验已在 api.js 中处理，此处无需重复
  },
  
  // 安全返回上一页，如果无法返回则跳转到管理员首页
  safeNavigateBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 })
    } else {
      wx.redirectTo({ url: '/pages/adminHome/adminHome' })
    }
  },
  onName(e){ this.setData({ name: e.detail.value }) },
  onPrice(e){ this.setData({ price: e.detail.value }) },
  onTypeChange(e){ this.setData({ typeIndex: e.detail.value }) },
  create(){
    const name = (this.data.name||'').trim()
    const price = Number(this.data.price||0)
    const type = this.data.typeValues[this.data.typeIndex]

    if (!name) return wx.showToast({ title:'请输入球桌名称', icon:'none' })

    const newTable = {
      name: name,
      pricePerHour: price,
      pricePerMinute: parseFloat((price / 60).toFixed(4)), // 自动计算每分钟价格
      type: type,
      tableNumber: 0, // 默认编号，数据库要求非空
      status: 'AVAILABLE' // 新创建的台球桌默认为空闲状态
    };

    request('/api/admin/tables', 'POST', newTable).then(() => {
      wx.showToast({ title:'创建成功', icon:'success' });
      this.safeNavigateBack();
    }).catch(err => {
      wx.showToast({ title:'创建失败，请重试', icon:'none' });
    });
  }
})