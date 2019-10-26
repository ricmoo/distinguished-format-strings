contract TestToken {
    bytes32 constant FORMAT_ID = 0xe42d80bf41ec9c11a0a39c1fd6eefd7af8f53973a63d684fb96e8f7b020999ed;

    function recoverCompact(bytes32 hash, bytes32 r, bytes32 vs) public pure returns (address) {
        bytes32 s = vs & 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        uint8 v = 27 + uint8(uint256(vs) >> 255);
        return ecrecover(hash, v, r, s);
    }

    function transfer_verify(bytes32 hash, address to, uint amount) {
        bytes32 computedHash = keccak256(abi.encode(address(this), FORMAT_ID, to, amount));
        require(hash == computedHash);
        transfer(to, amount);
    }

    function transfer_meta(bytes32 r, bytes32 vs, address to, uint amount) {
        bytes32 computedHash = keccak256(abi.encode(address(this), FORMAT_ID, to, amount));
        address from = recoverCompact(computedHash, r, vs);
        transferFrom(from, to, amount);
    }
}
