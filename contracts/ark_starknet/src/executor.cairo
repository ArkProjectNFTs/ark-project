use ark_common::protocol::order_types::OrderTrait;
use ark_common::protocol::order_types::OrderType;


use starknet::ContractAddress;


#[derive(Drop, Copy, Debug)]
struct OrderInfo {
    order_type: OrderType,
    // Contract address of the currency used on Starknet for the transfer.
    currency_address: ContractAddress,
    // The token contract address.
    token_address: ContractAddress,
    // The token id.
    // TODO: how to store Option<u256> ?
    token_id: u256,
    // The quantity of the token (1 for ERC-721, variable for ERC-1155).
    quantity: u256,
    // in wei. --> 10 | 10 | 10 |
    start_amount: u256,
    //
    offerer: ContractAddress,
}

//! Executor contract on Starknet
//!
//! This contract is responsible of executing the orders
//! and move the assets accordingly.
//! Once done, an event is emitted to confirm at the arkchain
//! that the order was executed correctly.
//!

#[starknet::contract]
mod executor {
    use ark_common::protocol::order_types::{
        RouteType, ExecutionInfo, ExecutionValidationInfo, FulfillInfo, CreateOrderInfo,
        FulfillOrderInfo, CancelOrderInfo, CancelInfo, OrderType,
    };
    use ark_common::protocol::order_v1::{OrderV1, OrderTraitOrderV1};

    use ark_component::orderbook::OrderbookComponent;
    use ark_component::orderbook::{
        OrderbookHooksCreateOrderEmptyImpl, OrderbookHooksCancelOrderEmptyImpl,
        OrderbookHooksFulfillOrderEmptyImpl, OrderbookHooksValidateOrderExecutionEmptyImpl,
    };
    use ark_oz::erc2981::interface::IERC2981_ID;
    use ark_oz::erc2981::{FeesRatio, FeesRatioDefault, FeesImpl};
    use ark_oz::erc2981::{IERC2981Dispatcher, IERC2981DispatcherTrait};

    use ark_starknet::interfaces::FeesAmount;

    use ark_starknet::interfaces::{IExecutor, IUpgradable, IMaintenance};
    use core::box::BoxTrait;

    use core::debug::PrintTrait;
    use core::option::OptionTrait;
    use core::traits::Into;
    use core::traits::TryInto;
    use core::zeroable::Zeroable;
    use openzeppelin::introspection::interface::{ISRC5, ISRC5Dispatcher, ISRC5DispatcherTrait};

    use openzeppelin::token::{
        erc721::interface::{IERC721, IERC721Dispatcher, IERC721DispatcherTrait, IERC721_ID},
        erc20::interface::{IERC20, IERC20Dispatcher, IERC20DispatcherTrait},
        erc1155::interface::{IERC1155, IERC1155Dispatcher, IERC1155DispatcherTrait, IERC1155_ID},
    };
    use starknet::contract_address_to_felt252;
    use starknet::get_contract_address;
    use starknet::storage::Map;

    use starknet::{ContractAddress, ClassHash};

    use super::OrderInfo;

    component!(path: OrderbookComponent, storage: orderbook, event: OrderbookEvent);

    #[storage]
    struct Storage {
        admin_address: ContractAddress,
        eth_contract_address: ContractAddress,
        chain_id: felt252,
        broker_fees: Map<ContractAddress, FeesRatio>,
        ark_fees: FeesRatio,
        // fallback when collection doesn't implement ERC2981
        default_receiver: ContractAddress,
        default_fees: FeesRatio,
        creator_fees: Map<ContractAddress, (ContractAddress, FeesRatio)>,
        // maintenance mode
        in_maintenance: bool,
        #[substorage(v0)]
        orderbook: OrderbookComponent::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        CollectionFallbackFees: CollectionFallbackFees,
        ExecutorInMaintenance: ExecutorInMaintenance,
        #[flat]
        OrderbookEvent: OrderbookComponent::Event,
    }

    #[derive(Drop, starknet::Event)]
    struct CollectionFallbackFees {
        #[key]
        collection: ContractAddress,
        #[key]
        amount: u256,
        currency_contract: ContractAddress,
        receiver: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct ExecutorInMaintenance {
        on: bool
    }

