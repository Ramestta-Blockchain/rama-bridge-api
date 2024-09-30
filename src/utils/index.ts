import fs from "fs"
import { Wallet } from "src/types"

export const getWalletFile = (chain:string): Wallet[] => {
    const filePath = `${process.cwd()}/src/data/wallet-${chain}.json`;
    
    // Check if the file exists
    if (fs.existsSync(filePath)) {
        // If the file exists, read and return its contents
        return JSON.parse(fs.readFileSync(filePath).toString());
    } else {
        // If the file doesn't exist, create an empty file and return an empty array
        fs.writeFileSync(filePath, '[]');
        return [];
    }
}

export const saveWalletFile = (savedWallet: Wallet[],chain:string) => {
    fs.writeFileSync(
        `${process.cwd()}/src/data/wallet-${chain}.json`,
        JSON.stringify(savedWallet, null, 2),
        'utf-8'
    )
}

export const  parseTokenString= (tokenString: string): { symbol: string; address: string } => {
    // Split the string by ":"
    const [symbol, address] = tokenString.split(":");

    // Return an object containing the symbol and address
    return { symbol, address };
}
