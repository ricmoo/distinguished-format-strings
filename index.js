"use strict";

const ethers = require("ethers");

const { parser } = require("./_parser");

const functions = {

    // Index Functions
    atIndex: function(node, args, metadata) {
        if (node.params.length !== 1) { throw new Error("atIndex requires INDEX"); }
        const result = evaluate(node.params[0], args, metadata);
        const index = ethers.BigNumber.from(result.value).toNumber() - 1;
        if (index < 0 || index >= args.length) { throw new Error(name + " INDEX out-of-bounds"); }

        return args[index];
    },

    // Comparison
    equals: function(node, args, metadata) {
        if (node.params.length !== 2) { throw new Error("equals requires VALUE0 and VALUE1"); }
        const result0 = evaluate(node.params[0], args, metadata);
        const result1 = evaluate(node.params[1], args, metadata);
        if (result0.type !== result1.type) {
            throw new Error(`equals failed type-check: ${ result0.type } != ${ result1.type }`);
        }
        if (result0.value !== result1.value) {
            throw new Error(`equals failed: ${ JSON.stringify(result0.value) } != ${ JSON.stringify(result1.value) }`);
        }
        return {
            string: "true",
            type: "boolean",
            value: true
        }
    },

    // Co-erce Functions
    address: function(node, args, metadata) {
        if (node.params.length !== 1) { throw new Error("address requires ADDRESS"); }
        const result = evaluate(node.params[0], args, metadata);
        const address = ethers.utils.getAddress(result.value, metadata);
        return {
            string: address,
            type: "address",
            value: address
        }
    },
    bytes: function(node, args, metadata) {
        if (node.params.length !== 1) { throw new Error("address requires ADDRESS"); }
        const result = evaluate(node.params[0], args, metadata);

        if (result.type === "bytes") {
            return result;
        }

        if (result.type === "address") {
            result.type = "bytes";
            return result;
        }

        if (result.type.match(/^bytes[1-9]+$/) && parseInt(result.type.substring(5)) <= 32) {
            result.type = "bytes";
            return result;
        }

        if (result.type === "string") {
            const hex = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(result.value));
            return {
                string: hex,
                type: "bytes",
                value: hex
            };
        }

        throw new Error("not implmented");
    },
