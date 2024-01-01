export const braavosAbi = [
  {
    name: "DeferredRemoveSignerRequest",
    size: 2,
    type: "struct",
    members: [
      {
        name: "expire_at",
        type: "felt",
        offset: 0
      },
      {
        name: "signer_id",
        type: "felt",
        offset: 1
      }
    ]
  },
  {
    name: "SignerModel",
    size: 7,
    type: "struct",
    members: [
      {
        name: "signer_0",
        type: "felt",
        offset: 0
      },
      {
        name: "signer_1",
        type: "felt",
        offset: 1
      },
      {
        name: "signer_2",
        type: "felt",
        offset: 2
      },
      {
        name: "signer_3",
        type: "felt",
        offset: 3
      },
      {
        name: "type",
        type: "felt",
        offset: 4
      },
      {
        name: "reserved_0",
        type: "felt",
        offset: 5
      },
      {
        name: "reserved_1",
        type: "felt",
        offset: 6
      }
    ]
  },
  {
    name: "DeferredMultisigDisableRequest",
    size: 1,
    type: "struct",
    members: [
      {
        name: "expire_at",
        type: "felt",
        offset: 0
      }
    ]
  },
  {
    name: "IndexedSignerModel",
    size: 8,
    type: "struct",
    members: [
      {
        name: "index",
        type: "felt",
        offset: 0
      },
      {
        name: "signer",
        type: "SignerModel",
        offset: 1
      }
    ]
  },
  {
    name: "PendingMultisigTransaction",
    size: 5,
    type: "struct",
    members: [
      {
        name: "transaction_hash",
        type: "felt",
        offset: 0
      },
      {
        name: "expire_at_sec",
        type: "felt",
        offset: 1
      },
      {
        name: "expire_at_block_num",
        type: "felt",
        offset: 2
      },
      {
        name: "signer_1_id",
        type: "felt",
        offset: 3
      },
      {
        name: "is_disable_multisig_transaction",
        type: "felt",
        offset: 4
      }
    ]
  },
  {
    name: "AccountCallArray",
    size: 4,
    type: "struct",
    members: [
      {
        name: "to",
        type: "felt",
        offset: 0
      },
      {
        name: "selector",
        type: "felt",
        offset: 1
      },
      {
        name: "data_offset",
        type: "felt",
        offset: 2
      },
      {
        name: "data_len",
        type: "felt",
        offset: 3
      }
    ]
  },
  {
    data: [
      {
        name: "implementation",
        type: "felt"
      }
    ],
    keys: [],
    name: "Upgraded",
    type: "event"
  },
  {
    data: [
      {
        name: "request",
        type: "DeferredRemoveSignerRequest"
      }
    ],
    keys: [],
    name: "SignerRemoveRequest",
    type: "event"
  },
  {
    data: [
      {
        name: "signer_id",
        type: "felt"
      },
      {
        name: "signer",
        type: "SignerModel"
      }
    ],
    keys: [],
    name: "SignerAdded",
    type: "event"
  },
  {
    data: [
      {
        name: "signer_id",
        type: "felt"
      }
    ],
    keys: [],
    name: "SignerRemoved",
    type: "event"
  },
  {
    data: [
      {
        name: "request",
        type: "DeferredRemoveSignerRequest"
      }
    ],
    keys: [],
    name: "SignerRemoveRequestCancelled",
    type: "event"
  },
  {
    data: [
      {
        name: "public_key",
        type: "felt"
      }
    ],
    keys: [],
    name: "AccountInitialized",
    type: "event"
  },
  {
    data: [
      {
        name: "request",
        type: "DeferredMultisigDisableRequest"
      }
    ],
    keys: [],
    name: "MultisigDisableRequest",
    type: "event"
  },
  {
    data: [
      {
        name: "request",
        type: "DeferredMultisigDisableRequest"
      }
    ],
    keys: [],
    name: "MultisigDisableRequestCancelled",
    type: "event"
  },
  {
    data: [
      {
        name: "num_signers",
        type: "felt"
      }
    ],
    keys: [],
    name: "MultisigSet",
    type: "event"
  },
  {
    data: [],
    keys: [],
    name: "MultisigDisabled",
    type: "event"
  },
  {
    name: "supportsInterface",
    type: "function",
    inputs: [
      {
        name: "interfaceId",
        type: "felt"
      }
    ],
    outputs: [
      {
        name: "success",
        type: "felt"
      }
    ],
    stateMutability: "view"
  },
  {
    name: "get_impl_version",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "res",
        type: "felt"
      }
    ],
    stateMutability: "view"
  },
  {
    name: "initializer",
    type: "function",
    inputs: [
      {
        name: "public_key",
        type: "felt"
      }
    ],
    outputs: []
  },
  {
    name: "upgrade",
    type: "function",
    inputs: [
      {
        name: "new_implementation",
        type: "felt"
      }
    ],
    outputs: []
  },
  {
    name: "upgrade_regenesis",
    type: "function",
    inputs: [
      {
        name: "new_implementation",
        type: "felt"
      },
      {
        name: "regenesis_account_id",
        type: "felt"
      }
    ],
    outputs: []
  },
  {
    name: "migrate_storage",
    type: "function",
    inputs: [
      {
        name: "from_version",
        type: "felt"
      }
    ],
    outputs: []
  },
  {
    name: "add_signer",
    type: "function",
    inputs: [
      {
        name: "signer",
        type: "SignerModel"
      }
    ],
    outputs: [
      {
        name: "signer_id",
        type: "felt"
      }
    ]
  },
  {
    name: "swap_signers",
    type: "function",
    inputs: [
      {
        name: "remove_index",
        type: "felt"
      },
      {
        name: "added_signer",
        type: "SignerModel"
      }
    ],
    outputs: [
      {
        name: "signer_id",
        type: "felt"
      }
    ]
  },
  {
    name: "setPublicKey",
    type: "function",
    inputs: [
      {
        name: "newPublicKey",
        type: "felt"
      }
    ],
    outputs: []
  },
  {
    name: "remove_signer",
    type: "function",
    inputs: [
      {
        name: "index",
        type: "felt"
      }
    ],
    outputs: []
  },
  {
    name: "remove_signer_with_etd",
    type: "function",
    inputs: [
      {
        name: "index",
        type: "felt"
      }
    ],
    outputs: []
  },
  {
    name: "cancel_deferred_remove_signer_req",
    type: "function",
    inputs: [
      {
        name: "removed_signer_id",
        type: "felt"
      }
    ],
    outputs: []
  },
  {
    name: "getPublicKey",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "publicKey",
        type: "felt"
      }
    ],
    stateMutability: "view"
  },
  {
    name: "get_public_key",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "res",
        type: "felt"
      }
    ],
    stateMutability: "view"
  },
  {
    name: "get_signers",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "signers_len",
        type: "felt"
      },
      {
        name: "signers",
        type: "IndexedSignerModel*"
      }
    ],
    stateMutability: "view"
  },
  {
    name: "get_signer",
    type: "function",
    inputs: [
      {
        name: "index",
        type: "felt"
      }
    ],
    outputs: [
      {
        name: "signer",
        type: "SignerModel"
      }
    ],
    stateMutability: "view"
  },
  {
    name: "get_deferred_remove_signer_req",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "deferred_request",
        type: "DeferredRemoveSignerRequest"
      }
    ],
    stateMutability: "view"
  },
  {
    name: "get_execution_time_delay",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "etd_sec",
        type: "felt"
      }
    ],
    stateMutability: "view"
  },
  {
    name: "is_valid_signature",
    type: "function",
    inputs: [
      {
        name: "hash",
        type: "felt"
      },
      {
        name: "signature_len",
        type: "felt"
      },
      {
        name: "signature",
        type: "felt*"
      }
    ],
    outputs: [
      {
        name: "is_valid",
        type: "felt"
      }
    ],
    stateMutability: "view"
  },
  {
    name: "isValidSignature",
    type: "function",
    inputs: [
      {
        name: "hash",
        type: "felt"
      },
      {
        name: "signature_len",
        type: "felt"
      },
      {
        name: "signature",
        type: "felt*"
      }
    ],
    outputs: [
      {
        name: "isValid",
        type: "felt"
      }
    ],
    stateMutability: "view"
  },
  {
    name: "get_multisig",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "multisig_num_signers",
        type: "felt"
      }
    ],
    stateMutability: "view"
  },
  {
    name: "set_multisig",
    type: "function",
    inputs: [
      {
        name: "num_signers",
        type: "felt"
      }
    ],
    outputs: []
  },
  {
    name: "get_pending_multisig_transaction",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "pending_multisig_transaction",
        type: "PendingMultisigTransaction"
      }
    ],
    stateMutability: "view"
  },
  {
    name: "sign_pending_multisig_transaction",
    type: "function",
    inputs: [
      {
        name: "pending_calldata_len",
        type: "felt"
      },
      {
        name: "pending_calldata",
        type: "felt*"
      },
      {
        name: "pending_nonce",
        type: "felt"
      },
      {
        name: "pending_max_fee",
        type: "felt"
      },
      {
        name: "pending_transaction_version",
        type: "felt"
      }
    ],
    outputs: [
      {
        name: "response_len",
        type: "felt"
      },
      {
        name: "response",
        type: "felt*"
      }
    ]
  },
  {
    name: "disable_multisig",
    type: "function",
    inputs: [],
    outputs: []
  },
  {
    name: "disable_multisig_with_etd",
    type: "function",
    inputs: [],
    outputs: []
  },
  {
    name: "get_deferred_disable_multisig_req",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "deferred_request",
        type: "DeferredMultisigDisableRequest"
      }
    ],
    stateMutability: "view"
  },
  {
    name: "cancel_deferred_disable_multisig_req",
    type: "function",
    inputs: [],
    outputs: []
  },
  {
    name: "__validate__",
    type: "function",
    inputs: [
      {
        name: "call_array_len",
        type: "felt"
      },
      {
        name: "call_array",
        type: "AccountCallArray*"
      },
      {
        name: "calldata_len",
        type: "felt"
      },
      {
        name: "calldata",
        type: "felt*"
      }
    ],
    outputs: []
  },
  {
    name: "__validate_deploy__",
    type: "function",
    inputs: [
      {
        name: "class_hash",
        type: "felt"
      },
      {
        name: "contract_address_salt",
        type: "felt"
      },
      {
        name: "implementation_address",
        type: "felt"
      },
      {
        name: "initializer_selector",
        type: "felt"
      },
      {
        name: "calldata_len",
        type: "felt"
      },
      {
        name: "calldata",
        type: "felt*"
      }
    ],
    outputs: []
  },
  {
    name: "__validate_declare__",
    type: "function",
    inputs: [
      {
        name: "class_hash",
        type: "felt"
      }
    ],
    outputs: []
  },
  {
    name: "__execute__",
    type: "function",
    inputs: [
      {
        name: "call_array_len",
        type: "felt"
      },
      {
        name: "call_array",
        type: "AccountCallArray*"
      },
      {
        name: "calldata_len",
        type: "felt"
      },
      {
        name: "calldata",
        type: "felt*"
      }
    ],
    outputs: [
      {
        name: "response_len",
        type: "felt"
      },
      {
        name: "response",
        type: "felt*"
      }
    ]
  }
];
