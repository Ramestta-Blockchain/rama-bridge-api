import { updateTx } from "../repositories";
import { WalletFactory } from "./WalletFactory";
import { TronWalletService } from "./TronWallet";
import { EVMWalletService, chainToChainId } from "./EvmWallet";
import { Address, Chain, erc20Abi, formatGwei, parseGwei } from "viem";
import transactionModel, { ITransaction } from "../models/transactionModel";
import { privateKeyToAccount } from "viem/accounts";
import { getWalletFile } from "../utils";


export default class Balance {

    constructor(
        private readonly chain: string
    ) {
        this.chain = chain
    }
    public async evmWorker(title: string, privateKey?: Address) {

        console.info(title);

        const network = WalletFactory.createWalletService(this.chain, privateKey) as EVMWalletService;
        const dbData = await transactionModel.find(
            {
                $and: [
                    { txStatus: "completed" },
                    { settlementStatus: "completed" },
                    { fromChain: this.chain },
                ]
            })

        const walletClient = network.getWalletClient()
        const publicClient = network.getPublicClient()
        const coldWalletAccount = network.getAccount()
        console.log("completed data length", dbData.length);

        let wallet = getWalletFile(this.chain)[0]

        if (dbData.length > 0) {
            Promise.all(
                dbData.map(async (data: ITransaction) => {
                    try {
                        let balance
                        balance = await publicClient.readContract({
                            address: network.getRama20Address(),
                            abi: erc20Abi,
                            functionName: "balanceOf",
                            args: [
                                data.depositAddress as Address,
                            ],
                            blockTag: 'latest'
                        })

                        console.log(`Token Balance of ${data.depositAddress}: ${balance}`);

                        const walletInfo = wallet.accounts.find((item) => item.address === data.depositAddress)

                        if (Number(balance) > 0 && walletInfo) {
                            const account = privateKeyToAccount(`0x${walletInfo.privateKey}`)
                            const gasPrice = await publicClient.getGasPrice()
                            const gas = await publicClient.estimateContractGas(
                                {
                                    address: network.getRama20Address(),
                                    abi: erc20Abi,
                                    functionName: "transfer",
                                    args: [
                                        coldWalletAccount.address,
                                        balance as bigint,

                                    ],
                                    blockTag: "latest",
                                    account: account.address
                                }
                            )
                            const txCost = Number(gas) * Number(formatGwei(gasPrice))
                            console.log({ gas, gasPrice, txCost });

                            const coinBalance = await publicClient.getBalance({
                                address: walletInfo.address as Address,
                                blockTag: 'latest'
                            })

                            console.log(`Coin Balance: ${coinBalance}`);


                            if (Number(coinBalance) < Number(parseGwei(txCost.toString()))) {
                                const hash = await walletClient.sendTransaction({
                                    account: coldWalletAccount,
                                    chain: {
                                        id: chainToChainId[this.chain],

                                    } as Chain,
                                    to: walletInfo.address as Address,
                                    value: parseGwei(txCost.toString()) - coinBalance,
                                })

                                console.log(`Transfer COIN for gas fee : ${hash}`);
                            }

                            const { request } = await publicClient.simulateContract({
                                address: network.getRama20Address(),
                                abi: erc20Abi,
                                functionName: "transfer",
                                args: [
                                    coldWalletAccount.address,
                                    balance as bigint,

                                ],
                                gas: gas,
                                gasPrice: gasPrice,
                                blockTag: 'latest',
                                account
                            })
                            const txHash = await walletClient.writeContract(request)
                            console.info(`Transfer Token: ${txHash}`);

                        }
                    } catch (error) {
                        console.log(error);

                    }
                })
            )
        }
    }

    public async tronWorker(title: string, privateKey?: string) {
        console.info(title);

        const network = WalletFactory.createWalletService(this.chain, privateKey) as TronWalletService;
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