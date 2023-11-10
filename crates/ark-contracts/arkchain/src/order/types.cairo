//! Order generic variables.
use starknet::ContractAddress;

/// Order types.
#[derive(Serde, Drop, PartialEq, Copy)]
enum OrderType {
    Listing,
    Auction,
    Offer,
    CollectionOffer,
}

/// Order validation status.
/// This enum is returned by the `validate_data` in order
/// to have details on what's wrong with the order.
#[derive(Serde, Drop, PartialEq)]
enum OrderValidationError {
    EndDateInThePast,
    EndDateTooFar,
    AdditionalDataTooLong,
    InvalidContent,
}

/// A trait to describe order capability.
trait OrderTrait<T, +Serde<T>, +Drop<T>> {
    /// get order version.
    fn get_version(self: @T) -> felt252;
    /// Returns ok if the order common data are valid, `OrderValidationError` otherwise.
    fn validate_common_data(self: @T) -> Result<(), OrderValidationError>;

    /// Validates and returns the order type on success, `OrderValidationError` otherwise.
    fn validate_order_type(self: @T) -> Result<OrderType, OrderValidationError>;

    /// Returns the hash of the order's data.
    /// Every field of the order that must be signed
    /// must be considered in the computation of this hash.
    fn compute_data_hash(self: @T) -> felt252;
}

/// Status of an order, that may be defined from
/// incoming transactions or messages from Starknet.
#[derive(Serde, Drop, PartialEq)]
enum OrderStatus {
    Open,
    Fulfilled,
    Executed,
    CancelledUser,
    CancelledAssetFault,
}

impl OrderStatusIntoFelt252 of Into<OrderStatus, felt252> {
    fn into(self: OrderStatus) -> felt252 {
        match self {
            OrderStatus::Open => 'OPEN',
            OrderStatus::Fulfilled => 'FULFILLED',
            OrderStatus::Executed => 'EXECUTED',
            OrderStatus::CancelledUser => 'CANCELLED_USER',
            OrderStatus::CancelledAssetFault => 'CANCELLED_ASSET_FAULT',
        }
    }
}

impl Felt252TryIntoOrderStatus of TryInto<felt252, OrderStatus> {
    fn try_into(self: felt252) -> Option<OrderStatus> {
        if self == 'OPEN' {
            Option::Some(OrderStatus::Open)
        } else if self == 'EXECUTING' {
            Option::Some(OrderStatus::Executed)
        } else if self == 'FULFILLED' {
            Option::Some(OrderStatus::Fulfilled)
        } else if self == 'CANCELLED_USER' {
            Option::Some(OrderStatus::CancelledUser)
        } else if self == 'CANCELLED_ASSET_FAULT' {
            Option::Some(OrderStatus::CancelledAssetFault)
        } else {
            Option::None
        }
    }
}

/// The info related to the execution of an order.
#[derive(starknet::Store, Serde, Copy, Drop)]
struct ExecutionInfo {
    // The hash of the order to execute.
    order_hash: felt252,
    // Address of the fulfiller of the order.
    fulfiller: ContractAddress,
    // The token chain id.
    token_chain_id: felt252,
    // The token contract address.
    token_address: ContractAddress,
    // Token token id.
    token_id: felt252,
}

/// The info related to the fulfillment an order.
#[derive(starknet::Store, Serde, Copy, Drop)]
struct FulfillmentInfo {
    // The hash of the order that has been fulfilled.
    order_hash: felt252,
    // Possible error on settlement (tx reverted funds/token fault).
    error: felt252,
    // Transaction hash of the fulfillment on the settlement layer.
    // In the future, asset and funds may be transferred in different chains.
    // If done on the same chain, the transaction hash is the same.
    transaction_hash_token: felt252,
    transaction_hash_currency: felt252,
}

/// Type of an route, that may be defined from
/// incoming order.
#[derive(Serde, Drop, PartialEq, Copy)]
enum RouteType {
    Erc20ToErc721,
    Erc721ToErc20,
}

impl RouteIntoFelt252 of Into<RouteType, felt252> {
    fn into(self: RouteType) -> felt252 {
        match self {
            RouteType::Erc20ToErc721 => 'ERC20TOERC721',
            RouteType::Erc721ToErc20 => 'ERC721TOERC20',
        }
    }
}

impl Felt252TryIntoRoute of TryInto<felt252, RouteType> {
    fn try_into(self: felt252) -> Option<RouteType> {
        if self == 'ERC20TOERC721' {
            Option::Some(RouteType::Erc20ToErc721)
        } else if self == 'ERC721TOERC20' {
            Option::Some(RouteType::Erc721ToErc20)
        } else {
            Option::None
        }
    }
}