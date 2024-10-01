import { createListing } from "./index.js";
import { getOrderStatus } from "../read/index.js";
import {
  accounts,
  config,
  mintERC721,
  STARKNET_NFT_ADDRESS
} from "../../../tests/utils/index.js";

describe("createListing", () => {
  it("default", async () => {
    const { seller } = accounts;
    const tokenId = await mintERC721({ account: seller });

    const orderHash = await createListing(config, {
      starknetAccount: seller,
      order: {
        brokerId: accounts.listingBroker.address,
        tokenAddress: STARKNET_NFT_ADDRESS,
        tokenId,
        startAmount: BigInt(1)
      },
      approveInfo: {
        tokenAddress: STARKNET_NFT_ADDRESS,
        tokenId
      }
    });
    const { orderStatus } = await getOrderStatus(config, { orderHash });

    expect(orderStatus).toBe("Open");
  }, 50_000);

  it("default: with custom currency", async () => {
    const { seller } = accounts;
    const tokenId = await mintERC721({ account: seller });

    const orderHash = await createListing(config, {
      starknetAccount: seller,
      order: {
        brokerId: accounts.listingBroker.address,
        tokenAddress: STARKNET_NFT_ADDRESS,
        tokenId,
        startAmount: BigInt(1),
        currencyAddress:
          "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"
      },
      approveInfo: {
        tokenAddress: STARKNET_NFT_ADDRESS,
        tokenId
      }
    });
    const { orderStatus } = await getOrderStatus(config, { orderHash });

    expect(orderStatus).toBe("Open");
  }, 50_000);
});
