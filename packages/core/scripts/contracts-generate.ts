import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the paths to the input and output files
const contractsFilePath = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "contracts.json"
);
const outputFilePath = path.resolve(__dirname, "..", "src", "contracts.ts");

// Define the structure of the contracts object
interface Contracts {
  [network: string]: {
    [contractName: string]: string;
  };
}

// Function to generate the TypeScript file with contract data
async function run() {
  try {
    // Read the contracts.json file
    const data = await fs.readFile(contractsFilePath, "utf8");
    // Parse the JSON data
    const contracts: Contracts = JSON.parse(data);

    // Initialize the content of the output file
    let fileContent = `// This file is auto-generated. Do not edit directly.\n\n`;

    // Iterate over each network in the contracts object
    for (const network of Object.keys(contracts)) {
      // TODO: remove dev key direction from contracts.json
      if (network !== "dev") {
        // Convert the contracts for each network to a JSON string and add it to the file content
        fileContent += `export const ${network.toUpperCase()}_CONTRACTS = ${JSON.stringify(
          contracts[network],
          null,
          2
        )};\n`;
      }
    }

    // Write the generated content to the output file
    await fs.writeFile(outputFilePath, fileContent);
    console.log("Contracts file generated successfully.");
  } catch (error) {
    // Log any errors that occur during the file operations
    console.error("Error generating contracts file:", error);
  }
}

// Call the function to generate the contracts file
run();
