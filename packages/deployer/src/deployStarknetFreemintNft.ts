import { program } from "commander";

import { deployFreemintContracts } from "./utils";

const artifactsPath = "../../contracts/target/dev/";
program.option("-n, --network <type>", "Starknet Network", "dev");
program.parse();
const options = program.opts();
const { network } = options;

deployFreemintContracts(network, artifactsPath);
