
export type Wallet =
    {
        updatedAt: string,
        mnemonic: string,
        accounts: Array<{
            address: string,
            privateKey: string
        }>
    }