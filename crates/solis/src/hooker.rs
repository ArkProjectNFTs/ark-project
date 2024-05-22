//! Solis hooker on Katana transaction lifecycle.
//!
use crate::contracts::starknet_utils::{ExecutionInfo, U256};
use async_trait::async_trait;
use cainome::cairo_serde::CairoSerde;
use cainome::rs::abigen;
use katana_core::hooker::{HookerAddresses, KatanaHooker};
use katana_core::sequencer::KatanaSequencer;
use katana_executor::ExecutorFactory;

use katana_primitives::chain::ChainId;
use katana_primitives::contract::ContractAddress;
use katana_primitives::transaction::{ExecutableTx, ExecutableTxWithHash, L1HandlerTx};
use katana_primitives::utils::transaction::compute_l1_message_hash;
use starknet::accounts::Call;
use starknet::core::types::BroadcastedInvokeTransaction;
use starknet::core::types::FieldElement;
use starknet::macros::selector;
use starknet::providers::Provider;
use std::sync::Arc;

use crate::contracts::orderbook::{OrderV1, RouteType};
use crate::contracts::starknet_utils::StarknetUtilsReader;
use crate::CHAIN_ID_SOLIS;
use tracing::{info};

#[allow(dead_code)]
pub enum CancelStatus {
    CancelledUser,
    CancelledByNewOrder,
    CancelledAssetFault,
    CancelledOwnership,
}

impl CancelStatus {
    fn to_u32(&self) -> u32 {
        match self {
            CancelStatus::CancelledUser => 1,
            CancelStatus::CancelledByNewOrder => 2,
            CancelStatus::CancelledAssetFault => 3,
            CancelStatus::CancelledOwnership => 4,
        }
    }
}

struct OwnershipVerifier {
    token_address: ContractAddress,
    token_id: U256,
    current_owner: cainome::cairo_serde::ContractAddress,
}

struct BalanceVerifier {
    currency_address: ContractAddress,
    offerer: cainome::cairo_serde::ContractAddress,
    start_amount: U256,
}

abigen!(CallContract, "./artifacts/contract.abi.json");

/// Hooker struct, with already instanciated contracts/readers
/// to avoid allocating them at each transaction that is being
/// verified.
pub struct SolisHooker<P: Provider + Sync + Send + 'static + std::fmt::Debug, EF: ExecutorFactory> {
    // Solis interacts with the orderbook only via `L1HandlerTransaction`. Only the
    // address is required.
    pub orderbook_address: FieldElement,
    // TODO: replace this by the Executor Contract object!
    pub sn_executor_address: FieldElement,
    pub sn_utils_reader: StarknetUtilsReader<P>,
    sequencer: Option<Arc<KatanaSequencer<EF>>>,
}

