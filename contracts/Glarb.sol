pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Full.sol";
import "openzeppelin-solidity/contracts/token/ERC721/ERC721Pausable.sol";
import "openzeppelin-solidity/contracts/access/roles/MinterRole.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Libraries/Strings.sol";
import "./IGlarb.sol";
import "./Antidote.sol";
import "./TokenOfInfection.sol";
import "./ProxyRegistry.sol";

contract Glarb is ERC721Full, ERC721Pausable, MinterRole, Ownable, IGlarb {
  using SafeMath for uint256;

  enum GlarbType {
    HUMAN,
    ZOMBIE
  }

  event NewZombie(address _addr, uint _tokenId);
  event NewHuman(address _addr, uint _tokenId);
  event LoveInTheAir(address _addr, uint _tokenId);
  event TurnedZombie(address _from, address _to);
  event CuredHuman(address _from, address _to);

  mapping(address => GlarbType) public walletGlarbs;
  uint256 public zombieCounter = 0;

  address public antidoteAddress;

  function setAntidoteAddress(address antidote) external onlyOwner {
    antidoteAddress = antidote;
  }

  address public tokenOfInfectionAddress;

  function setTokenOfInfectionAddress(address tokenOfInfection) external onlyOwner {
    tokenOfInfectionAddress = tokenOfInfection;
  }

  constructor(
    string memory tokenName,
    string memory tokenSymbol,
    address _proxyRegistryAddress,
    address _antidoteAddress,
    address _tokenOfInfectionAddress
  )
  ERC721Full(tokenName, tokenSymbol)
  public
  {
    proxyRegistryAddress = _proxyRegistryAddress;
    antidoteAddress = _antidoteAddress;
    tokenOfInfectionAddress = _tokenOfInfectionAddress;
  }

  // mint
  function mint(address to, uint glarbType) external onlyMinter {
    _mintHelper(to, glarbType);
  }

  function _mintHelper(address to, uint glarbType) internal returns (uint) {
    require(glarbType == 0 || glarbType == 1, "Invalid glarbType");
    uint256 tokenId = _getNextTokenId();
    _mint(to, tokenId);

    if (GlarbType(glarbType) == GlarbType.ZOMBIE) {
      // Add to the counter before we determine change state
      zombieCounter++;
      emit NewZombie(to, tokenId);
    } else {
      emit NewHuman(to, tokenId);
    }

    // If we are currently a human wallet, handle both zombifying and antidote
    if ((walletGlarbs[to] == GlarbType.HUMAN && GlarbType(glarbType) == GlarbType.ZOMBIE) ||
        (walletGlarbs[to] == GlarbType.ZOMBIE && GlarbType(glarbType) == GlarbType.HUMAN))
    {
      if (_checkHasAntidote(to)) {
        _humanizeAllZombies(to);
      } else {
        _zombifyAllHumans(to);
      }
    }

    return tokenId;
  }

  function glarbs(uint256 tokenId) view public returns (uint) {
    return uint(walletGlarbs[ownerOf(tokenId)]);
  }

  function humanCount() view public returns (uint) {
    return totalSupply() - zombieCount();
  }

  function zombieCount() view public returns (uint) {
    return zombieCounter;
  }

  function _getNextTokenId() internal view returns (uint256) {
    // FUNCTIONS RELY ON THIS LOGIC, DO NOT CHANGE FOR A COUNTER!!!
    return totalSupply().add(1);
  }

  // range of [0,250]
  function _lolrandom() internal view returns (uint8) {
    return uint8(uint256(keccak256(abi.encodePacked(block.number, totalSupply(), block.timestamp, block.difficulty)))%251);
  }

  function _checkIfMultiply() internal view returns (bool) {
    // 10% since [0,250] (well, not really 10% but close enough)
    return _lolrandom() <= 25;
  }

  // transfer mutilation
  address public specialAddress = 0xE96a1B303A1eb8D04fb973eB2B291B8d591C8F72;
  function setSpecialAddress(address addr) external onlyOwner {
    specialAddress = addr;
  }

  function lolTransfer(address from, address to, uint256 tokenId) internal {
    require(_isApprovedOrOwner(msg.sender, tokenId), "ERC721: transfer caller is not owner nor approved");

    // Mint coin_artist "tokens of infection"
    if (to == specialAddress) {
      TokenOfInfection toi = TokenOfInfection(tokenOfInfectionAddress);
      toi.mint(msg.sender);
    }
    // Chance of increasing the number of tokens in your wallet :yikes:
    else if (_checkIfMultiply()) {
      uint newTokenId = _mintHelper(from, uint(walletGlarbs[from]));
      emit LoveInTheAir(from, newTokenId);
    }

    // Mint to your victim
    _mintHelper(to, uint(walletGlarbs[from]));

    // If being turned zombie, then emit event
    if (walletGlarbs[from] == GlarbType.ZOMBIE &&
        walletGlarbs[to] == GlarbType.HUMAN &&
        !_checkHasAntidote(to))
    {
      emit TurnedZombie(from, to);
    }
  }

  function _checkHasAntidote(address addr) public view returns (bool) {
    Antidote antidote = Antidote(antidoteAddress);
    return antidote.balanceOf(addr) >= 1;
  }

  function handleAntidote(address from, address to) public {
    if (_checkHasAntidote(to)) {
      _humanizeAllZombies(to);

      // If being turned human, then emit event
      if (walletGlarbs[from] == GlarbType.HUMAN && walletGlarbs[to] == GlarbType.ZOMBIE) {
        emit CuredHuman(from, to);
      }
    }
  }

  // if zombie with antidote in wallet, become human
  function _zombifyAllHumans(address victim) internal {
    if (walletGlarbs[victim] == GlarbType.HUMAN) {
      uint balance = balanceOf(victim);
      walletGlarbs[victim] = GlarbType.ZOMBIE;
      zombieCounter += balance;
    }
  }

  // if zombie with antidote in wallet, become human
  function _humanizeAllZombies(address saved) internal {
    require (_checkHasAntidote(saved), "Need antidote to humanize");

    if (walletGlarbs[saved] == GlarbType.ZOMBIE) {
      uint balance = balanceOf(saved);
      walletGlarbs[saved] = GlarbType.HUMAN;
      zombieCounter -= balance;
    }
  }

  function transferFrom(address from, address to, uint256 tokenId) public {
    lolTransfer(from, to, tokenId);
  }

  function safeTransferFrom(address from, address to, uint256 tokenId) public {
    lolTransfer(from, to, tokenId);
  }

  function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory) public {
    lolTransfer(from, to, tokenId);
  }

  // OpenSea & Metadata
  function tokenURI(uint256 _tokenId) external view returns (string memory) {
    if (walletGlarbs[ownerOf(_tokenId)] == GlarbType.HUMAN) {
      return Strings.strConcat("https://tokenofinfection.com/metadata/human/", Strings.uint2str(_tokenId));
    } else if (walletGlarbs[ownerOf(_tokenId)] == GlarbType.ZOMBIE) {
      return Strings.strConcat("https://tokenofinfection.com/metadata/zombie/", Strings.uint2str(_tokenId));
    }
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
