Distinguished Format String
===========================

This idea has been deprecated in favour of [this idea](https://github.com/ricmoo/EIPs/blob/described-data/EIPS/eip-draft_described_data.md).

----

This is a very rough outline of the inkling of an idea. Do not implement this
yet.

The overall goals:

- Human-Readable Format Strings
- Machine-Verifyable Parameters matching against a Format String
- (Possibly) allow automatic contract calls be generated from a formatted call


JSON-RPC Method
---------------

eth_signFormattedString(address, [ formatString, ... ], paramTypes, paramValues)

- A UI should display the human-readable string as well as the address (reverse ENS lookup should be performed)
- If multiple formatStrings are provided, the best matching string SHOULD be choosen,
  taking into account locale and other relevant metadata. If a coder is not locale-aware,
  it should choose the first string.
- Once user-confirmed, the hash should be computed and signed and the signature returned


eth_sendFormattedTransaction(address, [ formatString, ... ], signature, paramTypes, paramValues)

- A UI should display the human-readable string as well as the address (reverse ENS lookup should be performed)
- If multiple formatStrings are provided, the best matching string SHOULD be choosen,
  taking into account locale and other relevant metadata. If a coder is not locale-aware,
  it should choose the first string.
- The signature must match [ bytes32, ...paramTypes ]
- Once user-confirmed, the hash should be computed and sent as a transaction
- @TODO: this is still being mulled over


Parameters
----------

- target: Address (20 bytes)
- format: Array of Format Strings
- types: Array of type strings
- values: Array of values


Distinguished Pack Encoding Algorithm
-------------------------------------

- All fixed length types are tightly packed
  i.e. a uint48 is packed into 6 bytes, Big Endian
- All dynamic types are prefixed with their length as a uint256 (@TODO: Maybe uint48?) and then tightly packed
  i.e. The string "foo" is (32 + 3 bytes) long

Note: Cannot use standard ABIv2, as it contains internal pointers, so the bytes
      created can be implementation dependent


Distingushed Hashing Bytes
--------------------------

This is used to derive the bytes necessary for hashing.

function id(text) { return keccak256(toUtf8Bytes(text)); }

FormatId = keccak256(
    keccak256(
        concat(sorted(formatStrings.map(string => id(string))))
    ),
    id(
        types.join(",")
    )
)

Preamble = keccak256(
    targetAddress,
    FormatId
)

HashBytes = DistinguishPackEncoding([ bytes32, ...types ], [ Preamble, ...values])

Note: The Format can be computed at Solidity compile-time for most cases,
      including where the address may change.
      The Preamble can be computed at deployment-time for cases where even
      the target does not change.


Metadata
--------

Metadata is provided as key-value pairs, using the `\m{key=value}` format specifier
within a string. The output string MUST NOT contain the metadata.

Metadata may be critical or non-critical. A critical key MUST begin with a capital
letter after any leading underscore (_) and any coder which encounters a critical
key it does not understand MUST fail. Non-critical keys which a coder does not
understand may be silently ignored, or presented to the user another way.

Metadata may also be private or public. A private key MUST begin with an underscore (_)
and is meant for application specific formatting. Public keys are maintained as a
well-known set in this document or future expansions.

Within a given format string, the same metadata key may not be used more than once.


Metadata Keys
-------------

locale - the locale this format string represents; this may impact
         how numbers or dates are formatted in the format string or
         the choice of quote characters. A locale-aware coder SHOULD
         attempt to choose the most appropriate format string for the
         user's current locale. See ISO XXXX. (non-critical)
Version - the version of the distinguished format string to use (critical)


String Encoding
---------------

All charcters in a Distinguished Format String MUST belong to the printable
ASCII set (i.e. XXX).

To represent Unicode characters within a string, **only** the `\u{XXX}` format
specifier may be used, and the value within the braces must be itself distinguished
(i.e. no uneeded leading zeros, which implies no overlong encoded code points).

@TODO: Possible disallow certain codeunits? Use IDNA?


Substitution Sepcifiers
-----------------------

A Substitution Format Specifier is of the form `${ expression, expression, ... }`, where *expression*
is a series of functions and literals.


Escape Sequences
----------------

The `$$` escape sequence can be used to insert a `$` in the final string.

Within strings inside a Substitution Format Specifier, a `\"` can be used
to insert a `"` in the string.

@TODO: Should \u{xxx} be disallowed for printable ASCII?


Examples
--------

eth_signFormatString(
    DAI_ADDRESS,
    [
        "\\m{locale=en}Hello! I allow sending $$${ formatUnits(atIndex(1), 18) (in DAI) to ${ atIndex(2) }.",
        "\\m{locale=fr}Allo! A ${ atIndex(2) }, je permitte $$${ formatUnits(atIndex(1), 18) (en DAI)"
    ],
    [ "uint", "address" ],
    [ "0x1b9de674df070000", "0x1234" ]
)

To English Users: (to DAI contract)
    "Hello! I allow sending $1.99 (in DAI) to 0x1234."

To French Users: (to DAI contract)
    "Bonjour! A 0x1234, je permitte $1,99 (en DAI)."


eth_signFormatString(
    WISP_ADDRESS,
    [
        "Please co-sign a call to ${ sighash("transfer(address to, uint256 amount)") } to ${ atIndex(2) } with ${ atIndex(3) } WETH."
    ],
    [ , "address", "uint256" ],
    [ , 0x1234, 1 ]
)


**Notes:**

- Must validate all inputs match their types
- Not all parameters specified need to be *shown* in the format string,
  which allows ancillary parameters (like a nonce) to be included or
  additional verification
- A UI should use their own (either client-specific or allow user-defined)
  token curation to provide a human readable name name for a given address,
  for example "WETH contract".
- It is assumed the contract develpoers can lie; the goal is to ensure that
  a correctly functioning contract by honest developers is safe to use
- The values passed in may come from untrustworthy sources, which is why
  it is important to protect against homoglyph and confusing similar input
  as best as possible

Random Thoughts
---------------

**Why not use the hash of a string instead of length prefixed tightly packed**

This allows either the string or the hash (using various patterns) to be the
value passed in. If the hash was used, then the string could not be used as
a parameter directly.

Either can be achieved using the following patterns:

```
// If text is required in the signature
format: "Label=${ equals(atIndex(2), keccak256(atIndex(1))), atIndex(1) }, ok?"
types: string, skip:bytes32
values: text, keccak256(text)
solidity:
   performOperation(bytes32 hash, string label) {
       require(hash == keccak256(packed(address(this), formatId, uint256(label.length), label)));
       ...
   }

// If the text is not important, just verifying it is
format: "Label=${ equals(atIndex(1), id(atIndex(2))), atIndex(2) }, ok?"
types: bytes32, skip:string
values: keccak256(text), text
solidity:
   performOperation(bytes32 hash, bytes32 labelHash) {
       require(hash == keccak256(packed(address(this), formatId, labelHash)));
       ...
   }
```

