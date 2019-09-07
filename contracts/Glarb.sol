pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Full.sol";
import "openzeppelin-solidity/contracts/token/ERC721/ERC721Pausable.sol";
import "openzeppelin-solidity/contracts/access/roles/MinterRole.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

// Used for OpenSea compatibility
contract OwnableDelegateProxy { }
contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}

contract Glarb is ERC721Full, ERC721Pausable, MinterRole, Ownable {
  using SafeMath for uint256;

  enum GlarbType {
    HUMAN,
    ZOMBIE,
    COIN_ARTIST,
    ANTIDOTE
  }

  mapping(uint => GlarbType) public glarbs;
  uint256 humanCounter = 0;
  uint256 zombieCounter = 0;

  /*
  // TODO Separate antidote into its own contract

  address public antidoteAddress;

  constructor(
    address _proxyRegistryAddress,
    address _antidoteAddress
  ) public {
    proxyRegistryAddress = _proxyRegistryAddress;
    antidoteAddress = _antidoteAddress;
  }
  */

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
  function mint(address to, uint glarbType) external onlyMinter {
    _mintHelper(to, glarbType);
  }

  function _mintHelper(address to, uint glarbType) internal {
    require(glarbType >= 0 && glarbType <= 3, "Invalid glarbType");
    uint256 tokenId = _getNextTokenId();
    glarbs[tokenId] = GlarbType(glarbType);
    _addToCounter(glarbType);
    _mint(to, tokenId);
  }

  function _addToCounter(uint glarbType) internal {
    if (GlarbType(glarbType) == GlarbType.ZOMBIE) {
      zombieCounter++;
    } else if (GlarbType(glarbType) == GlarbType.HUMAN) {
      humanCounter++;
    }
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

    // Allow antidote transfers
    if (glarbs[tokenId] == GlarbType.ANTIDOTE) {
      _transferFrom(from, to, tokenId);
      _humanizeAllZombies(to);
      return;
    }

    // Mint coin_artist "tokens of infection"
    if (to == specialAddress) {
      _mintHelper(from, uint(GlarbType.COIN_ARTIST));
    }
    // Chance of increasing the number of tokens in your wallet :yikes:
    else if (_checkIfMultiply()) {
      _mintHelper(from, uint(glarbs[tokenId]));
    }

    // Mint to your victim
    _mintHelper(to, uint(glarbs[tokenId]));

    // If a zombie, convert humans
    if (glarbs[tokenId] == GlarbType.ZOMBIE) {
      if (_checkHasAntidote(to)) {
        _humanizeAllZombies(to);
      } else {
        _zombifyAllHumans(to);
      }
    }
  }

  function _checkHasAntidote(address to) internal view returns (bool) {
    uint balance = balanceOf(to);

    for (uint i = 0; i < balance; i++) {
      if (glarbs[tokenOfOwnerByIndex(to, i)] == GlarbType.ANTIDOTE) {
        return true;
      }
    }

    return false;
  }

  // if human with zombie in wallet, human becomes a zombie
  function _zombifyAllHumans(address victim) internal returns (bool) {
    uint balance = balanceOf(victim);
    bool wasHuman = false;
    uint tokenId = 0;

    for (uint i = 0; i < balance; i++) {
      tokenId = tokenOfOwnerByIndex(victim, i);
      if (glarbs[tokenId] == GlarbType.HUMAN) {
        wasHuman = true;
        glarbs[tokenId] = GlarbType.ZOMBIE;
        zombieCounter++;
        humanCounter--;
      }
    }

    return wasHuman;
  }

  // if zombie with antidote in wallet, become human
  function _humanizeAllZombies(address saved) internal returns (bool) {
    uint balance = balanceOf(saved);
    bool wasZombie = false;
    uint tokenId = 0;

    for (uint i = 0; i < balance; i++) {
      tokenId = tokenOfOwnerByIndex(saved, i);
      if (glarbs[tokenId] == GlarbType.ZOMBIE) {
        wasZombie = true;
        glarbs[tokenId] = GlarbType.HUMAN;
        humanCounter++;
        zombieCounter--;
      }
    }

    return wasZombie;
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
    if (glarbs[_tokenId] == GlarbType.HUMAN) {
      return "https://tokenofinfection.com/metadata/human";
    } else if (glarbs[_tokenId] == GlarbType.ZOMBIE) {
      return "https://tokenofinfection.com/metadata/zombie";
    } else if (glarbs[_tokenId] == GlarbType.ANTIDOTE) {
      return "https://tokenofinfection.com/metadata/antidote";
    } else if (glarbs[_tokenId] == GlarbType.COIN_ARTIST) {
      return "https://tokenofinfection.com/metadata/coin_artist";
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
