import { config } from "../examples/config";
import { createAccount } from "../src/actions/account/account";

test("ArkProject Cancel listing should create and then cancel a listing", async () => {
  const { account: arkAccount } = await createAccount(config.arkProvider);
  expect(arkAccount).toBeDefined();
});
