const tabs = ["待报价", "待确认报价", "待派单", "施工中", "待验收", "已完成"];

Page({
  data: {
    activeTab: "待报价",
    tabs: [],
    orders: [],
    message: ""
  },
  onShow() {
    this.refresh();
  },
  async refresh() {
    const app = getApp();
    const all = await app.globalData.api.listOrders();
    this.setData({
      tabs: tabs.map((name) => ({ name, count: all.filter((item) => item.category === name).length })),
      orders: all.filter((item) => item.category === this.data.activeTab)
    });
  },
  switchTab(event) {
    this.setData({ activeTab: event.currentTarget.dataset.name, message: "" });
    this.refresh();
  },
  async confirmQuote(event) {
    const app = getApp();
    await app.globalData.api.confirmQuote(event.currentTarget.dataset.id);
    this.setData({ activeTab: "待派单", message: "报价已确认，等待平台派单。" });
    this.refresh();
  },
  async cancelOrder(event) {
    const app = getApp();
    try {
      await app.globalData.api.requestCancel(event.currentTarget.dataset.id, "客户在小程序申请取消");
      this.setData({ message: "取消申请已提交，等待管理员确认。" });
      this.refresh();
    } catch (error) {
      this.setData({ message: error.message });
    }
  },
  goAcceptance(event) {
    wx.navigateTo({ url: `/pages/acceptance/acceptance?id=${event.currentTarget.dataset.id}` });
  },
  goDetail(event) {
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${event.currentTarget.dataset.id}` });
  },
  callService() {
    const phoneNumber = getApp().globalData.servicePhone;
    if (typeof wx === "undefined" || !wx.makePhoneCall) {
      this.setData({ message: `客服电话：${phoneNumber}` });
      return;
    }
    wx.makePhoneCall({ phoneNumber });
  }
});
