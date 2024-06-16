import { createBroker } from "@ark-project/core";

import { config } from "./config/index.js";

const brokerID = process.env.BROKER_ID as string;
console.log("Creating broker with ID: " + brokerID);
console.log(config);
createBroker(config, { brokerID });
