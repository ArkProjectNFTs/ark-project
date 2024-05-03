import { createBroker } from "../src/actions/broker/createBroker.js";
import { config } from "./config/index.js";

const brokerID = process.env.NEXT_PUBLIC_BROKER_ID as string;
console.log("Creating broker with ID: " + brokerID);
createBroker(config, { brokerID });
