const fs = require("fs");
const path = require("path");
const domain = require("../shared/domain");

function createJsonStore(filePath) {
  const resolved = path.resolve(filePath);

  return {
    filePath: resolved,
    load() {
      if (!fs.existsSync(resolved)) {
        const fresh = domain.createInitialState();
        writeJson(resolved, fresh);
        return fresh;
      }
      return JSON.parse(fs.readFileSync(resolved, "utf8"));
    },
    save(state) {
      writeJson(resolved, state);
    }
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(tempPath, filePath);
}

module.exports = { createJsonStore };
