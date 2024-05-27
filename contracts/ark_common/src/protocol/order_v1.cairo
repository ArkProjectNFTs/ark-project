use core::array::ArrayTrait;
use core::traits::Into;
use core::traits::TryInto;
use core::option::OptionTrait;

use ark_common::protocol::broker::{broker_whitelist_read};

//! Order v1 supported by the Orderbook.
//!
use starknet::ContractAddress;
use starknet::contract_address_to_felt252;
use ark_common::protocol::order_types::{OrderTrait, OrderValidationError, OrderType, RouteType};
use ark_common::protocol::order_types::FulfillInfo;
use poseidon::poseidon_hash_span;
use starknet::SyscallResultTrait;

/// Must remain equal to 0 for now.
const ADDRESS_DOMAIN: u32 = 0;
const ORDER_VERSION_V1: felt252 = 'v1';
// Auction -> end_amount (reserve price) > start_amount (starting price).
// Auction -> ERC721_ERC20.
// Auction can't be cancelled if at least 1 valid offer.

#[derive(Serde, Drop, Copy)]
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
    token_id: Option<u256>,
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
    broker_id: ContractAddress,
    // Additional data, limited to ??? felts.
    additional_data: Span<felt252>,
}

impl OrderTraitOrderV1 of OrderTrait<OrderV1> {
    fn get_version(self: @OrderV1) -> felt252 {
        ORDER_VERSION_V1
    }

    fn validate_common_data(
        self: @OrderV1, block_timestamp: u64
    ) -> Result<(), OrderValidationError> {
        // If start_date is in the past, it's not a problem. The order
        // is valid once it's inserted in the storage.

        if (*self.start_date).is_non_zero() {
            if *self.start_date >= *self.end_date {
                return Result::Err(OrderValidationError::StartDateAfterEndDate);
            }
        }

        // Salt must be non-zero.
        if (*self.salt).is_zero() {
            return Result::Err(OrderValidationError::InvalidSalt);
        }

        let end_date = *self.end_date;

        if end_date < block_timestamp {
            return Result::Err(OrderValidationError::EndDateInThePast);
        }

        // End date -> start_date + 30 days.
        let max_end_date = *self.start_date + (30 * 24 * 60 * 60);
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
            || (*self.start_amount).is_zero()
            || (*self.salt).is_zero()
            || (*self.quantity).is_zero() {
            return Result::Err(OrderValidationError::InvalidContent);
        }

        // check if the broker is whitelisted.
        let whitelisted = broker_whitelist_read(*self.broker_id);

        if whitelisted == false {
            return Result::Err(OrderValidationError::InvalidBroker);
        }

        Result::Ok(())
    }

    fn validate_order_type(self: @OrderV1) -> Result<OrderType, OrderValidationError> {
        if self.token_id.is_some() {
            // Listing order.
            if (*self.start_amount) > 0
                && (*self.end_amount).is_zero()
                && (*self.route) == RouteType::Erc721ToErc20 {
                return Result::Ok(OrderType::Listing);
            }
            // Offer order.
            if (*self.start_amount) > 0
                && (*self.end_amount).is_zero()
                && (*self.route) == RouteType::Erc20ToErc721 {
                return Result::Ok(OrderType::Offer);
            }
            // Auction order.
            if (*self.start_amount) > 0
                && (*self.end_amount) >= (*self.start_amount)
                && (*self.route) == RouteType::Erc721ToErc20 {
                return Result::Ok(OrderType::Auction);
            }
        } else {
            // Collection Offer order.
            if (*self.start_amount) > 0
                && (*self.end_amount).is_zero()
                && (*self.route) == RouteType::Erc20ToErc721 {
                return Result::Ok(OrderType::CollectionOffer);
            }
        }

        // Other order types are not supported.
        Result::Err(OrderValidationError::InvalidContent)
    }

    fn compute_token_hash(self: @OrderV1) -> felt252 {
        assert(OptionTrait::is_some(self.token_id), 'Token ID expected');
        let token_id = (*self.token_id).unwrap();
        let mut buf: Array<felt252> = array![];
        buf.append((token_id.low).into());
        buf.append((token_id.high).into());
        buf.append((*self.token_address).into());
        buf.append(*self.token_chain_id);
        poseidon_hash_span(buf.span())
    }

    fn compute_order_hash(self: @OrderV1) -> felt252 {
        let mut buf = array![];
        self.serialize(ref buf);
        poseidon_hash_span(buf.span())
    }
}
