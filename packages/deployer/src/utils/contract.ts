import { promises as fs } from "fs";
import { join } from "path";

export function getContractsFilePath() {
  return join(__dirname, `../../../../contracts.json`);
}

export async function getExistingContracts() {
  try {
    console.log(getContractsFilePath());
    const fileContent = await fs.readFile(getContractsFilePath(), "utf8");
    console.log("fileContent", fileContent);
    const jsonContent = JSON.parse(fileContent);
    return jsonContent;
  } catch (error) {
    console.error("Error while reading file :", error);
    throw error;
  }
}
