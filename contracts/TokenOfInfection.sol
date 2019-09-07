pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Full.sol";
import "openzeppelin-solidity/contracts/token/ERC721/ERC721Pausable.sol";
import "openzeppelin-solidity/contracts/access/roles/MinterRole.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Libraries/Strings.sol";
import "./ProxyRegistry.sol";

contract TokenOfInfection is ERC721Full, ERC721Pausable, MinterRole, Ownable {

  constructor(
    string memory tokenName,
    string memory tokenSymbol,
    address proxyRegistry
  )
  ERC721Full(tokenName, tokenSymbol)
  public
  {
    proxyRegistryAddress = proxyRegistry;
  }

  // mint
  function mint(address to) public onlyMinter {
    uint256 tokenId = _getNextTokenId();
    _mint(to, tokenId);
  }

  function _getNextTokenId() internal view returns (uint256) {
    // FUNCTIONS RELY ON THIS LOGIC, DO NOT CHANGE FOR A COUNTER!!!
    return totalSupply().add(1);
  }

  // OpenSea & Metadata
  function tokenURI(uint256 _tokenId) external view returns (string memory) {
    return Strings.strConcat("https://tokenofinfection.com/metadata/tokenofinfection/", Strings.uint2str(_tokenId));
  }

  /**
   * Override isApprovedForAll to whitelist user's OpenSea proxy accounts to enable gas-less listings.
   */
  // Used for OpenSea compatibility
  address public proxyRegistryAddress;

  function setProxyRegistryAddress(address proxyRegistry) external onlyOwner {
    proxyRegistryAddress = proxyRegistry;
  }

  function isApprovedForAll(
    address tokenOwner,
    address tokenOperator
  )
    public
    view
    returns (bool)
  {
    // Whitelist OpenSea proxy contract for easy trading.
    ProxyRegistry proxyRegistry = ProxyRegistry(proxyRegistryAddress);
    if (address(proxyRegistry.proxies(tokenOwner)) == tokenOperator) {
      return true;
    }

    return super.isApprovedForAll(tokenOwner, tokenOperator);
  }

}
