import { updateTx } from "../repositories";
import { WalletFactory } from "./WalletFactory";
import { TronWalletService } from "./TronWallet";
import { EVMWalletService } from "./EvmWallet";
import { Address, parseAbiItem } from "viem";
import transactionModel, { ITransaction } from "../models/transactionModel";

export default class Watcher {

    constructor(
        private readonly chain: string
    ) {
        this.chain = chain
    }
    public async evmWorker(title: string) {
        console.log(title);

        const network = WalletFactory.createWalletService(this.chain) as EVMWalletService;
        const dbData = await transactionModel.find(
            {
                $and: [
                    { txStatus: "pending" },
                    { fromChain: this.chain }
                ]
            })
        const client = network.getPublicClient()
        const blockNumber = await client.getBlockNumber()
        const now = new Date();
        if (dbData.length > 0) {
            await Promise.all(
                dbData.map(async (data: ITransaction) => {
                    
                    await transactionModel.updateOne(
                        { _id: data._id, txStatus: 'pending', expiration: { $lt: now } },
                        { $set: { txStatus: 'canceled' } }
                    )

                    const logs = await client.getLogs({
                        address: network.getRama20Address(),
                        event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
                        args: {
                            to: data.depositAddress as Address
                        },
                        fromBlock: blockNumber - 450n,
                        toBlock: blockNumber
                    })


                    Promise.all(logs.map(async (item: any) => {
                        console.log({ item });

                        const tx = await client.getTransactionReceipt({ hash: item.transactionHash })
                        const block = await client.getBlock(item.blockHash);
                        const timestamp = block.timestamp;
                        const updateData = {
                            fromAmountInWei: item.args.value,
                            inTxHash: item.transactionHash.toString(),
                            txStatus: tx.status === "success" ? 'completed' : 'fail',
                            amountReceivedAt: `${new Date(Number(timestamp) * 1000).toISOString()}`
                        };
                        const saveData = await updateTx(updateData, { id: data._id });
                        saveData ? console.info(`Added to the database from ${this.chain} chain`) : console.info(`already Added data from ${this.chain} chain`);

                    }));

                })
            )
        }
    }

    public async tronWorker(title: string) {
        console.info(title);

        const network = WalletFactory.createWalletService(this.chain) as TronWalletService;
        const dbData = await transactionModel.find(
            {
                $and: [
                    { txStatus: "pending" },
                    { fromChain: this.chain }
                ]
            })
        const client = network.getTronWeb3()
        // console.log("0x"+client.address.toChecksumAddress(client.address.toHex("TH6Gvm2TumHpeRLy96d7na3JECwdE1ss1g")).slice(2));
        const now = new Date();
        if (dbData.length > 0) {
            Promise.all(
                dbData.map(async (data: ITransaction) => {

                    await transactionModel.updateOne(
                        { _id: data._id, txStatus: 'pending', expiration: { $lt: now } },
                        { $set: { txStatus: 'canceled' } }
                    )
                    
                    const events = await client.getEventResult(
                        network.getTronUsdt(),
                        {
                            eventName: "Transfer",
                            onlyConfirmed: true,
                            orderBy: "block_timestamp,asc",
                            limit: 500
                        }
                    )

                    // Filter events based on 'to' address
                    const filteredEvents = events.data?.filter((event) => {

                        return event.result.to === `0x${client.address.toHex(data.depositAddress).slice(2)}`
                    }
                    );

                    if (filteredEvents && filteredEvents.length > 0) {
                        Promise.all(
                            filteredEvents.map(async (item: any) => {
                                const timestamp = item.block_timestamp;
                                const updateData = {
                                    fromAmountInWei: item.result.value,
                                    inTxHash: item.transaction_id.toString(),
                                    txStatus: events.success === true ? 'completed' : 'fail',
                                    amountReceivedAt: `${new Date(Number(timestamp)).toISOString()}`
                                };

                                const saveData = await updateTx(updateData, { id: data._id });
                                saveData ? console.info(`Added to the database from ${this.chain} chain`) : console.info(`already Added data from ${this.chain} chain`);
                            })
                        )
                    }
                })
            )
        }
    }
}