    mod Errors {
        const IN_MAINTENANCE: felt252 = 'Executor not enabled';
        const UNAUTHORIZED_ADMIN: felt252 = 'Unauthorized admin address';
        const FEES_RATIO_INVALID: felt252 = 'Fees ratio is invalid';
    }

    #[abi(embed_v0)]
    impl OrderbookImpl = OrderbookComponent::OrderbookImpl<ContractState>;
    impl OrderbookActionImpl = OrderbookComponent::OrderbookActionImpl<ContractState>;

    #[constructor]
    fn constructor(
        ref self: ContractState,
        admin_address: ContractAddress,
        eth_contract_address: ContractAddress,
        chain_id: felt252
    ) {
        self.admin_address.write(admin_address);
        self.eth_contract_address.write(eth_contract_address);
        self.chain_id.write(chain_id);
        self.ark_fees.write(Default::default());
        self.default_receiver.write(admin_address);
        self.default_fees.write(Default::default());
        self.in_maintenance.write(false); // enabled by default 
    }


    #[abi(embed_v0)]
    impl ExecutorImpl of IExecutor<ContractState> {
        fn set_broker_fees(ref self: ContractState, fees_ratio: FeesRatio) {
            assert(fees_ratio.is_valid(), Errors::FEES_RATIO_INVALID);
            self.broker_fees.write(starknet::get_caller_address(), fees_ratio);
        }

        fn get_broker_fees(self: @ContractState, broker_address: ContractAddress) -> FeesRatio {
            let fees_ratio = self.broker_fees.read(broker_address);
            // non initialized value in storage is zero not default
            if fees_ratio.denominator == 0 {
                Default::default()
            } else {
                fees_ratio
            }
        }

        fn set_ark_fees(ref self: ContractState, fees_ratio: FeesRatio) {
            _ensure_admin(@self);
            assert(fees_ratio.is_valid(), Errors::FEES_RATIO_INVALID);

            self.ark_fees.write(fees_ratio);
        }

        fn get_ark_fees(self: @ContractState) -> FeesRatio {
            self.ark_fees.read()
        }

        fn get_default_creator_fees(self: @ContractState) -> (ContractAddress, FeesRatio) {
            (self.default_receiver.read(), self.default_fees.read())
        }

        fn set_default_creator_fees(
            ref self: ContractState, receiver: ContractAddress, fees_ratio: FeesRatio
        ) {
            _ensure_admin(@self);
            assert(fees_ratio.is_valid(), Errors::FEES_RATIO_INVALID);
            self.default_receiver.write(receiver);
            self.default_fees.write(fees_ratio);
        }

        fn get_collection_creator_fees(
            self: @ContractState, nft_address: ContractAddress
        ) -> (ContractAddress, FeesRatio) {
            let (receiver, fees_ratio) = self.creator_fees.read(nft_address);
            if fees_ratio.denominator.is_zero() {
                self.get_default_creator_fees()
            } else {
                (receiver, fees_ratio)
            }
        }

        fn set_collection_creator_fees(
            ref self: ContractState,
            nft_address: ContractAddress,
            receiver: ContractAddress,
            fees_ratio: FeesRatio
        ) {
            _ensure_admin(@self);
            assert(fees_ratio.is_valid(), Errors::FEES_RATIO_INVALID);
            self.creator_fees.write(nft_address, (receiver, fees_ratio));
        }

        fn get_fees_amount(
            self: @ContractState,
            fulfill_broker: ContractAddress,
            listing_broker: ContractAddress,
            nft_address: ContractAddress,
            nft_token_id: u256,
            payment_amount: u256
        ) -> FeesAmount {
            let (
                fulfill_broker_fees_amount,
                listing_broker_fees_amount,
                ark_fees_amount,
                creator_fees_amount
            ) =
                _compute_fees_amount(
                self, fulfill_broker, listing_broker, nft_address, nft_token_id, payment_amount
            );

            FeesAmount {
                fulfill_broker: fulfill_broker_fees_amount,
                listing_broker: listing_broker_fees_amount,
                ark: ark_fees_amount,
                creator: creator_fees_amount,
            }
        }

        fn update_eth_address(ref self: ContractState, eth_address: ContractAddress) {
            _ensure_admin(@self);

            self.eth_contract_address.write(eth_address);
        }

