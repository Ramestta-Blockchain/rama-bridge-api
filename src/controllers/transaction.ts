import type { Request, Response, NextFunction } from "express";
import { asyncMiddleware } from "../middlewares";
import { TxById, allTx } from "../repositories/index";
import transactionModel from "../models/transactionModel";
import { WalletFactory } from "../services/WalletFactory";

export const getTxById = asyncMiddleware(
    async (req: Request, res: Response, _next: NextFunction) => {
        try {
            const data = await TxById(req.query.id as string)
            res.status(200).json({ success: true, message: "fetch successfully data", data: data });

        } catch (error) {
            res.status(400).json({ success: false, message: error });
        }
    }
)


export const getTxList = asyncMiddleware(
    async (req: Request, res: Response, _next: NextFunction) => {
        try {
            const data = await allTx({txStatus: req.query.status})

            res.status(200).json({ success: true, message: "fetch successfully all data", data: data });

        } catch (error) {
            res.status(400).json({ success: false, message: error });
        }
    }
)


// Create a new transaction
export const createTx = asyncMiddleware(
    async (req: Request, res: Response) => {
        try {
            const { fromChain, toChain, fromToken, toToken, receiverAddress, amountInWei } = req.body;

            if(fromChain===toChain){
                return res.status(500).json({ success: true, message: "Both chain are not different" }); 
            }

            // Get the current transaction count, which will act as the index for wallet generation
            // Get the count of transactions based on the fromChain condition
            const transactionCount = await transactionModel.countDocuments({ fromChain });
            console.log({ transactionCount });

            // Auto-generate depositAddress
            const walletService = WalletFactory.createWalletService(fromChain);
            const depositAddress =  walletService.generateDepositAddress(transactionCount, fromChain);

            const calculateAmount = Number(amountInWei)  // will add networkFee and serviceFee later
            const transaction = new transactionModel({
                fromChain,
                toChain,
                fromToken,
                toToken,
                depositAddress,
                receiverAddress,
                fromAmountInWei: amountInWei,
                toAmountInWei: calculateAmount.toString(),
                // exchangeRate,
                // serviceFee,
                // transactionCost,
                expiration: Date.now() + 15 * 60 * 1000,
            });

            await transaction.save();
            return res.status(201).json({ success: true, message: "Transaction Request Created", data: transaction });
        } catch (error) {
            return res.status(500).json({ message: 'Error creating transaction', error });
        }
    })