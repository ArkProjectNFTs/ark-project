import { getDefaultCreatorFees } from "../src/index.js";
import { config } from "./utils/index.js";

describe("getDefaultCreatorFees", () => {
  it("default", async () => {
    const { creator, fees } = await getDefaultCreatorFees(config);

    expect(creator).toBeDefined();
    expect(fees).toMatchObject({
      formatted: expect.any(String),
      denominator: expect.any(BigInt),
      numerator: expect.any(BigInt)
    });
  }, 50_000);
});
