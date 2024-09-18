import fs from "fs";

import type { CairoAssembly, CompiledContract } from "starknet";

/**
 * Reads a file and parse it's content to a JSON.
 * @param path - The file path.
 * @returns - A object with the JSON on success, exit otherwise.
 */
function readJson(path: string) {
  try {
    const data = fs.readFileSync(path, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

/**
 * Locates and loads artifacts files and returns casm and sierra artifacts paths.
 * @param path - The base path.
 * @param contract_name - Name of the contract.
 * @returns - An object with `casm` and `sierra` objects.
 */
export function loadArtifacts(
  path: string,
  contractName: string
): { casm: CairoAssembly; sierra: CompiledContract } {
  const casm = "compiled_contract_class.json";
  const sierra = "contract_class.json";

  return {
    casm: readJson(`${path}/${contractName}.${casm}`),
    sierra: readJson(`${path}/${contractName}.${sierra}`)
  };
}
