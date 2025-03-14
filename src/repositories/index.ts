import { BaseRepository } from './base'
import { HexcoreRepository } from './hexcore'
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
  Hydra,
  Hexcore
}
export default function getRepository(name: RepoName) {
  switch (name) {
    case RepoName.Wallet:
      return new WalletRepository()
    case RepoName.Transaction:
      return new TxsRepository()
    case RepoName.Hydra:
      return new HydraRepository()
    case RepoName.Hexcore:
      return new HexcoreRepository()
    default:
      return new DefaultRepository()
  }
}
