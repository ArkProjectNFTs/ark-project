import { RpcProvider } from "starknet";

import { createAccount } from "../src/actions/account/account";

describe("ArkProject Account Creation", () => {
  it("should successfully create an account", async () => {
    // Initialize the RPC provider with the ArkChain node URL
    const provider = new RpcProvider({
      nodeUrl: "http://0.0.0.0:7777"
    });

    // Create an account using the provider
    const accountDetails = await createAccount(provider);

    // Assertions to verify account creation
    expect(accountDetails).toHaveProperty("address");
    expect(typeof accountDetails.address).toBe("string");
    expect(accountDetails).toHaveProperty("privateKey");
    expect(typeof accountDetails.privateKey).toBe("string");
    expect(accountDetails).toHaveProperty("publicKey");
    expect(typeof accountDetails.publicKey).toBe("string");
    expect(accountDetails).toHaveProperty("account");
  });
});
