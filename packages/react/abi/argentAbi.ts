export const argentAbi = [
  {
    name: "core::starknet::account::Call",
    type: "struct",
    members: [
      {
        name: "to",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "selector",
        type: "core::felt252"
      },
      {
        name: "calldata",
        type: "core::array::Array::<core::felt252>"
      }
    ]
  },
  {
    name: "__validate__",
    type: "function",
    inputs: [
      {
        name: "calls",
        type: "core::array::Array::<core::starknet::account::Call>"
      }
    ],
    outputs: [
      {
        type: "core::felt252"
      }
    ],
    state_mutability: "external"
  },
  {
    name: "core::array::Span::<core::felt252>",
    type: "struct",
    members: [
      {
        name: "snapshot",
        type: "@core::array::Array::<core::felt252>"
      }
    ]
  },
  {
    name: "__execute__",
    type: "function",
    inputs: [
      {
        name: "calls",
        type: "core::array::Array::<core::starknet::account::Call>"
      }
    ],
    outputs: [
      {
        type: "core::array::Array::<core::array::Span::<core::felt252>>"
      }
    ],
    state_mutability: "external"
  },
  {
    name: "is_valid_signature",
    type: "function",
    inputs: [
      {
        name: "hash",
        type: "core::felt252"
      },
      {
        name: "signature",
        type: "core::array::Array::<core::felt252>"
      }
    ],
    outputs: [
      {
        type: "core::felt252"
      }
    ],
    state_mutability: "view"
  },
  {
    name: "ExecuteFromOutsideImpl",
    type: "impl",
    interface_name: "lib::outside_execution::IOutsideExecution"
  },
  {
    name: "lib::outside_execution::OutsideExecution",
    type: "struct",
    members: [
      {
        name: "caller",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "nonce",
        type: "core::felt252"
      },
      {
        name: "execute_after",
        type: "core::integer::u64"
      },
      {
        name: "execute_before",
        type: "core::integer::u64"
      },
      {
        name: "calls",
        type: "core::array::Span::<core::starknet::account::Call>"
      }
    ]
  },
  {
    name: "core::bool",
    type: "enum",
    variants: [
      {
        name: "False",
        type: "()"
      },
      {
        name: "True",
        type: "()"
      }
    ]
  },
  {
    name: "lib::outside_execution::IOutsideExecution",
    type: "interface",
    items: [
      {
        name: "execute_from_outside",
        type: "function",
        inputs: [
          {
            name: "outside_execution",
            type: "lib::outside_execution::OutsideExecution"
          },
          {
            name: "signature",
            type: "core::array::Array::<core::felt252>"
          }
        ],
        outputs: [
          {
            type: "core::array::Array::<core::array::Span::<core::felt252>>"
          }
        ],
        state_mutability: "external"
      },
      {
        name: "is_valid_outside_execution_nonce",
        type: "function",
        inputs: [
          {
            name: "nonce",
            type: "core::felt252"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "get_outside_execution_message_hash",
        type: "function",
        inputs: [
          {
            name: "outside_execution",
            type: "lib::outside_execution::OutsideExecution"
          }
        ],
        outputs: [
          {
            type: "core::felt252"
          }
        ],
        state_mutability: "view"
      }
    ]
  },
  {
    name: "UpgradeableImpl",
    type: "impl",
    interface_name: "lib::upgrade::IUpgradeable"
  },
  {
    name: "lib::upgrade::IUpgradeable",
    type: "interface",
    items: [
      {
        name: "upgrade",
        type: "function",
        inputs: [
          {
            name: "new_implementation",
            type: "core::starknet::class_hash::ClassHash"
          },
          {
            name: "calldata",
            type: "core::array::Array::<core::felt252>"
          }
        ],
        outputs: [
          {
            type: "core::array::Array::<core::felt252>"
          }
        ],
        state_mutability: "external"
      },
      {
        name: "execute_after_upgrade",
        type: "function",
        inputs: [
          {
            name: "data",
            type: "core::array::Array::<core::felt252>"
          }
        ],
        outputs: [
          {
            type: "core::array::Array::<core::felt252>"
          }
        ],
        state_mutability: "external"
      }
    ]
  },
  {
    name: "ArgentAccountImpl",
    type: "impl",
    interface_name: "account::interface::IArgentAccount"
  },
  {
    name: "account::escape::Escape",
    type: "struct",
    members: [
      {
        name: "ready_at",
        type: "core::integer::u64"
      },
      {
        name: "escape_type",
        type: "core::felt252"
      },
      {
        name: "new_signer",
        type: "core::felt252"
      }
    ]
  },
  {
    name: "lib::version::Version",
    type: "struct",
    members: [
      {
        name: "major",
        type: "core::integer::u8"
      },
      {
        name: "minor",
        type: "core::integer::u8"
      },
      {
        name: "patch",
        type: "core::integer::u8"
      }
    ]
  },
  {
    name: "account::escape::EscapeStatus",
    type: "enum",
    variants: [
      {
        name: "None",
        type: "()"
      },
      {
        name: "NotReady",
        type: "()"
      },
      {
        name: "Ready",
        type: "()"
      },
      {
        name: "Expired",
        type: "()"
      }
    ]
  },
  {
    name: "account::interface::IArgentAccount",
    type: "interface",
    items: [
      {
        name: "__validate_declare__",
        type: "function",
        inputs: [
          {
            name: "class_hash",
            type: "core::felt252"
          }
        ],
        outputs: [
          {
            type: "core::felt252"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "__validate_deploy__",
        type: "function",
        inputs: [
          {
            name: "class_hash",
            type: "core::felt252"
          },
          {
            name: "contract_address_salt",
            type: "core::felt252"
          },
          {
            name: "owner",
            type: "core::felt252"
          },
          {
            name: "guardian",
            type: "core::felt252"
          }
        ],
        outputs: [
          {
            type: "core::felt252"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "change_owner",
        type: "function",
        inputs: [
          {
            name: "new_owner",
            type: "core::felt252"
          },
          {
            name: "signature_r",
            type: "core::felt252"
          },
          {
            name: "signature_s",
            type: "core::felt252"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "change_guardian",
        type: "function",
        inputs: [
          {
            name: "new_guardian",
            type: "core::felt252"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "change_guardian_backup",
        type: "function",
        inputs: [
          {
            name: "new_guardian_backup",
            type: "core::felt252"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "trigger_escape_owner",
        type: "function",
        inputs: [
          {
            name: "new_owner",
            type: "core::felt252"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "trigger_escape_guardian",
        type: "function",
        inputs: [
          {
            name: "new_guardian",
            type: "core::felt252"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "escape_owner",
        type: "function",
        inputs: [],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "escape_guardian",
        type: "function",
        inputs: [],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "cancel_escape",
        type: "function",
        inputs: [],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "get_owner",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::felt252"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "get_guardian",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::felt252"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "get_guardian_backup",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::felt252"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "get_escape",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "account::escape::Escape"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "get_version",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "lib::version::Version"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "get_name",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::felt252"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "get_guardian_escape_attempts",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u32"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "get_owner_escape_attempts",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u32"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "get_escape_and_status",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "(account::escape::Escape, account::escape::EscapeStatus)"
          }
        ],
        state_mutability: "view"
      }
    ]
  },
  {
    name: "Erc165Impl",
    type: "impl",
    interface_name: "lib::erc165::IErc165"
  },
  {
    name: "lib::erc165::IErc165",
    type: "interface",
    items: [
      {
        name: "supports_interface",
        type: "function",
        inputs: [
          {
            name: "interface_id",
            type: "core::felt252"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "view"
      }
    ]
  },
  {
    name: "OldArgentAccountImpl",
    type: "impl",
    interface_name: "account::interface::IDeprecatedArgentAccount"
  },
  {
    name: "account::interface::IDeprecatedArgentAccount",
    type: "interface",
    items: [
      {
        name: "getVersion",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::felt252"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "getName",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::felt252"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "supportsInterface",
        type: "function",
        inputs: [
          {
            name: "interface_id",
            type: "core::felt252"
          }
        ],
        outputs: [
          {
            type: "core::felt252"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "isValidSignature",
        type: "function",
        inputs: [
          {
            name: "hash",
            type: "core::felt252"
          },
          {
            name: "signatures",
            type: "core::array::Array::<core::felt252>"
          }
        ],
        outputs: [
          {
            type: "core::felt252"
          }
        ],
        state_mutability: "view"
      }
    ]
  },
  {
    name: "constructor",
    type: "constructor",
    inputs: [
      {
        name: "owner",
        type: "core::felt252"
      },
      {
        name: "guardian",
        type: "core::felt252"
      }
    ]
  },
  {
    kind: "struct",
    name: "account::argent_account::ArgentAccount::AccountCreated",
    type: "event",
    members: [
      {
        kind: "key",
        name: "owner",
        type: "core::felt252"
      },
      {
        kind: "data",
        name: "guardian",
        type: "core::felt252"
      }
    ]
  },
  {
    name: "core::array::Span::<core::array::Span::<core::felt252>>",
    type: "struct",
    members: [
      {
        name: "snapshot",
        type: "@core::array::Array::<core::array::Span::<core::felt252>>"
      }
    ]
  },
  {
    kind: "struct",
    name: "account::argent_account::ArgentAccount::TransactionExecuted",
    type: "event",
    members: [
      {
        kind: "key",
        name: "hash",
        type: "core::felt252"
      },
      {
        kind: "data",
        name: "response",
        type: "core::array::Span::<core::array::Span::<core::felt252>>"
      }
    ]
  },
  {
    kind: "struct",
    name: "account::argent_account::ArgentAccount::EscapeOwnerTriggered",
    type: "event",
    members: [
      {
        kind: "data",
        name: "ready_at",
        type: "core::integer::u64"
      },
      {
        kind: "data",
        name: "new_owner",
        type: "core::felt252"
      }
    ]
  },
  {
    kind: "struct",
    name: "account::argent_account::ArgentAccount::EscapeGuardianTriggered",
    type: "event",
    members: [
      {
        kind: "data",
        name: "ready_at",
        type: "core::integer::u64"
      },
      {
        kind: "data",
        name: "new_guardian",
        type: "core::felt252"
      }
    ]
  },
  {
    kind: "struct",
    name: "account::argent_account::ArgentAccount::OwnerEscaped",
    type: "event",
    members: [
      {
        kind: "data",
        name: "new_owner",
        type: "core::felt252"
      }
    ]
  },
  {
    kind: "struct",
    name: "account::argent_account::ArgentAccount::GuardianEscaped",
    type: "event",
    members: [
      {
        kind: "data",
        name: "new_guardian",
        type: "core::felt252"
      }
    ]
  },
  {
    kind: "struct",
    name: "account::argent_account::ArgentAccount::EscapeCanceled",
    type: "event",
    members: []
  },
  {
    kind: "struct",
    name: "account::argent_account::ArgentAccount::OwnerChanged",
    type: "event",
    members: [
      {
        kind: "data",
        name: "new_owner",
        type: "core::felt252"
      }
    ]
  },
  {
    kind: "struct",
    name: "account::argent_account::ArgentAccount::GuardianChanged",
    type: "event",
    members: [
      {
        kind: "data",
        name: "new_guardian",
        type: "core::felt252"
      }
    ]
  },
  {
    kind: "struct",
    name: "account::argent_account::ArgentAccount::GuardianBackupChanged",
    type: "event",
    members: [
      {
        kind: "data",
        name: "new_guardian_backup",
        type: "core::felt252"
      }
    ]
  },
  {
    kind: "struct",
    name: "account::argent_account::ArgentAccount::AccountUpgraded",
    type: "event",
    members: [
      {
        kind: "data",
        name: "new_implementation",
        type: "core::starknet::class_hash::ClassHash"
      }
    ]
  },
  {
    kind: "struct",
    name: "account::argent_account::ArgentAccount::OwnerAdded",
    type: "event",
    members: [
      {
        kind: "key",
        name: "new_owner_guid",
        type: "core::felt252"
      }
    ]
  },
  {
    kind: "struct",
    name: "account::argent_account::ArgentAccount::OwnerRemoved",
    type: "event",
    members: [
      {
        kind: "key",
        name: "removed_owner_guid",
        type: "core::felt252"
      }
    ]
  },
  {
    kind: "enum",
    name: "account::argent_account::ArgentAccount::Event",
    type: "event",
    variants: [
      {
        kind: "nested",
        name: "AccountCreated",
        type: "account::argent_account::ArgentAccount::AccountCreated"
      },
      {
        kind: "nested",
        name: "TransactionExecuted",
        type: "account::argent_account::ArgentAccount::TransactionExecuted"
      },
      {
        kind: "nested",
        name: "EscapeOwnerTriggered",
        type: "account::argent_account::ArgentAccount::EscapeOwnerTriggered"
      },
      {
        kind: "nested",
        name: "EscapeGuardianTriggered",
        type: "account::argent_account::ArgentAccount::EscapeGuardianTriggered"
      },
      {
        kind: "nested",
        name: "OwnerEscaped",
        type: "account::argent_account::ArgentAccount::OwnerEscaped"
      },
      {
        kind: "nested",
        name: "GuardianEscaped",
        type: "account::argent_account::ArgentAccount::GuardianEscaped"
      },
      {
        kind: "nested",
        name: "EscapeCanceled",
        type: "account::argent_account::ArgentAccount::EscapeCanceled"
      },
      {
        kind: "nested",
        name: "OwnerChanged",
        type: "account::argent_account::ArgentAccount::OwnerChanged"
      },
      {
        kind: "nested",
        name: "GuardianChanged",
        type: "account::argent_account::ArgentAccount::GuardianChanged"
      },
      {
        kind: "nested",
        name: "GuardianBackupChanged",
        type: "account::argent_account::ArgentAccount::GuardianBackupChanged"
      },
      {
        kind: "nested",
        name: "AccountUpgraded",
        type: "account::argent_account::ArgentAccount::AccountUpgraded"
      },
      {
        kind: "nested",
        name: "OwnerAdded",
        type: "account::argent_account::ArgentAccount::OwnerAdded"
      },
      {
        kind: "nested",
        name: "OwnerRemoved",
        type: "account::argent_account::ArgentAccount::OwnerRemoved"
      }
    ]
  }
];
