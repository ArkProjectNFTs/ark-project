import { createAccount } from "../src/actions/account/account.js";
import { config } from "./utils/index.js";

describe("createAccount", () => {
  it("default", async () => {
    const { starknetProvider } = config;
    const accountDetails = await createAccount(starknetProvider);

    expect(accountDetails).toHaveProperty("address");
    expect(typeof accountDetails.address).toBe("string");
    expect(accountDetails).toHaveProperty("privateKey");
    expect(typeof accountDetails.privateKey).toBe("string");
    expect(accountDetails).toHaveProperty("publicKey");
    expect(typeof accountDetails.publicKey).toBe("string");
    expect(accountDetails).toHaveProperty("account");
  });
});
