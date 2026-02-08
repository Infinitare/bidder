/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/bidder.json`.
 */
export type Bidder = {
  "address": "JtMSXSCDbJ6ZDLwMFLXLmLZWLD1VGwzxUsA57nefbdr",
  "metadata": {
    "name": "bidder",
    "version": "0.1.1",
    "spec": "0.1.0",
    "description": "Win it all"
  },
  "instructions": [
    {
      "name": "close",
      "discriminator": [
        98,
        165,
        201,
        177,
        108,
        65,
        206,
        96
      ],
      "accounts": [
        {
          "name": "signer",
          "docs": [
            "User that is resolving"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "pool",
          "docs": [
            "Current lottery pool"
          ],
          "writable": true
        },
        {
          "name": "randomnessAccountData"
        }
      ],
      "args": []
    },
    {
      "name": "entry",
      "discriminator": [
        49,
        1,
        109,
        22,
        199,
        43,
        16,
        153
      ],
      "accounts": [
        {
          "name": "signer",
          "docs": [
            "User that is making the entry"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "pool",
          "docs": [
            "Current lottery pool"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "dayId"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              }
            ]
          }
        },
        {
          "name": "pages",
          "docs": [
            "Pages for entries"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  103,
                  101,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              }
            ]
          }
        },
        {
          "name": "page",
          "docs": [
            "Current page for entries"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  103,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "pool.current_page",
                "account": "pool"
              }
            ]
          }
        },
        {
          "name": "user",
          "docs": [
            "User data"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "dayId",
          "type": "i64"
        }
      ]
    },
    {
      "name": "payout",
      "discriminator": [
        149,
        140,
        194,
        236,
        174,
        189,
        6,
        239
      ],
      "accounts": [
        {
          "name": "signer",
          "docs": [
            "User that is resolving"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "pool",
          "docs": [
            "Current lottery pool"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "pool.day_id",
                "account": "pool"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              }
            ]
          }
        },
        {
          "name": "winner",
          "docs": [
            "Current lottery pool"
          ],
          "writable": true
        },
        {
          "name": "fee",
          "docs": [
            "Fee account"
          ],
          "writable": true,
          "address": "TjgnAqExKJKAGmWKxr5sKuZE648nwvqYE8c4MQVqbdr"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "resolve",
      "discriminator": [
        246,
        150,
        236,
        206,
        108,
        63,
        58,
        10
      ],
      "accounts": [
        {
          "name": "signer",
          "docs": [
            "User that is resolving"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "pool",
          "docs": [
            "Current lottery pool"
          ],
          "writable": true
        },
        {
          "name": "page",
          "docs": [
            "Current page for entries"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  103,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "pool.winning_page",
                "account": "pool"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "select",
      "discriminator": [
        135,
        147,
        132,
        101,
        155,
        102,
        202,
        124
      ],
      "accounts": [
        {
          "name": "signer",
          "docs": [
            "User that is resolving"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "pool",
          "docs": [
            "Current lottery pool"
          ],
          "writable": true
        },
        {
          "name": "pages",
          "docs": [
            "Pages for entries"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  103,
                  101,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              }
            ]
          }
        },
        {
          "name": "randomnessAccountData"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "page",
      "discriminator": [
        133,
        127,
        192,
        87,
        206,
        149,
        195,
        14
      ]
    },
    {
      "name": "pages",
      "discriminator": [
        235,
        41,
        152,
        65,
        162,
        140,
        170,
        11
      ]
    },
    {
      "name": "pool",
      "discriminator": [
        241,
        154,
        109,
        4,
        17,
        177,
        109,
        188
      ]
    },
    {
      "name": "user",
      "discriminator": [
        159,
        117,
        95,
        227,
        239,
        151,
        58,
        236
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "overflow",
      "msg": "Arithmetic overflow occurred"
    },
    {
      "code": 6001,
      "name": "badDayId",
      "msg": "The provided day ID does not match the current day"
    },
    {
      "code": 6002,
      "name": "poolClosed",
      "msg": "The lottery pool is closed for entries"
    },
    {
      "code": 6003,
      "name": "invalidAmount",
      "msg": "The amount must be greater than zero"
    },
    {
      "code": 6004,
      "name": "pageFull",
      "msg": "The current page is already full"
    },
    {
      "code": 6005,
      "name": "wrongFeeAccount",
      "msg": "The provided fee account is incorrect"
    },
    {
      "code": 6006,
      "name": "wrongWinnerAccount",
      "msg": "The provided winner account is incorrect"
    },
    {
      "code": 6007,
      "name": "randomnessExpired",
      "msg": "The randomness has already expired"
    },
    {
      "code": 6008,
      "name": "randomnessAlreadyRevealed",
      "msg": "The randomness has already been revealed"
    },
    {
      "code": 6009,
      "name": "invalidRandomnessAccount",
      "msg": "The provided randomness account is invalid"
    },
    {
      "code": 6010,
      "name": "randomnessNotResolved",
      "msg": "The randomness has not been resolved yet"
    },
    {
      "code": 6011,
      "name": "randomnessValueError",
      "msg": "The provided randomness value is invalid"
    }
  ],
  "types": [
    {
      "name": "page",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "offsetEntries",
            "type": "u64"
          },
          {
            "name": "entries",
            "type": {
              "vec": {
                "defined": {
                  "name": "pageEntry"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "pageEntry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "pages",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "entries",
            "type": {
              "vec": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "pool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "totalEntries",
            "type": "u64"
          },
          {
            "name": "currentPage",
            "type": "u64"
          },
          {
            "name": "dayId",
            "type": "i64"
          },
          {
            "name": "closeSlot",
            "type": "u64"
          },
          {
            "name": "randomnessAccount",
            "type": "pubkey"
          },
          {
            "name": "winningEntry",
            "type": "u64"
          },
          {
            "name": "winningPage",
            "type": "u64"
          },
          {
            "name": "winner",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "user",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "entries",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
