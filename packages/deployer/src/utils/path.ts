import { join } from "path";

import { ProviderNetwork } from "../types";

export function getMessagingFilePath(network: ProviderNetwork): string {
  switch (network) {
    case "mainnet":
      return join(__dirname, "../../../../crates/solis/messaging.json");
    case "sepolia":
      return join(__dirname, "../../../../crates/solis/messaging.sepolia.json");
    case "dev":
      return join(__dirname, "../../../../crates/solis/messaging.local.json");
    default:
      return join(__dirname, "../../../../crates/solis/messaging.local.json");
  }
}
