import * as starknet from "@scure/starknet";
import { Account, ec, num, Signature, TypedData } from "starknet";

export const signMessage = (privateKey: string, data: bigint[]) => {
  const starknetPublicKey = ec.starkCurve.getStarkKey(privateKey);
  const messageHash = starknet.poseidonHashMany(data);
  const signature = ec.starkCurve.sign(num.toHex(messageHash), privateKey);
  return {
    user_pubkey: starknetPublicKey,
    user_sig_r: signature.r.toString(),
    user_sig_s: signature.s.toString()
  };
};

export const getSignInfos = async (
  typedOrderData: TypedData,
  account: Account
) => {
  let signer: Signature = await account.signMessage(typedOrderData);
  if ("r" in signer && "s" in signer) {
    return {
      user_pubkey: await account.signer.getPubKey(),
      user_sig_r: signer.r,
      user_sig_s: signer.s
    };
  }
  console.error("Unexpected signature type: ArraySignatureType");
  return {
    user_pubkey: account.signer.getPubKey(),
    user_sig_r: null,
    user_sig_s: null
  };
};
