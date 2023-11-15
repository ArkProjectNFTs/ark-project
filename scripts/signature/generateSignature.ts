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
import * as starknet from "@scure/starknet";

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

// type OrderV1 = {
//   tokenId: Uint256;
// };

function generateOrderMessageHash(): string {
  const route: BigNumberish = 1; // Erc20ToErc721 = 0, Erc721ToErc20 = 1
  const currencyAddress: BigNumberish =
    "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"; // Starkgate ETH
  const currency_chain_id: BigNumberish = "0x534e5f4d41494e";
  const salt: BigNumberish = 1;
  const offerer: BigNumberish =
    "0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078";
  const token_chain_id: BigNumberish = "0x534e5f4d41494e";
  const token_address: BigNumberish =
    "0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672";

  const start_date: BigNumberish = 1699643228;
  const end_date: BigNumberish = 1700420828;
  const broker_id: BigNumberish = 123;

  const message: BigNumberish[] = [
    route,
    currencyAddress,
    currency_chain_id,
    salt,
    offerer,
    token_chain_id,
    token_address,
    10, // token_id
    0, // token_id
    1, //quantity
    0, // quantity
    600000000000000000, // start_amount,
    0, // start_amount
    0, // end_amount,
    0, // end_amount,
    start_date,
    end_date,
    broker_id,
    0, // additional_data length
  ];

  const initialValue = Uint8Array.from([]);
  const results = message.reduce((acc, m) => {
    const hex: string = `0x${num.toHex(m).replace("0x", "").padStart(64, "0")}`;
    const arr: Uint8Array = num.hexToBytes(hex);
    return Uint8Array.from([...acc, ...arr]);
  }, initialValue);

  let test: BigNumberish = 255;
  let hexValue = num.toHex(test);

  // hexValue = hexValue.padStart(64, "0");

  let result = num.hexToBytes(hexValue);

  console.log(
    "=> test",
    test,
    `0x${hexValue.replace("0x", "").padStart(64, "0")}`,
    result
  );

  // console.log("=> results", results);
  let hash = starknet.keccak(results);
  console.log("=> hash", num.toHex(hash));

  // const msgHash = hash.computeHashOnElements(message);
  // return msgHash;

  return num.toHex(hash);
}

// 0xebb957c0c165c2622f912876b0650b86367930df11b3346b81f352cc26229d

// order hash (contract) = 474106594419416033452982221818660428152512398534120276814331985155964601931
// order hash (contract) = 0x10c55b6f605623038e811a612220e6f00a4fbc9288906aaafae5f6eb871064b

const orderMessageHash = generateOrderMessageHash();
console.log("=> orderMessageHash", orderMessageHash);

const signature: WeierstrassSignatureType = ec.starkCurve.sign(
  orderMessageHash,
  privateKey
);

console.log("=> starknet public key", starknetPublicKey);
console.log("=> public key", fullPublicKey);
console.log("=> r", signature.r.toString());
console.log("=> s", signature.s.toString());
