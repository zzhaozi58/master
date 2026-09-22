Page({
  data: {
    orderId: "",
    order: {},
    cycle: { completionMedia: { images: [], videos: [] }, completionNote: "" },
    message: ""
  },
  onLoad(query) {
    this.setData({ orderId: query.id || "" });
    this.refresh();
  },
  async refresh() {
    const app = getApp();
    const orders = await app.globalData.api.listOrders();
    const order = orders.find((item) => item.id === this.data.orderId);
    if (!order) {
      this.setData({ message: "未找到订单。" });
      return;
    }
    this.setData({
      order,
      cycle: order.latestCycle || { completionMedia: { images: [], videos: [] }, completionNote: "" }
    });
  }
});