/*
    string: function(node, argTypes, args) {
        if (node.params.length !== 1) { throw new Error("string requires VALUE"); }
        const result = evaluate(node.params[0], argTypes, args);
        result.value = result.string;
        result.type = "string";
        return result;
        if (result.type === "string") {
            return result;
        }

        if (result.type === "bytes") {
            const text = ethers.utils.toUtf8String(result.value);
            return {
                string: text,
                type: "string",
                value: text
            };
        }

        if (result.type.match(/^u?int/)) {
            const text = result.value.toString();
            return {
                string: text,
                type: "string",
                value: text
            };
        }

        throw new Error("not implemented");
    },
*/
/*
    length (string, bytes and bytesXX only)
*/

    // Formatting
    formatUnits: function(node, args, metadata) {
        if (node.params.length !== 2) { throw new Error("formatUnits requires VALUE and DECIMALS"); }
        const value = evaluate(node.params[0], args, metadata);
        const decimals = evaluate(node.params[1], args, metadata);

        let string = ethers.utils.formatUnits(value.value, decimals.value.toNumber());
        if (metadata.locale === "fr") {
            string = string.replace(".", ",");
        }

        return {
            string: string,
            type: value.type,
            value: value.value
        };
    },
    quote: function(node, args, metadata) {
        if (node.params.length !== 1) { throw new Error("quote requires VALUE"); }
        const result = evaluate(node.params[0], args, metadata);
        result.string = JSON.stringify(result.string);
        return result;
    },

    // Hashinh and Verification
    id: function(node, args, metadata) {
        if (node.params.length !== 1) { throw new Error("id requires DATA"); }
        const result = evaluate(node.params[0], args, metadata);
        if (result.type !== "string") { throw new Error("id requires STRING for DATA"); }
        const value = ethers.utils.id(result.value);
        return {
            string: value,
            type: "bytes32",
            value: value
        };
    },
    keccak256: function(node, args, metadata) {
        if (node.params.length !== 1) { throw new Error("keccak256 requires DATA"); }
        const result = evaluate(node.params[0], args, metadata);
        if (result.type !== "bytes") { throw new Error("keccak256 requires BYTES for DATA"); }
        const value = ethers.utils.keccak256(result.value);
        return {
            string: value,
            type: "bytes32",
            value: value
        };
    },
    namehash: function(node, args, metadata) {
        if (node.params.length !== 1) { throw new Error("namehash requires NAME"); }
        const result = evaluate(node.params[0], args, metadata);
        if (result.type !== "string") { throw new Error("namehash requires STRING for NAME"); }
        return {
            string: result.value,
            type: "bytes32",
            value: ethers.utils.namehash(result.value)
        };
    },
    sighash: function(node, args, metadata) {
        if (node.params.length !== 1) { throw new Error("topichash requires SIGNATURE"); }
        const result = evaluate(node.params[0], args, metadata);
        if (result.type !== "string") { throw new Error("topichash requires STRING for SIGNATURE"); }
        const fragment = ethers.utils.FunctionFragment.from(result.value);
        return {
            string: result.value,
            type: "bytes4",
            value: ethers.utils.id(fragment.format("sighash")).substring(0, 10)
        };
    },
    topichash: function(node, args, metadata) {
        if (node.params.length !== 1) { throw new Error("topichash requires SIGNATURE"); }
        const result = evaluate(node.params[0], args, metadata);
        if (result.type !== "string") { throw new Error("topichash requires STRING for SIGNATURE"); }
        const fragment = ethers.utils.EventFragment.from(result.value);
        return {
            string: result.value,
            type: "bytes32",
            value: ethers.utils.id(fragment.format("sighash"))
        };
    },
    sha256: function(node, args, metadata) {
        if (node.params.length !== 1) { throw new Error("sha256 requires DATA"); }
        const result = evaluate(node.params[0], args, metadata);
        if (result.type !== "bytes") { throw new Error("sha256 requires BYTES for DATA"); }
        const value = ethers.utils.sha256(result.value);
        return {
            string: value,
            type: "bytes32",
            value: value
        };
    },
};

function createCoerceNumber(name, signed, width) {
    return function(node, args, metadata) {
        if (node.params.length !== 1) { throw new Error(name + " requires VALUE"); }
        const result = evaluate(node.params[0], args, metadata);

        if (result.type.match(/^u?int/)) {
            result.type = name;
            return result;
        }

        throw new Error("not implemented");
    }
}

for (let i = 8; i <= 256; i += 8) {
    const name = "int" + String(i);
    functions[name] = createCoerceNumber(name, true, i);
    functions["u" + name] = createCoerceNumber("u" + name, false, i);
}
functions["int"] = functions["int256"];
functions["uint"] = functions["uint256"];

function createCoerceBytes(name, length) {
    return function(node, args, metadata) {
        if (node.params.length !== 1) { throw new Error(name + " requires VALUE"); }
        const result = evaluate(node.params[0], args, metadata);

        if (result.type === "bytes") {
            if (ethers.utils.hexDataLength(result.value) !== length) {
                throw new Error("byte length mismatch");
            }
            result.type = name;
            return result;
        }

        throw new Error("not implemented");
    }
}

for (let i = 1; i <= 32; i++) {
    const name = "bytes" + i;
    functions[name] = createCoerceBytes(name, i);
}

// @TODO: Programatically add uintXX, intXX and bytesXX to coerce functions

// Evaluate an AST node
function evaluate(node, args, metadata) {
    switch (node.type) {
        case "boolean":
            return {
                string: ((node.value === "true") ? "true": "false"),
                type: "boolean",
                value: (node.value === "true")
            };
        case "bytes":
            return {
                string: node.value,
                type: "bytes",
                value: node.value
            };
        case "number":
            return {
                string: String(node.value),
                type: "int256",
                value: ethers.BigNumber.from(node.value)
            };
        case "string":
            return {
                string: node.value,
                type: "string",
                value: node.value
            };
        case "function": {
            const func = functions[node.name];
            if (!func) { throw new Error("unknown function: " + node.name); }
            return ethers.utils.shallowCopy(func(node, args, metadata));
        }
        case "substitution": {
            return node.value.map((node) => {
                return evaluate(node, args, metadata);
            }).pop();
        }
        default:
            throw new Error("unknown node type: " + node.type);
    }
}

