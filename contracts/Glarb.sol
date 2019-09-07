pragma solidity ^0.5.0

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Full.sol";
import "openzeppelin-solidity/contracts/token/ERC721/ERC721Pausable.sol";
import "openzeppelin-solidity/contracts/access/roles/MinterRole.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Libraries/Strings.sol";

contract OwnableDelegateProxy { }

contract GlarbPopulation {
  struct Glarb {
    address owner;
    string displayName;
    uint state; // 0 is a human, 1 is a zombie, 2 is a big zombie, 3 is a really big zombie, 4 is a too big zombie

    mapping (uint => address) public glarbToOwner;
    mapping (address => uint) public ownerToGlarb;

    Glarb[] public glarbs;

    // mint
    // transfer (if human, cannot, if zombie, can unless too big zombie)
    // if human with zombie in wallet, human becomes a zombie
    // merge function: if zombie gets transfered into wallet with more zombies, they become biog zombie
    // kill zombie function (turn back into humans)
    // kill score for owner

  }
}
