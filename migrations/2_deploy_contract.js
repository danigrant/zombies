/* global artifacts module */

const Glarb = artifacts.require('Glarb');

const proxyRegistryAddress = '0x0000000000000000000000000000000000000000';

module.exports = async (deployer) => {
  await deployer.deploy(
    Glarb,
    "Token Of Infection",
    "INFECT",
    proxyRegistryAddress
  );
};
