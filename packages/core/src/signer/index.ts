import * as starknet from "@scure/starknet";
import {
  Account,
  AccountInterface,
  ec,
  num,
  Signature,
  TypedData
} from "starknet";

const signMessage = (data: bigint[]) => {
  // todo replace with starknet wallet signature
  const privateKey = "0x1234567890987654321";
  const starknetPublicKey = ec.starkCurve.getStarkKey(privateKey);
  const messageHash = starknet.poseidonHashMany(data);
  const signature = ec.starkCurve.sign(num.toHex(messageHash), privateKey);
  return {
    user_pubkey: starknetPublicKey,
    user_sig_r: signature.r.toString(),
    user_sig_s: signature.s.toString()
  };
};

const getSignInfos = async (
  TypedOrderData: TypedData,
  account: AccountInterface
) => {
  let signer: Signature = await account.signMessage(TypedOrderData);
  console.log(typeof signer, signer);
  if ("r" in signer && "s" in signer) {
    return {
      user_pubkey: await account.signer.getPubKey(),
      user_sig_r: signer.r,
      user_sig_s: signer.s
    };
  }

  return {
    user_pubkey: account.signer.getPubKey(),
    user_sig_r: signer[0],
    user_sig_s: signer[1]
  };
};

export { signMessage, getSignInfos };
