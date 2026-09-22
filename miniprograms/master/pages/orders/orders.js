const tabs = ["待预约", "施工中", "待验收", "已完成"];

Page({
  data: { approved: false, reviewStatus: "", reviewReason: "", activeTab: "待预约", tabs: [], orders: [], completionNotes: {}, message: "" },
  onShow() { this.refresh(); },
  async refresh() {
    const app = getApp();
    const master = await app.globalData.api.getProfile();
    const all = await app.globalData.api.listOrders();
    this.setData({
      approved: master.reviewStatus === "已通过",
      reviewStatus: master.reviewStatus,
      reviewReason: master.reviewReason || "",
      tabs: tabs.map((name) => ({ name, count: all.filter((item) => item.category === name).length })),
      orders: all.filter((item) => item.category === this.data.activeTab)
    });
  },
  openRegister() {
    wx.navigateTo({ url: "/pages/register/register" });
  },
  switchTab(event) {
    this.setData({ activeTab: event.currentTarget.dataset.name, message: "" });
    this.refresh();
  },
  callCustomer(event) {
    if (isCanceledEvent(event)) return;
    wx.makePhoneCall({ phoneNumber: event.currentTarget.dataset.phone });
  },
  async appoint(event) {
    if (isCanceledEvent(event)) return;
    const app = getApp();
    await app.globalData.api.appoint(event.currentTarget.dataset.id);
    this.setData({ activeTab: "施工中", message: "已确认预约。" });
    this.refresh();
  },
  async checkIn(event) {
    if (isCanceledEvent(event)) return;
    const app = getApp();
    const location = await getLocationForCheckIn();
    await app.globalData.api.checkIn(event.currentTarget.dataset.id, location);
    this.setData({ message: location.ok ? "已打卡并记录定位。" : `已打卡，定位未成功：${location.reason}` });
    this.refresh();
  },
  inputCompletionNote(event) {
    const id = event.currentTarget.dataset.id;
    this.setData({ [`completionNotes.${id}`]: event.detail.value });
  },
  async complete(event) {
    if (isCanceledEvent(event)) return;
    const app = getApp();
    const orderId = event.currentTarget.dataset.id;
    const note = (this.data.completionNotes[orderId] || "").trim();
    try {
      this.setData({ message: "正在选择并上传完工凭证..." });
      const picked = await chooseMediaFallback({ purpose: "师傅完工凭证" });
      validateCompletionMedia(picked);
      const uploaded = [];
      for (const item of picked) {
        uploaded.push(await app.globalData.api.uploadMedia(item));
      }
      await app.globalData.api.submitCompletion(orderId, {
        images: uploaded.filter((item) => item.mediaType === "image"),
        videos: uploaded.filter((item) => item.mediaType === "video"),
        note
      });
      this.setData({ activeTab: "待验收", [`completionNotes.${orderId}`]: "", message: "完工凭证已提交，等待客户验收。" });
      this.refresh();
    } catch (error) {
      this.setData({ message: `完工凭证上传失败：${error.message || "请重试"}` });
    }
  }
});

function validateCompletionMedia(items) {
  const imageCount = items.filter((item) => item.mediaType === "image").length;
  const videoCount = items.filter((item) => item.mediaType === "video").length;
  if (imageCount < 1 || imageCount > 5) throw new Error("完工图片必须 1-5 张");
  if (videoCount < 1 || videoCount > 2) throw new Error("完工视频必须 1-2 个");
}

function isCanceledEvent(event) {
  const value = event.currentTarget.dataset.canceled;
  return value === true || value === "true";
}

async function chooseMediaFallback(options) {
  if (typeof wx === "undefined" || !wx.chooseMedia) {
    return [
      { mediaType: "image", filename: "完工图片.jpg", mimeType: "image/jpeg", purpose: options.purpose, contentText: "demo completion image" },
      { mediaType: "video", filename: "完工视频.mp4", mimeType: "video/mp4", purpose: options.purpose, contentText: "demo completion video" }
    ];
  }
  const result = await new Promise((resolve, reject) => {
    wx.chooseMedia({
      count: 7,
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

async function getLocationForCheckIn() {
  if (typeof wx === "undefined" || !wx.getLocation) {
    return { ok: false, reason: "当前环境不支持定位" };
  }
  try {
    const result = await new Promise((resolve, reject) => {
      wx.getLocation({
        type: "gcj02",
        success: resolve,
        fail: reject
      });
    });
    return {
      ok: true,
      latitude: result.latitude,
      longitude: result.longitude,
      accuracy: result.accuracy
    };
  } catch (error) {
    return { ok: false, reason: error.errMsg || "用户未授权或定位失败" };
  }
}
