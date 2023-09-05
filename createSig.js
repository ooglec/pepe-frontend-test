import { ethers, utils, Contract} from "ethers";
import factoryAbi from './abis/factory.json' assert { type: "json" };


const IFactory = new utils.Interface(factoryAbi)

const factory = '0x762C2b5165E57A9B7B843F5B968C11Fe1d2F55Dd'
const provider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc')
const FactoryContract = new Contract(factory, IFactory, provider)



function createSalt(userAddress, nonce) {
    const salt = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256'],
        [userAddress, nonce]
      )
    );
    return salt;
  }

async function generateEIP712Signature(wallet, factoryAddress, userAddress, compounderAddress, nonce) {
  
  const domain = {
    name: 'PlsAutoCompounderFactory',
    version: '1',
    chainId: 42161,
    verifyingContract: factoryAddress,
  };

  const types = {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    registerCompounder: [  // Changed to match the Solidity type name
      { name: 'user', type: 'address' },
      { name: 'compounder', type: 'address' },
      { name: 'factory', type: 'address' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint48' },
    ],
  };

  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

  const value = {
    user: userAddress,
    compounder: compounderAddress,
    factory: factoryAddress,
    nonce: nonce,
    deadline: deadline,
  };

  const signature = await wallet._signTypedData(domain, { registerCompounder: types.registerCompounder }, value);
  const salt = createSalt(userAddress, nonce);

  const recoveredAddress = utils.recoverAddress(
    utils._TypedDataEncoder.hash(domain, { registerCompounder: types.registerCompounder }, value),
    signature
  );
  
  console.log("Original Address:", wallet.address);
  console.log("Recovered Address:", recoveredAddress);

  return {
    signature: signature,
    deadline: deadline,
    nonce: nonce,
    salt: salt
  };

}



(async function runAll() {
  const factoryAddress = "0x762C2b5165E57A9B7B843F5B968C11Fe1d2F55Dd"; //store as env var
  const privateKey = "0xf655fa3977ab88fd933b51328fe20facb97d54ffd5ea2677c74b13ebc3db37e7"; //store as env var
  const wallet = new ethers.Wallet(privateKey);
  const userAddress = "0x0f3f7Df1bEF87d0B0D7b3933869E8E9F8A4FBFA2"; //store as env var

  const salt = createSalt(userAddress, await FactoryContract.nonce());

  const compounderAddress = await FactoryContract.predictDeterministicAddress(salt);

  const nonce = await FactoryContract.nonce();

  generateEIP712Signature(wallet, factoryAddress, userAddress, compounderAddress, nonce)
  .then(async(value) => {
    console.log(`Signature: ${value.signature}`);
    console.log(`Deadline: ${value.deadline}`);
    console.log(`Nonce: ${value.nonce}`);
    console.log(`Salt: ${value.salt}`);

    // const privateKey2 = "117cfb768ba416ae3650551c3f0708b4fa71c5c3795d1cc7b78478e63c35aa65"
    // const wallet2 = new ethers.Wallet(privateKey2, provider);
    // const FactoryContract2 = new Contract(factory, IFactory, wallet2)

    // await FactoryContract2.createAutoCompounder(value.signature, value.salt, value.deadline, {gasLimit: 1000000})
    // .then(tx => {
    //   console.log(`https://arbiscan.io/tx/${tx.hash}`);
    // })
  })
  .catch(error => console.error(error));
})()