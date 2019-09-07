/* global artifacts module */

const Antidote = artifacts.require('Antidote');
const TokenOfInfection = artifacts.require('TokenOfInfection');
const Glarb = artifacts.require('Glarb');

const proxyRegistryAddress = '0x0000000000000000000000000000000000000000';
let glarbAddress;
let tokenOfInfectionInstance, antidoteInstance;

module.exports = async (deployer) => {
  deployer.deploy(
    TokenOfInfection,
    "Token Of Infection",
    "INFECT",
    proxyRegistryAddress
  ).then(function (instance) {
  	tokenOfInfectionInstance = instance;
  	return deployer.deploy(
		Antidote,
		"Antidote",
		"ANTIDOTE",
		proxyRegistryAddress
  	)
  }).then(function (instance) {
  	antidoteInstance = instance;
  	return deployer.deploy(
		Glarb,
		"Glarbs",
		"GLARB",
		proxyRegistryAddress,
		antidoteInstance.address,
		tokenOfInfectionInstance.address
  	)
  })
  .then(function (instance) {
  	glarbAddress = instance.address;
  	return antidoteInstance.setGlarbAddress(glarbAddress)
  })
  .then(function () {
  	return tokenOfInfectionInstance.addMinter(glarbAddress)
  })
};
