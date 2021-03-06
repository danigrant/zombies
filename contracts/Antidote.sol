pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Full.sol";
import "openzeppelin-solidity/contracts/token/ERC721/ERC721Pausable.sol";
import "openzeppelin-solidity/contracts/access/roles/MinterRole.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Libraries/Strings.sol";
import "./IGlarb.sol";
import "./ProxyRegistry.sol";

contract Antidote is ERC721Full, ERC721Pausable, MinterRole, Ownable {

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

  address public glarbAddress;

  function setGlarbAddress(address glarb) external onlyOwner {
    glarbAddress = glarb;
  }

  // mint
  function mint(address to) external onlyMinter {
    _mintHelper(to);
  }

  function _updateGlarbsWithAntidote(address addr) internal {
    IGlarb glarb = IGlarb(glarbAddress);
    glarb.handleAntidote(msg.sender, addr);
  }

  function _mintHelper(address to) internal {
    uint256 tokenId = _getNextTokenId();
    _mint(to, tokenId);
    _updateGlarbsWithAntidote(to);
  }

  function transferFrom(address from, address to, uint256 tokenId) public {
    //solhint-disable-next-line max-line-length
    require(_isApprovedOrOwner(msg.sender, tokenId), "ERC721: transfer caller is not owner nor approved");

    _transferFrom(from, to, tokenId);
    _updateGlarbsWithAntidote(to);
  }

  uint public antidotePrice = 50000000000000000;

  // We only let you buy antidote right now
  function purchase() external payable whenNotPaused {
    require(msg.value == antidotePrice, "Invalid payment for option");
    _mintHelper(msg.sender);
  }

  // We only let you buy antidote right now
  function purchaseFor(address to) external payable whenNotPaused {
    require(msg.value == antidotePrice, "Invalid payment for option");
    _mintHelper(to);
  }

  function _getNextTokenId() internal view returns (uint256) {
    // FUNCTIONS RELY ON THIS LOGIC, DO NOT CHANGE FOR A COUNTER!!!
    return totalSupply().add(1);
  }

  // OpenSea & Metadata
  function tokenURI(uint256 _tokenId) external view returns (string memory) {
    return Strings.strConcat("https://tokenofinfection.com/metadata/antidote/", Strings.uint2str(_tokenId));
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
