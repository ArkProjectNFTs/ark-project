//! The messaging between the appchain and starknet
//! is done using solis capabilities to execute a transaction on Starknet
//! from a message sent by arkchain contracts.
//!
//! So, on Starknet, we can:
//!   1. Traditionally consume a message sent from the arkchain.
//!   2. A transaction can be fired directly from arkchain contract
//!      to a starknet contract (like the operator does).

#[starknet::interface]
trait IAppchainMessaging<T> {
    fn update_appchain_account_address(ref self: T, appchain_address: starknet::ContractAddress);

    /// Sends a message to an appchain by emitting an event.
    /// Returns the message hash and the nonce.
    fn send_message_to_appchain(
        ref self: T,
        to_address: starknet::ContractAddress,
        selector: felt252,
        payload: Span<felt252>,
    ) -> (felt252, felt252);

    /// Registers messages hashes as consumable.
    /// Usually, this function is only callable by the appchain developer/owner
    /// that control the appchain sequencer (solis in our case).
    fn register_messages_hashes(ref self: T, messages_hashes: Span<felt252>);

    /// Consumes a message registered as consumable by the appchain.
    /// This is the traditional consuming as Starknet does.
    fn consume_message_from_appchain(
        ref self: T,
        from_address: starknet::ContractAddress,
        payload: Span<felt252>,
    );

    /// Executes a message send from the appchain. A message to execute
    /// does not need to be registered as consumable. It is automatically
    /// consumed while executed.
    fn execute_message_from_appchain(
        ref self: T,
        from_address: starknet::ContractAddress,
        to_address: starknet::ContractAddress,
        selector: felt252,
        payload: Span<felt252>,
    );

}

#[starknet::interface]
trait IUpgradeable<T> {
    fn upgrade(ref self: T, class_hash: starknet::ClassHash);
}

#[starknet::contract]
mod appchain_messaging {
    use starknet::{ContractAddress, ClassHash};
    use debug::PrintTrait;

    use super::{IAppchainMessaging, IUpgradeable};

    #[storage]
    struct Storage {
        owner: ContractAddress,
        // The account used by the appchain sequencer to
        // register messages hashes.
        appchain_account: ContractAddress,
        // Abbreviated identifier of the appchain sending messaging
        // with this contract.
        appchain_name: felt252,
        // The nonce for messages sent from Starknet.
        sn_to_appc_nonce: felt252,
        // Ledger of messages sent from Starknet to the appchain.
        sn_to_appc_messages: LegacyMap::<felt252, felt252>,
        // Records of messages registered from the appchain and a refcount
        // associated to it.
        appc_to_sn_messages: LegacyMap::<felt252, felt252>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        MessageSentToAppchain: MessageSentToAppchain,
        MessagesRegisteredFromAppchain: MessagesRegisteredFromAppchain,
        MessageConsumed: MessageConsumed,
        MessageExecuted: MessageExecuted,
        MessageExecutionError: MessageExecutionError,
        Upgraded: Upgraded,
    }

    #[derive(Drop, starknet::Event)]
    struct MessageSentToAppchain {
        #[key]
        message_hash: felt252,
        #[key]
        from: ContractAddress,
        #[key]
        to: ContractAddress,
        selector: felt252,
        nonce: felt252,
        payload: Span<felt252>,
    }

    #[derive(Drop, starknet::Event)]
    struct MessagesRegisteredFromAppchain {
        messages_hashes: Span<felt252>,
    }

    #[derive(Drop, starknet::Event)]
    struct MessageConsumed {
        #[key]
        message_hash: felt252,
        #[key]
        from: ContractAddress,
        #[key]
        to: ContractAddress,
        payload: Span<felt252>,
    }

    #[derive(Drop, starknet::Event)]
    struct MessageExecuted {
        #[key]
        from_address: ContractAddress,
        #[key]
        to_address: ContractAddress,
        #[key]
        selector: felt252,
        payload: Span<felt252>,
        // TODO: is the execution result interesting here?
    }

    #[derive(Drop, starknet::Event)]
    struct MessageExecutionError {
        #[key]
        from_address: ContractAddress,
        #[key]
        to_address: ContractAddress,
        #[key]
        selector: felt252,
        payload: Span<felt252>,
        error: Span<felt252>,
    }

    #[derive(Drop, starknet::Event)]
    struct Upgraded {
        class_hash: ClassHash,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        appchain_account: ContractAddress,
    ) {
        self.owner.write(owner);
        self.appchain_account.write(appchain_account);
    }

    /// Computes the starknet keccak.
    /// TODO: must be ported in a package to have the same
    /// function used on appchain and starknet.
    fn starknet_keccak(data: Span<felt252>) -> felt252 {
        let mut u256_data: Array<u256> = array![];

        let mut i = 0_usize;
        loop {
            if i == data.len() {
                break;
            }
            u256_data.append((*data[i]).into());
            i += 1;
        };

        let mut hash = keccak::keccak_u256s_be_inputs(u256_data.span());
        let low = integer::u128_byte_reverse(hash.high);
        let high = integer::u128_byte_reverse(hash.low);
        hash = u256 { low, high };
        hash = hash & 0x03ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff_u256;
        hash.try_into().expect('starknet keccak overflow')
    }

