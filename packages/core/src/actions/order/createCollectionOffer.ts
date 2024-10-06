import {
	AccountInterface,
	cairo,
	CairoOption,
	CairoOptionVariant,
	CallData,
	Uint256
  } from "starknet";
  
  import { Config } from "../../createConfig.js";
  import {
	InvalidEndDateError,
	InvalidStartDateError
  } from "../../errors/actions.js";
  import { OrderV1, RouteType } from "../../types/index.js";
  import { getOrderHashFromOrderV1 } from "../../utils/index.js";
  import { getAllowance } from "../read/getAllowance.js";
  
  export interface CreateCollectionOfferParameters {
	account: AccountInterface;
	brokerAddress: string;
	currencyAddress?: string;
	tokenAddress: string;
	amount: bigint;
	startDate?: number;
	endDate?: number;
	waitForTransaction?: boolean;
  }
  
  export interface CreateCollectionOfferResult {
	orderHash: bigint;
	transactionHash: string;
  }
  
  const docsPath = "/create-collection-offer";
  /**
   * Creates a collection offer on the ArkProject.
   *
   * This function takes a configuration object and listing parameters, builds a complete OrderV1 object
   * with default values for unspecified fields, compiles the order data, signs it, and then executes
   * the transaction to create a listing on the Arkchain using the specified Starknet and Arkchain accounts.
   *
   * @param {Config} config - The core SDK config, including network and contract information.
   * @param {CreateCollectionOfferParameters} parameters - The parameters for the listing, including Starknet account,
   * Arkchain account, base order details, and an optional owner address.
   *
   * @returns {Promise<CreateCollectionOfferResult>} A promise that resolves with the hash of the created order.
   *
   */
  async function createCollectionOffer(
	config: Config,
	parameters: CreateCollectionOfferParameters
  ): Promise<CreateCollectionOfferResult> {
	const {
	  account,
	  brokerAddress,
	  currencyAddress = config.starknetCurrencyContract,
	  tokenAddress,
	  amount,
	  startDate,
	  endDate,
	  waitForTransaction = true
	} = parameters;
	const now = Math.floor(Date.now() / 1000);
	const startedAt = startDate || now;
	const endedAt = endDate || now + 60 * 60 * 24;
	const maxEndedAt = now + 60 * 60 * 24 * 30;
  
	if (startedAt < now) {
	  throw new InvalidStartDateError(startDate, { docsPath });
	}
  
	if (endedAt < startedAt) {
	  throw new InvalidEndDateError({ endDate, startDate }, { docsPath });
	}
  
	if (endedAt > maxEndedAt) {
	  throw new Error(
		`End date too far in the future. End date (${endDate}) exceeds the maximum allowed (${maxEndedAt}).`
	  );
	}
  
	if (amount === BigInt(0)) {
	  throw new Error(
		"Invalid start amount. The start amount must be greater than zero."
	  );
	}
  
	const chainId = await config.starknetProvider.getChainId();
	const currentAllowance = await getAllowance(
	  config,
	  currencyAddress,
	  account.address
	);
	const allowance = currentAllowance + amount;
	const order: OrderV1 = {
	  route: RouteType.Erc20ToErc721,
	  currencyAddress,
	  currencyChainId: chainId,
	  salt: 1,
	  offerer: account.address,
	  tokenChainId: chainId,
	  tokenAddress,
	  tokenId: new CairoOption<Uint256>(CairoOptionVariant.None),
	  quantity: cairo.uint256(1),
	  startAmount: cairo.uint256(amount),
	  endAmount: cairo.uint256(0),
	  startDate: startedAt,
	  endDate: endedAt,
	  brokerId: brokerAddress,
	  additionalData: []
	};
  
	const result = await account.execute([
	  {
		contractAddress: currencyAddress,
		entrypoint: "approve",
		calldata: CallData.compile({
		  spender: config.starknetExecutorContract,
		  amount: cairo.uint256(allowance)
		})
	  },
	  {
		contractAddress: config.starknetExecutorContract,
		entrypoint: "create_order",
		calldata: CallData.compile({
		  order
		})
	  }
	]);
  
	if (waitForTransaction) {
	  await config.starknetProvider.waitForTransaction(result.transaction_hash, {
		retryInterval: 1000
	  });
	}
  
	const orderHash = getOrderHashFromOrderV1(order);
  
	return {
	  orderHash,
	  transactionHash: result.transaction_hash
	};
  }
  
  export { createCollectionOffer };