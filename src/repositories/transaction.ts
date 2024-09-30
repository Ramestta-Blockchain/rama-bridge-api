import transactionModel, { ITransaction } from "../models/transactionModel"


export const TxById = async (id: string): Promise<ITransaction|null> => {
  try {
    return await transactionModel.findById({
        _id: id
    })
  } catch (e) {
    throw e
  }
}

export const allTx = async (_where?: any): Promise<ITransaction[] | null> => {
  try {
    return await transactionModel.find({
        ..._where
    })
  } catch (e) {
    throw e
  }
}

// export const createBridge = async (req: any, _select?: any): Promise<ITransaction | null> => {
//   try {
//     const bridgeData = await bridgeByTxHash(req.txHash);
//     if (!bridgeData) {
//       return await prisma.bridge.create({
//         data: {
//           ...req
//         }
//       })
//     }
//     return null
//   } catch (e) {
//     if (e instanceof Prisma.PrismaClientKnownRequestError) {
//       // The .code property can be accessed in a type-safe manner
//       if (e.code === 'P2001') {
//         console.log(
//           'data does not exist'
//         )
//       }
//     }
//     throw e
//   }
// }

export const updateTx = async (req: any, _query?: any): Promise<ITransaction | null> => {
  try {

    return await transactionModel.findOneAndUpdate(
        { _id: _query.id }, // Find condition
        { $set: req } ,
        {
            new: true
        }     
      );

  } catch (e) {
    throw e
  }
}