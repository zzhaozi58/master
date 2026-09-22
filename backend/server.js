const path = require("path");
const { createJsonStore } = require("./storage");
const { createMediaStore } = require("./media-store");
const { createHttpServer } = require("./http-server");

const port = Number(process.env.PORT || 8787);
const dataFile = process.env.JINDASHI_DATA_FILE || path.join(__dirname, "..", "data", "jindashi-state.json");
const mediaDir = process.env.JINDASHI_MEDIA_DIR || path.join(__dirname, "..", "data", "media");
const store = createJsonStore(dataFile);
const server = createHttpServer({ store, mediaStore: createMediaStore(mediaDir) });

server.listen(port, () => {
  console.log(`Jindashi backend listening on http://localhost:${port}`);
  console.log(`Data file: ${store.filePath}`);
  console.log(`Media dir: ${mediaDir}`);
});