        fn update_admin_address(ref self: ContractState, admin_address: ContractAddress) {
            _ensure_admin(@self);

            self.admin_address.write(admin_address);
        }

        fn cancel_order(ref self: ContractState, cancelInfo: CancelInfo) {
            _ensure_is_not_in_maintenance(@self);

            let vinfo = CancelOrderInfo { cancelInfo: cancelInfo.clone() };
            _verify_cancel_order(@self, @vinfo);

            self.orderbook.cancel_order(cancelInfo);
        }

        fn create_order(ref self: ContractState, order: OrderV1) {
            _ensure_is_not_in_maintenance(@self);

            let vinfo = CreateOrderInfo { order: order.clone() };
            _verify_create_order(@self, @vinfo);

            self.orderbook.create_order(order);
        }

        fn fulfill_order(ref self: ContractState, fulfillInfo: FulfillInfo) {
            _ensure_is_not_in_maintenance(@self);

            let vinfo = FulfillOrderInfo { fulfillInfo: fulfillInfo.clone() };

            _verify_fulfill_order(@self, @vinfo);

            match self.orderbook.fulfill_order(fulfillInfo) {
                Option::Some(execute_info) => { _execute_order(ref self, execute_info); },
                Option::None => panic!("OB: failed to fulfill order"),
            }
        }
    }

    #[abi(embed_v0)]
    impl ExecutorUpgradeImpl of IUpgradable<ContractState> {
        fn upgrade(ref self: ContractState, class_hash: ClassHash) {
            _ensure_admin(@self);

            match starknet::replace_class_syscall(class_hash) {
                Result::Ok(_) => (), // emit event
                Result::Err(revert_reason) => panic(revert_reason),
            };
        }
    }

    #[abi(embed_v0)]
    impl ExecutorMaintenanceImpl of IMaintenance<ContractState> {
        fn is_in_maintenance(self: @ContractState) -> bool {
            self.in_maintenance.read()
        }

        fn set_maintenance_mode(ref self: ContractState, on: bool) {
            _ensure_admin(@self);
            self.in_maintenance.write(on);
            self.emit(ExecutorInMaintenance { on })
        }
    }

    fn _verify_create_order(self: @ContractState, vinfo: @CreateOrderInfo) {
        let order = vinfo.order;
        let caller = starknet::get_caller_address();
        assert!(caller == *(order.offerer), "Caller is not the offerer");

        match order.route {
            RouteType::Erc20ToErc721 |
            RouteType::Erc20ToErc1155 => {
                assert!(
                    _check_erc20_amount(
                        order.currency_address, *(order.start_amount), order.offerer
                    ),
                    "Offerer does not own enough ERC20 tokens"
                );
            },
            RouteType::Erc721ToErc20 => {
                match order.token_id {
                    Option::Some(token_id) => {
                        assert!(
                            _check_erc721_owner(order.token_address, *token_id, order.offerer),
                            "Offerer does not own the specified ERC721 token"
                        );
                    },
                    Option::None => panic!("Invalid token id"),
                }
            },
            RouteType::Erc1155ToErc20 => {
                match order.token_id {
                    Option::Some(token_id) => {
                        assert!(
                            _check_erc1155_balance(
                                order.token_address, token_id, order.quantity, order.offerer
                            ),
                            "Offerer does not own enough of the specified ERC1155 token"
                        );
                    },
                    Option::None => panic!("Invalid token id"),
                }
            }
        }
    }

    fn _verify_cancel_order(self: @ContractState, vinfo: @CancelOrderInfo) {
        let cancel_info = vinfo.cancelInfo;
        let caller = starknet::get_caller_address();
        let canceller = *(cancel_info.canceller);
        assert!(caller == canceller, "Caller is not the canceller");

        let order_info = _get_order_info(self, *cancel_info.order_hash);

        // default value for ContractAddress is zero
        // and an order's currency address shall not be zero
        assert!(order_info.currency_address.is_non_zero(), "Order not found");
        assert!(order_info.offerer == canceller, "Canceller is not the offerer");
    }

