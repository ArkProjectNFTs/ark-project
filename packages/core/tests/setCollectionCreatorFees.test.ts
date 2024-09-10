import { getFeesAmount, setCollectionCreatorFees } from "../src/index.js";
import { accounts, config, mintERC721 } from "./utils/index.js";

describe("setCollectionCreatorFees", () => {
  it("default", async () => {
    const {
      admin,
      seller,
      listingBroker,
      saleBroker,
      arkSetbyAdminCollectionReceiver
    } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });
    const amount = BigInt(10000);
    const numerator = 1;
    const denominator = 100;

    await setCollectionCreatorFees(config, {
      account: admin,
      tokenAddress,
      receiver: arkSetbyAdminCollectionReceiver.address,
      numerator,
      denominator
    });

    const fees = await getFeesAmount(config, {
      fulfillBroker: saleBroker.address,
      listingBroker: listingBroker.address,
      nftAddress: tokenAddress,
      nftTokenId: tokenId,
      paymentAmount: amount
    });

    expect(fees.creator).toBe(
      (amount * BigInt(numerator)) / BigInt(denominator)
    );
  }, 50_000);

  it("error: invalid fees ratio", async () => {
    const { admin, seller, arkSetbyAdminCollectionReceiver } = accounts;
    const { tokenAddress } = await mintERC721({ account: seller });
    const numerator = 100;
    const denominator = 1;

    await expect(
      setCollectionCreatorFees(config, {
        account: admin,
        tokenAddress,
        receiver: arkSetbyAdminCollectionReceiver.address,
        numerator,
        denominator
      })
    ).rejects.toThrow();
  }, 50_000);
});
