const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "shared/domain.js"), "utf8");
const targets = [
  "miniprograms/client/utils/domain.js",
  "miniprograms/admin/utils/domain.js",
  "miniprograms/master/utils/domain.js"
];

for (const target of targets) {
  const body = fs.readFileSync(path.join(root, target), "utf8");
  if (body !== source) {
    console.error(`${target} is not synchronized with shared/domain.js`);
    process.exit(1);
  }
}

console.log("shared domain copies ok");
