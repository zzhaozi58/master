const fs = require("fs");
const path = require("path");

function createMediaStore(rootDir) {
  const root = path.resolve(rootDir);

  return {
    root,
    saveUpload(upload, actor) {
      const normalized = normalizeUpload(upload);
      const id = `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const ext = extensionFor(normalized.filename, normalized.mimeType);
      const storageKey = `${id}${ext}`;
      const filePath = path.join(root, storageKey);
      fs.mkdirSync(root, { recursive: true });
      fs.writeFileSync(filePath, normalized.buffer);
      return {
        id,
        mediaType: normalized.mediaType,
        filename: normalized.filename,
        mimeType: normalized.mimeType,
        size: normalized.buffer.length,
        purpose: normalized.purpose,
        ownerRole: actor && actor.role ? actor.role : normalized.ownerRole,
        ownerId: actor && actor.subjectId ? actor.subjectId : "",
        storageKey,
        url: `/media/${id}`,
        createdAt: nowText()
      };
    },
    read(media) {
      const filePath = path.join(root, media.storageKey);
      return fs.readFileSync(filePath);
    }
  };
}

function normalizeUpload(upload) {
  if (!upload || typeof upload !== "object") throw new Error("缺少上传文件");
  const mediaType = upload.mediaType;
  if (!["image", "video"].includes(mediaType)) throw new Error("mediaType 必须是 image 或 video");
  const filename = sanitizeFilename(upload.filename || (mediaType === "image" ? "upload.jpg" : "upload.mp4"));
  const mimeType = upload.mimeType || (mediaType === "image" ? "image/jpeg" : "video/mp4");
  const purpose = upload.purpose || "订单凭证";
  const ownerRole = upload.ownerRole || "";
  const buffer = upload.contentBase64
    ? Buffer.from(upload.contentBase64, "base64")
    : Buffer.from(upload.contentText || "", "utf8");
  if (!buffer.length) throw new Error("上传内容不能为空");
  if (buffer.length > 10 * 1024 * 1024) throw new Error("单个文件不能超过 10MB");
  return { mediaType, filename, mimeType, purpose, ownerRole, buffer };
}

function sanitizeFilename(value) {
  return String(value).replace(/[\\/]/g, "_").slice(0, 120) || "upload";
}

function extensionFor(filename, mimeType) {
  const ext = path.extname(filename);
  if (ext) return ext;
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "video/quicktime") return ".mov";
  return mimeType.startsWith("video/") ? ".mp4" : ".jpg";
}

function nowText() {
  return "2026-09-21 20:00";
}

module.exports = { createMediaStore };
