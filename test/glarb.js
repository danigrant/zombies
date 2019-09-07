/* global assert artifacts before describe contract it require web3 */
var Glarb = artifacts.require("../contracts/Glarb.sol");
var Antidote = artifacts.require("../contracts/Antidote.sol");
var TokenOfInfection = artifacts.require("../contracts/TokenOfInfection.sol");

const truffleAssert = require('truffle-assertions');
const shouldFail = require('../helpers/shouldFail.js');

contract("Token Of Infection", (accounts) => {

    var instance,
        owner = accounts[0],
        player1 = accounts[1],
        player2 = accounts[2],
        player3 = accounts[3],
        player4 = accounts[4],
        player5 = accounts[5],
        player6 = accounts[6],
        expectedHumans = 3,
        expectedZombies = 2,
        expectedTotalSupply = 5,
        expectedPlayer4Wallet = 0,
        tokenOfInfectionAddress,
        antidoteAddress,
        glarbAddress,
        tokenOfInfectionInstance,
        antidoteInstance,
        glarbInstance,
        specialAddress = "0xE96a1B303A1eb8D04fb973eB2B291B8d591C8F72";

    before(() => Glarb.deployed().then((_instance) => {
          glarbInstance = _instance;
          console.log("Local Glarb contract address:", glarbInstance.address);
          return Antidote.deployed();
        })
        .catch(console.error)
        .then((_instance) => {
          antidoteInstance = _instance;
          console.log("Local Antidote contract address:", antidoteInstance.address);
          return TokenOfInfection.deployed();
        })
        .then((_instance) => {
          tokenOfInfectionInstance = _instance;
          console.log("Local TokenOfInfection contract address:", tokenOfInfectionInstance.address);
          return antidoteInstance.setGlarbAddress(glarbInstance.address);
        })
        .then(() => glarbInstance.mint(player1, 0, { from: owner }))
        .then(() => glarbInstance.mint(player2, 0, { from: owner }))
        .then(() => glarbInstance.mint(player3, 0, { from: owner }))
        .then(() => glarbInstance.mint(player4, 1, { from: owner }))
        .then(() => glarbInstance.mint(player6, 1, { from: owner }))
        .then(() => antidoteInstance.mint(player3, { from: owner }))
    );

    describe('Setup & Defaults', () => {
        it("Verify the expectedZombies and expectedHumans", async () => {
          let localExpectedHumans = 0, localExpectedZombies = 0;
          let totalSupply = await glarbInstance.totalSupply();
          for (let i = 1; i <= totalSupply; i++) {
            let type = await glarbInstance.glarbs(i);
            if (parseInt(type, 10) == 0) {
              localExpectedHumans++;
            } else {
              localExpectedZombies++;
            }
          }
          assert.equal(expectedHumans, localExpectedHumans);
          assert.equal(expectedZombies, localExpectedZombies);
          console.log("expectedHumans", expectedHumans, "expectedZombies", expectedZombies);
        })

        it('Verify the owner', () => glarbInstance.isOwner({ from: owner })
          .then((_isOwner) => {
            assert.equal(_isOwner, true);
          })
          .then(() => glarbInstance.isOwner({ from: player1 }))
          .then((_isOwner) => {
            assert.equal(_isOwner, false);
          }));

        it('Disallow minting from unauthorized account', () => glarbInstance.totalSupply()
          .then((_supply) => {
            assert.equal(_supply, expectedTotalSupply);
          })
          .then(() => shouldFail.reverting(glarbInstance.mint(player5, 0, { from: player1 })))
          .then(() => glarbInstance.totalSupply())
          .then((_supply) => {
            assert.equal(_supply, expectedTotalSupply);
          }));

        it('Disallow unauthorized account from assigning a new minter', () =>
            shouldFail.reverting(glarbInstance.addMinter(player2, { from: player1 }))
          );

        it('Designate new minter, allow them to mint', () => glarbInstance.totalSupply()
          .then((_supply) => {
            assert.equal(_supply, expectedTotalSupply);
          })
          .then(() => glarbInstance.addMinter(player1, { from: owner }))
          .then(() => glarbInstance.mint(player5, 1, { from: player1 }))
          .then(() => glarbInstance.totalSupply())
          .then((_supply) => {
            expectedTotalSupply = _supply;
            expectedZombies+=1;
          }));

        it("Verify the expectedZombies and expectedHumans", async () => {
          let localExpectedHumans = 0, localExpectedZombies = 0;
          let totalSupply = await glarbInstance.totalSupply();
          for (let i = 1; i <= totalSupply; i++) {
            let type = await glarbInstance.glarbs(i);
            if (parseInt(type, 10) == 0) {
              localExpectedHumans++;
            } else {
              localExpectedZombies++;
            }
          }
          assert.equal(expectedHumans, localExpectedHumans);
          assert.equal(expectedZombies, localExpectedZombies);
          console.log("expectedHumans", expectedHumans, "expectedZombies", expectedZombies);
        })

        it('Disallow sending a token to another player if you don\'t own it', () =>
            shouldFail.reverting(glarbInstance.safeTransferFrom(player1, player2, 3, { from: player1 }))
          .then(() => glarbInstance.ownerOf(3))
          .then((_owner) => {
            assert.equal(_owner, player3);
          }));

        it('Verify NFT token owners', () => glarbInstance.ownerOf(1)
          .then((_owner) => {
            assert.equal(_owner, player1);
            return glarbInstance.ownerOf(2);
          })
          .then((_owner) => {
            assert.equal(_owner, player2);
            return glarbInstance.ownerOf(3);
          })
          .then((_owner) => {
            assert.equal(_owner, player3);
            return glarbInstance.ownerOf(4);
          })
          .then((_owner) => {
            assert.equal(_owner, player4);
          }));

        it('Verify NFT human and zombie types', () => glarbInstance.glarbs(1)
          .then((_glarbType) => {
            assert.equal(_glarbType, 0);
            return glarbInstance.glarbs(2);
          })
          .then((_glarbType) => {
            assert.equal(_glarbType, 0);
            return glarbInstance.glarbs(3);
          })
          .then((_glarbType) => {
            assert.equal(_glarbType, 0);
            return glarbInstance.glarbs(4);
          })
          .then((_glarbType) => {
            assert.equal(_glarbType, 1);
          }));
    });

  describe('Infections!', async() => {
    it('Send a human to another player', () => glarbInstance.safeTransferFrom(player1, player2, 1, { from: player1 })
      .then((tx) => {
        try {truffleAssert.eventEmitted(tx, 'LoveInTheAir', function(ev){expectedZombies+=1;});} catch (ex) {}
        expectedHumans+=1;
        return glarbInstance.ownerOf(1)
      })
      .then((_owner) => {
        assert.equal(_owner, player1);
      })
      .then(() => glarbInstance.totalSupply())
      .then((_totalSupply) => {
        expectedTotalSupply = _totalSupply;
      })
      .then(() => glarbInstance.ownerOf(expectedTotalSupply))
      .then((_owner) => {
        assert.equal(_owner, player2);
      })
      .then(() => glarbInstance.glarbs(expectedTotalSupply))
      .then((_glarbType) => {
        assert.equal(_glarbType, 0);
      })
    );

    it("Verify the expectedZombies and expectedHumans", async () => {
      let localExpectedHumans = 0, localExpectedZombies = 0;
      let totalSupply = await glarbInstance.totalSupply();
      for (let i = 1; i <= totalSupply; i++) {
        let type = await glarbInstance.glarbs(i);
        if (parseInt(type, 10) == 0) {
          localExpectedHumans++;
        } else {
          localExpectedZombies++;
        }
      }
      assert.equal(expectedHumans, localExpectedHumans);
      assert.equal(expectedZombies, localExpectedZombies);
      console.log("expectedHumans", expectedHumans, "expectedZombies", expectedZombies);
    })

    it('Send a zombie to another player, infect', () => glarbInstance.safeTransferFrom(player4, player1, 4, { from: player4 })
      .then((tx) => {
        try {truffleAssert.eventEmitted(tx, 'LoveInTheAir', function(ev){expectedZombies+=1;});} catch (ex) {}
        expectedZombies+=2;
        expectedHumans-=1;
        return glarbInstance.ownerOf(4);
      })
      .then((_owner) => {
        assert.equal(_owner, player4);
      })
      .then(() => glarbInstance.totalSupply())
      .then((_totalSupply) => {
        expectedTotalSupply = _totalSupply;
      })
      .then(() => glarbInstance.ownerOf(expectedTotalSupply))
      .then((_owner) => {
        assert.equal(_owner, player1);
      })
      .then(() => glarbInstance.glarbs(expectedTotalSupply))
      .then((_glarbType) => {
        assert.equal(_glarbType, 1);
      })
      .then(() => glarbInstance.glarbs(1))
      .then((_glarbType) => {
        assert.equal(_glarbType, 1);
      })
    );

    it("Verify the expectedZombies and expectedHumans", async () => {
      let localExpectedHumans = 0, localExpectedZombies = 0;
      let totalSupply = await glarbInstance.totalSupply();
      for (let i = 1; i <= totalSupply; i++) {
        let type = await glarbInstance.glarbs(i);
        if (parseInt(type, 10) == 0) {
          localExpectedHumans++;
        } else {
          localExpectedZombies++;
        }
      }
      assert.equal(expectedHumans, localExpectedHumans);
      assert.equal(expectedZombies, localExpectedZombies);
      console.log("expectedHumans", expectedHumans, "expectedZombies", expectedZombies);
    })

    it('Send a zombie to a wallet with antidote, cure', () => glarbInstance.safeTransferFrom(player4, player3, 4, { from: player4 })
      .then((tx) => {
        try {truffleAssert.eventEmitted(tx, 'LoveInTheAir', function(ev){expectedZombies+=1;});} catch (ex) {}
        expectedHumans+=1;
        return glarbInstance.ownerOf(4)
      })
      .then((_owner) => {
        assert.equal(_owner, player4);
      })
      .then(() => glarbInstance.totalSupply())
      .then((_totalSupply) => {
        expectedTotalSupply = _totalSupply;
      })
      .then(() => glarbInstance.ownerOf(expectedTotalSupply))
      .then((_owner) => {
        assert.equal(_owner, player3);
      })
      .then(() => glarbInstance.glarbs(expectedTotalSupply))
      .then((_glarbType) => {
        assert.equal(_glarbType, 0);
      })
      .then(() => glarbInstance.glarbs(4))
      .then((_glarbType) => {
        assert.equal(_glarbType, 1);
      })
    );

    it("Verify the expectedZombies and expectedHumans", async () => {
      let localExpectedHumans = 0, localExpectedZombies = 0;
      let totalSupply = await glarbInstance.totalSupply();
      for (let i = 1; i <= totalSupply; i++) {
        let type = await glarbInstance.glarbs(i);
        if (parseInt(type, 10) == 0) {
          localExpectedHumans++;
        } else {
          localExpectedZombies++;
        }
      }
      assert.equal(expectedHumans, localExpectedHumans);
      assert.equal(expectedZombies, localExpectedZombies);
      console.log("expectedHumans", expectedHumans, "expectedZombies", expectedZombies);
    })

    it('Send antidote to a wallet with zombies, cure', () => glarbInstance.balanceOf(player4)
      .then((count) => expectedPlayer4Wallet = parseInt(count, 10))
      .then(() => antidoteInstance.safeTransferFrom(player3, player4, 1, { from: player3 }))
      .then((tx) => {
        expectedHumans+=expectedPlayer4Wallet;
        expectedZombies-=expectedPlayer4Wallet;
        return antidoteInstance.ownerOf(1)
      })
      .then((_owner) => {
        assert.equal(_owner, player4);
      })
      .then(() => glarbInstance.totalSupply())
      .then((_totalSupply) => {
        expectedTotalSupply = _totalSupply;
      })
      .then(() => glarbInstance.glarbs(expectedTotalSupply))
      .then((_glarbType) => {
        assert.equal(_glarbType, 0);
      })
      .then(() => glarbInstance.glarbs(3))
      .then((_glarbType) => {
        assert.equal(_glarbType, 0);
      })
    );

    it("Verify the expectedZombies and expectedHumans", async () => {
      let localExpectedHumans = 0, localExpectedZombies = 0;
      let totalSupply = await glarbInstance.totalSupply();
      for (let i = 1; i <= parseInt(totalSupply, 10); i++) {
        let type = await glarbInstance.glarbs(i);
        if (parseInt(type, 10) == 0) {
          localExpectedHumans++;
        } else {
          localExpectedZombies++;
        }
      }
      assert.equal(expectedHumans, localExpectedHumans);
      assert.equal(expectedZombies, localExpectedZombies);
      console.log("expectedHumans", expectedHumans, "expectedZombies", expectedZombies);
    })

    it('Send token to special wallet, get a token of infection', () => glarbInstance.safeTransferFrom(player1, specialAddress, 1, { from: player1 })
      .then(() => glarbInstance.ownerOf(1))
      .then((_owner) => {
        assert.equal(_owner, player1);
      })
      .then(() => glarbInstance.totalSupply())
      .then((_totalSupply) => {
        expectedTotalSupply = _totalSupply;
      })
      .then(() => tokenOfInfectionInstance.ownerOf(1))
      .then((_owner) => {
        assert.equal(_owner, player1);
      })
      .then(() => tokenOfInfectionInstance.balanceOf(player1))
      .then((_count) => {
        assert.equal(_count, 1);
      })
    );

    it("Spontaneously (roughly 10% of the time) mint extra tokens", async () => {
      let initialCount = await glarbInstance.balanceOf(player1);
      let finalCount = 0;
      for(let i = 0; i < 25; i++) {
        let tx = await glarbInstance.safeTransferFrom(player1, player2, 1, { from: player1 });
        try {
          truffleAssert.eventEmitted(tx, 'LoveInTheAir', function(ev){
            console.log("Caught LoveInTheAir")
          });
        } catch (ex) {}
        finalCount = await glarbInstance.balanceOf(player1);
      }
      console.log("Initial count", initialCount, "- Final count", finalCount);
    })

    it('Let player without minting rights buy antidote to cure their zombies', () =>
      antidoteInstance.purchase({ from: player6, value: web3.utils.toWei('0.05', 'ether') })
      .then(() => antidoteInstance.ownerOf(2))
      .then((_owner) => { assert.equal(_owner, player6) })
      .then(() => glarbInstance.ownerOf(5))
      .then((_owner) => { assert.equal(_owner, player6) })
      .then(() => glarbInstance.glarbs(5))
      .then((_glarbType) => { assert.equal(_glarbType, 0) })
    );

  });

  describe('Proxy registry address', async() => {
    it('should not allow non-owner to set address', async () => {
      await shouldFail.reverting(glarbInstance.setProxyRegistryAddress(
        // Useful address, not actually used for testing calls
        player3,
        { from: player2 }
      ));
    });

    it('should allow owner to set address', async () => {
      await glarbInstance.setProxyRegistryAddress(
        // Useful address, not actually used for testing calls
        player3,
        { from: owner }
      );
      assert.equal(await glarbInstance.proxyRegistryAddress(), player3);
    });
  });
});
