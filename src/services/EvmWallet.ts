import { Wallet } from '../types';
import { getWalletFile, saveWalletFile } from '../utils'
import {privateKeyToAccount, generateMnemonic, english, Address, mnemonicToAccount } from 'viem/accounts'

import { createPublicClient, createWalletClient, http, webSocket } from "viem"
import type { Chain, PrivateKeyAccount, PublicClient, WalletClient } from "viem"
import rpc from "../config/RPC.json"


type RpcConfig=[
    {
        [chain:string]:{ 
            name: string, 
            httpRpc: string, 
            wssRpc: string ,
            contractAddress: {
                usdt: Address
            }
        }
    }
]
const config: RpcConfig = JSON.parse(JSON.stringify(rpc))



export class EVMWalletService  {
    private readonly evmPublicClient: PublicClient
    private readonly evmWalletClient: WalletClient 
    private readonly evmAccount?: PrivateKeyAccount 
    private readonly evmUsdt: Address
  
    constructor(readonly chain: string, readonly privateKey?: Address,readonly isWssRpc = false,) {
    const data = config.filter((item: any) => {
        return item[chain]
    })[0]
    this.evmUsdt=data[chain].contractAddress.usdt
    this.evmPublicClient = createPublicClient({
        transport: !isWssRpc ? 
        http(data[chain].httpRpc) : 
        webSocket(data[chain].wssRpc),
        chain: {
            id: Number(chain),
        } as Chain
    })
    this.evmWalletClient = createWalletClient({
            transport: !isWssRpc ? 
            http(data[chain].httpRpc) : 
            webSocket(data[chain].wssRpc),
            chain:{
                id: Number(chain) ,
            } as Chain,
        })
        if(privateKey) {
            this.evmAccount = privateKeyToAccount(privateKey);
        }
    }
    public getPublicClient(): PublicClient {
        return this.evmPublicClient
    }
    public getWalletClient(): WalletClient {
        return this.evmWalletClient
    }
    public getAccount() {
        return this.evmAccount as PrivateKeyAccount
    }
    public getRama20Address(): Address{
        return this.evmUsdt
    }

    // Generate a new wallet address using viem
    public generateDepositAddress(num:number,chain:string): Address {
        return CreateWalletV2(num,chain) as Address
    }

}



export const GenerateNewAccount=(numberOfAccounts: number, mnemonic: string)=>{
    const time = `${new Date().toLocaleString()}`
    const newWallet: Wallet = {
        updatedAt: time,
        mnemonic: mnemonic,
        accounts: []
    };
        const path = `m/44'/60'/0'/0/${numberOfAccounts}` as `m/44'/60'/${string}`
        const account = mnemonicToAccount(mnemonic, { path: path })
        const walletAccount = {
            address: account.address,
            privateKey: Buffer.from(account.getHdKey().privateKey as any).toString('hex') as Address
        };

        newWallet.accounts.push(walletAccount)
    
    return {walletAccount,newWallet}
}


export const CreateWalletV2= (numberOfAccounts: number,chain:string, lang = english)=>{

    try {
        let savedWallet = getWalletFile(chain)
        if(savedWallet.length>0){
            const mnemonic = savedWallet[0].mnemonic
            for(let i=0;i<savedWallet.length;i++){
             if(savedWallet[i].mnemonic===mnemonic && savedWallet[i].accounts.length<numberOfAccounts+1){
                const {newWallet,walletAccount}= GenerateNewAccount(numberOfAccounts,mnemonic)
                savedWallet[i].accounts.push(...newWallet.accounts)
                saveWalletFile(savedWallet,chain)
                return walletAccount.address
             }
            }
         }else{
            const NewMnemonic =  generateMnemonic(lang)
            const {newWallet,walletAccount}= GenerateNewAccount(numberOfAccounts,NewMnemonic)
            savedWallet.push(newWallet)
            saveWalletFile(savedWallet,chain)
            return walletAccount.address
    
        }
        return 
        
    } catch (error) {
        return error
        
    }
     
}


