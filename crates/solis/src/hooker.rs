//! Solis hooker on Katana transaction lifecycle.
//!
use async_trait::async_trait;
use cainome::cairo_serde::CairoSerde;
use katana_core::hooker::{HookerAddresses, KatanaHooker};
use katana_core::sequencer::KatanaSequencer;
use katana_primitives::contract::ContractAddress;
use katana_primitives::transaction::{ExecutableTx, ExecutableTxWithHash, L1HandlerTx};
use katana_primitives::utils::transaction::compute_l1_message_hash;
use starknet::accounts::Call;
use starknet::core::types::BroadcastedInvokeTransaction;
use starknet::core::types::FieldElement;
use starknet::macros::selector;
use starknet::providers::Provider;
use std::sync::Arc;

use crate::contracts::orderbook::OrderV1;
use crate::contracts::starknet_utils::StarknetUtilsReader;
use crate::error::{Error, SolisResult};
use crate::CHAIN_ID_SOLIS;

/// Hooker struct, with already instanciated contracts/readers
/// to avoid allocating them at each transaction that is being
/// verified.
pub struct SolisHooker<P: Provider + Sync + Send + 'static> {
    // Solis interacts with the orderbook only via `L1HandlerTransaction`. Only the
    // address is required.
    pub orderbook_address: FieldElement,
    // TODO: replace this by the Executor Contract object!
    pub sn_executor_address: FieldElement,
    pub sn_utils_reader: StarknetUtilsReader<P>,
    sequencer: Option<Arc<KatanaSequencer>>,
}

impl<P: Provider + Sync + Send + 'static> SolisHooker<P> {
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
    pub fn sequencer_ref(&self) -> &Arc<KatanaSequencer> {
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
        let chain_id = CHAIN_ID_SOLIS;

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
            let exe = ExecutableTxWithHash::new_query(ExecutableTx::L1Handler(tx));
            seq.add_transaction_to_pool(exe);
        }
    }
}

/// Solis hooker relies on verifiers to inspect and verify
/// the transaction and starknet state before acceptance.
#[async_trait]
impl<P: Provider + Sync + Send + 'static> KatanaHooker for SolisHooker<P> {
    fn set_sequencer(&mut self, sequencer: Arc<KatanaSequencer>) {
        self.sequencer = Some(sequencer);
    }

    fn set_addresses(&mut self, addresses: HookerAddresses) {
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
        println!(
            "verify message to appchain: {:?} == {:?} && {:?} == {:?}",
            from, self.sn_executor_address, to, self.orderbook_address
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
        tracing::trace!("verify invoke tx before pool: {:?}", transaction);

        let calls = match calls_from_tx(&transaction.calldata) {
            Ok(calls) => calls,
            Err(e) => {
                tracing::error!("Fail getting calls from tx: {:?}", e);
                return false;
            }
        };

        tracing::trace!("Calls: {:?}", calls);

        for call in calls {
            tracing::trace!("\nCall: {:?}", call);
            if call.to != self.orderbook_address {
                continue;
            }

            if call.selector != selector!("create_order") {
                continue;
            }

            let order = match OrderV1::cairo_deserialize(&call.calldata, 0) {
                Ok(order) => order,
                Err(e) => {
                    tracing::error!("Fail deserializing OrderV1: {:?}", e);
                    return false;
                }
            };

            tracing::trace!("Order to verify: {:?}", order);

            // TODO: check assets on starknet.
            // TODO: if not valid, in some cases we want to send L1HandlerTransaction
            // to change the status of the order. (entrypoint to be written).
        }

        true
    }

    async fn verify_tx_for_starknet(&self, call: Call) -> bool {
        println!("verify message to starknet before tx: {:?}", call);

        // TODO: Decode the ExecutionInfo from the calldata.
        // Check that assets are still in the good location. When this function
        // returns true, a transaction is fired on Starknet for the execution.
        true
    }

    async fn on_starknet_tx_failed(&self, call: Call) {
        println!("Starknet tx failed: {:?}", call);

        // TODO: in the case a transaction reverts on Starknet for the ExecutionInfo
        // being invalid (someone races Solis), some code may be run here
        // to cancel / invalidate the order (if it applies).
    }
}

/// Parses a transaction's array of calls and deserializes them.
/// The calls are serialized using Cairo serialization scheme.
/// As a reference, here is how OZ are using this array of `Call`
/// in cairo contract:
/// https://github.com/OpenZeppelin/cairo-contracts/blob/v0.8.0-beta.1/src/account/account.cairo#L205
///
/// # Arguments
///
/// * `tx_calldata` - The serializes array of `Call` of the transaction.
fn calls_from_tx(tx_calldata: &[FieldElement]) -> SolisResult<Vec<Call>> {
    let mut out = vec![];
    if tx_calldata.is_empty() {
        return Ok(out);
    }

    let n_call: u64 = tx_calldata[0]
        .try_into()
        .map_err(|_e| Error::FeltConversion("Failed to convert felt252 into u64".to_string()))?;

    let mut offset = 1;
    loop {
        if out.len() == n_call as usize {
            break;
        }

        let to = tx_calldata[offset];
        offset += 1;
        let selector = tx_calldata[offset];
        offset += 1;

        // TODO: how to differenciate legacy-encoding from new encoding...?
        // Support legacy encoding for now.

        // In legacy, first is the offset of the data. Mostly 0 with only
        // one call.
        offset += 1;

        // Then it's the data len, which is the same as calldata len when
        // only one call is in the array.
        offset += 1;

        println!("offset before calldata len {}", offset);
        // Then we've the calldata len, same as new encoding.
        let calldata_len: u64 = tx_calldata[offset].try_into().map_err(|_e| {
            Error::FeltConversion("Failed to convert felt252 into u64".to_string())
        })?;
        offset += 1;

        let calldata = if calldata_len > 0 {
            tx_calldata[offset..offset + calldata_len as usize].to_vec()
        } else {
            Vec::<FieldElement>::new()
        };

        out.push(Call {
            to,
            selector,
            calldata,
        });

        offset += calldata_len as usize;
    }

    Ok(out)
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

        let calls = calls_from_tx(&data).unwrap();
        assert_eq!(calls.len(), 1);
        assert_eq!(
            calls[0].to,
            felt!("0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7")
        );
        assert_eq!(calls[0].selector, selector!("transfer"));
        assert_eq!(calls[0].calldata.len(), 3);
    }
}
