import express from 'express'
import dotenv from 'dotenv'
import { ethers, utils, Contract} from "ethers";
import factoryAbi from './abis/factory.json' assert { type: "json" };
import cors from 'cors'

const IFactory = new utils.Interface(factoryAbi)

const factory = '0x762C2b5165E57A9B7B843F5B968C11Fe1d2F55Dd'
const provider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc')
const FactoryContract = new Contract(factory, IFactory, provider)
export function createSalt(userAddress, nonce) {
  const salt = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['address', 'uint256'],
      [userAddress, nonce]
    )
  );
  return salt;
}

export async function generateEIP712Signature(wallet, factoryAddress, userAddress, compounderAddress, nonce) {

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

const app = express()
app.use(cors())
const PORT = 4000

dotenv.config()

app.listen(PORT, () => {
  console.log(`API listening on PORT ${PORT} `)
})

app.get('/', (req, res) => {
  res.send('Hey this is my API running 🥳')
})

app.post('/createCompounder', async (req, res) => {
        const factoryAddress = "0x762C2b5165E57A9B7B843F5B968C11Fe1d2F55Dd"; //store as env var
       
        const privateKey = process.env.PRIVATE_KEY; //store as env var
        
        const wallet = new ethers.Wallet(privateKey);
        
        const userAddress = req.query.userAddress; //The that would be calling the create compounder function
       
        const nonce1 = await FactoryContract.nonce();

        const salt_ = createSalt(userAddress, nonce1);

        const compounderAddress = await FactoryContract.predictDeterministicAddress(salt_);
        
        const {signature, deadline, nonce, salt} = await generateEIP712Signature(wallet, factoryAddress, userAddress, compounderAddress, nonce1)
        
        res.send(JSON.stringify({signature, deadline, nonce, salt}))
})

// Export the Express API
