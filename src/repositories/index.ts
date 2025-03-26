import { BaseRepository } from './base'
import { HexcoreRepository } from './hexcore'
import { HydraRepository } from './hydra'
import { TxsRepository } from './transaction'
import { WalletRepository } from './wallet'
import { HydraGameRepository } from './game'

class DefaultRepository extends BaseRepository {
  constructor() {
    super('/')
  }
}

export enum RepoName {
  Wallet,
  Transaction,
  Hydra,
  Hexcore,
  HydraGame
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
    case RepoName.HydraGame:
      return new HydraGameRepository()
    default:
      return new DefaultRepository()
  }
}
