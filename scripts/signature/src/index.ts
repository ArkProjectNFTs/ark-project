import { ec, encode } from "starknet";
import { OrderV1, RouteType } from "./types";
import { hashOrder } from "./utils";

function main() {
  const privateKey = "0x1234567890987654321";
  const starknetPublicKey = ec.starkCurve.getStarkKey(privateKey);
  const fullPublicKey = encode.addHexPrefix(
    encode.buf2hex(ec.starkCurve.getPublicKey(privateKey, false))
  );

  const order: OrderV1 = {
    route: RouteType.Erc721ToErc20,
    currencyAddress:
      "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    currencyChainId: "0x534e5f4d41494e",
    salt: 1,
    offerer:
      "0x00E4769a4d2F7F69C70951A003eBA5c32707Cef3CdfB6B27cA63567f51cdd078",
    tokenChainId: "0x534e5f4d41494e",
    tokenAddress:
      "0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672",
    tokenId: { high: 0, low: 10 },
    quantity: { high: 0, low: 1 },
    startAmount: { high: 0, low: 1 },
    endAmount: { high: 0, low: 10 },
    startDate: 1699556828,
    endDate: 1702148828,
    brokerId: 123,
    additionalData: [],
  };

  const orderMessageHash = hashOrder(order);
  const signature = ec.starkCurve.sign(orderMessageHash, privateKey);

  console.log("Order Message Hash:", orderMessageHash);
  console.log("StarkNet Public Key:", starknetPublicKey);
  console.log("Full Public Key:", fullPublicKey);
  console.log("Signature R:", signature.r.toString());
  console.log("Signature S:", signature.s.toString());
}

main();
