const { Web3 } = require("web3")
const express = require("express")
const bodyParser = require("body-parser")
const swaggerUi = require("swagger-ui-express")
const yaml = require("js-yaml")
const fs = require("fs")



const app = express()
app.use(bodyParser.json())
const web3 = new Web3("https://mainnet-rpc.thundercore.com")
const swaggerDocument = yaml.load(fs.readFileSync("./docs.yaml", "utf8"))



app.get("/generate-address", async (req, res) => {

  try {

    const privateKey = web3.eth.accounts.create().privateKey
    const walletAddress = web3.eth.accounts.privateKeyToAccount(privateKey).address

    res.status(200).json({ "success": "true", "address": walletAddress, "private_key": privateKey })

  } catch (error) {

    res.status(500).json({ "success": "false" })

  }
})



app.get("/balance", async (req, res) => {

  try {

    const address = req.query.address
    const balance = await web3.eth.getBalance(address)
    const formattedBalance = web3.utils.fromWei(balance, "ether")
    const balanceWithZero = parseFloat(formattedBalance).toString()

    res.status(200).json({ "success": "true", "balance": "" + balanceWithZero + "" })

  } catch (error) {

    res.status(500).json({ "success": "false" })
  }
})



app.get("/send", async (req, res) => {

  try {

    const privateKey = req.query.private_key
    const recipientAddress = req.query.to_address
    const amount = req.query.amount

    const account = web3.eth.accounts.privateKeyToAccount(privateKey)
    const senderAddress = account.address
    const gasPriceWei = await web3.eth.getGasPrice()
    const txObject = {
      from: senderAddress,
      to: recipientAddress,
      value: web3.utils.toWei(amount, "ether"),
      gas: 21000,
      gasPrice: web3.utils.toWei(web3.utils.fromWei(gasPriceWei, "gwei"), "gwei")
    }
    const signedTransaction = await web3.eth.accounts.signTransaction(txObject, privateKey)
    const sentTransaction = await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction)

    res.status(200).json({ "success": "true", "transaction:": { "amount": amount, "from_address": senderAddress, "to_address": recipientAddress, "id": sentTransaction.transactionHash } })

  } catch (error) {

    res.status(500).json({ "success": "false" })

  }
})



app.get("/transactions", async (req, res) => {

  try {

    const address = req.query.address
    const transactionCount = await web3.eth.getTransactionCount(address)
    const transactionIds = []

    for (let i = BigInt(transactionCount) - BigInt(1); i >= 0; i--) {
      const transaction = await web3.eth.getTransactionFromBlock('latest', i)
      if (transaction !== null) {
        transactionIds.push(transaction.hash)
      }
    }

    res.status(200).json({ "success": "true", "transactions": { "total": "" + transactionCount + "", "transaction_ids": transactionIds } })

  } catch (error) {

    res.status(500).json({ "success": "false" })

  }
})



app.get("/transaction", async (req, res) => {
  try {
    const transactionHash = req.query.hash
    const transaction = await web3.eth.getTransaction(transactionHash)

    if (transaction) {

      const transactionDetails = {
        hash: transaction.hash,
        from_address: transaction.from,
        to_address: transaction.to,
        value: web3.utils.fromWei(transaction.value, "ether"),
        blockNumber: Number(transaction.blockNumber),
        gasPrice: Number(web3.utils.fromWei(transaction.gasPrice, "gwei")),
        gasLimit: Number(transaction.gas),
        inputData: transaction.input,
      }

      res.status(200).json({ "success": "true", "data": transactionDetails })

    } else {

      res.status(500).json({ "success": "false" })

    }

  } catch (error) {

    res.status(500).json({ "success": "false" })

  }
})


app.use("/", swaggerUi.serve, swaggerUi.setup(swaggerDocument))

app.listen(process.env.PORT || 3000)
