import { shortString, stark } from "starknet";

import { config } from "../examples/config/index.js";
import {
  STARKNET_ETH_ADDRESS,
  STARKNET_NFT_ADDRESS
} from "../examples/constants/index.js";
import { mintERC20 } from "../examples/utils/mintERC20.js";
import { whitelistBroker } from "../examples/utils/whitelistBroker.js";
import {
  approveERC20,
  cancelOrder,
  createAccount,
  createOffer,
  fetchOrCreateAccount,
  getOrderStatus,
  getOrderType,
  OfferV1
} from "../src/index.js";
import {
  generateRandomTokenId,
  getTypeFromCairoCustomEnum
} from "./utils/index.js";

describe("ArkProject cancel offer", () => {
  it("should cancel an offer and verify its status and type", async () => {
    const { arkProvider, starknetProvider } = config;
    const brokerId = stark.randomAddress();
    const solisAdminAccount = await fetchOrCreateAccount(
      config.arkProvider,
      process.env.SOLIS_ADMIN_ADDRESS_DEV,
      process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV
    );

    await whitelistBroker(config, solisAdminAccount, brokerId);

    const { account: arkAccount } = await createAccount(arkProvider);
    const starknetOffererAccount = await fetchOrCreateAccount(
      config.starknetProvider,
      process.env.STARKNET_ACCOUNT1_ADDRESS,
      process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
    );

    const offerStarAmount = 600000000000000000;

    await mintERC20(starknetProvider, starknetOffererAccount, offerStarAmount);

    const offer: OfferV1 = {
      brokerId,
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId: generateRandomTokenId(),
      startAmount: offerStarAmount,
      currencyAddress: STARKNET_ETH_ADDRESS // The ERC20 address
    };

    await approveERC20(config, {
      starknetAccount: starknetOffererAccount,
      contractAddress: STARKNET_ETH_ADDRESS,
      amount: offer.startAmount
    });

    const orderHash = await createOffer(config, {
      starknetAccount: starknetOffererAccount,
      arkAccount,
      offer: offer
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const r1 = await getOrderStatus(config, { orderHash });
    const orderStatusBefore = shortString.decodeShortString(r1.orderStatus);
    expect(orderStatusBefore).toEqual("OPEN");

    const r2 = await getOrderType(config, { orderHash });
    const orderType = getTypeFromCairoCustomEnum(r2.orderType);
    expect(orderType).toEqual("OFFER");

    const cancelInfo = {
      orderHash: orderHash,
      tokenAddress: offer.tokenAddress,
      tokenId: offer.tokenId
    };

    await cancelOrder(config, {
      starknetAccount: starknetOffererAccount,
      arkAccount,
      cancelInfo
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));
    const r3 = await getOrderStatus(config, { orderHash });
    const orderStatusAfter = shortString.decodeShortString(r3.orderStatus);
    expect(orderStatusAfter).toEqual("CANCELLED_USER");
  }, 20000);
});
