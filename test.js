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