impl<P: Provider + Sync + Send + 'static + std::fmt::Debug,  EF: ExecutorFactory> SolisHooker<P, EF> {
    /// Verify the ownership of a token
    async fn verify_ownership(&self, ownership_verifier: &OwnershipVerifier) -> bool {
        let sn_utils_reader_nft_address = StarknetUtilsReader::new(
            ownership_verifier.token_address.into(),
            self.sn_utils_reader.provider(),
        );

        // check the current owner of the token.
        let owner = sn_utils_reader_nft_address
            .ownerOf(&ownership_verifier.token_id)
            .call()
            .await;

        if let Ok(owner_address) = owner {
            if owner_address != ownership_verifier.current_owner {
                tracing::trace!(
                    "\nOwner {:?} differs from offerer {:?} ",
                    owner,
                    ownership_verifier.current_owner
                );

                println!(
                    "\nOwner {:?} differs from offerer {:?} ",
                    owner, ownership_verifier.current_owner
                );

                return false;
            }
        }

        true
    }

    async fn verify_balance(&self, balance_verifier: &BalanceVerifier) -> bool {
        info!("HOOKER: Verify Balance");

        let sn_utils_reader_erc20_address = StarknetUtilsReader::new(
            balance_verifier.currency_address.into(),
            self.sn_utils_reader.provider(),
        );
        let allowance = sn_utils_reader_erc20_address
            .allowance(&balance_verifier.offerer, &self.sn_executor_address.into())
            .call()
            .await;

        info!("HOOKER: Verify Balance allowance {:?}, amount {:?}", allowance, balance_verifier.start_amount);

        if let Ok(allowance) = allowance {
            if allowance < balance_verifier.start_amount {
                println!(
                    "\nAllowance {:?} is not enough {:?} for offerer {:?}",
                    allowance, balance_verifier.start_amount, balance_verifier.offerer
                );
                return false;
            }
        }

        // check the balance
        let balance = sn_utils_reader_erc20_address
            .balanceOf(&balance_verifier.offerer)
            .call()
            .await;
        if let Ok(balance) = balance {
            if balance < balance_verifier.start_amount {
                tracing::trace!(
                    "\nBalance {:?} is not enough {:?} ",
                    balance,
                    balance_verifier.start_amount
                );
                println!(
                    "\nBalance {:?} is not enough {:?} ",
                    balance, balance_verifier.start_amount
                );
                return false;
            }
        }

        true
    }

    async fn verify_call(&self, call: &TxCall) -> bool {
        let order = match OrderV1::cairo_deserialize(&call.calldata, 0) {
            Ok(order) => order,
            Err(e) => {
                tracing::error!("Fail deserializing OrderV1: {:?}", e);
                return false;
            }
        };

        // ERC721 to ERC20
        if order.route == RouteType::Erc721ToErc20 {
            let token_id = order.token_id.clone().unwrap();
            let n_token_id = U256 {
                low: token_id.low,
                high: token_id.high,
            };

            let verifier = OwnershipVerifier {
                token_address: ContractAddress(order.token_address.into()),
                token_id: n_token_id,
                current_owner: cainome::cairo_serde::ContractAddress(order.offerer.into()),
            };

            let owner_ship_verification = self.verify_ownership(&verifier).await;
            if !owner_ship_verification {
                return false;
            }
        }

        // ERC20 to ERC721 : we check the allowance and the offerer balance.
        if order.route == RouteType::Erc20ToErc721 {
            if !self
                .verify_balance(&BalanceVerifier {
                    currency_address: ContractAddress(order.currency_address.into()),
                    offerer: cainome::cairo_serde::ContractAddress(order.offerer.into()),
                    start_amount: U256 {
                        low: order.start_amount.low,
                        high: order.start_amount.high,
                    },
                })
                .await
            {
                println!("verify balance for starknet before failed");
                return false;
            }
        }
        return true;
    }
}

