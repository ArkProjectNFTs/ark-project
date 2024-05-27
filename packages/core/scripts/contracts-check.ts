import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

const outputFilePath = path.resolve(__dirname, "..", "src", "contracts.ts");

async function run() {
  try {
    const { stderr } = await execAsync(`tsc --noEmit ${outputFilePath}`);

    if (stderr) {
      throw new Error(stderr);
    }

    console.log("Contracts file is valid TypeScript.");
  } catch (error) {
    console.error("Error validating contracts file:", error);
  }
}

run();
