const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const wxmlFiles = walk(path.join(root, "miniprograms")).filter((file) => file.endsWith(".wxml"));
const pageJsFiles = walk(path.join(root, "miniprograms")).filter((file) => /\/pages\/.+\.js$/.test(file));
const problems = [];

for (const file of wxmlFiles) {
  const body = fs.readFileSync(file, "utf8");
  collectComplexMustache(file, body);
  collectMissingPageFiles(file);
  collectDeadServiceButton(file, body);
  collectDeadAcceptanceReminder(file, body);
  collectMissingCompletionNoteInput(file, body);
  collectFreeTextMasterLevel(file, body);
  collectFreeTextVisitTime(file, body);
  collectMissingAdminOrderDetailFields(file, body);
  collectMissingOrderMediaLists(file, body);
  collectClientCompletedOrderSummary(file, body);
  collectMissingMasterDetailGroups(file, body);
  collectMissingAcceptanceCompletionProof(file, body);
  collectMissingExceptionActors(file, body);
}
for (const file of pageJsFiles) {
  collectPageLayerLeaks(file, fs.readFileSync(file, "utf8"));
}

if (problems.length) {
  for (const problem of problems) console.error(problem);
  process.exit(1);
}

console.log(`miniprogram static ok ${wxmlFiles.length}`);

function collectComplexMustache(file, body) {
  const matches = body.match(/\{\{[^}]+\}\}/g) || [];
  for (const match of matches) {
    if (/\[[^\]]+\]/.test(match)) {
      problems.push(`${relative(file)} uses bracket access in WXML: ${match}`);
    }
    if (/\+/.test(match)) {
      problems.push(`${relative(file)} concatenates or calculates in WXML: ${match}`);
    }
  }
}

function collectMissingPageFiles(wxmlFile) {
  const base = wxmlFile.slice(0, -".wxml".length);
  for (const ext of [".js", ".json", ".wxss"]) {
    if (!fs.existsSync(`${base}${ext}`)) {
      problems.push(`${relative(wxmlFile)} is missing sibling ${path.basename(base)}${ext}`);
    }
  }
}

function collectDeadServiceButton(file, body) {
  if (/拨打客服/.test(body) && !/bindtap="callService"/.test(body)) {
    problems.push(`${relative(file)} has customer service text without callService binding`);
  }
  if (/对报价有疑问/.test(body) && !/bindtap="callService"/.test(body)) {
    problems.push(`${relative(file)} has quote question text without callService binding`);
  }
}

function collectDeadAcceptanceReminder(file, body) {
  if (/发送验收提醒/.test(body) && !/bindtap="remindAcceptance"/.test(body)) {
    problems.push(`${relative(file)} has acceptance reminder text without remindAcceptance binding`);
  }
}

function collectMissingCompletionNoteInput(file, body) {
  if (/提交完工/.test(body) && !/bindinput="inputCompletionNote"/.test(body)) {
    problems.push(`${relative(file)} has completion submit without completion note input`);
  }
}

function collectFreeTextMasterLevel(file, body) {
  if (/admin\/pages\/master-detail\/master-detail\.wxml$/.test(relative(file)) && /师傅等级/.test(body) && !/<picker[^>]+range="\{\{levelOptions\}\}"/.test(body)) {
    problems.push(`${relative(file)} must use fixed picker options for master level`);
  }
}

function collectFreeTextVisitTime(file, body) {
  if (/client\/pages\/inquiry\/inquiry\.wxml$/.test(relative(file)) && /期望上门时间/.test(body) && !/<picker[^>]+mode="date"/.test(body)) {
    problems.push(`${relative(file)} must use date/time picker for visit time`);
  }
}

function collectMissingAdminOrderDetailFields(file, body) {
  if (!/admin\/pages\/order-detail\/order-detail\.wxml$/.test(relative(file))) return;
  if (!/客户图片\/视频/.test(body)) {
    problems.push(`${relative(file)} must show customer uploaded image/video counts`);
  }
  if (!/确认人数/.test(body)) {
    problems.push(`${relative(file)} must show confirmed master counts`);
  }
  if (/款项明细/.test(body) && (!/确认人/.test(body) || !/确认金额/.test(body))) {
    problems.push(`${relative(file)} must show payment confirmation actor and amount`);
  }
  if (/款项明细/.test(body) && !/备注/.test(body)) {
    problems.push(`${relative(file)} must show payment note`);
  }
}

function collectMissingOrderMediaLists(file, body) {
  const name = relative(file);
  if (/admin\/pages\/order-detail\/order-detail\.wxml$/.test(name) && (!/customerImageItems/.test(body) || !/customerVideoItems/.test(body))) {
    problems.push(`${name} must list customer uploaded image and video items`);
  }
  if (/client\/pages\/order-detail\/order-detail\.wxml$/.test(name) && (!/completionImageItems/.test(body) || !/completionVideoItems/.test(body))) {
    problems.push(`${name} must list completion image and video items`);
  }
}

function collectClientCompletedOrderSummary(file, body) {
  if (!/client\/pages\/orders\/orders\.wxml$/.test(relative(file))) return;
  if (/上门时间/.test(body) && !/activeTab !== '已完成'/.test(body)) {
    problems.push(`${relative(file)} must keep completed-order cards summarized`);
  }
}

function collectMissingMasterDetailGroups(file, body) {
  if (!/admin\/pages\/master-detail\/master-detail\.wxml$/.test(relative(file))) return;
  if (!body.includes("orderGroups")) {
    problems.push(`${relative(file)} must render grouped master orders`);
  }
  if (!body.includes("需要支付")) {
    problems.push(`${relative(file)} must show need-pay amount`);
  }
  if (!/审核管理员/.test(body) || !/审核时间/.test(body)) {
    problems.push(`${relative(file)} must show master review actor and time`);
  }
}

function collectMissingAcceptanceCompletionProof(file, body) {
  if (!/client\/pages\/acceptance\/acceptance\.wxml$/.test(relative(file))) return;
  if (!/completionImageItems/.test(body) || !/completionVideoItems/.test(body)) {
    problems.push(`${relative(file)} must list master completion images and videos`);
  }
}

function collectMissingExceptionActors(file, body) {
  if (!/admin\/pages\/exceptions\/exceptions\.wxml$/.test(relative(file))) return;
  if (!/发起人/.test(body) || !/处理人/.test(body)) {
    problems.push(`${relative(file)} must show exception creator and handler`);
  }
}

function collectPageLayerLeaks(file, body) {
  if (/globalData\.(domain|state)/.test(body)) {
    problems.push(`${relative(file)} must use app.globalData.api instead of globalData.domain/state`);
  }
  const lines = body.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/globalData\.api\.\w+\(/.test(line) && !/await\s+.*globalData\.api\.\w+\(/.test(line) && !/return\s+.*globalData\.api\.\w+\(/.test(line)) {
      problems.push(`${relative(file)}:${index + 1} calls app.globalData.api without await or return`);
    }
  });
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function relative(file) {
  return path.relative(root, file);
}
