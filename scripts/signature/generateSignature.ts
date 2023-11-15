import {
  ec,
  hash,
  num,
  json,
  Contract,
  WeierstrassSignatureType,
  type BigNumberish,
  encode,
} from "starknet";

const privateKey = "0x1234567890987654321";
const starknetPublicKey = ec.starkCurve.getStarkKey(privateKey);
const fullPublicKey = encode.addHexPrefix(
  encode.buf2hex(ec.starkCurve.getPublicKey(privateKey, false))
);

// struct OrderV1 {
//   route: RouteType,
//   currency_address: ContractAddress,
//   currency_chain_id: felt252,
//   // Salt.
//   salt: felt252,
//   // The address of the user sending the offer.
//   offerer: ContractAddress,
//   // Chain id.
//   token_chain_id: felt252,
//   // The token contract address.
//   token_address: ContractAddress,
//   // The token id.
//   token_id: u256,
//   // The quantity of the token_id to be offerred (1 for NFTs).
//   quantity: u256,
//   // in wei. --> 10 | 10 | 10 |
//   start_amount: u256,
//   // in wei. --> 0  | 10 | 20 |
//   end_amount: u256,
//   // Start validity date of the offer, seconds since unix epoch.
//   start_date: u64,
//   // Expiry date of the order, seconds since unix epoch.
//   end_date: u64,
//   // Broker public identifier.
//   broker_id: felt252,
//   // Additional data, limited to ??? felts.
//   additional_data: Span<felt252>,
// }

function generateOrderMessageHash(): string {
  const route: BigNumberish = 0; // Erc20ToErc721 = 0, Erc721ToErc20 = 1
  const currencyAddress: BigNumberish =
    "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"; // Starkgate ETH
  const currency_chain_id: BigNumberish = 0;
  const salt: BigNumberish = 0;
  const offerer: BigNumberish = starknetPublicKey;
  const token_chain_id: BigNumberish = 0;
  const token_address: BigNumberish =
    "0x05dbdedc203e92749e2e746e2d40a768d966bd243df04a6b712e222bc040a9af"; // Starknet ID

  const token_id: BigNumberish = 1;

  const quantity: BigNumberish = 1;
  const start_amount: BigNumberish = 0;
  const end_amount: BigNumberish = 1;
  const start_date: BigNumberish = 1700063671;
  const end_date: BigNumberish = 1700582073;
  const broker_id = 0;

  const message: BigNumberish[] = [
    route,
    currencyAddress,
    currency_chain_id,
    salt,
    offerer,
    token_chain_id,
    token_address,
    0,
    token_id,
    0,
    quantity,
    start_amount,
    end_amount,
    start_date,
    end_date,
    broker_id,
  ];
  const msgHash = hash.computeHashOnElements(message);
  return msgHash;
}

const orderMessageHash = generateOrderMessageHash();
const signature: WeierstrassSignatureType = ec.starkCurve.sign(
  orderMessageHash,
  privateKey
);

console.log("=> starknet public key", starknetPublicKey);
console.log("=> public key", fullPublicKey);
console.log("=> r", signature.r.toString());
console.log("=> s", signature.s.toString());
