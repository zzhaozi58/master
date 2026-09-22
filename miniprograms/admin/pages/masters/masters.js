const tabs = ["待审核", "全部", "金牌", "银牌", "铜牌"];

Page({
  data: { activeTab: "全部", tabs: [], masters: [] },
  onShow() { this.refresh(); },
  async refresh() {
    const api = getApp().globalData.api;
    const tabItems = [];
    for (const name of tabs) {
      tabItems.push({ name, count: (await api.listMasters(name)).length });
    }
    this.setData({
      tabs: tabItems,
      masters: await api.listMasters(this.data.activeTab)
    });
  },
  switchTab(event) {
    this.setData({ activeTab: event.currentTarget.dataset.name });
    this.refresh();
  },
  openDetail(event) {
    getApp().globalData.currentMasterId = event.currentTarget.dataset.id;
    wx.navigateTo({ url: "/pages/master-detail/master-detail" });
  }
});
