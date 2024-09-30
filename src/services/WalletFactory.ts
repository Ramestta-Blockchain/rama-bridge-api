import { Address } from "viem";
import { EVMWalletService } from "./EvmWallet";
import { TronWalletService } from "./TronWallet";



export class WalletFactory {
    private static EVM_CHAINS = ['bsc', 'ramestta'];
  
    public static createWalletService(chain: string, privateKey?: string) {
      if (this.EVM_CHAINS.includes(chain)) {
        return new EVMWalletService(chain,privateKey as Address) ;
      } else if (chain === 'tron') {
        return new TronWalletService(privateKey) ;
      } else {
        throw new Error('Unsupported chain');
      }
    }
  }

  