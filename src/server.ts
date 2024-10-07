import express from 'express';
import cors from "cors"
import cron from "node-cron"
import transactionRoutes from './routes/transaction'
import { connectMongoDB } from './config/dbConnect';
import * as dotenv from "dotenv"
import Watcher from './services/Watcher';
import Sender from './services/Sender';
import { Address } from 'viem';
import Balance from './services/Balance';
dotenv.config()

const port: string | number = process.env.PORT || 3000
const db_url = process.env.DB_URL
connectMongoDB(db_url as string, 'transaction')


const app = express();
app.use(express.json());
app.use(cors())


app.use("/api/v1/tx", transactionRoutes)

if(process.env.ROLE==='Watcher'){
// Watcher
// cron job for network one run every 20 second
cron.schedule("*/20 * * * * *", async () => {
    const depositWatcherOne = new Watcher(
        "bsc"
    )
    await depositWatcherOne.evmWorker("EVM-BSC-Watcher-1")
})

// cron job for network one run every 40 second
// cron.schedule("*/40 * * * * *", async () => {
//     const depositWatcherOne = new Watcher(
//         "tron"
//     )
//     await depositWatcherOne.tronWorker("TRON-Watcher-1")
// })

// cron job for network one run every 60 second
cron.schedule("*/40 * * * * *", async () => {
    const depositWatcherOne = new Watcher(
        "ramestta"
    )
    await depositWatcherOne.evmWorker("EVM-Ramestta-Watcher-1")
})
} 

if(process.env.ROLE==='Sender'){


// Sender

// cron job for network one run every 20 second
cron.schedule("*/30 * * * * *", async () => {
    const depositWatcherOne = new Sender(
        "ramestta",
    )
    await depositWatcherOne.evmWorker("EVM-Ramestta-Sender-1",process.env.PRIVATE_KEY as Address)
})

// cron job for network one run every 40 second
cron.schedule("*/75 * * * * *", async () => {
    const depositWatcherOne = new Sender(
        "bsc"
    )
    await depositWatcherOne.evmWorker("EVM-BSC-Sender-1",process.env.PRIVATE_KEY as Address)
})

// cron job for network one run every 60 second
// cron.schedule("*/90 * * * * *", async () => {
//     const depositWatcherOne = new Sender(
//         "tron"
//     )
//     await depositWatcherOne.tronWorker("TRON-Sender-1",process.env.PRIVATE_KEY as string)
// })


// Balance

// cron job for network one run every 5 mins
cron.schedule("*/5 * * * *", async () => {
    const depositWatcherOne = new Balance(
        "bsc",
    )
    await depositWatcherOne.evmWorker("EVM-BSC-Balance-1",process.env.PRIVATE_KEY as Address)
})

// cron job for network one run every 7 mins
cron.schedule("*/7 * * * *", async () => {
    const depositWatcherOne = new Balance(
        "ramestta",
    )
    await depositWatcherOne.evmWorker("EVM-Ramestta-Balance-1",process.env.PRIVATE_KEY as Address)
})

}

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
