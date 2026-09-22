Page({
  data: {
    order: {},
    quote: { repairFee: 300, visitFee: 50, description: "按现场损伤报价。" },
    candidateGroups: [],
    selections: { gold: [], silver: [], bronze: [] },
    allocationAmounts: {},
    customerImageItems: [],
    customerVideoItems: [],
    canAllocateAmounts: false,
    message: ""
  },
  onShow() { this.refresh(); },
  async refresh() {
    const app = getApp();
    const order = await app.globalData.api.getOrder(app.globalData.currentOrderId);
    const allocationAmounts = {};
    order.assignments = (order.assignments || []).map((assign) => {
      const amount = assign.receivableAmount == null ? "" : String(assign.receivableAmount);
      allocationAmounts[assign.masterId] = amount;
      return Object.assign({}, assign, { amountInput: amount });
    });
    order.isMultiMaster = order.assignments.length > 1;
    order.canAllocateAmounts = order.isMultiMaster && ["待验收", "验收不通过待处理", "已验收"].includes(order.status);
    const groups = [];
    for (const [key, level] of [["gold", "金牌"], ["silver", "银牌"], ["bronze", "铜牌"]]) {
      const need = order.requestedMasters[key];
      if (need > 0) {
        const candidates = (await app.globalData.api.rankCandidates(order.id, level))
          .map((candidate, index) => Object.assign({}, candidate, { displayIndex: index + 1 }));
        groups.push({ key, level, need, candidates });
      }
    }
    this.setData({
      order,
      candidateGroups: groups,
      selections: order.dispatchDraft || { gold: [], silver: [], bronze: [] },
      allocationAmounts,
      customerImageItems: formatMediaItems(order.media.images, "客户图片"),
      customerVideoItems: formatMediaItems(order.media.videos, "客户视频"),
      canAllocateAmounts: order.canAllocateAmounts
    });
  },
  inputQuote(event) {
    this.setData({ [`quote.${event.currentTarget.dataset.field}`]: event.detail.value });
  },
  async submitQuote() {
    const app = getApp();
    try {
      await app.globalData.api.submitQuote(this.data.order.id, this.data.quote);
      this.setData({ message: "报价已提交，等待客户确认。" });
      this.refresh();
    } catch (error) {
      this.setData({ message: error.message });
    }
  },
  async saveQuoteDraft() {
    const app = getApp();
    try {
      await app.globalData.api.saveQuoteDraft(this.data.order.id, this.data.quote);
      this.setData({ message: "报价草稿已保存，未通知客户。" });
      this.refresh();
    } catch (error) {
      this.setData({ message: error.message });
    }
  },
  toggleMaster(event) {
    const keyMap = { "金牌": "gold", "银牌": "silver", "铜牌": "bronze" };
    const key = keyMap[event.currentTarget.dataset.level];
    const id = event.currentTarget.dataset.id;
    const list = this.data.selections[key].slice();
    const index = list.indexOf(id);
    if (index >= 0) list.splice(index, 1); else list.push(id);
    this.setData({ [`selections.${key}`]: list, message: `${event.currentTarget.dataset.level}已选 ${list.length} 人` });
  },
  callMaster(event) {
    wx.makePhoneCall({ phoneNumber: event.currentTarget.dataset.phone });
  },
  inputAllocation(event) {
    this.setData({ [`allocationAmounts.${event.currentTarget.dataset.id}`]: event.detail.value });
  },
  async saveAllocation() {
    if (!this.data.canAllocateAmounts) {
      this.setData({ message: "多人订单完工后才能分配师傅金额。" });
      return;
    }
    const app = getApp();
    try {
      await app.globalData.api.allocateMasterAmounts(this.data.order.id, this.data.allocationAmounts);
      this.setData({ message: "师傅金额已保存。" });
      this.refresh();
    } catch (error) {
      this.setData({ message: error.message });
    }
  },
  async dispatch() {
    const app = getApp();
    try {
      await app.globalData.api.dispatch(this.data.order.id, this.data.selections);
      this.setData({ message: "派单完成，订单进入待施工。" });
      this.refresh();
    } catch (error) {
      this.setData({ message: error.message });
    }
  },
  async saveDispatchDraft() {
    const app = getApp();
    try {
      await app.globalData.api.saveDispatchDraft(this.data.order.id, this.data.selections);
      this.setData({ message: "派单设置已保存，可稍后继续补齐。" });
      this.refresh();
    } catch (error) {
      this.setData({ message: error.message });
    }
  },
  async remindAcceptance() {
    const app = getApp();
    try {
      await app.globalData.api.remindAcceptance(this.data.order.id);
      this.setData({ message: "已发送验收提醒。" });
    } catch (error) {
      this.setData({ message: error.message });
    }
  },
  async confirmCustomerPayment() {
    const app = getApp();
    await app.globalData.api.confirmCustomerPayment(this.data.order.id);
    this.setData({ message: "已确认客户收款。" });
    this.refresh();
  },
  async confirmMasterPayment() {
    const app = getApp();
    for (const assign of this.data.order.assignments) {
      await app.globalData.api.confirmMasterPayment(this.data.order.id, assign.masterId);
    }
    this.setData({ message: "已确认支付给师傅。" });
    this.refresh();
  }
});

function formatMediaItems(items, fallbackName) {
  return (items || []).map((item, index) => ({
    name: typeof item === "string" ? item : item.filename || item.id || `${fallbackName}${index + 1}`,
    index: index + 1
  }));
}
