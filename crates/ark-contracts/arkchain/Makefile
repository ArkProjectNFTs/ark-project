config := --account katana-0 \
	  --rpc http://0.0.0.0:7777

ob_cl = $(shell starkli class-hash target/dev/arkchain_orderbook.contract_class.json)

build:
	scarb build
	mkdir -p ../../../artifacts
	jq .abi ./target/dev/arkchain_orderbook.contract_class.json > ../../../artifacts/orderbook.json

setup:
	scarb build
	starkli declare target/dev/arkchain_orderbook.contract_class.json ${config}
	starkli deploy ${ob_cl} 0x517ececd29116499f4a1b64b094da79ba08dfd54a3edaa316134c41f8160973 ${config} --salt 0x1234

