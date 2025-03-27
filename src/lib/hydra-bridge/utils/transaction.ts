import type { ProtocolParameters } from '../types/protocol-parameters.type'

export const getTxBuilder = (protocolParameters: ProtocolParameters) => {
  const linearFee = CardanoWasm.LinearFee.new(CardanoWasm.BigNum.from_str('44'), CardanoWasm.BigNum.from_str('155381'))
  const txBuilderCfg = CardanoWasm.TransactionBuilderConfigBuilder.new()
    .fee_algo(linearFee)
    .pool_deposit(CardanoWasm.BigNum.from_str(`${protocolParameters.stakePoolDeposit}`)) // stakePoolDeposit
    .key_deposit(CardanoWasm.BigNum.from_str(`${protocolParameters.stakeAddressDeposit}`)) // stakeAddressDeposit
    .max_value_size(protocolParameters.maxValueSize) // maxValueSize
    .max_tx_size(protocolParameters.maxTxSize) // maxTxSize
    .coins_per_utxo_byte(CardanoWasm.BigNum.from_str(`${protocolParameters.utxoCostPerByte}`))
    .build()
  const txBuilder = CardanoWasm.TransactionBuilder.new(txBuilderCfg)
  return txBuilder
}
