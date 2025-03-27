export type ProtocolParameters = {
  txFeePerByte: number
  txFeeFixed: number
  maxBlockBodySize: number
  maxTxSize: number
  maxBlockHeaderSize: number
  stakeAddressDeposit: number
  stakePoolDeposit: number
  poolRetireMaxEpoch: number
  stakePoolTargetNum: number
  poolPledgeInfluence: number
  monetaryExpansion: number
  treasuryCut: number
  minPoolCost: number
  costModels: {
    PlutusV1: Array<number>
    PlutusV2: Array<number>
    PlutusV3: Array<number>
  }
  executionUnitPrices: {
    priceMemory: number
    priceSteps: number
  }
  maxTxExecutionUnits: {
    memory: number
    steps: number
  }
  maxBlockExecutionUnits: {
    memory: number
    steps: number
  }
  maxValueSize: number
  collateralPercentage: number
  maxCollateralInputs: number
  utxoCostPerByte: number
  poolVotingThresholds: {
    committeeNoConfidence: number
    committeeNormal: number
    hardForkInitiation: number
    motionNoConfidence: number
    ppSecurityGroup: number
  }
  dRepVotingThresholds: {
    committeeNoConfidence: number
    committeeNormal: number
    hardForkInitiation: number
    motionNoConfidence: number
    ppEconomicGroup: number
    ppGovGroup: number
    ppNetworkGroup: number
    ppTechnicalGroup: number
    treasuryWithdrawal: number
    updateToConstitution: number
  }
  committeeMinSize: number
  committeeMaxTermLength: number
  govActionLifetime: number
  govActionDeposit: number
  dRepDeposit: number
  dRepActivity: number
  minFeeRefScriptCostPerByte: number
  protocolVersion: {
    major: number
    minor: number
  }
}
