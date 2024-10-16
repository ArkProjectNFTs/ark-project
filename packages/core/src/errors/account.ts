import { BaseError, BaseErrorOptions } from "./base.js";

export type NoAccountFoundErrorType = NoAccountFoundError & {
  name: "NoAccountFoundError";
};
export class NoAccountFoundError extends BaseError {
  override name = "NoAccountFoundError";
  constructor({ docsPath, docsSlug }: BaseErrorOptions) {
    super("No account found", { docsPath, docsSlug });
  }
}

export class AccountNotConnectedError extends BaseError {
  override name = "AccountNotConnectedError";
  constructor({ docsPath, docsSlug }: BaseErrorOptions) {
    super("Account not connected", { docsPath, docsSlug });
  }
}
