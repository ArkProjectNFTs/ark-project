import { getFeesAmount } from "../src/index.js";
import { accounts, config, mintERC721 } from "./utils/index.js";

describe("getFeesAmount", () => {
  it("default", async () => {
    const { seller, listingBroker, saleBroker } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });

    const fees = await getFeesAmount(config, {
      fulfillBroker: saleBroker.address,
      listingBroker: listingBroker.address,
      nftAddress: tokenAddress,
      nftTokenId: tokenId,
      paymentAmount: BigInt(10000)
    });

    expect(fees).toMatchObject({
      listingBroker: expect.any(BigInt),
      fulfillBroker: expect.any(BigInt),
      creator: expect.any(BigInt),
      ark: expect.any(BigInt)
    });
  }, 50_000);
});
