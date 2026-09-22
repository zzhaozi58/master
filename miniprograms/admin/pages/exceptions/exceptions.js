Page({
  data: { exceptions: [], notes: {}, submitting: false, message: "" },
  onShow() { this.refresh(); },
  async refresh() {
    this.setData({ exceptions: await getApp().globalData.api.listExceptions() });
  },
  inputNote(event) {
    this.setData({ [`notes.${event.currentTarget.dataset.id}`]: event.detail.value });
  },
  noteFor(event, actionName) {
    const id = event.currentTarget.dataset.id;
    const note = this.data.notes[id] || "";
    if (!note.trim()) {
      this.setData({ message: `${actionName}必须填写处理说明。` });
      return null;
    }
    return { id, note };
  },
  async confirmCancel(event) {
    if (this.data.submitting) return;
    const payload = this.noteFor(event, "确认取消");
    if (!payload) return;
    const app = getApp();
    this.setData({ submitting: true });
    try {
      await app.globalData.api.confirmCancel(payload.id, payload.note);
      this.setData({ message: "订单已取消。" });
      this.refresh();
    } catch (error) {
      this.setData({ message: error.message });
    } finally {
      this.setData({ submitting: false });
    }
  },
  async keepOrder(event) {
    if (this.data.submitting) return;
    const payload = this.noteFor(event, "保留订单");
    if (!payload) return;
    const app = getApp();
    this.setData({ submitting: true });
    try {
      await app.globalData.api.keepCancelOrder(payload.id, payload.note);
      this.setData({ message: "已保留订单。" });
      this.refresh();
    } catch (error) {
      this.setData({ message: error.message });
    } finally {
      this.setData({ submitting: false });
    }
  },
  async arrangeRework(event) {
    if (this.data.submitting) return;
    const app = getApp();
    this.setData({ submitting: true });
    try {
      await app.globalData.api.arrangeRework(event.currentTarget.dataset.id);
      this.setData({ message: "已安排返修，订单回到施工中。" });
      this.refresh();
    } finally {
      this.setData({ submitting: false });
    }
  },
  async forceComplete(event) {
    if (this.data.submitting) return;
    const payload = this.noteFor(event, "驳回异常并强制完成");
    if (!payload) return;
    const app = getApp();
    this.setData({ submitting: true });
    try {
      await app.globalData.api.forceCompleteException(payload.id, payload.note);
      this.setData({ message: "已驳回异常并强制完成。" });
      this.refresh();
    } finally {
      this.setData({ submitting: false });
    }
  },
  openOrder(event) {
    getApp().globalData.currentOrderId = event.currentTarget.dataset.id;
    wx.navigateTo({ url: "/pages/order-detail/order-detail" });
  }
});
