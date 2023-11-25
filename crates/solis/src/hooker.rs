//! Solis hooker on Katana transaction lifecycle.
//!
use async_trait::async_trait;
use katana_core::hooker::KatanaHooker;
use starknet::accounts::Call;
use starknet::core::types::BroadcastedInvokeTransaction;
use starknet::core::types::FieldElement;
use starknet::macros::selector;
use starknet::providers::Provider;
use starknet_abigen_parser::CairoType;

use crate::contracts::orderbook::OrderV1;
use crate::contracts::starknet_utils::StarknetUtilsReader;
use crate::error::{Error, SolisResult};

/// Hooker struct, with already instanciated contracts/readers
/// to avoid allocating them at each transaction that is being
/// verified.
pub struct SolisHooker<P: Provider + Sync + Send + 'static> {
    pub orderbook_address: FieldElement,
    pub sn_utils_reader: StarknetUtilsReader<P>,
    // TODO: init the orderbook contract too.
}

/// Solis hooker relies on verifiers to inspect and verify
/// the transaction and starknet state before acceptance.
#[async_trait]
impl<P: Provider + Sync + Send + 'static> KatanaHooker for SolisHooker<P> {
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

            let order = match OrderV1::deserialize(&call.calldata, 0) {
                Ok(order) => order,
                Err(e) => {
                    tracing::error!("Fail deserializing OrderV1: {:?}", e);
                    return false;
                }
            };

            tracing::trace!("Order to verify: {:?}", order);
        }

        true
    }

    async fn verify_message_to_starknet_before_tx(&self, call: Call) -> bool {
        println!("verify message to starknet before tx: {:?}", call);
        true
    }

    async fn react_on_starknet_tx_failed(&self, call: Call) {
        println!("Starknet tx failed: {:?}", call);
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

        println!("offset {}", offset);
        println!("calldata_len {}", calldata_len);
        println!("offset + calldata_len {}", offset + calldata_len as usize);

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
