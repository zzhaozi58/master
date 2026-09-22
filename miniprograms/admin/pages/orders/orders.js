const tabs = ["待报价", "待派单", "待施工", "施工中", "待验收", "已验收"];

Page({
  data: { activeTab: "待报价", tabs: [], orders: [], keyword: "", page: 1, pageSize: 5, hasMore: false, total: 0 },
  onShow() { this.refresh(); },
  async refresh() {
    const app = getApp();
    const result = await app.globalData.api.queryOrders({
      filter: this.data.activeTab,
      keyword: this.data.keyword,
      page: this.data.page,
      pageSize: this.data.pageSize
    });
    const orders = this.data.page === 1 ? result.items : this.data.orders.concat(result.items);
    this.setData({
      tabs: tabs.map((name) => ({ name, count: result.counts[name] || 0 })),
      orders,
      hasMore: result.hasMore,
      total: result.total
    });
  },
  switchTab(event) {
    this.setData({ activeTab: event.currentTarget.dataset.name, page: 1, orders: [] });
    this.refresh();
  },
  inputKeyword(event) {
    this.setData({ keyword: event.detail.value });
  },
  search() {
    this.setData({ page: 1, orders: [] });
    this.refresh();
  },
  loadMore() {
    if (!this.data.hasMore) return;
    this.setData({ page: this.data.page + 1 });
    this.refresh();
  },
  openDetail(event) {
    getApp().globalData.currentOrderId = event.currentTarget.dataset.id;
    wx.navigateTo({ url: "/pages/order-detail/order-detail" });
  }
});
