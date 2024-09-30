import { Wallet } from '../types';
import { getWalletFile, saveWalletFile } from '../utils';
import { TronWeb } from 'tronweb';

export class TronWalletService {
    private tronWeb: TronWeb;

    constructor(readonly privateKey?: string) {
        this.tronWeb = new TronWeb({ 
            fullHost: "https://api.trongrid.io" ,
            privateKey: this.privateKey
        });
    }

    public getTronWeb3(): TronWeb {
        return this.tronWeb;
    }

    public getTronUsdt() {
        return "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
    }

    // Generate a new wallet address using TronWeb
    public generateDepositAddress(num: number,chain:string): string {
        return CreateTronWalletV2(num,chain) as string
    }
}


export const GenerateTronNewAccount = (numberOfAccounts: number, mnemonic: string) => {
    const time = `${new Date().toLocaleString()}`
    const newWallet: Wallet = {
        updatedAt: time,
        mnemonic: mnemonic,
        accounts: []
    };
    const path = `m/44'/195'/0'/0/${numberOfAccounts}` as `m/44'/195'/${string}`
    const account = TronWeb.fromMnemonic(mnemonic, path)
    const walletAccount = {
        address: account.address,
        privateKey: account.privateKey
    };

    newWallet.accounts.push(walletAccount)

    return { walletAccount, newWallet }
}


export const CreateTronWalletV2 = (numberOfAccounts: number,chain:string) => {
    try {
        let savedWallet = getWalletFile(chain)
        if (savedWallet.length > 0) {
            for (let i = 0; i < savedWallet.length; i++) {
                const mnemonic = savedWallet[0].mnemonic
                if (savedWallet[i].mnemonic === mnemonic && savedWallet[i].accounts.length < numberOfAccounts+1) {
                    const { newWallet, walletAccount } = GenerateTronNewAccount(numberOfAccounts, mnemonic)
                    savedWallet[i].accounts.push(...newWallet.accounts)
                    saveWalletFile(savedWallet, chain)
                    return walletAccount.address
                }
            }
        } else {
            const NewMnemonic = TronWeb.createRandom()
            const { newWallet, walletAccount } = GenerateTronNewAccount(numberOfAccounts, NewMnemonic.mnemonic?.phrase as string)
            savedWallet.push(newWallet)
            saveWalletFile(savedWallet, chain)
            return walletAccount.address

        }
        return
    } catch (error) {
        return error
    }

}