    fn _verify_fulfill_order(self: @ContractState, vinfo: @FulfillOrderInfo) {
        let fulfill_info = vinfo.fulfillInfo;
        let caller = starknet::get_caller_address();
        let fulfiller = *(fulfill_info.fulfiller);
        assert!(caller == fulfiller, "Caller is not the fulfiller");

        let order_info = _get_order_info(self, *fulfill_info.order_hash);

        // default value for ContractAddress is zero
        // and an order's currency address shall not be zero
        if order_info.currency_address.is_zero() {
            panic!("Order not found");
        }

        if order_info.order_type != OrderType::Auction {
            assert!(order_info.offerer != fulfiller, "Offerer and fulfiller must be different");
        }

        let contract_address = get_contract_address();
        match order_info.order_type {
            OrderType::Listing => {
                _verify_fulfill_listing_order(self, order_info, fulfill_info, contract_address);
            },
            OrderType::Offer => {
                _verify_fulfill_offer_order(self, order_info, fulfill_info, contract_address);
            },
            OrderType::Auction => {
                _verify_fulfill_auction_order(self, order_info, fulfill_info, contract_address);
            },
            OrderType::CollectionOffer => {
                _verify_fulfill_collection_offer_order(
                    self, order_info, fulfill_info, contract_address
                );
            }
        }
    }

    fn _verify_fulfill_listing_order(
        self: @ContractState,
        order_info: OrderInfo,
        fulfill_info: @FulfillInfo,
        contract_address: ContractAddress
    ) {
        let fulfiller = *(fulfill_info.fulfiller);
        assert!(
            _check_erc20_amount(@order_info.currency_address, order_info.start_amount, @fulfiller),
            "Fulfiller does not own enough ERC20 tokens"
        );
        assert!(
            _check_erc20_allowance(
                @order_info.currency_address,
                order_info.start_amount,
                @fulfiller,
                @get_contract_address()
            ),
            "Fulfiller's allowance of executor is not enough"
        );

        if _is_erc721(order_info.token_address) {
            assert!(
                _check_erc721_owner(
                    @order_info.token_address, order_info.token_id, @order_info.offerer
                ),
                "Offerer does not own the specified ERC721 token"
            );
            assert!(
                _check_erc721_approval(
                    @order_info.token_address,
                    order_info.token_id,
                    @order_info.offerer,
                    @contract_address,
                ),
                "Executor not approved by offerer"
            );
        }

        if _is_erc1155(order_info.token_address) {
            assert!(
                _check_erc1155_balance(
                    @order_info.token_address,
                    @order_info.token_id,
                    @order_info.quantity,
                    @order_info.offerer
                ),
                "Offerer does not own the specified amount of ERC1155 token"
            );
            assert!(
                _check_erc1155_approval(
                    @order_info.token_address, @order_info.offerer, @contract_address,
                ),
                "Executor not approved by offerer"
            );
        }
    }

    fn _verify_fulfill_offer_order(
        self: @ContractState,
        order_info: OrderInfo,
        fulfill_info: @FulfillInfo,
        contract_address: ContractAddress
    ) {
        let fulfiller = *(fulfill_info.fulfiller);
        let token_id = match *(fulfill_info.token_id) {
            Option::None => panic!("Token id must be set for a collection offer"),
            Option::Some(token_id) => token_id,
        };
        assert!(order_info.token_id == token_id, "Fulfiller token id is different than order");

        if _is_erc721(order_info.token_address) {
            assert!(
                _check_erc721_owner(@order_info.token_address, token_id, @fulfiller),
                "Fulfiller does not own the specified ERC721 token"
            );
            assert!(
                _check_erc721_approval(
                    @order_info.token_address, token_id, @fulfiller, @contract_address,
                ),
                "Executor not approved by fulfiller"
            );
        }

        if _is_erc1155(order_info.token_address) {
            assert!(
                _check_erc1155_balance(
                    @order_info.token_address, @token_id, fulfill_info.quantity, @fulfiller
                ),
                "Fulfiller does not own the specified amount of ERC1155 token"
            );
            assert!(
                _check_erc1155_approval(@order_info.token_address, @fulfiller, @contract_address,),
                "Executor not approved by fulfiller"
            );
        }

        assert!(
            _check_erc20_amount(
                @order_info.currency_address, order_info.start_amount, @order_info.offerer
            ),
            "Offerer does not own enough ERC20 tokens"
        );
        assert!(
            _check_erc20_allowance(
                @order_info.currency_address,
                order_info.start_amount,
                @order_info.offerer,
                @contract_address,
            ),
            "Offerer's allowance of executor is not enough"
        )
    }

