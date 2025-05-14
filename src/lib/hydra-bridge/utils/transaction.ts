import type { ProtocolParameters } from '../types/protocol-parameters.type'
import * as CardanoWasm from '@emurgo/cardano-serialization-lib-browser'

export const getTxBuilder = (protocolParameters: ProtocolParameters) => {
  const linearFee = CardanoWasm.LinearFee.new(
    CardanoWasm.BigNum.from_str(`${protocolParameters.txFeePerByte}`),
    CardanoWasm.BigNum.from_str(`${protocolParameters.txFeeFixed}`)
  )
  // config cost for script
  /**
   * 
    "executionUnitPrices": {
      "priceMemory": 0.0577,
      "priceSteps": 0.0000721
    }
    "maxTxExecutionUnits": {
      "memory": 14000000,
      "steps": 10000000000
    },
    "maxBlockExecutionUnits": {
        "memory": 62000000,
        "steps": 20000000000
    },
    */
  const exUnitPrices = CardanoWasm.ExUnitPrices.new(
    CardanoWasm.UnitInterval.new(CardanoWasm.BigNum.from_str('0'), CardanoWasm.BigNum.from_str('1')), // mem: 0 -> 1
    CardanoWasm.UnitInterval.new(CardanoWasm.BigNum.from_str('0'), CardanoWasm.BigNum.from_str('1')) // steps: 0 -> 1
  )
  const txBuilderCfg = CardanoWasm.TransactionBuilderConfigBuilder.new()
    .fee_algo(linearFee)
    .pool_deposit(CardanoWasm.BigNum.from_str(`${protocolParameters.stakePoolDeposit}`)) // stakePoolDeposit
    .key_deposit(CardanoWasm.BigNum.from_str(`${protocolParameters.stakeAddressDeposit}`)) // stakeAddressDeposit
    .max_value_size(protocolParameters.maxValueSize) // maxValueSize
    .max_tx_size(protocolParameters.maxTxSize) // maxTxSize
    .ex_unit_prices(exUnitPrices)
    .coins_per_utxo_byte(CardanoWasm.BigNum.from_str(`${protocolParameters.utxoCostPerByte}`))
    .build()
  const txBuilder = CardanoWasm.TransactionBuilder.new(txBuilderCfg)
  return txBuilder
}
