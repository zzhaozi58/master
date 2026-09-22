Page({
  data: { master: {}, form: {}, levelOptions: ["金牌", "银牌", "铜牌"], levelIndex: 2, orderGroups: [], rejectReason: "", message: "" },
  onShow() { this.refresh(); },
  async refresh() {
    const app = getApp();
    const master = await app.globalData.api.getMaster(app.globalData.currentMasterId);
    const orders = await app.globalData.api.getMasterOrders(master.id);
    const levelIndex = this.data.levelOptions.indexOf(master.level);
    this.setData({
      master,
      form: { level: master.level, creditScore: master.creditScore, paidAmount: master.paidAmount || 0 },
      levelIndex: levelIndex >= 0 ? levelIndex : 2,
      orderGroups: buildOrderGroups(orders)
    });
  },
  inputField(event) {
    this.setData({ [`form.${event.currentTarget.dataset.field}`]: event.detail.value });
  },
  pickLevel(event) {
    const index = Number(event.detail.value);
    this.setData({ levelIndex: index, "form.level": this.data.levelOptions[index] });
  },
  inputRejectReason(event) {
    this.setData({ rejectReason: event.detail.value });
  },
  async approve() {
    const app = getApp();
    await app.globalData.api.reviewMaster(this.data.master.id, true);
    this.setData({ message: "已通过注册。" });
    this.refresh();
  },
  async reject() {
    const app = getApp();
    if (!this.data.rejectReason || !this.data.rejectReason.trim()) {
      this.setData({ message: "拒绝注册必须填写原因。" });
      return;
    }
    try {
      await app.globalData.api.reviewMaster(this.data.master.id, false, this.data.rejectReason);
      this.setData({ message: "已拒绝注册。" });
      this.refresh();
    } catch (error) {
      this.setData({ message: error.message });
    }
  },
  async save() {
    const app = getApp();
    try {
      await app.globalData.api.updateMasterAdminFields(this.data.master.id, this.data.form);
      this.setData({ message: "师傅等级、信用分和已支付金额已保存。" });
      this.refresh();
    } catch (error) {
      this.setData({ message: error.message });
    }
  },
  openOrder(event) {
    getApp().globalData.currentOrderId = event.currentTarget.dataset.id;
    wx.navigateTo({ url: "/pages/order-detail/order-detail" });
  }
});

function buildOrderGroups(orders) {
  const groups = [
    { title: "被分配订单", names: ["待预约"], orders: [] },
    { title: "进行中订单", names: ["施工中", "待验收"], orders: [] },
    { title: "完成订单", names: ["已完成"], orders: [] }
  ];
  for (const order of orders) {
    const group = groups.find((item) => item.names.includes(order.category));
    if (group) group.orders.push(order);
  }
  return groups.map((item) => ({
    title: item.title,
    count: item.orders.length,
    orders: item.orders
  }));
}
