const HDWalletProvider = require('truffle-hdwallet-provider');
const Web3 = require('web3');
const fs = require('fs');

if (process.argv.length !== 3) {
	throw "usage: node airdropMultipleFile.js [mainnet, rinkeby]";
	process.exit();
	return;
}

let environment = process.argv[2];
let airdropJsonFile = "test_addresses.json";

const Glarb = JSON.parse(fs.readFileSync("../build/contracts/Glarb.json").toString('utf-8'));
const GlarbABI = Glarb.abi;

const Antidote = JSON.parse(fs.readFileSync("../build/contracts/Antidote.json").toString('utf-8'));
const AntidoteABI = Antidote.abi;

let provider, glarbContractAddress, antidoteContractAddress;
if (environment == 'mainnet') {
	glarbContractAddress = '';
	antidoteContractAddress = '';
	let providerUrl = 'https://mainnet.infura.io/v3/24792c3ebc9643f0a61afedf9e3256a1';
	const private_key = fs.readFileSync("../rinkeby.secret").toString('utf-8');
	provider = new HDWalletProvider(private_key, providerUrl);
} else if (environment == 'rinkeby') {
	glarbContractAddress = '0x696Ba64bD47Db0e51323aEf20803903be7a71F3a';
	antidoteContractAddress = '0x277426B1A0d1e82243d174E60729A99D5b15979C';
	let providerUrl = 'https://rinkeby.infura.io/v3/24792c3ebc9643f0a61afedf9e3256a1';
	const private_key = fs.readFileSync("../rinkeby.secret").toString('utf-8');
	provider = new HDWalletProvider(private_key, providerUrl);
} else {
	throw "invalid environment";
}

let file = fs.readFileSync(airdropJsonFile).toString('utf-8');
let airdropJson = JSON.parse(file);

let web3 = new Web3(provider);
let glarbContract = new web3.eth.Contract(GlarbABI, glarbContractAddress);
let antidoteContract = new web3.eth.Contract(AntidoteABI, antidoteContractAddress);

airdrop();

var owner;

async function airdrop() {
	owner = await getUserEthereumAccount();

	let nonce = await web3.eth.getTransactionCount(owner, 'pending');

	const MAX_ITER = 10;
	let iter = 0;
	for (let i = 0; i < airdropJson.length; i++) {
		let glarbType   = parseInt(airdropJson[i]['glarbType'], 10);
		let toAddress   = airdropJson[i]['toAddress'];
		let in_progress = airdropJson[i]['in_progress'];
		let completed   = airdropJson[i]['completed'];

		if (glarbType < 0 || glarbType > 3) {
			throw "Invalid glarbType: " + String(glarbType);
		}

		if (toAddress.length !== 42 || toAddress.indexOf('0x') !== 0) {
			throw "Invalid toAddress: " + String(toAddress);
		}

		if (in_progress && !completed) {
			throw "In progress: " + String(toAddress) + " - please manually review";
		}

		if (!in_progress && !completed) {
			// Update the file
			airdropJson[i]['in_progress'] = 1;
			let data = JSON.stringify(airdropJson);
			fs.writeFileSync(airdropJsonFile, data);

			// Issue the tx
			if (iter >= MAX_ITER - 1 || i >= (airdropJson.length - 1)) {
				iter = 0;
				console.log(" * On tx " + String(i) + " of " + String(airdropJson.length) + ", Minting to " + toAddress);

				if (glarbType === 3) {
					await antidoteContract.methods.mint(toAddress).send({"from":owner, "gasPrice":3100000001, "nonce" : nonce++});
				} else {
					await glarbContract.methods.mint(toAddress, glarbType).send({"from":owner, "gasPrice":3100000001, "nonce" : nonce++});
				}
			} else {
				iter++;
				console.log("On tx " + String(i) + " of " + String(airdropJson.length) + ", Minting to " + toAddress);
				if (glarbType === 3) {
					antidoteContract.methods.mint(toAddress).send({"from":owner, "gasPrice":3100000001, "nonce" : nonce++});
				} else {
					glarbContract.methods.mint(toAddress, glarbType).send({"from":owner, "gasPrice":3100000001, "nonce" : nonce++});
				}
			}

			// Update the file
			airdropJson[i]['completed'] = 1;
			data = JSON.stringify(airdropJson);
			fs.writeFileSync(airdropJsonFile, data);
		} else {
			console.log("Skipping " + toAddress + " - already completed");
		}
	}

	process.exit();
}

async function getUserEthereumAccount() {
	const accounts = await web3.eth.getAccounts()
	return accounts[0];
}
