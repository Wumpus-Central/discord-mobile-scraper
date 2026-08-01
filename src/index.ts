import { Pipeline } from "#src/pipeline.js";
import { versionCheck } from "#src/modules/version-check/index.js";
import { scraper } from "#src/modules/scraper/index.js";
import { unpacker } from "#src/modules/unpacker/index.js";
import { debundler } from "#src/modules/debundler/index.js";
import { stateWriter } from "#src/modules/state-writer/index.js";
import { parseSteps } from "#src/utils/args.js";

const pipeline = new Pipeline()
  .step("version-check", versionCheck)
  .step("scraper", scraper)
  .step("unpacker", unpacker)
  .step("debundler", debundler)
  .step("state-writer", stateWriter);

await pipeline.run(parseSteps(process.argv));
