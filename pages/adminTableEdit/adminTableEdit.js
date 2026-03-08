const { request } = require('../../utils/api');

Page({
  /**
   * 页面的初始数据
   */
  data:{
    id:null, 
    name:'', 
    price:'', 
    status:'',
    type:'',
    tableNumber: 0,
    statusOptions: [
      { value: 'AVAILABLE', text: '空闲' },
      { value: 'IN_USE', text: '使用中' },
      { value: 'RESERVED', text: '已预约' },
      { value: 'FAULT', text: '故障' }
    ],
    statusIndex: 0,
    typeIndex: 0,
    typeOptions: [
      { value: 'HIGH', text: '高级' },
      { value: 'MIDDLE', text: '中级' },
      { value: 'LOW', text: '低级' }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options){
    const id = Number(options && options.id || 0);
    this.setData({ id: id || 0 });
    if (id) {
      this.fetchTableDetail(id);
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow(){ 
    // 数据已在onLoad中初始化
  },

  /**
   * 获取球桌详细信息
   * 并初始化状态和类型的选择索引
   * @param {number} id - 球桌ID
   */
  fetchTableDetail(id) {
    request(`/api/admin/tables/${id}`, 'GET').then(res => {
      // 兼容不同的API返回结构
      const t = res.data || res;
      
      if (!t) {
        throw new Error('未获取到球桌数据');
      }
      
      // 初始化状态选择器索引
      let statusIndex = 0;
      if (this.data.statusOptions) {
        for (let i = 0; i < this.data.statusOptions.length; i++) {
          if (this.data.statusOptions[i].value === t.status) {
            statusIndex = i;
            break;
          }
        }
      }
      
      // 初始化类型选择器索引
      let typeIndex = 0;
      if (this.data.typeOptions && t.type) {
        const typeValue = t.type.toUpperCase();
        for (let i = 0; i < this.data.typeOptions.length; i++) {
          if (this.data.typeOptions[i].value === typeValue) {
            typeIndex = i;
            break;
          }
        }
      }
      
      this.setData({
        name: t.name || '',
        price: String(t.pricePerHour || 30),
        status: t.status || 'AVAILABLE',
        type: (t.type || 'MIDDLE').toUpperCase(),
        tableNumber: t.tableNumber || 0,
        statusIndex,
        typeIndex
      });
    }).catch(err => {
      wx.showToast({ title:'获取球桌详情失败', icon:'none' });
      
      setTimeout(() => {
        this.safeNavigateBack();
      }, 1500);
    });
  },

  /**
   * 表单输入处理函数集合
   */
  onName(e){ this.setData({ name: e.detail.value }) },
  onPrice(e){ this.setData({ price: e.detail.value }) },
  
  onStatusChange(e){
    const statusIndex = e.detail.value;
    const status = this.data.statusOptions[statusIndex].value;
    this.setData({ 
      statusIndex, 
      status 
    });
  },
  
  onTypeChange(e){
    const typeIndex = e.detail.value;
    const type = this.data.typeOptions[typeIndex].value;
    this.setData({ 
      typeIndex, 
      type 
    });
  },
  
  /**
   * 保存球桌信息（更新）
   * 自动计算每分钟价格
   */
  save(){
    const name = (this.data.name||'').trim();
    const price = Number(this.data.price||0);
    const status = this.data.status;
    const type = this.data.type;
    const tableNumber = this.data.tableNumber;

    if (!name) return wx.showToast({ title:'请输入球桌名称', icon:'none' });

    const updatedTable = {
      name: name,
      pricePerHour: price,
      pricePerMinute: parseFloat((price / 60).toFixed(4)), // 自动更新每分钟价格
      status: status,
      type: type,
      tableNumber: tableNumber
    };

    request(`/api/admin/tables/${this.data.id}`, 'PUT', updatedTable).then(() => {
      wx.showToast({ title:'已保存', icon:'success' });
      setTimeout(() => {
        this.safeNavigateBack();
      }, 1500);
    }).catch(err => {
      wx.showToast({ title:'保存失败', icon:'none' });
    });
  },
  
  cancel(){ this.safeNavigateBack() },
  
  /**
   * 安全返回上一页
   */
  safeNavigateBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
    } else {
      wx.redirectTo({ url: '/pages/adminHome/adminHome' });
    }
  }
})
