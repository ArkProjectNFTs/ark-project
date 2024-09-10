import { getCollectionCreatorFees } from "../src/index.js";
import { accounts, config, mintERC721 } from "./utils/index.js";

describe("getCollectionCreatorFees", () => {
  it("default", async () => {
    const { seller } = accounts;
    const { tokenAddress } = await mintERC721({ account: seller });

    const { creator, fees } = await getCollectionCreatorFees(
      config,
      tokenAddress
    );

    expect(creator).toBeDefined();
    expect(fees).toMatchObject({
      formatted: expect.any(String),
      denominator: expect.any(BigInt),
      numerator: expect.any(BigInt)
    });
  }, 50_000);
});
