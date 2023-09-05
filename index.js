import { generateEIP712Signature, createSalt } from './api/_createSigTest.js'
import express from 'express'
import dotenv from 'dotenv'

const app = express()
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
module.exports = app