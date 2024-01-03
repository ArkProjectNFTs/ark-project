import { program } from "commander";

import { deployStarknetContracts } from "./utils";

const artifactsPath = "../../contracts/target/dev/";

program.option("--starknet", "Starknet Network", "dev");
program.parse();
const options = program.opts();
const network = options.starknet;

deployStarknetContracts(network, artifactsPath);
