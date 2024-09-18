import type * as sn from "starknet";

export interface Accounts {
  arkDefaultFeesReceiver: sn.Account;
  admin: sn.Account;
  broker_listing: sn.Account;
  broker_sale: sn.Account;
  offerer: sn.Account;
  fulfiller: sn.Account;
  arkSetbyAdminCollectionReceiver: sn.Account;
  arkCollection2981Receiver: sn.Account;
}
