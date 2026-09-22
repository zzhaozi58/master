const statuses = ["未知", "有空", "无空"];

Page({
  data: { rows: [], submitting: false, message: "" },
  async onShow() {
    const app = getApp();
    this.setData({ rows: await app.globalData.api.getAvailability() });
  },
  cycleStatus(event) {
    const index = event.currentTarget.dataset.index;
    const row = this.data.rows[index];
    const next = statuses[(statuses.indexOf(row.status) + 1) % statuses.length];
    this.setData({ [`rows[${index}].status`]: next });
  },
  async save() {
    if (this.data.submitting) return;
    const app = getApp();
    this.setData({ submitting: true });
    try {
      await app.globalData.api.saveAvailability(this.data.rows);
      this.setData({ message: "可用时间已保存。" });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
