const { request } = require('../../utils/api');

Page({
  /**
   * 页面的初始数据
   * 包含球桌列表、状态映射、类型映射等数据
   */
  data: {
    tables: [],
    tableStatusMap: {
      'AVAILABLE': '空闲',
      'IN_USE': '使用中',
      'RESERVED': '已预约',
      'FAULT': '故障'
    },
    tableTypeMap: {
      'HIGH': '高级',
      'MIDDLE': '中级',
      'LOW': '低级',
      'high': '高级',
      'middle': '中级',
      'low': '低级'
    },
    // 管理员只能修改为空闲或故障状态，使用中、已预约由系统自动更新
    statusOptions: ['空闲', '故障'],
    statusValues: ['AVAILABLE', 'FAULT'],
    batchMode: false, // 批量操作模式
    selectedCount: 0, // 已选择数量
    isAllSelected: false // 是否全选
  },

  /**
   * 生命周期函数--监听页面显示
   * 页面显示时自动加载球桌列表
   */
  onShow() {
    this.fetchTables();
  },

  /**
   * 获取台球桌列表
   * 从服务器获取球桌数据并进行预处理
   */
  fetchTables() {
    request('/api/admin/tables', 'GET').then(res => {
      const tables = res.data || [];
      const processedTables = tables.map((table, index) => {
        return {
          ...table,
          tableNumber: table.tableNumber || table.id || (index + 1),
          selected: false // 确保每个球桌都有selected属性
        };
      });
      
      this.setData({
        tables: processedTables,
        selectedCount: 0,
        isAllSelected: false
      });
    }).catch(err => {
      wx.showToast({
        title: '获取台球桌列表失败',
        icon: 'none'
      });
    });
  },

  /**
   * 修改台球桌状态
   * 管理员只能将球桌状态改为空闲或故障，使用中、已预约由系统自动更新
   * @param {Object} e - 事件对象
   */
  onStatusChange(e) {
    const { id } = e.currentTarget.dataset;
    const index = e.detail.value;
    const newStatus = this.data.statusValues[index];
    
    // 获取当前球桌信息，检查是否可以修改状态
    const { tables } = this.data;
    const currentTable = tables.find(table => table.id === id);
    
    if (!currentTable) {
      wx.showToast({ title: '球桌信息获取失败', icon: 'none' });
      // 恢复原来的选择
      this.fetchTables();
      return;
    }
    
    // 检查状态值是否有效
    if (!newStatus) {
      wx.showToast({ title: '状态值无效', icon: 'none' });
      // 恢复原来的选择
      this.fetchTables();
      return;
    }
    
    // 如果当前状态是使用中或已预约，且要修改为非空闲状态，提示用户
    if ((currentTable.status === 'IN_USE' || currentTable.status === 'RESERVED') && newStatus !== 'AVAILABLE') {
      wx.showModal({
        title: '状态修改提示',
        content: '使用中或已预约的球桌只能修改为空闲状态，是否继续？',
        success: (res) => {
          if (res.confirm) {
            this.updateTableStatus(id, 'AVAILABLE');
          } else {
            // 恢复原来的选择
            this.fetchTables();
          }
        }
      });
      return;
    }
    
    this.updateTableStatus(id, newStatus);
  },
  
  /**
   * 更新球桌状态
   * @param {string} id - 球桌ID
   * @param {string} status - 新状态
   */
  updateTableStatus(id, status) {
    // 保存当前状态用于回滚
    const { tables } = this.data;
    const currentTable = tables.find(table => table.id === id);
    const originalStatus = currentTable ? currentTable.status : null;
    
    // 立即更新UI显示新状态（乐观更新）
    if (currentTable) {
      currentTable.status = status;
      this.setData({ tables: [...tables] });
    }
    
    request(`/api/admin/tables/${id}/status`, 'PUT', { status })
      .then(() => {
        wx.showToast({
          title: '状态更新成功',
          icon: 'success'
        });
        // 重新加载数据确保一致性
        setTimeout(() => {
          this.fetchTables();
        }, 500);
      })
      .catch(err => {
        // 恢复原来的状态
        if (currentTable && originalStatus) {
          currentTable.status = originalStatus;
          this.setData({ tables: [...tables] });
        }
        
        let errorMsg = '更新台球桌状态失败';
        if (err.data && err.data.message) {
          errorMsg = err.data.message;
        } else if (typeof err.data === 'string') {
          errorMsg = err.data;
        }
        
        wx.showModal({
          title: '状态更新失败',
          content: errorMsg,
          showCancel: false,
          confirmText: '知道了',
          confirmColor: '#ff4d4f'
        });
      });
  },

  /**
   * 删除台球桌
   * @param {Object} e - 事件对象
   */
  deleteTable(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '确认删除此球桌？操作不可恢复',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          request(`/api/admin/tables/${id}`, 'DELETE').then(() => {
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            this.fetchTables();
          }).catch(err => {
            wx.showToast({
              title: '删除台球桌失败',
              icon: 'none'
            });
          });
        }
      }
    });
  },

  /**
   * 跳转到新增台球桌页面
   */
  addTable() {
    wx.navigateTo({
      url: '/pages/adminTableCreate/adminTableCreate'
    });
  },

  /**
   * 跳转到编辑台球桌页面
   * @param {Object} e - 事件对象
   */
  editTable(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/adminTableEdit/adminTableEdit?id=${id}`
    });
  },

  /**
   * 进入批量操作模式
   */
  enterBatchMode() {
    this.setData({
      batchMode: true,
      selectedCount: 0,
      isAllSelected: false
    })
    
    // 重置所有选择状态
    this.resetAllSelections()
  },

  /**
   * 退出批量操作模式
   */
  exitBatchMode() {
    this.setData({
      batchMode: false,
      selectedCount: 0,
      isAllSelected: false
    })
    
    // 重置所有选择状态
    this.resetAllSelections()
  },

  /**
   * 重置所有选择状态
   */
  resetAllSelections() {
    const { tables } = this.data
    
    // 重置球桌选择状态
    const resetTables = tables.map(item => ({
      ...item,
      selected: false
    }))
    
    this.setData({
      tables: resetTables
    })
  },

  /**
   * 切换球桌选择状态
   */
  toggleSelectTable(e) {
    const index = e.currentTarget.dataset.index
    const { tables } = this.data
    
    const updatedTables = [...tables]
    updatedTables[index].selected = !updatedTables[index].selected
    
    this.setData({
      tables: updatedTables
    })
    
    this.updateSelectionCount()
  },

  /**
   * 更新选择数量
   */
  updateSelectionCount() {
    const { tables } = this.data
    
    const selectedCount = tables.filter(item => item.selected).length
    const totalCount = tables.length
    
    this.setData({
      selectedCount,
      isAllSelected: selectedCount === totalCount && totalCount > 0
    })
  },

  /**
   * 切换全选状态
   */
  toggleSelectAll() {
    const { tables, isAllSelected } = this.data
    
    const updatedTables = tables.map(item => ({
      ...item,
      selected: !isAllSelected
    }))
    
    this.setData({
      tables: updatedTables
    })
    
    this.updateSelectionCount()
  },

  /**
   * 批量删除
   */
  batchDelete() {
    const { tables, selectedCount } = this.data
    
    if (selectedCount === 0) {
      wx.showToast({ title: '请先选择要删除的球桌', icon: 'none' })
      return
    }
    
    wx.showModal({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedCount} 个球桌吗？此操作不可恢复。`,
      success: (res) => {
        if (res.confirm) {
          this.performBatchDelete()
        }
      }
    })
  },

  /**
   * 执行批量删除
   */
  performBatchDelete() {
    const { tables } = this.data
    
    const selectedTables = tables.filter(item => item.selected)
    const deletePromises = selectedTables.map(item => 
      request(`/api/admin/tables/${item.id}`, 'DELETE')
    )
    
    wx.showLoading({ title: '删除中...' })
    
    Promise.all(deletePromises)
      .then(() => {
        wx.hideLoading()
        wx.showToast({ title: `成功删除 ${selectedTables.length} 个球桌` })
        
        // 退出批量模式并重新加载数据
        this.exitBatchMode()
        this.fetchTables()
      })
      .catch(err => {
        wx.hideLoading()
        wx.showToast({ title: '删除失败，请重试', icon: 'none' })
      })
  }
})