    /// Computes message hash for consuming messages from appchain.
    /// starknet_keccak(from_address, to_address, payload_len, payload).
    fn compute_hash_appc_to_sn(
        from_address: ContractAddress,
        to_address: ContractAddress,
        payload: Span<felt252>
    ) -> felt252 {
        let mut hash_data: Array<felt252> = array![
            from_address.into(),
            to_address.into(),
            payload.len().into(),
        ];

        let mut i = 0_usize;
        loop {
            if i == payload.len() {
                break;
            }
            hash_data.append((*payload[i]));
            i += 1;
        };

        starknet_keccak(hash_data.span())
    }

    /// Computes message hash for sending messages to appchain.
    /// starknet_keccak(nonce, to_address, selector, payload).
    fn compute_hash_sn_to_appc(
        nonce: felt252,
        to_address: ContractAddress,
        selector: felt252,
        payload: Span<felt252>
    ) -> felt252 {
        let mut hash_data = array![
            nonce,
            to_address.into(),
            selector,
        ];

        let mut i = 0_usize;
        loop {
            if i == payload.len() {
                break;
            }
            hash_data.append((*payload[i]));
            i += 1;
        };

        starknet_keccak(hash_data.span())
    }

    #[external(v0)]
    impl AppchainMessagingUpgradeImpl of IUpgradeable<ContractState> {

        fn upgrade(ref self: ContractState, class_hash: ClassHash) {
            assert(
                starknet::get_caller_address() == self.owner.read(),
                'Unauthorized replace class'
            );

            match starknet::replace_class_syscall(class_hash) {
                Result::Ok(_) => self.emit(Upgraded { class_hash }),
                Result::Err(revert_reason) => panic(revert_reason),
            };
        }
    }

    #[external(v0)]
    impl AppchainMessagingImpl of IAppchainMessaging<ContractState> {
        fn update_appchain_account_address(ref self: ContractState, appchain_address: ContractAddress) {
            assert(
                starknet::get_caller_address() == self.owner.read(),
                'Unauthorized update'
            );

            self.appchain_account.write(appchain_address);
        }

        fn send_message_to_appchain(
            ref self: ContractState,
            to_address: ContractAddress,
            selector: felt252,
            payload: Span<felt252>
        ) -> (felt252, felt252) {
            let nonce = self.sn_to_appc_nonce.read() + 1;
            self.sn_to_appc_nonce.write(nonce);

            let msg_hash = compute_hash_sn_to_appc(nonce, to_address, selector, payload);

            self.emit(MessageSentToAppchain {
                message_hash: msg_hash,
                from: starknet::get_caller_address(),
                to: to_address,
                selector,
                nonce,
                payload,
            });

            self.sn_to_appc_messages.write(msg_hash, nonce);
            (msg_hash, nonce)
        }

        fn register_messages_hashes(ref self: ContractState, messages_hashes: Span<felt252>) {
            assert(
                self.appchain_account.read() == starknet::get_caller_address(),
                'Unauthorized hashes registrar',
            );

            let mut i = 0_usize;
            loop {
                if i == messages_hashes.len() {
                    break;
                }

                let msg_hash = *messages_hashes[i];

                let count = self.appc_to_sn_messages.read(msg_hash);
                self.appc_to_sn_messages.write(msg_hash, count + 1);

                i += 1;
            };

            self.emit(MessagesRegisteredFromAppchain { messages_hashes });
        }

        fn consume_message_from_appchain(
            ref self: ContractState,
            from_address: ContractAddress,
            payload: Span<felt252>
        ) {
            let to_address = starknet::get_caller_address();

            let msg_hash = compute_hash_appc_to_sn(from_address, to_address, payload);

            let count = self.appc_to_sn_messages.read(msg_hash);
            assert(count.is_non_zero(), 'INVALID_MESSAGE_TO_CONSUME');

            self.emit(MessageConsumed {
                message_hash: msg_hash,
                from: from_address,
                to: to_address,
                payload,
            });

            self.appc_to_sn_messages.write(msg_hash, count - 1);
        }

        fn execute_message_from_appchain(
            ref self: ContractState,
            from_address: ContractAddress,
            to_address: ContractAddress,
            selector: felt252,
            payload: Span<felt252>,
        ) {
            assert(
                self.appchain_account.read() == starknet::get_caller_address(),
                'Unauthorized executor',
            );

            match starknet::call_contract_syscall(to_address, selector, payload) {
                Result::Ok(span) => self.emit(MessageExecuted {
                    from_address,
                    to_address,
                    selector,
                    payload,
                }),
                Result::Err(e) => {
                    // TODO: Should we revert directly and the appchain will know the
                    // message failed? Should we emit event with execution error?
                    self.emit(MessageExecutionError {
                        from_address,
                        to_address,
                        selector,
                        payload,
                        error: e.span()
                    })
                }
            }
        }

    }
}
