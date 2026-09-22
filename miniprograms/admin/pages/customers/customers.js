Page({
  data: { customers: [] },
  onShow() { this.refresh(); },
  async refresh() {
    this.setData({
      customers: await getApp().globalData.api.listCustomers()
    });
  },
  openCustomer(event) {
    getApp().globalData.currentCustomerId = event.currentTarget.dataset.id;
    wx.navigateTo({ url: "/pages/customer-detail/customer-detail" });
  }
});
