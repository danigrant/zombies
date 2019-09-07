/* global assert artifacts before describe contract it require web3 */
var Glarb = artifacts.require("../contracts/Glarb.sol");

const shouldFail = require('../helpers/shouldFail.js');

contract("Glarb", (accounts) => {

    var instance,
        owner = accounts[0],
        player1 = accounts[1],
        player2 = accounts[2],
        player3 = accounts[3],
        player4 = accounts[4],
        player5 = accounts[5],
        expectedTotalSupply = 5,
        expectedHumans = 3,
        expectedZombies = 1;

    before(() => Glarb.deployed().then((_instance) => {
          instance = _instance;
          console.log("Local instance contract address:", instance.address);
          return instance.mint(player1, 0, { from: owner });
        })
        .catch(console.error)
        .then(() => instance.mint(player2, 0, { from: owner }))
        .then(() => instance.mint(player3, 0, { from: owner }))
        .then(() => instance.mint(player4, 1, { from: owner }))
        .then(() => instance.mint(player3, 3, { from: owner }))
    );

    describe('Setup & Defaults', () => {
        it('Verify the owner', () => instance.isOwner({ from: owner })
          .then((_isOwner) => {
            assert.equal(_isOwner, true);
          })
          .then(() => instance.isOwner({ from: player1 }))
          .then((_isOwner) => {
            assert.equal(_isOwner, false);
          }));

        it('Disallow minting from unauthorized account', () => instance.totalSupply()
          .then((_supply) => {
            assert.equal(_supply, expectedTotalSupply);
          })
          .then(() => shouldFail.reverting(instance.mint(player5, 0, { from: player1 })))
          .then(() => instance.totalSupply())
          .then((_supply) => {
            assert.equal(_supply, expectedTotalSupply);
          }));

        it('Disallow unauthorized account from assigning a new minter', () =>
            shouldFail.reverting(instance.addMinter(player2, { from: player1 }))
          );

        it('Designate new minter, allow them to mint', () => instance.totalSupply()
          .then((_supply) => {
            assert.equal(_supply, expectedTotalSupply);
          })
          .then(() => instance.addMinter(player1, { from: owner }))
          .then(() => instance.mint(player5, 1, { from: player1 }))
          .then(() => instance.totalSupply())
          .then((_supply) => {
            // Increment expectedTotalSupply before we check
            assert.equal(_supply, ++expectedTotalSupply);
          }));

        it('Disallow sending a token to another player if you don\'t own it', () =>
            shouldFail.reverting(instance.safeTransferFrom(player1, player2, 3, { from: player1 }))
          .then(() => instance.ownerOf(3))
          .then((_owner) => {
            assert.equal(_owner, player3);
          }));

        /*
        it('Let player without minting rights buy an item', () =>
            instance.purchase(1, { from: player3, value: web3.utils.toWei('0.0255', 'ether') })
            .then(() => instance.totalSupply())
            .then((_supply) => { assert.equal(_supply, ++expectedTotalSupply) })
            .then(() => instance.ownerOf(expectedTotalSupply))
            .then((_owner) => { assert.equal(_owner, player3) })
          );
        */

        it('Verify NFT token owners', () => instance.ownerOf(1)
          .then((_owner) => {
            assert.equal(_owner, player1);
            return instance.ownerOf(2);
          })
          .then((_owner) => {
            assert.equal(_owner, player2);
            return instance.ownerOf(3);
          })
          .then((_owner) => {
            assert.equal(_owner, player3);
            return instance.ownerOf(4);
          })
          .then((_owner) => {
            assert.equal(_owner, player4);
          }));

        it('Verify NFT human and zombie types', () => instance.glarbs(1)
          .then((_glarbType) => {
            assert.equal(_glarbType, 0);
            return instance.glarbs(2);
          })
          .then((_glarbType) => {
            assert.equal(_glarbType, 0);
            return instance.glarbs(3);
          })
          .then((_glarbType) => {
            assert.equal(_glarbType, 0);
            return instance.glarbs(4);
          })
          .then((_glarbType) => {
            assert.equal(_glarbType, 1);
          }));
    });

  describe('Infections!', async() => {
    it('Send a human to another player', () => instance.safeTransferFrom(player1, player2, 1, { from: player1 })
      .then(() => instance.ownerOf(1))
      .then((_owner) => {
        assert.equal(_owner, player1);
      })
      .then(() => instance.totalSupply())
      .then((_totalSupply) => {
        expectedTotalSupply = _totalSupply;
      })
      .then(() => instance.ownerOf(expectedTotalSupply))
      .then((_owner) => {
        assert.equal(_owner, player2);
      })
      .then(() => instance.glarbs(expectedTotalSupply))
      .then((_glarbType) => {
        assert.equal(_glarbType, 0);
      })
    );

    it('Send a zombie to another player, infect', () => instance.safeTransferFrom(player4, player1, 4, { from: player4 })
      .then(() => instance.ownerOf(4))
      .then((_owner) => {
        assert.equal(_owner, player4);
      })
      .then(() => instance.totalSupply())
      .then((_totalSupply) => {
        expectedTotalSupply = _totalSupply;
      })
      .then(() => instance.ownerOf(expectedTotalSupply))
      .then((_owner) => {
        assert.equal(_owner, player1);
      })
      .then(() => instance.glarbs(expectedTotalSupply))
      .then((_glarbType) => {
        assert.equal(_glarbType, 1);
      })
      .then(() => instance.glarbs(1))
      .then((_glarbType) => {
        assert.equal(_glarbType, 1);
      })
    );

    it('Send a zombie to a wallet with antidote, cure', () => instance.safeTransferFrom(player4, player3, 4, { from: player4 })
      .then(() => instance.ownerOf(4))
      .then((_owner) => {
        assert.equal(_owner, player4);
      })
      .then(() => instance.totalSupply())
      .then((_totalSupply) => {
        expectedTotalSupply = _totalSupply;
      })
      .then(() => instance.ownerOf(expectedTotalSupply))
      .then((_owner) => {
        assert.equal(_owner, player3);
      })
      .then(() => instance.glarbs(expectedTotalSupply))
      .then((_glarbType) => {
        assert.equal(_glarbType, 0);
      })
      .then(() => instance.glarbs(4))
      .then((_glarbType) => {
        assert.equal(_glarbType, 1);
      })
    );

    it('Send antidote to a wallet with zombies, cure', () => instance.safeTransferFrom(player3, player4, 5, { from: player3 })
      .then(() => instance.ownerOf(5))
      .then((_owner) => {
        assert.equal(_owner, player4);
      })
      .then(() => instance.totalSupply())
      .then((_totalSupply) => {
        expectedTotalSupply = _totalSupply;
      })
      .then(() => instance.glarbs(expectedTotalSupply))
      .then((_glarbType) => {
        assert.equal(_glarbType, 0);
      })
      .then(() => instance.glarbs(3))
      .then((_glarbType) => {
        assert.equal(_glarbType, 0);
      })
    );

  });

  describe('Proxy registry address', async() => {
    it('should not allow non-owner to set address', async () => {
      await shouldFail.reverting(instance.setProxyRegistryAddress(
        // Useful address, not actually used for testing calls
        player3,
        { from: player2 }
      ));
    });

    it('should allow owner to set address', async () => {
      await instance.setProxyRegistryAddress(
        // Useful address, not actually used for testing calls
        player3,
        { from: owner }
      );
      assert.equal(await instance.proxyRegistryAddress(), player3);
    });
  });
});
