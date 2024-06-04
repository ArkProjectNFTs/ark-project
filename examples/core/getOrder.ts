import { getOrder } from "@ark-project/core";

import { config } from "./config/index.js";

(async () => {
  console.log("=> Getting order...");
  const order = await getOrder(config, {
    orderHash:
      BigInt(0x04ee020dfcb4c4abf7355c4058f5210f8aa73ac98e579ddac5d414295c858455)
  });

  console.log("=> Order: ", order);
})();
