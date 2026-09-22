Page({
  data: { master: {}, summary: { receivable: 0, paid: 0 } },
  async onShow() {
    const app = getApp();
    const master = await app.globalData.api.getProfile();
    const orders = await app.globalData.api.listOrders();
    this.setData({
      master,
      summary: {
        receivable: orders.reduce((sum, item) => sum + (item.receivableAmount || 0), 0),
        paid: orders.reduce((sum, item) => sum + (item.paidAmount || 0), 0)
      }
    });
  },
  openRegister() {
    wx.navigateTo({ url: "/pages/register/register" });
  }
});
