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

invoke_create_order:
	starkli invoke \
	0x024df499c7b1b14c0e52ea237e26a7401ef70507cf72eaef105316dfb5a207a7 \
	create_order \
	0 0x1 0x2 0x3 0x4 0x5 0x6 u256:0x7 u256:0x1 u256:0x1 u256:0x2 10000 20000 str:broker 0 \
	0x1 0x2 0x3 \
	--max-fee-raw 10581100000000000
