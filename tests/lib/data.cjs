// Uygulamanın kullandığı içerik modüllerini (src/data) testler için birleştirir — src/lib/engine/load.ts ile aynı yapı.
const fs = require("fs");
const path = require("path");
const D = path.join(__dirname, "../../src/data");
const j = (p) => JSON.parse(fs.readFileSync(path.join(D, p), "utf8"));
function loadData() {
  return {
    words: j("vocabulary/words.json"),
    content: {
      bank: j("questions/mini-yds-bank.json"),
      traps: j("questions/traps.json"),
      passages: j("reading/passages.json"),
      reading: j("reading/questions.json"),
      clozes: j("cloze/clozes.json"),
      ladders: j("semantic-ladders/ladders.json"),
      rel: j("semantic-ladders/relations.json"),
      held: j("questions/content-meta.json").held,
    },
  };
}
const ENGINE = path.join(__dirname, "../../src/engine/app.generated.js");
const REFERENCE = path.join(__dirname, "../fixtures/engine-v5.1-reference.js");
module.exports = { loadData, ENGINE, REFERENCE };
