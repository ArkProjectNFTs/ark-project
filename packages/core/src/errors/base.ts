import { Compute, OneOf } from "../types/utils.js";
import { getVersion } from "../utils/utils.js";

export type ErrorType<name extends string = "Error"> = Error & { name: name };

export type BaseErrorOptions = Compute<
  OneOf<{ details?: string | undefined } | { cause: BaseError | Error }> & {
    docsPath?: string | undefined;
    docsSlug?: string | undefined;
    metaMessages?: string[] | undefined;
  }
>;

export type BaseErrorType = BaseError & { name: "ArkProjectCoreError" };
export class BaseError extends Error {
  details: string;
  docsPath?: string | undefined;
  metaMessages?: string[] | undefined;
  shortMessage: string;

  override name = "ArkProjectCoreError";
  get docsBaseUrl() {
    return "https://docs.arkproject.dev/";
  }
  get version() {
    return getVersion();
  }

  constructor(shortMessage: string, options: BaseErrorOptions = {}) {
    super();

    const details =
      options.cause instanceof BaseError
        ? options.cause.details
        : options.cause?.message
          ? options.cause?.message
          : options.details!;
    const docsPath =
      options.cause instanceof BaseError
        ? options.cause.docsPath || options.docsPath
        : options.docsPath;

    this.message = [
      shortMessage || "An error occured.",
      "",
      ...(options.metaMessages ? [...options.metaMessages, ""] : []),
      ...(docsPath
        ? [
            `Docs: ${this.docsBaseUrl}${docsPath}${options.docsSlug ? `#${options.docsSlug}` : ""}`
          ]
        : []),
      ...(details ? [`Details: ${details}`] : []),
      `Version: ${this.version}`
    ].join("\n");

    if (options.cause) this.cause = options.cause;
    this.details = details;
    this.docsPath = docsPath;
    this.metaMessages = options.metaMessages;
    this.shortMessage = shortMessage;
  }

  walk(fn?: (err: unknown) => boolean) {
    return this.#walk(this, fn);
  }

  #walk(err: unknown, fn?: (err: unknown) => boolean): unknown {
    if (fn?.(err)) return err;
    if ((err as Error).cause) return this.#walk((err as Error).cause, fn);
    return err;
  }
}

/**
 * CONTRACT_ADDRESS_MUST_BE_NON_EMPTY_STRING -> config
 * UNSUPPORTED_NETWORK -> Config
 * NFT_CONTRACT_ADDRESS_IS_NOT_DEFINED -> Scripts/Config
 * NO_ABI -> Config, Actions/Read
 * STDERR -> Scripts
 * EXECUTOR_CONTRACT_ADDRESS_IS_REQUIRED_FOR_DEVELOPER_NETWORK -> Config
 * ACCOUNT_DEPLOY_FAILED_FOR_ADDRESS -> Account
 * INVALID_FEES_RATIO -> Actions/Fees
 * INVALID_START_DATE -> Actions/Orders
 * INVALID_END_DATE -> Actions/Orders
 * END_DATE_TOO_FAR -> Actions/Orders
 * INVALID_START_AMOUNT -> Actions/Orders
 * INVALID_END_AMOUNT -> Actions/Orders
 * NO_VALID_VARIANT_FOUND_IN_CAIRO_CUSTOM_ENUM -> Utils
 * UNSUPPORTED_STARKNET_NETWORK -> Providers
 * NO_ACCOUNT_FOUND -> Account
 * CONFIG_NOT_FOUND -> Config/Hooks
 * CONFIG_NOT_LOADED -> Config/Hooks
 * USECONFIG_WITHIN_ARKPROVIDER -> Config/Hooks
 * ACCOUNT_NOT_CONNECTED -> Account
 */
