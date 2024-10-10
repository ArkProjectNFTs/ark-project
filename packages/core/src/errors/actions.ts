import { BaseError, BaseErrorOptions } from "./base.js";

export type UndefinedNFTContractAddressErrorType =
  UndefinedNFTContractAddressError & {
    name: "UndefinedNFTContractAddressErrorType";
  };
export class UndefinedNFTContractAddressError extends BaseError {
  override name = "UndefinedNFTContractAddressError";
  constructor({ docsPath, docsSlug }: BaseErrorOptions) {
    super("NFT contract address is not defined", { docsPath, docsSlug });
  }
}

export type NoABIErrorType = NoABIError & {
  name: "NoABIError";
};
export class NoABIError extends BaseError {
  override name = "NoABIError";
  constructor({ docsPath, docsSlug }: BaseErrorOptions) {
    super("No ABI", { docsPath, docsSlug });
  }
}

export type AccountDeployFailedErrorType = AccountDeployFailedError & {
  name: "AccountDeployFailedError";
};
export class AccountDeployFailedError extends BaseError {
  override name = "AccountDeployFailedError";
  constructor(address: string, { docsPath }: BaseErrorOptions) {
    super(`Account deploy failed for ${address}`, { docsPath });
  }
}

export type InvalidFeesRatioErrorType = InvalidFeesRatioError & {
  name: "InvalidFeesRatioError";
};
export class InvalidFeesRatioError extends BaseError {
  override name = "InvalidFeesRatioError";
  constructor() {
    super("Invalid fees ratio", {
      docsPath: "/errors",
      docsSlug: "error-types"
    });
  }
}

export type InvalidStartDateErrorType = InvalidFeesRatioError & {
  name: "InvalidStartDateErrorType";
};
export class InvalidStartDateError extends BaseError {
  override name = "InvalidStartDateError";
  constructor(startDate: number | undefined, { docsPath }: BaseErrorOptions) {
    super(
      `Invalid start date. Start date (${startDate}) cannot be in the past.`,
      { docsPath }
    );
  }
}

export type InvalidEndDateErrorType = InvalidEndDateError & {
  name: "InvalidDateError";
};
export class InvalidEndDateError extends BaseError {
  override name = "InvalidEndDateError";
  constructor(
    {
      endDate,
      startDate
    }: { endDate: number | undefined; startDate: number | undefined },
    { docsPath }: BaseErrorOptions
  ) {
    super(
      `Invalid end date. End date (${endDate}) must be after the start date (${startDate}).`,
      { docsPath }
    );
  }
}

export type EndDateTooFarErrorType = EndDateTooFarError & {
  name: "EndDateTooFarError";
};
export class EndDateTooFarError extends BaseError {
  override name = "EndDateTooFarError";
  constructor(
    {
      endDate,
      maxEndedAt
    }: { endDate: number | undefined; maxEndedAt: number | undefined },
    { docsPath }: BaseErrorOptions
  ) {
    super(
      `End date too far in the future. End date (${endDate}) exceeds the maximum allowed (${maxEndedAt}).`,
      { docsPath }
    );
  }
}

export type InvalidStartAmountErrorType = InvalidStartAmountError & {
  name: "InvalidStartAmountError";
};
export class InvalidStartAmountError extends BaseError {
  override name = "InvalidStartAmountError";
  constructor({ docsPath }: BaseErrorOptions) {
    super("Invalid start amount. The start amount must be greater than zero.", {
      docsPath
    });
  }
}

export type InvalidEndAmountErrorType = InvalidEndAmountError & {
  name: "InvalidEndAmountErrorType";
};
export class InvalidEndAmountError extends BaseError {
  override name = "InvalidEndAmountError";
  constructor({ docsPath }: BaseErrorOptions) {
    super(
      "Invalid end amount. The end amount must be greater than the start amount.",
      { docsPath }
    );
  }
}
