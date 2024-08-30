import { getFeesAmount } from "../src/actions/read/index.js";
import {
  accounts,
  config,
  mintERC721,
  setBrokerFees,
  STARKNET_NFT_ADDRESS
} from "./utils/index.js";

describe("getFeesAmount", () => {
  it("default", async () => {
    const { seller, listingBroker, saleBroker } = accounts;
    const tokenId = await mintERC721({ account: seller });
    const amount = BigInt(100);

    await setBrokerFees(config, listingBroker, 1000);
    await setBrokerFees(config, saleBroker, 1);

    const fees = await getFeesAmount(config, {
      fulfillBroker: saleBroker.address,
      listingBroker: listingBroker.address,
      nftAddress: STARKNET_NFT_ADDRESS,
      nftTokenId: tokenId,
      paymentAmount: amount
    });

    expect(fees.fulfillBroker).toBe(BigInt(10000));
  }, 50_000);
});
