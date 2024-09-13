import { Config } from "@ark-project/core";

import { Accounts } from "../types/accounts.js";
import { getCurrentTokenId } from "./getCurrentTokenId.js";
import { logger } from "./logger.js";
import { mintERC20 } from "./mintERC20.js";
import { mintERC721 } from "./mintERC721.js";

export async function mintTokens(
  config: Config,
  accounts: Accounts,
  nftContract: string,
  isOffer?: boolean
): Promise<{ tokenId: bigint; orderAmount: bigint }> {
  logger.info("Minting tokens...");

  let tokenId: bigint;
  const orderAmount = BigInt(100000000000000000);

  if (isOffer) {
    // For offers, mint ERC20 for offerer and ERC721 for fulfiller
    logger.info("Minting ERC20 for the offerer...");
    await mintERC20(config.starknetProvider, accounts.offerer, orderAmount);

    logger.info("Minting ERC721 for the fulfiller...");
    const transaction_hash = await mintERC721(
      config.starknetProvider,
      accounts.fulfiller,
      nftContract
    );
    logger.info("ERC721 minting transaction hash:", transaction_hash);
  } else {
    // For listings, mint ERC721 for offerer and ERC20 for fulfiller (if in dev)
    const transaction_hash = await mintERC721(
      config.starknetProvider,
      accounts.offerer,
      nftContract
    );
    logger.info("ERC721 minting transaction hash:", transaction_hash);

    if (process.env.STARKNET_NETWORK_ID === "dev") {
      logger.info("Minting ERC20 for the fulfiller...");
      await mintERC20(config.starknetProvider, accounts.fulfiller, orderAmount);
    }
  }

  tokenId = await getCurrentTokenId(config, nftContract);
  logger.info("Token minted with tokenId:", tokenId);

  logger.info("Token minting complete.");

  return { tokenId, orderAmount };
}
