Page({
  data: {
    profile: {},
    orders: [],
    submitting: false,
    message: ""
  },
  async onShow() {
    const app = getApp();
    const customer = await app.globalData.api.getProfile();
    const orders = await app.globalData.api.listOrders();
    this.setData({
      profile: Object.assign({}, customer),
      orders
    });
  },
  inputField(event) {
    this.setData({ [`profile.${event.currentTarget.dataset.field}`]: event.detail.value });
  },
  async save() {
    if (this.data.submitting) return;
    const error = validateProfile(this.data.profile);
    if (error) {
      this.setData({ message: error });
      return;
    }
    const app = getApp();
    this.setData({ submitting: true });
    try {
      await app.globalData.api.updateProfile(this.data.profile);
      this.setData({ message: "资料已保存。" });
    } catch (saveError) {
      this.setData({ message: saveError.message });
    } finally {
      this.setData({ submitting: false });
    }
  },
  openOrder(event) {
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

function validateProfile(profile) {
  if (!profile.name || !profile.name.trim()) return "公司名称 / 用户名字必填";
  if (!profile.wechat || !profile.wechat.trim()) return "微信号 / 微信昵称必填";
  if (!profile.phone || !(/^1\d{10}$/.test(profile.phone) || /^0\d{2,3}-?\d{7,8}$/.test(profile.phone))) return "联系电话格式不正确";
  if (!profile.address || !profile.address.trim()) return "常用上门地址必填";
  return "";
}
