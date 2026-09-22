Page({
  data: { form: {}, message: "" },
  async onShow() {
    const master = await getApp().globalData.api.getProfile();
    this.setData({ form: Object.assign({}, master) });
  },
  inputField(event) {
    this.setData({ [`form.${event.currentTarget.dataset.field}`]: event.detail.value });
  },
  async submit() {
    const error = validateForm(this.data.form);
    if (error) {
      this.setData({ message: error });
      return;
    }
    const app = getApp();
    try {
      await app.globalData.api.updateProfile(this.data.form);
      this.setData({ message: "资料已提交，等待管理员审核。" });
    } catch (submitError) {
      this.setData({ message: submitError.message });
    }
  }
});

function validateForm(form) {
  if (!form.name || !form.name.trim()) return "姓名必填";
  if (!form.gender || !form.gender.trim()) return "性别必填";
  if (!form.wechat || !form.wechat.trim()) return "微信号必填";
  if (!form.phone || !(/^1\d{10}$/.test(form.phone) || /^0\d{2,3}-?\d{7,8}$/.test(form.phone))) return "手机号格式不正确";
  if (!form.city || !form.city.trim()) return "城市必填";
  if (!form.district || !form.district.trim()) return "区/县必填";
  if (!form.street || !form.street.trim()) return "街道必填";
  return "";
}
