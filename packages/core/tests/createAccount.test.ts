import { expect } from "chai";
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
    expect(accountDetails).to.have.property("address");
    expect(accountDetails.address).to.be.a("string");
    expect(accountDetails).to.have.property("privateKey");
    expect(accountDetails.privateKey).to.be.a("string");
    expect(accountDetails).to.have.property("publicKey");
    expect(accountDetails.publicKey).to.be.a("string");
    expect(accountDetails).to.have.property("account");
  });
});
