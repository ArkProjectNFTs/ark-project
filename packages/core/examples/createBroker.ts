import { createBroker } from "../src/actions/broker/createBroker";
import { config } from "./config";

const brokerID = process.env.NEXT_PUBLIC_BROKER_ID as string;

createBroker(config, { brokerID });
