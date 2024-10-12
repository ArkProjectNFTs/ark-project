import * as dotenv from "dotenv";
import { Account } from "starknet";
import { beforeAll } from "vitest";

import { config, getAccounts } from "@ark-project/test";

import { setArkFees } from "../src/index.js";

dotenv.config({ path: `${__dirname}/../../../.env.test` });

async function startMocking() {
  const numerator = 1;
  const denominator = 100;
  try {
    const { admin } = getAccounts();
    await setArkFees(config, {
      account: admin as Account,
      numerator,
      denominator
    });
  } catch (error) {
    console.error("Error setting Ark fees:", error);
  }
}

beforeAll(async () => {
  await startMocking();
});

export {};
