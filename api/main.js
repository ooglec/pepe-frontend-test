import { generateEIP712Signature, createSalt } from "./_createSigTest"
import dotenv from 'dotenv'
import { express } from "express"

dotenv.config()

module.exports = async (res, req) => {
    if (res.method === 'GET') {
        res.end('Hello World')
    }else{
        const factoryAddress = "0x762C2b5165E57A9B7B843F5B968C11Fe1d2F55Dd"; //store as env var
       
        const privateKey = process.env.PRIVATE_KEY; //store as env var
        
        const wallet = new ethers.Wallet(privateKey);
        
        const userAddress = req.query.userAddress; //The that would be calling the create compounder function
       
        const nonce1 = await FactoryContract.nonce();

        const salt_ = createSalt(userAddress, nonce1);

        const compounderAddress = await FactoryContract.predictDeterministicAddress(salt_);
        
        const {signature, deadline, nonce, salt} = await generateEIP712Signature(wallet, factoryAddress, userAddress, compounderAddress, nonce1)
        
        res.send(JSON.stringify({signature, deadline, nonce, salt}))
    }
}