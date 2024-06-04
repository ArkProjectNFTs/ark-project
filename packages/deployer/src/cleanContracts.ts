import { promises as fs } from "fs";

import { getContractsFilePath } from "./utils";

(async () => {
  await fs.writeFile(
    getContractsFilePath(),
    JSON.stringify({
      sepolia: {},
      mainnet: {},
      dev: {}
    })
  );
})();
