import { BaseError, BaseErrorOptions } from "./base.js";

export type InvalidContractAddressErrorType = InvalidContractAddressError & {
  name: "InvalidContractAddressError";
};
export class InvalidContractAddressError extends BaseError {
  override name = "InvalidContractAdressError";
  constructor(name: string, { docsPath, docsSlug }: BaseErrorOptions) {
    super(`${name} contract address must be a valid non-empty string`, {
      docsPath,
      docsSlug
    });
  }
}

export type UnsupportedNetworkErrorType = UnsupportedNetworkError & {
  name: "UnsupportedNetworkError";
};
export class UnsupportedNetworkError extends BaseError {
  override name = "UnsupportedNetworkError";
  constructor(network: string, { docsPath, docsSlug }: BaseErrorOptions) {
    super(`Unsupported network: ${network}`, { docsPath, docsSlug });
  }
}

export type ContractsCheckErrorType = ContractsCheckError & {
  name: "ContractsCheckError";
};
export class ContractsCheckError extends BaseError {
  override name = "ContractsCheckError";
  constructor(stderr: string, { docsPath }: BaseErrorOptions) {
    super(stderr, { docsPath });
  }
}

export type MissingExecutorContractErrorType = MissingExecutorContractError & {
  name: "MissingExecutorContractError";
};
export class MissingExecutorContractError extends BaseError {
  override name = "MissingExecutorContractError";
  constructor({ docsPath, docsSlug }: BaseErrorOptions) {
    super("Executor contract address is required for dev network", {
      docsPath,
      docsSlug
    });
  }
}

export type InvalidVariantCairoCustomEnumErrorType =
  InvalidContractAddressError & {
    name: "InvalidVariantCairoCustomEnumError";
  };
export class InvalidVariantCairoCustomEnumError extends BaseError {
  override name = "InvalidVariantCairoCustomEnumError";
  constructor({ docsPath }: BaseErrorOptions) {
    super("No valid variant found in CairoCustomEnum", { docsPath });
  }
}

export class UnsupportedStarknetNetworkError extends BaseError {
  override name = "UnsupportedStarknetNetworkError";
  constructor(
    starknetNetwork: string,
    { docsPath, docsSlug }: BaseErrorOptions
  ) {
    super(`Unsupported starknetNetwork: ${starknetNetwork}`, {
      docsPath,
      docsSlug
    });
  }
}

export type ConfigNotLoadedType = ConfigNotLoaded & {
  name: "ConfigNotLoaded";
};
export class ConfigNotFoundError extends BaseError {
  override name = "ConfigNotFoundError";
  constructor({ docsPath, docsSlug }: BaseErrorOptions) {
    super("Config not found", { docsPath, docsSlug });
  }
}

export type ConfigNotFoundErrorType = ConfigNotFoundError & {
  name: "ConfigNotFoundError";
};
export class ConfigNotLoaded extends BaseError {
  override name = "ConfigNotLoaded";
  constructor({ docsPath, docsSlug }: BaseErrorOptions) {
    super("Config not loaded", { docsPath, docsSlug });
  }
}

export type UseConfigWithinArkProviderErrorType =
  UseConfigWithinArkProviderError & {
    name: "UseConfigWithinArkProviderError";
  };
export class UseConfigWithinArkProviderError extends BaseError {
  override name = "UseConfigWithinArkProviderError";
  constructor({ docsPath, docsSlug }: BaseErrorOptions) {
    super("useConfig must be used within a ArkProvider", {
      docsPath,
      docsSlug
    });
  }
}
