config := --account katana-0 \
	  --rpc http://0.0.0.0:7777

ob_cl = $(shell starkli class-hash target/dev/ark_orderbook_orderbook_event_mock.contract_class.json)
ob_addr = 0x04e3170ff4f5a4e03a1aadd0eab06acb237e850dbd694b70bf4d010bdf8eb310

generate_artifacts:
	scarb build --workspace
	mkdir -p ../artifacts
	# For now, the json is duplicated to be able to run
	# cargo build -p diri from here, and from ark-services too.
	jq .abi ./target/dev/ark_orderbook_orderbook.contract_class.json > ../artifacts/orderbook.abi.json
	jq .abi ./target/dev/ark_orderbook_orderbook.contract_class.json > ../crates/diri/artifacts/orderbook.abi.json

# Using max-fee 0 avoids starkli to run estimate_fee before actually sending the tx.
# There are no fees on Solis.
setup_orderbook_events:
	scarb build
	starkli declare target/dev/ark_orderbook_orderbook_event_mock.contract_class.json ${config}
	sleep 2
	starkli deploy ${ob_cl} ${config} --max-fee 0 --salt 0x1234

	starkli invoke ${ob_addr} emit_order_placed ${config}
	starkli invoke ${ob_addr} emit_order_cancelled ${config}
	starkli invoke ${ob_addr} emit_order_fulfilled ${config}
	starkli invoke ${ob_addr} emit_order_listing ${config}
	starkli invoke ${ob_addr} emit_order_offer_placed ${config}
	starkli invoke ${ob_addr} emit_order_offer_executed ${config}
