"use strict";

const { ethers } = require("ethers");

const { format } = require("./index");

console.dir(
    format(

        // The contract address
        "0x1234567890123456789012345678901234567890",

        // The format strings
        [
            "\\m{locale=en}Hello! Would you like to send ${ equals(atIndex(1), namehash(atIndex(3))), quote(atIndex(3)) } $$${ formatUnits(uint64(atIndex(2)), 18) } (DAI)?",
            "\\m{locale=fr}Bonjour! Souhaitez-vous transf\\u{e9}rer ${ formatUnits(uint64(atIndex(2)), 18) }$$ (DAI) \\u{e0} ${ equals(atIndex(1), namehash(atIndex(3))), quote(atIndex(3)) }?",
        ],

        // The types of the values to be passed in
        [ "bytes32", "uint", "skip:string" ],

        // The values to use in the format strings
        [ ethers.utils.namehash("ricmoo.eth"), "0x12345678900000", "ricmoo.eth" ]

    ), { depth: null }
)
// The output:
//   { formatId:
//     '0xe42d80bf41ec9c11a0a39c1fd6eefd7af8f53973a63d684fb96e8f7b020999ed',
//    formatStringIds:
//     [ '0x66d451826846c1df870209f7abb7844fb8764120f7f67f5d64f25efdadb4f02e',
//       '0xa1221a2f1ba88d8b8b253c04b62178470e289ec05d9c6b6665f0bc3370005e11' ],
//    strings:
//     [ { string:
//          'Hello! Would you like to send "ricmoo.eth" $0.00512409557532672 (DAI)?',
//         metadata: { locale: 'en' } },
//       { string:
//          'Bonjour! Souhaitez-vous transf\u{e9}rer 0,00512409557532672$ (DAI) \u{e0} "ricmoo.eth"?'
//         metadata: { locale: 'fr' } } ],
//    argTypes: [ 'bytes32', 'uint256', 'skip:string' ],
//    formatArgTypes: [ 'address', 'bytes32', 'bytes32', 'uint256' ],
//    bytes:
//     '0x1234567890123456789012345678901234567890e42d80bf41ec9c11a0a39c1fd6eefd7af8f53973a63d684fb96e8f7b020999edbf074faa138b72c65adbdcfb329847e4f2c04bde7f7dd7fcad5a52d2f395a5580000000000000000000000000000000000000000000000000012345678900000' }
//
// A UI that is using English would show:
//    Hello! Would you like to send "ricmoo.eth" $0.00512409557532672 (DAI)?
//
// And upon signing the bytes, a contract could easily verify that (as long as
// the client correctly showed the above text and signed the bytes) that nothing
// has been tampered with an the user agreed.
