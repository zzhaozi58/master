Page({
  data: { form: {}, message: "" },
  onShow() { this.refresh(); },
  async refresh() {
    const app = getApp();
    const customer = await app.globalData.api.getCustomer(app.globalData.currentCustomerId);
    this.setData({ form: Object.assign({}, customer), message: "" });
  },
  inputField(event) {
    this.setData({ [`form.${event.currentTarget.dataset.field}`]: event.detail.value });
  },
  async save() {
    const error = validateForm(this.data.form);
    if (error) {
      this.setData({ message: error });
      return;
    }
    const app = getApp();
    try {
      await app.globalData.api.updateCustomer(this.data.form);
      this.setData({ message: "客户资料已保存。" });
    } catch (saveError) {
      this.setData({ message: saveError.message });
    }
  }
});

function validateForm(form) {
  if (!form.name || !form.name.trim()) return "公司名称 / 用户名字必填";
  if (!form.wechat || !form.wechat.trim()) return "微信名必填";
  if (!form.phone || !(/^1\d{10}$/.test(form.phone) || /^0\d{2,3}-?\d{7,8}$/.test(form.phone))) return "联系电话格式不正确";
  if (!form.address || !form.address.trim()) return "常用地址必填";
  return "";
}
