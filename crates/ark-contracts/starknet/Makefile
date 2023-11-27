export STARKNET_ACCOUNT=katana-0
export STARKNET_RPC=http://0.0.0.0:5050

APPCHAIN_MESSAGING_CLASSHASH=0x007926ea5b82c5cc3a46f89335e5ae2e018f255d2e34c627116d5bbaa6a9d951
KATANA_0=0x517ececd29116499f4a1b64b094da79ba08dfd54a3edaa316134c41f8160973

# Setup appchain messaging contract on Starknet at address: 0x07a7c5998c847b43710a9ef093e0a456af17b86013e98eece7d8e83efff16e16
setup_messaging_katana:
	scarb build
	starkli declare ./target/dev/ark_operator_appchain_messaging.contract_class.json
	starkli deploy $(APPCHAIN_MESSAGING_CLASSHASH) $(KATANA_0) $(KATANA_0) --salt 0x7777