function getLengthBytes(length) {
    return ethers.utils.defaultAbiCoder.encode([ "uint" ], [ length ])
}

module.exports.format = function(address, formatStrings, argTypes, args) {
    const argNodes = [ ];
    argTypes = argTypes.map((argType, index) => {
        // Get the input argument
        const arg = args[index];

        // Normalize the type
        const comps = argType.split(":");
        const type = ethers.utils.ParamType.from(comps.pop()).type;
        comps.push(type);
        argType = comps.join(":");

        if (type.match(/^u?int/)) {
            const value = ethers.BigNumber.from(arg);
            argNodes.push({
                string: value.toString(),
                type: type,
                value: value
            });
        }

        if (type === "boolean") {
            argNodes.push({
                string: ((arg === "true") ? "true": "false"),
                type: "boolean",
                value: (arg === "true")
            });
        }

        if (type === "string") {
            argNodes.push({
                string: arg,
                type: "string",
                value: arg
            });
        }

        let match = type.match(/^bytes([1-9]*)$/)
        if (match) {
            const value = ethers.utils.hexlify(arg);
            if (match[1] && ethers.utils.hexDataLength(value) !== parseInt(match[1])) {
                throw new Error("fixed byte length mismatch");
            }
            argNodes.push({
                string: value,
                type: type,
                value: value
            });
        }

        return argType;
    });

    const strings = [ ];
    formatStrings.forEach((formatString) => {
        const fragments = parser.parse(formatString);

        let string = "";

        const metadata = { };
        fragments.forEach((fragment) => {
            if (fragment.type === "text") {
                fragment.metadata.forEach((md) => {
                    const pair = md.match(/^([^=]*)=(.*)$/);
                    if (!pair) { throw new Error("invalid metadata pair"); }
                    const key = pair[1].toLowerCase();
                    if (metadata[key] != null) { throw new Error("duplicate metadata key"); }
                    metadata[key] = pair[2];
                });
            }
        });

        fragments.forEach((fragment) => {
            if (fragment.type === "text") {
                string += fragment.value;
            } else if (fragment.type === "substitution") {
                const result = evaluate(fragment, argNodes.slice(), metadata);
                string += result.string;
            } else {
                throw new Error("unknown fragment");
            }
        });

        strings.push({ string, metadata });
    });

    const formatStringIds = formatStrings.map((formatString) => ethers.utils.id(formatString));
    formatStringIds.sort();

    const formatId = ethers.utils.keccak256(ethers.utils.concat([
        ethers.utils.keccak256(ethers.utils.concat(formatStringIds)),
        ethers.utils.id(argTypes.join(","))
    ]));

    let bytes = [ address, formatId ];
    let formatArgTypes = [ "address", "bytes32" ];
    argTypes.forEach((argType, index) => {
        if (argType.split(":")[0] === "skip") { return; }
        const arg = args[index];
        switch (argType) {
            case "bytes": {
                formatArgTypes.push("uint256");
                const data = ethers.utils.arrayify(arg);
                bytes.push(getLengthBytes(data.length));
                bytes.push(data);
                break;
            }
            case "string": {
                formatArgTypes.push("uint256");
                const data = ethers.utils.toUtf8Bytes(arg)
                bytes.push(getLengthBytes(data.length));
                bytes.push(data);
                break;
            }
            default:
                bytes.push(ethers.utils.solidityPack([ argType ], [ arg ]));
                break;
        }
        formatArgTypes.push(argType);
    });

    return {
        formatId: formatId,
        formatStringIds: formatStringIds,
        strings: strings,
        argTypes: argTypes,
        formatArgTypes: formatArgTypes,
        bytes: ethers.utils.hexlify(ethers.utils.concat(bytes)),
    };
}
