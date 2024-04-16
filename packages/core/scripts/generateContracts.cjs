const fs = require("fs");
const path = require("path");

// Path to contracts.json at the root of the repository
const contractsFilePath = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "contracts.json"
);
// Output path for the generated file within the core package
const outputFilePath = path.join(__dirname, "../src/contracts.js");

const generateContractsFile = () => {
  const contracts = JSON.parse(fs.readFileSync(contractsFilePath, "utf8"));

  let fileContent = "// This file is auto-generated. Do not edit directly.\n\n";

  Object.keys(contracts).forEach((network) => {
    fileContent += `exports.${network.toUpperCase()}_CONTRACTS = ${JSON.stringify(
      contracts[network],
      null,
      2
    )};\n`;
  });

  fs.writeFileSync(outputFilePath, fileContent);
};

generateContractsFile();
