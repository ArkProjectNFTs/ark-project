import { AccountInterface, Signature, TypedData } from "starknet";

const getSignInfos = async (
  TypedOrderData: TypedData,
  account: AccountInterface,
  owner?: string
) => {
  const signer: Signature = await account.signMessage(TypedOrderData);
  const pubKey = owner ? owner : await account.signer.getPubKey();
  if ("r" in signer && "s" in signer) {
    return {
      user_pubkey: pubKey,
      user_sig_r: signer.r,
      user_sig_s: signer.s
    };
  }
  return {
    user_pubkey: pubKey,
    user_sig_r: signer[0],
    user_sig_s: signer[1]
  };
};

export { getSignInfos };