    fn _verify_fulfill_auction_order(
        self: @ContractState,
        order_info: OrderInfo,
        fulfill_info: @FulfillInfo,
        contract_address: ContractAddress
    ) {
        let related_order_info = match *(fulfill_info.related_order_hash) {
            Option::None => panic!("Fulfill auction order require a related order"),
            Option::Some(related_order_hash) => _get_order_info(self, related_order_hash),
        };
        assert!(
            @order_info.currency_address == @related_order_info.currency_address,
            "Order and related order use different currency"
        );
        let buyer = related_order_info.offerer;

        assert!(
            _check_erc20_amount(
                @related_order_info.currency_address, related_order_info.start_amount, @buyer
            ),
            "Buyer does not own enough ERC20 tokens"
        );
        assert!(
            _check_erc20_allowance(
                @related_order_info.currency_address,
                related_order_info.start_amount,
                @buyer,
                @get_contract_address()
            ),
            "Buyer's allowance of executor is not enough"
        );

        if _is_erc721(order_info.token_address) {
            assert!(
                _check_erc721_owner(
                    @order_info.token_address, order_info.token_id, @order_info.offerer
                ),
                "Offerer does not own the specified ERC721 token"
            );
            assert!(
                _check_erc721_approval(
                    @order_info.token_address,
                    order_info.token_id,
                    @order_info.offerer,
                    @contract_address,
                ),
                "Executor not approved by offerer"
            );
        }

        if _is_erc1155(order_info.token_address) {
            assert!(
                _check_erc1155_balance(
                    @order_info.token_address,
                    @order_info.token_id,
                    @order_info.quantity,
                    @order_info.offerer
                ),
                "Offerer does not own the specified amount of ERC1155 token"
            );
            assert!(
                _check_erc1155_approval(
                    @order_info.token_address, @order_info.offerer, @contract_address,
                ),
                "Executor not approved by offerer"
            );
        }
    }

    fn _verify_fulfill_collection_offer_order(
        self: @ContractState,
        order_info: OrderInfo,
        fulfill_info: @FulfillInfo,
        contract_address: ContractAddress
    ) {
        let fulfiller = *(fulfill_info.fulfiller);
        let token_id = match *(fulfill_info.token_id) {
            Option::None => panic!("Token id must be set for a collection offer"),
            Option::Some(token_id) => token_id,
        };

        if _is_erc721(order_info.token_address) {
            assert!(
                _check_erc721_owner(@order_info.token_address, token_id, @fulfiller),
                "Fulfiller does not own the specified ERC721 token"
            );
            assert!(
                _check_erc721_approval(
                    @order_info.token_address, token_id, @fulfiller, @contract_address,
                ),
                "Executor not approved by fulfiller"
            );
        }

        if _is_erc1155(order_info.token_address) {
            assert!(
                _check_erc1155_balance(
                    @order_info.token_address, @token_id, fulfill_info.quantity, @fulfiller
                ),
                "Fulfiller does not own the specified amount of ERC1155 token"
            );
            assert!(
                _check_erc1155_approval(@order_info.token_address, @fulfiller, @contract_address,),
                "Executor not approved by fulfiller"
            );
        }

        assert!(
            _check_erc20_amount(
                @order_info.currency_address, order_info.start_amount, @order_info.offerer
            ),
            "Offerer does not own enough ERC20 tokens"
        );
        assert!(
            _check_erc20_allowance(
                @order_info.currency_address,
                order_info.start_amount,
                @order_info.offerer,
                @contract_address,
            ),
            "Offerer's allowance of executor is not enough"
        )
    }

