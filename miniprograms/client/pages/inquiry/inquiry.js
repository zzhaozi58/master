Page({
  data: {
    prices: [
      { label: "木作浅表划痕 / 水印", price: "50 元/处" },
      { label: "木作深划痕 / 缺角", price: "120 元/处" },
      { label: "瓷砖 / 岩板缺角", price: "130 元/处" },
      { label: "大理石拼缝 / 开裂", price: "190 元/处" }
    ],
    services: ["平台报价确认", "按等级匹配师傅", "师傅完工凭证", "客户验收闭环"],
    materials: ["木材", "实木", "瓷砖", "岩板", "大理石", "水磨石", "其他"],
    repairTypeValues: ["划痕", "坑洞", "缺角", "裂缝", "拼缝", "补漆", "其他"],
    repairTypes: [],
    levels: [
      { key: "gold", label: "金牌大师" },
      { key: "silver", label: "银牌大师" },
      { key: "bronze", label: "铜牌大师" }
    ],
    form: {
      media: { images: [], videos: [] },
      material: "",
      materialOther: "",
      types: [],
      typesMap: {},
      typeOther: "",
      woundCount: "",
      woundLength: "",
      visitTime: "",
      durationDays: "1",
      address: "",
      requestedMasters: { gold: 0, silver: 1, bronze: 0 },
      customerName: "成都锦禾石材有限公司",
      wechat: "jinhe_zhou",
      phone: "13800001001"
    },
    visitDate: "",
    visitClock: "",
    visitDateLabel: "选择日期",
    visitClockLabel: "选择时间",
    mediaLabel: "点击添加现场图片或视频",
    uploadMessage: "",
    uploadFailed: false,
    otherTypeSelected: false,
    submitting: false,
    message: ""
  },
  onLoad() {
    this.refreshDerivedState();
  },
  async addMedia() {
    const app = getApp();
    this.setData({ uploadMessage: "正在上传现场图片 / 视频...", uploadFailed: false });
    try {
      const picked = await chooseMediaFallback({ count: 9, purpose: "客户询价现场" });
      const uploaded = [];
      for (const item of picked) {
        uploaded.push(await app.globalData.api.uploadMedia(item));
      }
      this.setData({
        "form.media": {
          images: this.data.form.media.images.concat(uploaded.filter((item) => item.mediaType === "image")),
          videos: this.data.form.media.videos.concat(uploaded.filter((item) => item.mediaType === "video"))
        },
        uploadMessage: "上传完成，可继续补充或提交询价。",
        uploadFailed: false
      });
      this.refreshDerivedState();
    } catch (error) {
      this.setData({ uploadMessage: `上传失败：${error.message || "请重试"}`, uploadFailed: true });
    }
  },
  chooseMaterial(event) {
    const value = event.currentTarget.dataset.value;
    this.setData({
      "form.material": this.data.form.material === value ? "" : value,
      "form.materialOther": value === "其他" ? this.data.form.materialOther : ""
    });
  },
  toggleType(event) {
    const value = event.currentTarget.dataset.value;
    const typesMap = Object.assign({}, this.data.form.typesMap);
    typesMap[value] = !typesMap[value];
    const types = Object.keys(typesMap).filter((key) => typesMap[key]);
    this.setData({
      "form.typesMap": typesMap,
      "form.types": types,
      "form.typeOther": typesMap["其他"] ? this.data.form.typeOther : ""
    });
    this.refreshDerivedState();
  },
  inputField(event) {
    this.setData({ [`form.${event.currentTarget.dataset.field}`]: event.detail.value });
  },
  pickVisitDate(event) {
    this.setData({ visitDate: event.detail.value, visitDateLabel: event.detail.value });
    this.refreshVisitTime();
  },
  pickVisitClock(event) {
    this.setData({ visitClock: event.detail.value, visitClockLabel: event.detail.value });
    this.refreshVisitTime();
  },
  refreshVisitTime() {
    if (this.data.visitDate && this.data.visitClock) {
      this.setData({ "form.visitTime": `${this.data.visitDate} ${this.data.visitClock}` });
    }
  },
  inputMaterialOther(event) {
    this.setData({ "form.materialOther": event.detail.value });
  },
  inputTypeOther(event) {
    this.setData({ "form.typeOther": event.detail.value });
  },
  stepMaster(event) {
    const key = event.currentTarget.dataset.key;
    const delta = Number(event.currentTarget.dataset.delta);
    const next = Math.max(0, Math.min(20, this.data.form.requestedMasters[key] + delta));
    this.setData({ [`form.requestedMasters.${key}`]: next });
    this.refreshDerivedState();
  },
  refreshDerivedState() {
    const mediaCount = this.data.form.media.images.length + this.data.form.media.videos.length;
    this.setData({
      mediaLabel: mediaCount ? `已添加 ${mediaCount} 个文件` : "点击添加现场图片或视频",
      repairTypes: this.data.repairTypeValues.map((value) => ({ value, active: !!this.data.form.typesMap[value] })),
      otherTypeSelected: !!this.data.form.typesMap["其他"],
      levels: this.data.levels.map((item) => Object.assign({}, item, { count: this.data.form.requestedMasters[item.key] }))
    });
  },
  async submit() {
    if (this.data.submitting) return;
    const app = getApp();
    this.setData({ submitting: true });
    try {
      const form = Object.assign({}, this.data.form, {
        types: Object.keys(this.data.form.typesMap).filter((key) => this.data.form.typesMap[key])
      });
      const order = await app.globalData.api.submitInquiry(form);
      this.setData({ message: `已提交，订单号 ${order.id}，当前状态待报价。` });
    } catch (error) {
      this.setData({ message: error.message });
    } finally {
      this.setData({ submitting: false });
    }
  }
});

async function chooseMediaFallback(options) {
  if (typeof wx === "undefined" || !wx.chooseMedia) {
    return [{ mediaType: "image", filename: "现场图片.jpg", mimeType: "image/jpeg", purpose: options.purpose, contentText: "demo image" }];
  }
  const result = await new Promise((resolve, reject) => {
    wx.chooseMedia({
      count: options.count,
      mediaType: ["image", "video"],
      sourceType: ["album", "camera"],
      success: resolve,
      fail: reject
    });
  });
  const files = result.tempFiles || [];
  const fs = wx.getFileSystemManager();
  const uploads = [];
  for (const file of files) {
    const contentBase64 = await new Promise((resolve, reject) => {
      fs.readFile({
        filePath: file.tempFilePath,
        encoding: "base64",
        success: (res) => resolve(res.data),
        fail: reject
      });
    });
    const isVideo = file.fileType === "video" || /\.mp4|\.mov$/i.test(file.tempFilePath);
    uploads.push({
      mediaType: isVideo ? "video" : "image",
      filename: file.tempFilePath.split("/").pop(),
      mimeType: isVideo ? "video/mp4" : "image/jpeg",
      purpose: options.purpose,
      contentBase64
    });
  }
  return uploads;
}
