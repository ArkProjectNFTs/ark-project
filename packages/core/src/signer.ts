import * as starknet from "@scure/starknet";
import { ec, num } from "starknet";

const signMessage = (order: bigint[]) => {
  // todo replace with starknet wallet signature
  const privateKey = "0x1234567890987654321";
  const starknetPublicKey = ec.starkCurve.getStarkKey(privateKey);

  const orderMessageHash = starknet.poseidonHashMany(order);
  const signature = ec.starkCurve.sign(num.toHex(orderMessageHash), privateKey);

  return {
    user_pubkey: starknetPublicKey,
    user_sig_r: signature.r.toString(),
    user_sig_s: signature.s.toString()
  };
};

export { signMessage };