    fn _execute_order(ref self: ContractState, execution_info: ExecutionInfo) {
        // Check if execution_info.currency_contract_address is whitelisted
        _ensure_is_not_in_maintenance(@self);
        assert(
            execution_info.payment_currency_chain_id == self.chain_id.read(),
            'Chain ID is not SN_MAIN'
        );

        let currency_contract = IERC20Dispatcher {
            contract_address: execution_info.payment_currency_address.try_into().unwrap()
        };

        let (creator_address, creator_fees_amount) = _compute_creator_fees_amount(
            @self,
            @execution_info.nft_address,
            execution_info.payment_amount,
            execution_info.nft_token_id
        );
        let (fulfill_broker_fees_amount, listing_broker_fees_amount, ark_fees_amount, _) =
            _compute_fees_amount(
            @self,
            execution_info.fulfill_broker_address,
            execution_info.listing_broker_address,
            execution_info.nft_address,
            execution_info.nft_token_id,
            execution_info.payment_amount
        );
        assert!(
            execution_info
                .payment_amount > (fulfill_broker_fees_amount
                    + listing_broker_fees_amount
                    + creator_fees_amount
                    + ark_fees_amount),
            "Fees exceed payment amount"
        );

        let seller_amount = execution_info.payment_amount
            - (fulfill_broker_fees_amount
                + listing_broker_fees_amount
                + creator_fees_amount
                + ark_fees_amount);

        // split the fees
        if fulfill_broker_fees_amount > 0 {
            currency_contract
                .transfer_from(
                    execution_info.payment_from,
                    execution_info.fulfill_broker_address,
                    fulfill_broker_fees_amount,
                );
        }

        if listing_broker_fees_amount > 0 {
            currency_contract
                .transfer_from(
                    execution_info.payment_from,
                    execution_info.listing_broker_address,
                    listing_broker_fees_amount
                );
        }

        if creator_fees_amount > 0 {
            let (default_receiver_creator, _) = self.get_default_creator_fees();
            if creator_address == default_receiver_creator {
                self
                    .emit(
                        CollectionFallbackFees {
                            collection: execution_info.nft_address,
                            amount: creator_fees_amount,
                            currency_contract: currency_contract.contract_address,
                            receiver: default_receiver_creator,
                        }
                    )
            }
            currency_contract
                .transfer_from(execution_info.payment_from, creator_address, creator_fees_amount);
        }

        if ark_fees_amount > 0 {
            currency_contract
                .transfer_from(
                    execution_info.payment_from, self.admin_address.read(), ark_fees_amount
                );
        }
        // finally transfer to the seller
        if seller_amount > 0 {
            currency_contract
                .transfer_from(
                    execution_info.payment_from, execution_info.payment_to, seller_amount
                );
        }

        if _is_erc721(execution_info.nft_address) {
            let nft_contract = IERC721Dispatcher { contract_address: execution_info.nft_address };
            nft_contract
                .transfer_from(
                    execution_info.nft_from, execution_info.nft_to, execution_info.nft_token_id
                );
        }

        if _is_erc1155(execution_info.nft_address) {
            let erc1155_contract = IERC1155Dispatcher {
                contract_address: execution_info.nft_address
            };
            erc1155_contract
                .safe_transfer_from(
                    execution_info.nft_from,
                    execution_info.nft_to,
                    execution_info.nft_token_id,
                    execution_info.nft_quantity,
                    array![].span()
                );
        }

        let tx_info = starknet::get_tx_info().unbox();
        let transaction_hash = tx_info.transaction_hash;
        let block_timestamp = starknet::info::get_block_timestamp();

        let vinfo = ExecutionValidationInfo {
            order_hash: execution_info.order_hash,
            transaction_hash,
            starknet_block_timestamp: block_timestamp,
            from: execution_info.nft_from,
            to: execution_info.nft_to,
        };

        self.orderbook.validate_order_execution(vinfo);
    }

    fn _is_erc721(token_address: ContractAddress) -> bool {
        let src5_dispatcher = ISRC5Dispatcher { contract_address: token_address };
        src5_dispatcher.supports_interface(IERC721_ID)
    }

    fn _is_erc1155(token_address: ContractAddress) -> bool {
        let src5_dispatcher = ISRC5Dispatcher { contract_address: token_address };
        src5_dispatcher.supports_interface(IERC1155_ID)
    }

    fn _check_erc20_amount(
        token_address: @ContractAddress, amount: u256, user: @ContractAddress
    ) -> bool {
        let contract = IERC20Dispatcher { contract_address: *token_address };
        amount <= contract.balance_of(*user)
    }

    fn _check_erc20_allowance(
        token_address: @ContractAddress,
        amount: u256,
        owner: @ContractAddress,
        spender: @ContractAddress
    ) -> bool {
        let contract = IERC20Dispatcher { contract_address: *token_address };
        amount <= contract.allowance(*owner, *spender)
    }

