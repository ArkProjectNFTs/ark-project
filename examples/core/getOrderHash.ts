import { getOrderHash } from "@ark-project/core";

import { config } from "./config/index.js";

(async () => {
  console.log("=> Getting order hash");

  const order = await getOrderHash(config, {
    tokenId: BigInt(44),
    tokenAddress:
      "0x032d99485b22f2e58c8a0206d3b3bb259997ff0db70cffd25585d7dd9a5b0546"
  });

  console.log("=> Order: ", order);
})();
