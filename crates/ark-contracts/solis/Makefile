build:
	scarb build
	mkdir -p ../../../artifacts
	jq .abi ./target/dev/solis_starknet_utils.contract_class.json > ../../../artifacts/starknet_utils.json