    fn _check_erc721_owner(
        token_address: @ContractAddress, token_id: u256, user: @ContractAddress
    ) -> bool {
        let contract = IERC721Dispatcher { contract_address: *token_address };
        contract.owner_of(token_id) == *user
    }

    fn _check_erc721_approval(
        token_address: @ContractAddress,
        token_id: u256,
        owner: @ContractAddress,
        operator: @ContractAddress
    ) -> bool {
        let contract = IERC721Dispatcher { contract_address: *token_address };
        contract.is_approved_for_all(*owner, *operator)
            || (contract.get_approved(token_id) == *operator)
    }

    fn _check_erc1155_balance(
        token_address: @ContractAddress, token_id: @u256, quantity: @u256, user: @ContractAddress
    ) -> bool {
        let contract = IERC1155Dispatcher { contract_address: *token_address };
        *quantity <= contract.balance_of(*user, *token_id)
    }

    fn _check_erc1155_approval(
        token_address: @ContractAddress, owner: @ContractAddress, operator: @ContractAddress
    ) -> bool {
        let contract = IERC1155Dispatcher { contract_address: *token_address };
        contract.is_approved_for_all(*owner, *operator)
    }

    fn _compute_creator_fees_amount(
        self: @ContractState, nft_address: @ContractAddress, payment_amount: u256, token_id: u256
    ) -> (ContractAddress, u256) {
        // check if nft support 2981 interface
        let dispatcher = ISRC5Dispatcher { contract_address: *nft_address };
        if dispatcher.supports_interface(IERC2981_ID) {
            IERC2981Dispatcher { contract_address: *nft_address }
                .royalty_info(token_id, payment_amount)
        } else {
            _fallback_compute_creator_fees_amount(self, nft_address, payment_amount)
        }
    }

    fn _fallback_compute_creator_fees_amount(
        self: @ContractState, nft_address: @ContractAddress, payment_amount: u256
    ) -> (ContractAddress, u256) {
        let (receiver, fees_ratio) = self.get_collection_creator_fees(*nft_address);
        let amount = fees_ratio.compute_amount(payment_amount);
        (receiver, amount)
    }

    fn _ensure_admin(self: @ContractState) {
        assert(
            starknet::get_caller_address() == self.admin_address.read(), Errors::UNAUTHORIZED_ADMIN
        );
    }

    fn _ensure_is_not_in_maintenance(self: @ContractState) {
        assert(!self.in_maintenance.read(), Errors::IN_MAINTENANCE)
    }

    fn _compute_fees_amount(
        self: @ContractState,
        fulfill_broker_address: ContractAddress,
        listing_broker_address: ContractAddress,
        nft_address: ContractAddress,
        nft_token_id: u256,
        payment_amount: u256
    ) -> (u256, u256, u256, u256) {
        let fulfill_broker_fees = self.get_broker_fees(fulfill_broker_address);
        let listing_broker_fees = self.get_broker_fees(listing_broker_address);
        let ark_fees = self.ark_fees.read();

        let fulfill_broker_fees_amount = fulfill_broker_fees.compute_amount(payment_amount);
        let listing_broker_fees_amount = listing_broker_fees.compute_amount(payment_amount);
        let (_, creator_fees_amount) = _compute_creator_fees_amount(
            self, @nft_address, payment_amount, nft_token_id
        );
        let ark_fees_amount = ark_fees.compute_amount(payment_amount);
        (
            fulfill_broker_fees_amount,
            listing_broker_fees_amount,
            ark_fees_amount,
            creator_fees_amount,
        )
    }

    fn _get_order_info(self: @ContractState, order_hash: felt252) -> OrderInfo {
        let order = self.orderbook.get_order(order_hash);
        let order_type = self.orderbook.get_order_type(order_hash);
        let token_id = match order.token_id {
            Option::Some(token_id) => token_id,
            Option::None => 0,
        };
        OrderInfo {
            order_type,
            currency_address: order.currency_address,
            token_address: order.token_address,
            token_id,
            quantity: order.quantity,
            start_amount: order.start_amount,
            offerer: order.offerer,
        }
    }
}
