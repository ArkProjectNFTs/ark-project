import * as sn from "starknet";

export interface Accounts {
  arkReceiver: sn.Account;
  admin: sn.Account;
  broker: sn.Account;
  offerer: sn.Account;
  fulfiller: sn.Account;
}
