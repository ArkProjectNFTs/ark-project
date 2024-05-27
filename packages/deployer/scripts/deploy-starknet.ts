import { program } from "commander";

import { deployStarknetContracts } from "../src/deployStarknetFreemintNft";

program.option("-sn, --starknet <type>", "Starknet Network", "dev");
program.parse();

const options = program.opts();
const starknetNetwork = options.starknet;

deployStarknetContracts(starknetNetwork);
