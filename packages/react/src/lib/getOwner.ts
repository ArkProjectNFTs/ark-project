import { Contract, type ProviderInterface } from "starknet";

import { argentAbi } from "../../abi/argentAbi";
import { braavosAbi } from "../../abi/braavosAbi";

const getOwner = async (
  address: string,
  provider: ProviderInterface,
  connectorId: string | undefined
) => {
  let owner = null;
  try {
    if (connectorId === "braavos") {
      const accountContract = new Contract(braavosAbi, address, provider);
      owner = await accountContract.call("get_public_key", [], {
        parseResponse: false
      });
    } else if (connectorId === "argentX") {
      const accountContract = new Contract(argentAbi, address, provider);
      owner = await accountContract.call("get_owner", [], {
        parseResponse: false
      });
    }
  } catch (error) {
    console.error("Error in getOwner function:", error);
  }
  return owner;
};

export { getOwner };
