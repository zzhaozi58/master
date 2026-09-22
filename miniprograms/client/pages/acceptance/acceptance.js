Page({
  data: {
    orderId: "",
    order: {},
    cycle: { completionMedia: { images: [], videos: [] }, completionNote: "" },
    completionImageItems: [],
    completionVideoItems: [],
    result: "pass",
    issue: { images: [], videos: [], description: "" },
    issueMediaLabel: "点击添加问题凭证",
    uploadMessage: "",
    uploadFailed: false,
    message: ""
  },
  onLoad(query) {
    this.setData({ orderId: query.id });
    this.refresh();
  },
  async refresh() {
    const app = getApp();
    const orders = await app.globalData.api.listOrders();
    const order = orders.find((item) => item.id === this.data.orderId);
    const cycle = order.latestCycle || { completionMedia: { images: [], videos: [] }, completionNote: "" };
    this.setData({
      order,
      cycle,
      completionImageItems: formatMediaItems(cycle.completionMedia.images, "完工图片"),
      completionVideoItems: formatMediaItems(cycle.completionMedia.videos, "完工视频")
    });
  },
  chooseResult(event) {
    this.setData({ result: event.currentTarget.dataset.value, message: "" });
  },
  async addIssueMedia() {
    const app = getApp();
    this.setData({ uploadMessage: "正在上传验收问题凭证...", uploadFailed: false });
    try {
      const picked = await chooseMediaFallback({ count: 6, purpose: "客户验收问题" });
      const uploaded = [];
      for (const item of picked) {
        uploaded.push(await app.globalData.api.uploadMedia(item));
      }
      this.setData({
        "issue.images": this.data.issue.images.concat(uploaded.filter((item) => item.mediaType === "image")),
        "issue.videos": this.data.issue.videos.concat(uploaded.filter((item) => item.mediaType === "video")),
        uploadMessage: "验收问题凭证已上传。",
        uploadFailed: false
      });
      this.refreshIssueLabel();
    } catch (error) {
      this.setData({ uploadMessage: `上传失败：${error.message || "请重试"}`, uploadFailed: true });
    }
  },
  inputIssue(event) {
    this.setData({ "issue.description": event.detail.value });
  },
  async submitPass() {
    const app = getApp();
    await app.globalData.api.acceptOrder(this.data.orderId);
    this.setData({ message: "验收已通过，订单进入已完成。" });
  },
  async submitFail() {
    const app = getApp();
    try {
      await app.globalData.api.rejectAcceptance(this.data.orderId, this.data.issue);
      this.setData({ message: "验收问题已提交，平台会安排处理。" });
    } catch (error) {
      this.setData({ message: error.message });
    }
  },
  refreshIssueLabel() {
    const count = this.data.issue.images.length + this.data.issue.videos.length;
    this.setData({ issueMediaLabel: count ? "已添加凭证" : "点击添加问题凭证" });
  }
});

function formatMediaItems(items, fallbackName) {
  return (items || []).map((item, index) => ({
    name: typeof item === "string" ? item : item.filename || item.id || `${fallbackName}${index + 1}`,
    index: index + 1
  }));
}

async function chooseMediaFallback(options) {
  if (typeof wx === "undefined" || !wx.chooseMedia) {
    return [{ mediaType: "image", filename: "验收问题.jpg", mimeType: "image/jpeg", purpose: options.purpose, contentText: "demo issue image" }];
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
