import { getFeesAmount, setDefaultCreatorFees } from "../src/index.js";
import { accounts, config, mintERC721 } from "./utils/index.js";

describe("setDefaultCreatorFees", () => {
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

    await setDefaultCreatorFees(config, {
      account: admin,
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
    const { admin, arkSetbyAdminCollectionReceiver } = accounts;
    const numerator = 100;
    const denominator = 1;

    await expect(
      setDefaultCreatorFees(config, {
        account: admin,
        receiver: arkSetbyAdminCollectionReceiver.address,
        numerator,
        denominator
      })
    ).rejects.toThrow();
  }, 50_000);
});
