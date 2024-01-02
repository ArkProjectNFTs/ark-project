config := --account katana-0 \
	  --rpc http://0.0.0.0:7777

ob_cl = $(shell starkli class-hash target/dev/arkchain_orderbook_event_mock.contract_class.json)
ob_addr = 0x045dd7f47f2621491763ebf2095de7b4535487e3ffacde139a832c547c994a2f

generate_artifacts:
	scarb build
	mkdir -p ../../../artifacts
	# For now, the json is duplicated to be able to run
	# cargo build -p diri from here, and from ark-services too.
	jq .abi ./target/dev/ark_orderbook_orderbook.contract_class.json > ../artifacts/orderbook.json
	jq .abi ./target/dev/ark_orderbook_orderbook.contract_class.json > ../crates/diri/artifacts/orderbook.json

# Using max-fee 0 avoids starkli to run estimate_fee before actually sending the tx.
# There are no fees on Solis.
setup_orderbook_events:
	scarb build
	starkli declare target/dev/arkchain_orderbook_event_mock.contract_class.json ${config}
	starkli deploy ${ob_cl} ${config} --max-fee 0 --salt 0x1234

	starkli invoke ${ob_addr} emit_order_placed ${config}
	starkli invoke ${ob_addr} emit_order_cancelled ${config}
	starkli invoke ${ob_addr} emit_order_fulfilled ${config}
