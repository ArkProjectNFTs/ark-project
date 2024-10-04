use ark_common::protocol::order_types::FulfillInfo;
use ark_common::protocol::order_types::{OrderTrait, OrderValidationError, OrderType, RouteType};
use core::array::ArrayTrait;
use core::option::OptionTrait;
use core::traits::Into;
use core::traits::TryInto;
use poseidon::poseidon_hash_span;

//! Order v1 supported by the Orderbook.
//!
use starknet::ContractAddress;
use starknet::SyscallResultTrait;
use starknet::contract_address_to_felt252;

const ORDER_VERSION_V1: felt252 = 'v1';
// Auction -> end_amount (reserve price) > start_amount (starting price).
// Auction -> ERC721_ERC20.
// Auction can't be cancelled if at least 1 valid offer.

#[derive(Serde, Drop, Copy)]
struct OrderV1 {
    // Route ERC20->ERC721 (buy) ERC721->ERC20 (sell) ERC20BUY ERC20SELL
    route: RouteType,
    // Contract address of the payment currency used on Starknet for the transfer.
    currency_address: ContractAddress,
    currency_chain_id: felt252,
    // Salt.
    salt: felt252,
    // The address of the user sending the offer.
    offerer: ContractAddress,
    // Chain id.
    token_chain_id: felt252,
    // The token contract address. // exchange token
    token_address: ContractAddress,
    // The token id.
    token_id: Option<u256>,
    // The quantity of the token_id to be offerred (1 for NFTs).
    quantity: u256,
    // in wei. --> 10 | 10 | 10 |
    start_amount: u256, // amount to pay for buy order.
    // in wei. --> 0  | 10 | 20 |
    end_amount: u256, // amount to receive for sell order
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
        // Salt must be non-zero.
        if (*self.salt).is_zero() {
            return Result::Err(OrderValidationError::InvalidSalt);
        }

        // check for expiry only if not erc20 buys or sells
        if (*self.route != RouteType::Erc20ToErc20Buy || *self.route != RouteType::Erc20ToErc20Sell) {
            let end_date = *self.end_date;

            if end_date < block_timestamp {
                return Result::Err(OrderValidationError::EndDateInThePast);
            }
    
            // End date -> block_timestamp + 30 days.
            let max_end_date = block_timestamp + (30 * 24 * 60 * 60);
            if end_date > max_end_date {
                return Result::Err(OrderValidationError::EndDateTooFar);
            }
        }

        // TODO: define a real value here. 20 is an example and
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

            // Limit Buy Order 
            if(*self.quantity) > 0 
                && (*self.start_amount) > 0 // amount to pay
                && (*self.end_amount).is_zero()
                && (*self.route == RouteType::Erc20ToErc20Buy) {
                return Result::Ok(OrderType::LimitBuy);
            }

            // Limit Sell Order 
            if(*self.quantity) > 0 
                && (*self.start_amount).is_zero()
                && (*self.end_amount) > 0 // amount to receive
                && (*self.route == RouteType::Erc20ToErc20Sell) {
                return Result::Ok(OrderType::LimitSell);
            }
        }

        // Other order types are not supported.
        Result::Err(OrderValidationError::InvalidContent)
    }

    fn compute_token_hash(self: @OrderV1) -> felt252 {
        if (*self.route == RouteType::Erc20ToErc20Buy || *self.route == RouteType::Erc20ToErc20Sell) {
            let mut buf: Array<felt252> = array![];
            // used quantity, start_date and the offerer as the identifiers
            buf.append((*self.token_address).into());
            buf.append(*self.token_chain_id);
            poseidon_hash_span(buf.span())
        }else{
            assert(OptionTrait::is_some(self.token_id), 'Token ID expected');
            let token_id = (*self.token_id).unwrap();
            let mut buf: Array<felt252> = array![];
            buf.append((token_id.low).into());
            buf.append((token_id.high).into());
            buf.append((*self.token_address).into());
            buf.append(*self.token_chain_id);
            poseidon_hash_span(buf.span())
        }
    }

    fn compute_order_hash(self: @OrderV1) -> felt252 {
        let mut buf = array![];
        self.serialize(ref buf);
        poseidon_hash_span(buf.span())
    }
}