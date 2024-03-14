/**
 * Demonstrates how to use the Starknet SDK for creating a listing on the arkchain.
 * This example shows the process of initializing a provider, creating an account,
 * submitting a listing order and cancelling it.
 */

import "dotenv/config";

import { AccountInterface, cairo, CallData } from "starknet";

import { Config, fetchOrCreateAccount } from "../src";
import { config } from "./config";
import { STARKNET_NFT_ADDRESS } from "./constants";
import { getCurrentTokenId } from "./utils/getCurrentTokenId";
import { mintERC721 } from "./utils/mintERC721";

interface ApproveERC721Parameters {
  starknetAccount: AccountInterface;
  contractAddress: string;
  tokenId: bigint;
  from: string;
  to: string;
}

export const approveERC721 = async (
  config: Config,
  parameters: ApproveERC721Parameters
) => {
  const { contractAddress, starknetAccount } = parameters;
  const result = await starknetAccount.execute([
    {
      contractAddress: contractAddress,
      entrypoint: "approve",
      calldata: CallData.compile({
        to: "0x48d116d91dd6ffdcb78761f8851d4e419afeff46740c01206e57283273dbb4",
        token_id: cairo.uint256(parameters.tokenId)
      })
    },
    {
      contractAddress:
        "0x48d116d91dd6ffdcb78761f8851d4e419afeff46740c01206e57283273dbb4",
      entrypoint: "execute_swap",
      calldata: CallData.compile({
        swap_info: {
          nft_address: contractAddress,
          nft_from: parameters.from,
          nft_to: parameters.to,
          nft_token_id: cairo.uint256(parameters.tokenId)
        }
      })
    }
  ]);
  await config.starknetProvider.waitForTransaction(result.transaction_hash, {
    retryInterval: 1000
  });
};

/**
 * Creates a listing on the blockchain using provided order details.
 */
(async () => {
  const { starknetProvider } = config;
  const starknetOffererAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT1_ADDRESS,
    process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
  );
  const starknetRecipientAccount = await fetchOrCreateAccount(
    config.starknetProvider,
    process.env.STARKNET_ACCOUNT2_ADDRESS,
    process.env.STARKNET_ACCOUNT2_PRIVATE_KEY
  );
  const transaction_hash = await mintERC721(
    starknetProvider,
    starknetOffererAccount
  );
  console.log("Minted ERC721 token with transaction hash:", transaction_hash);
  const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);
  await approveERC721(config, {
    contractAddress: STARKNET_NFT_ADDRESS,
    starknetAccount: starknetOffererAccount,
    tokenId: tokenId,
    from: starknetOffererAccount.address,
    to: starknetRecipientAccount.address
  });
})();
