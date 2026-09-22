Page({
  data: {
    orderId: "",
    order: {},
    cycle: { completionMedia: { images: [], videos: [] }, completionNote: "" },
    completionImageItems: [],
    completionVideoItems: [],
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
    const cycle = order.latestCycle || { completionMedia: { images: [], videos: [] }, completionNote: "" };
    this.setData({
      order,
      cycle,
      completionImageItems: formatMediaItems(cycle.completionMedia.images, "完工图片"),
      completionVideoItems: formatMediaItems(cycle.completionMedia.videos, "完工视频")
    });
  }
});

function formatMediaItems(items, fallbackName) {
  return (items || []).map((item, index) => ({
    name: typeof item === "string" ? item : item.filename || item.id || `${fallbackName}${index + 1}`,
    index: index + 1
  }));
}