impl<P: Provider + Sync + Send + 'static + std::fmt::Debug, EF: ExecutorFactory> SolisHooker<P, EF> {
    /// Initializes a new instance.
    pub fn new(
        sn_utils_reader: StarknetUtilsReader<P>,
        orderbook_address: FieldElement,
        sn_executor_address: FieldElement,
    ) -> Self {
        Self {
            orderbook_address,
            sn_utils_reader,
            sn_executor_address,
            sequencer: None,
        }
    }

    /// Retrieves a reference to the sequencer.
    #[allow(dead_code)]
    pub fn sequencer_ref(&self) -> &Arc<KatanaSequencer<EF>> {
        // The expect is used here as it must always be set by Katana core.
        // If not set, the merge on Katana may be revised.
        self.sequencer
            .as_ref()
            .expect("Sequencer must be set to get a reference to it")
    }

    /// Adds a `L1HandlerTransaction` to the transaction pool that is directed to the
    /// orderbook only.
    /// `L1HandlerTransaction` is a special type of transaction that can only be
    /// sent by the sequencer itself. This transaction is not validated by any account.
    ///
    /// In the case of Solis, `L1HandlerTransaction` are sent by Solis for two purposes:
    /// 1. A message was collected from the L2, and it must be executed.
    /// 2. A transaction has been rejected by Solis (asset faults), and the order
    ///    must then be updated.
    ///
    /// This function is used for the scenario 2. For this reason, the `from_address`
    /// field is automatically filled up by the sequencer to use the executor address
    /// deployed on L2 to avoid any attack by other contracts.
    ///
    /// # Arguments
    ///
    /// * `selector` - The selector of the recipient contract to execute.
    /// * `payload` - The payload of the message.
    #[allow(dead_code)]
    pub fn add_l1_handler_transaction_for_orderbook(
        &self,
        selector: FieldElement,
        payload: &[FieldElement],
    ) {
        let to_address = self.orderbook_address;
        let from_address = self.sn_executor_address;
        let chain_id = ChainId::Id(CHAIN_ID_SOLIS);

        // The nonce is normally used by the messaging contract on Starknet. But in the
        // case of those transaction, as they are only sent by Solis itself, we use 0.
        // TODO: this value of 0 must be checked by the `l1_handler` function.
        let nonce = FieldElement::ZERO;

        // The calldata always starts with the from_address.
        let mut calldata: Vec<FieldElement> = vec![from_address];
        for p in payload.into_iter() {
            calldata.push(*p);
        }

        let message_hash = compute_l1_message_hash(from_address, to_address, payload);

        let tx = L1HandlerTx {
            nonce,
            chain_id,
            paid_fee_on_l1: 30000_u128,
            version: FieldElement::ZERO,
            message_hash,
            calldata,
            contract_address: ContractAddress(to_address),
            entry_point_selector: selector,
        };

        if let Some(seq) = &self.sequencer {
            let exe = ExecutableTxWithHash::new_query(ExecutableTx::L1Handler(tx), false);
            seq.add_transaction_to_pool(exe);
        }
    }
}

