pragma solidity ^0.5.0;

// Used for OpenSea compatibility
contract OwnableDelegateProxy { }
contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}
