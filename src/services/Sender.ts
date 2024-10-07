import { updateTx } from "../repositories";
import { WalletFactory } from "./WalletFactory";
import { TronWalletService } from "./TronWallet";
import { EVMWalletService } from "./EvmWallet";
import { Address, erc20Abi } from "viem";
import transactionModel, { ITransaction } from "../models/transactionModel";
import { privateKeyToAccount } from "viem/accounts";


export default class Sender {

    constructor(
        private readonly chain: string
    ) {
        this.chain = chain
    }
    public async evmWorker(title: string,privateKey?:Address) {
        
        console.info(title);

        const network = WalletFactory.createWalletService(this.chain,privateKey) as EVMWalletService;
        const dbData1 = await transactionModel.find(
            {
                $and: [
                    { txStatus: "completed" },
                    {settlementStatus:"pending"},
                    { toChain: this.chain },
                    {
                        outTxHash: '0x',
                    }
                ]
        })

        const walletClient = network.getWalletClient()
        const publicClient = network.getPublicClient()
        const account = privateKeyToAccount(privateKey as Address)
        if (dbData1.length > 0) {
            Promise.all(
                dbData1.map(async (data: ITransaction) => {
                    const gas = await publicClient.estimateContractGas(
                        {
                            address: network.getRama20Address(),
                            abi: erc20Abi,
                            functionName: "transfer",
                            args: [
                                data.receiverAddress as Address,
                                BigInt(data.toAmountInWei),
            
                            ],
                            blockTag: 'latest',
                            account
                        }
                    ) 
                    const { request } = await publicClient.simulateContract({
                        address: network.getRama20Address(),
                        abi: erc20Abi,
                        functionName: "transfer",
                        args: [
                            data.receiverAddress as Address,
                            BigInt(data.toAmountInWei),

                        ],
                        gas: gas,
                        blockTag: 'latest',
                        account
                    })
                    
                    const txHash = await walletClient.writeContract(request)
                    const updateData = {
                        outTxHash: txHash,
                    }
                    const query = {
                        id: data._id
                    }
                    await updateTx(
                        updateData,
                        query
                    )
            
                })
            )
        }
        
        const dbData2 = await transactionModel.find(
            {
                $and: [
                    { txStatus: "completed" },
                    {settlementStatus:"pending"},
                    { toChain: this.chain },
                    {
                        outTxHash: {$ne: '0x'},
                    }
                ]
        })
            
        if (dbData2.length > 0) {
            Promise.all(
                dbData2.map(async (data: ITransaction) => {
                    const txHash = data.outTxHash as Address;
                    const tx = await publicClient.waitForTransactionReceipt({ hash: txHash,confirmations:4})
                    const block = await publicClient.getBlock(tx.blockHash as any);
                    const timestamp = block.timestamp;
                    if (tx.status === "success") {
                        const updateData = {
                            settlementStatus: "completed",
                            amountSentAt: `${new Date(Number(timestamp) * 1000).toISOString()}`,
                            remarks: "Successfully Transfer"
                        }
                        const query = {
                            id: data._id
                        }
                        await updateTx(
                            updateData,
                            query
                        )
                    } else {
                        const updateData = {
                            remarks: "Something went wrong "
                        }
                        const query = {
                            id: data._id
                        }
                        await updateTx(
                            updateData,
                            query
                        )
                        console.log("failed");

                    }

                })
            )
        }
    }

    public async tronWorker(title: string,privateKey?:string) {
        console.info(title);

        const network = WalletFactory.createWalletService(this.chain,privateKey) as TronWalletService;
        const dbData = await transactionModel.find(
            {
                $and: [
                    { txStatus: "completed" },
                    { toChain: this.chain }
                ]
            })
        const client = network.getTronWeb3()
        // console.log("0x"+client.address.toChecksumAddress(client.address.toHex("TH6Gvm2TumHpeRLy96d7na3JECwdE1ss1g")).slice(2));
        const functionSelector = 'transfer(address,uint256)';
        if (dbData.length > 0) {
            Promise.all(
                dbData.map(async (data: ITransaction) => {
                    const parameter = [{ type: 'address', value: data.receiverAddress }, { type: 'uint256', value: data.toAmountInWei }]
                    const tx = await client.transactionBuilder.triggerSmartContract(
                        network.getTronUsdt(),
                        functionSelector,
                        {},
                        parameter
                    )
                    const signedTx = await client.trx.sign(tx.transaction);
                    const result = await client.trx.sendRawTransaction(signedTx);
                    if (tx.result.result === true) {
                        const updateData = {
                            settlementStatus: "completed",
                            outTxHash: result.transaction.txID,
                            amountSentAt: `${new Date(Number(result.transaction.raw_data.timestamp)).toISOString()}`,
                            remarks: "Successfully Transfer"
                        }
                        const query = {
                            id: data._id
                        }
                        await updateTx(
                            updateData,
                            query
                        )
                    } else {
                        const updateData = {
                            remarks: "Something went wrong "
                        }
                        const query = {
                            id: data._id
                        }
                        await updateTx(
                            updateData,
                            query
                        )
                        console.log("failed");

                    }

                })
            )
        }
    }
}