/// Solis hooker relies on verifiers to inspect and verify
/// the transaction and starknet state before acceptance.
#[async_trait]
impl<P: Provider + Sync + Send + 'static + std::fmt::Debug, EF: ExecutorFactory> KatanaHooker<EF> for SolisHooker<P, EF> {
    fn set_sequencer(&mut self, sequencer: Arc<KatanaSequencer<EF>>) {
        self.sequencer = Some(sequencer);
    }

    fn set_addresses(&mut self, addresses: HookerAddresses) {
        info!("HOOKER: Addresses set for hooker: {:?}", addresses);
        self.orderbook_address = addresses.orderbook_arkchain;
        self.sn_executor_address = addresses.executor_starknet;
    }

    /// Verifies if the message is directed to the orderbook and comes from
    /// the executor contract on L2.
    ///
    /// Currently, only the `from` and `to` are checked.
    /// More checks may be added on the selector, and the data.
    async fn verify_message_to_appchain(
        &self,
        from: FieldElement,
        to: FieldElement,
        _selector: FieldElement,
    ) -> bool {
        info!(
            "HOOKER: verify_message_to_appchain called with from: {:?}, to: {:?}, {:?}, {:?}",
            from, to, self.sn_executor_address, self.orderbook_address
        );
        // For now, only the from/to are checked.
        from == self.sn_executor_address && to == self.orderbook_address
    }

    /// Verifies an invoke transaction that is:
    /// 1. Directed to the orderbook only.
    /// 2. With the selector `create_order` only as the fulfill
    ///    is verified by `verify_message_to_starknet_before_tx`.
    async fn verify_invoke_tx_before_pool(
        &self,
        transaction: BroadcastedInvokeTransaction,
    ) -> bool {
        info!("HOOKER: verify_invoke_tx_before_pool called with transaction: {:?}", transaction);

        let calldata = match transaction {
            BroadcastedInvokeTransaction::V1(v1_transaction) => v1_transaction.calldata,
            BroadcastedInvokeTransaction::V3(v3_transaction) => v3_transaction.calldata,
        };
        info!("HOOKER: cairo_deserialize called with transaction: {:?}", calldata);

        let calls = match Vec::<TxCall>::cairo_deserialize(&calldata, 0) {
            Ok(calls) => calls,
            Err(e) => {
                tracing::error!("Fail deserializing OrderV1: {:?}", e);
                return false;
            }
        };

        for call in calls {
            if call.selector != selector!("create_order")
                && call.selector != selector!("create_order_from_l2")
                && call.selector != selector!("fulfill_order_from_l2")  {
                continue;
            }

            if !self.verify_call(&call).await {
                return false;
            }

            // TODO: check assets on starknet.
            // TODO: if not valid, in some cases we want to send L1HandlerTransaction
            // to change the status of the order. (entrypoint to be written).
        }
        true
    }

    async fn verify_tx_for_starknet(&self, call: Call) -> bool {
        println!("verify message to starknet before tx: {:?}", call);
        if call.selector != selector!("fulfill_order") {
            return true;
        }

        let execution_info = match ExecutionInfo::cairo_deserialize(&call.calldata, 0) {
            Ok(execution_info) => execution_info,
            Err(e) => {
                tracing::error!("Fail deserializing ExecutionInfo: {:?}", e);
                return false;
            }
        };

        let verifier = OwnershipVerifier {
            token_address: ContractAddress(execution_info.nft_address.into()),
            token_id: execution_info.nft_token_id,
            current_owner: cainome::cairo_serde::ContractAddress(execution_info.nft_from.into()),
        };

        let owner_ship_verification = self.verify_ownership(&verifier).await;
        if !owner_ship_verification {
            // rollback the status
            let status = CancelStatus::CancelledOwnership;

            self.add_l1_handler_transaction_for_orderbook(
                selector!("rollback_status_order"),
                &[execution_info.order_hash, status.to_u32().into()],
            );
            return false;
        }

        if !self
            .verify_balance(&BalanceVerifier {
                currency_address: ContractAddress(execution_info.payment_currency_address.into()),
                offerer: cainome::cairo_serde::ContractAddress(execution_info.nft_to.into()),
                start_amount: U256 {
                    low: execution_info.payment_amount.low,
                    high: execution_info.payment_amount.high,
                },
            })
            .await
        {
            // rollback the status
            let status = CancelStatus::CancelledAssetFault;

            self.add_l1_handler_transaction_for_orderbook(
                selector!("rollback_status_order"),
                &[execution_info.order_hash, status.to_u32().into()],
            );
            return false;
        }

        true
    }

    async fn on_starknet_tx_failed(&self, call: Call) {
        println!("Starknet tx failed: {:?}", call);

        let execution_info = match ExecutionInfo::cairo_deserialize(&call.calldata, 0) {
            Ok(execution_info) => execution_info,
            Err(e) => {
                tracing::error!("Fail deserializing ExecutionInfo: {:?}", e);
                return;
            }
        };

        // rollback the status
        self.add_l1_handler_transaction_for_orderbook(
            selector!("rollback_status_order"),
            &[execution_info.order_hash],
        );
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use starknet::macros::{felt, selector};

    #[test]
    fn test_calldata_calls_parsing_new_encoding() {
        // Calldata for a transaction to starkgate:
        // Tx hash Goerli: 0x78140a4777bdf508feec62485c2d49b90b8346875c19470790935bcfbb9594
        let data = vec![
            FieldElement::ONE,
            // to (starkgate).
            felt!("0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"),
            // selector (transfert).
            felt!("0x83afd3f4caedc6eebf44246fe54e38c95e3179a5ec9ea81740eca5b482d12e"),
            // data offset.
            felt!("0x0"),
            // data len.
            felt!("0x0"),
            // Calldata len.
            FieldElement::THREE,
            felt!("0x06cdcce7333a7143ad0aebbaffe54a809cc53b65c0936ecfbebaecc0de099e8e"),
            felt!("0x071afd498d0000"),
            felt!("0x00"),
        ];

        let calls = match Vec::<TxCall>::cairo_deserialize(&data, 0) {
            Ok(calls) => calls,
            Err(e) => {
                tracing::error!("Fail deserializing OrderV1: {:?}", e);
                Vec::new()
            }
        };

        assert_eq!(calls.len(), 1);
        assert_eq!(
            calls[0].to,
            felt!("0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7").into()
        );
        assert_eq!(calls[0].selector, selector!("transfer"));
    }
}
