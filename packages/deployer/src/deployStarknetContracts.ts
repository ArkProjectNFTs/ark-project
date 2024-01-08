import { program } from "commander";

import { deployStarknetContracts } from "./utils";

const artifactsPath = "../../contracts/target/dev/";

program.option("-n, --network <type>", "Starknet Network", "dev");
program.parse();
const options = program.opts();
const network = options.network;

deployStarknetContracts(network, artifactsPath);
