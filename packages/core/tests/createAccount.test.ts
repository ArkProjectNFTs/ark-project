import { config } from "../examples/config/index.js";
import { createAccount } from "../src/actions/account/account.js";

describe("ArkProject Account Creation", () => {
  it("should successfully create an account", async () => {
    // Initialize the RPC provider with the ArkChain node URL
    const { arkProvider } = config;

    // Create an account using the provider
    const accountDetails = await createAccount(arkProvider);

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
