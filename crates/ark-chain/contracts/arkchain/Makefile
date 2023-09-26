config := --account ../solis_account1.json \
	--keystore ../solis_key1.json \
	--rpc http://127.0.0.1:7070 \
	--keystore-password 1234

ob_cl = $(shell starkli class-hash target/dev/arkchain_orderbook.sierra.json)
ob_addr := 0x008707b3296680b4f67430509ee8655f86ce3c844d7223cb52b01412a6c45eff

ark_executor_sn := 0x0573e38d2b37032172a1f9b370bd81954a0d44934e38154ff75a678700b73430

# Solis accounts
# has token 1 and 2
solis_2 := 0x47abb77acbb2f65006a42b14fed3664bafb0d102c00a97be58618d49d5186ac
# has token 3 and 4
solis_3 := 0x4c077c4085945fa6ea7116ec3c4579de29b10bd65aaf77cf4cf4f85af3ef609
# collection
erc721_address := 0x044b07a8c955296dd52a9d7d31a400b16ad4f6f574aa57db79cac0e87eac48cd

setup:
	scarb build
	starkli declare target/dev/arkchain_orderbook.sierra.json ${config}
	starkli deploy ${ob_cl} 0x3ee9e18edc71a6df30ac3aca2e0b02a198fbce19b7480a63a0d71cbd76652e0 ${config} --salt 0x1234
	starkli invoke ${ob_addr} set_executor_sn_address ${ark_executor_sn} ${config}

	starkli invoke ${ob_addr} register_broker str:b1 1 str:starknet_testnet ${config}

	starkli invoke ${ob_addr} add_order_listing ${solis_2} ${erc721_address} u256:1 u256:77 0 str:b1 0 0 ${config}

	starkli invoke ${ob_addr} submit_order_buy 0x51a397add04213bb487668b635bedefdbbe5fb8f5b9d3aad6164031b60958b ${solis_3} str:b1 0 0 ${config}

