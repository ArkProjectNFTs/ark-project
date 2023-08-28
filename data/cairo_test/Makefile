export STARKNET_ACCOUNT=../katana_account.json
export STARKNET_RPC=http://0.0.0.0:5050
#STARKNET_KEYSTORE=./data/katana_key.json
export PRIVATE_KEY=0x0300001800000000300000180000000000030000000000003006001800006600

ADMIN_ADDR := 0x3ee9e18edc71a6df30ac3aca2e0b02a198fbce19b7480a63a0d71cbd76652e0

# If a keystore is passed instead of a private key -> ask for the password.
ifndef STARKNET_KEYSTORE
priv_key := --private-key "${PRIVATE_KEY}"
else
priv_key := --keystore ${STARKNET_KEYSTORE}
endif

erc721_ll_class_hash := $(shell starkli class-hash target/dev/cairo_test_erc721_longstring.sierra.json)
erc721_mini_class_hash := $(shell starkli class-hash target/dev/cairo_test_erc721_mini.sierra.json)



declare:
	starkli declare target/dev/cairo_test_erc721_longstring.sierra.json ${priv_key}
	starkli declare target/dev/cairo_test_erc721_mini.sierra.json ${priv_key}

deploy:
	starkli deploy --salt 0x1234 ${erc721_ll_class_hash} 1 str:token_n_ll 1 str:token_s_ll ${priv_key}
	starkli deploy --salt 0x1234 ${erc721_mini_class_hash} str:token_n_mini str:token_s_mini ${priv_key}

mint:
	starkli invoke 0x04af7f2203ff465f5a3025f5fbb78538d3b2d6a78784b63152e5df819822433c mint_free ${ADMIN_ADDR} u256:$(token_id) ${priv_key}

	starkli invoke 0x04dc9f0c6df16cd196938b22d35014d6a318bf514b9702d755a5ddc6b15f90a7 mint_free ${ADMIN_ADDR} u256:$(token_id) ${priv_key}

all: declare deploy mint
