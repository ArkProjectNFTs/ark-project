//! Order v1 supported by the Orderbook.
//!
use starknet::ContractAddress;

use arkchain::order::types::{OrderTrait, OrderValidationError, OrderType, RouteType};
use arkchain::crypto::hash::starknet_keccak;

// Auction -> end_amount (reserve price) > start_amount (starting price).
// Auction -> ERC721_ERC20.
// Auction can't be cancelled if at least 1 valid offer.

#[derive(Serde, Copy, Drop)]
struct OrderV1 {
    // Route ERC20->ERC721 (buy) ERC721->ERC20 (sell)
    route: RouteType,
    // Contract address of the currency used on Starknet for the transfer.
    // For now ERC20 -> ETH Starkgate.
    currency_address: ContractAddress,
    currency_chain_id: felt252,
    // Salt.
    salt: felt252,
    // The address of the user sending the offer.
    offerer: ContractAddress,
    // Chain id.
    token_chain_id: felt252,
    // The token contract address.
    token_address: ContractAddress,
    // The token id.
    token_id: u256,
    // The quantity of the token_id to be offerred (1 for NFTs).
    quantity: u256,
    // in wei. --> 10 | 10 | 10 |
    start_amount: u256,
    // in wei. --> 0  | 10 | 20 |
    end_amount: u256,
    // Start validity date of the offer, seconds since unix epoch.
    start_date: u64,
    // Expiry date of the order, seconds since unix epoch.
    end_date: u64,
    // Broker public identifier.
    broker_id: felt252,
    // Additional data, limited to ??? felts.
    additional_data: Span<felt252>,
}

impl OrderTraitOrderV1 of OrderTrait<OrderV1> {
    fn validate_common_data(self: @OrderV1) -> Result<(), OrderValidationError> {
        let block_ts = starknet::get_block_timestamp();

        // If start_date is in the past, it's not a problem. The order
        // is valid once it's inserted in the storage.

        let end_date = *self.end_date;

        // End date -> block_ts + 30 days.
        let max_end_date = block_ts + (30 * 24 * 60 * 60);

        if end_date < block_ts {
            return Result::Err(OrderValidationError::EndDateInThePast);
        }

        if end_date > max_end_date {
            return Result::Err(OrderValidationError::EndDateTooFar);
        }

        // TODO: define a real value here. 10 is an example and
        // totally arbitrary.
        // The only consideration is that, the total order serialized
        // data must not be greater than 256 felts.
        if (*self.additional_data).len() > 20 {
            return Result::Err(OrderValidationError::AdditionalDataTooLong);
        }

        if (*self.offerer).is_zero()
            || (*self.token_address).is_zero()
            || (*self.token_id).is_zero()
            || (*self.start_amount).is_zero() {
            return Result::Err(OrderValidationError::InvalidContent);
        }

        // TODO TO BE COMPLETED FROM THE SCHEMA.

        Result::Ok(())
    }

    fn validate_order_type(self: @OrderV1) -> Result<OrderType, OrderValidationError> {
        // Listing order.
        if (*self.token_id) > 0
            && (*self.start_amount) > 0
            && (*self.end_amount).is_zero()
            && (*self.route) == RouteType::Erc721ToErc20 {
            return Result::Ok(OrderType::Listing);
        }
        // Offer order.
        if (*self.token_id) > 0
            && (*self.start_amount) > 0
            && (*self.end_amount).is_zero()
            && (*self.route) == RouteType::Erc20ToErc721 {
            return Result::Ok(OrderType::Offer);
        }
        // Auction order.
        if (*self.token_id) > 0
            && (*self.start_amount) > 0
            && (*self.start_amount) >= (*self.end_amount)
            && (*self.route) == RouteType::Erc721ToErc20 {
            return Result::Ok(OrderType::Auction);
        }
        // Collection Offer order.
        if (*self.token_id).is_zero()
            && (*self.start_amount) > 0
            && (*self.end_amount).is_zero()
            && (*self.route) == RouteType::Erc20ToErc721 {
            return Result::Ok(OrderType::CollectionOffer);
        }
        // Other order types are not supported.
        else {
            return Result::Err(OrderValidationError::InvalidContent);
        }
        Result::Err(OrderValidationError::InvalidContent)
    }

    fn compute_data_hash(self: @OrderV1) -> felt252 {
        let mut buf = array![];
        self.serialize(ref buf);
        starknet_keccak(buf.span())
    }
}
