import { stark } from "starknet";

import { createBroker } from "../src/actions/broker/createBroker";
import { config } from "./config";

const brokerID = stark.randomAddress();

createBroker(config, { brokerID });
