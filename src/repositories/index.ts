import { BaseRepository } from './base'
import { HydraRepository } from './hydra'
import { TxsRepository } from './transaction'
import { WalletRepository } from './wallet'

class DefaultRepository extends BaseRepository {
  constructor() {
    super('/')
  }
}

export enum RepoName {
  Wallet,
  Transaction,
  Hydra
}
export default function getRepository(name: RepoName) {
  switch (name) {
    case RepoName.Wallet:
      return new WalletRepository()
    case RepoName.Transaction:
      return new TxsRepository()
    case RepoName.Hydra:
      return new HydraRepository()
    default:
      return new DefaultRepository()
  }
}
