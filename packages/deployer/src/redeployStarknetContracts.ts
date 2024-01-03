import { program } from "commander";

import {
  cleanContracts,
  deployFreemintContracts,
  deployStarknetContracts
} from "./utils";

program.option("--network", "Starknet Network", "dev");
program.parse();
const options = program.opts();
const { network } = options;

(async (network: string) => {
  const artifactsPath = "../../contracts/target/dev/";
  await cleanContracts();
  await deployFreemintContracts(network, artifactsPath);
  await deployStarknetContracts(network, artifactsPath);
})(network);
