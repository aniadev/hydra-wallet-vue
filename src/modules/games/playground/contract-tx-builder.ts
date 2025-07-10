import { CardanoWasm } from '@/composables/useWalletCore'
import { deserializeTx } from '@/lib/utils/deserializer'

export const buildTxLockContract_2 = async ({
  contract,
  txBuilder,
  rootKey
}: {
  contract: { cborHex: string; address: string; hash: string }
  txBuilder: CardanoWasm.TransactionBuilder
  rootKey: CardanoWasm.Bip32PrivateKey
}) => {
  const spendingUTxOs = [
    {
      input: {
        transaction_id: '44edcc57855e1aac94225c98ec0a101e57feaee246436736579fceec4acd5147',
        index: 1
      },
      output: {
        address:
          'addr_test1qrsx72hrv8ens90hwkezg7ysyhwvcjmyzdveyf88ppq7a0lwu7gv0wuuf9lhzm7wclvj5ntgcfa53j0rqxmu237x20xsne56q3',
        amount: {
          coin: String(1_000_000),
          multiasset: null
        },
        plutus_data: null,
        script_ref: null,
        data_hash: null
      }
    }
  ]

  const scriptUtxo = {
    input: {
      index: 0,
      transaction_id: '44edcc57855e1aac94225c98ec0a101e57feaee246436736579fceec4acd5147'
    },
    output: {
      address: contract.address,
      amount: {
        coin: String(2_000_000),
        multiasset: null
      },
      plutus_data: {
        constructor: 0,
        fields: [
          {
            constructor: 0,
            fields: [
              {
                bytes: '3969ae4e255d5150f5c27d0251d8129241e1fdb28873cad1a229fcda'
              },
              {
                bytes: 'fc6beb57c9451fc1018755f470950eac27085ba9475cb08b5d314b5a'
              }
            ]
          },
          {
            constructor: 0,
            fields: [
              {
                bytes: 'e06f2ae361f33815f775b224789025dccc4b6413599224e70841eebf'
              },
              {
                bytes: 'eee790c7bb9c497f716fcec7d92a4d68c27b48c9e301b7c547c653cd'
              }
            ]
          },
          {
            bytes: '265d94569431f75f1864cb573789807f5a6276a47c8044c37ab3ba276d72dd5b'
          },
          {
            bytes: ''
          },
          {
            int: -1
          },
          {
            int: -1
          },
          {
            int: 0
          },
          {
            int: 0
          },
          {
            int: 1
          },
          {
            int: 2000000
          },
          {
            int: 0
          },
          {
            int: 0
          },
          {
            bytes: '61306232366234352d363461302d343966382d623232652d373566626338303465343163'
          }
        ]
      } as any,
      script_ref: null,
      data_hash: 'a280bb5ee31f46bae712d56a60159a0c79a92e125d5b862580a0931d41cc6bbb'
    }
  }

  const collateral = {
    input: {
      transaction_id: '03ff59d5cbe53331f8542a0d1bab013496561cf3fa1993e4fbe7e91d0f42dc79',
      index: 2
    },
    output: {
      address:
        'addr_test1qrsx72hrv8ens90hwkezg7ysyhwvcjmyzdveyf88ppq7a0lwu7gv0wuuf9lhzm7wclvj5ntgcfa53j0rqxmu237x20xsne56q3',
      amount: {
        coin: '5000000',
        multiasset: null
      },
      plutus_data: null,
      script_ref: null,
      data_hash: null
    }
  }

  console.log('1. Tạo UTXO')
  console.log('1.1. start Tạo script UTXO')
  const wasmScriptUtxos = CardanoWasm.TransactionUnspentOutputs.new()
  const scriptUtxoOutput = CardanoWasm.TransactionOutput.new(
    CardanoWasm.Address.from_bech32(scriptUtxo.output.address),
    CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(scriptUtxo.output.amount.coin))
  )
  // scriptUtxoOutput.set_data_hash(CardanoWasm.DataHash.from_bytes(Buffer.from(scriptUtxo.output.data_hash, 'hex')))

  const txScriptInput = CardanoWasm.TransactionUnspentOutput.new(
    CardanoWasm.TransactionInput.new(
      CardanoWasm.TransactionHash.from_bytes(Buffer.from(scriptUtxo.input.transaction_id, 'hex')),
      scriptUtxo.input.index
    ),
    scriptUtxoOutput
  )
  wasmScriptUtxos.add(txScriptInput)
  console.log('1.1. end Tạo script UTXO', wasmScriptUtxos.to_js_value())

  console.log('1.2. start Tạo UTXO để trả phí')
  const wasmUtxos = CardanoWasm.TransactionUnspentOutputs.new()
  spendingUTxOs.forEach(utxo => {
    wasmUtxos.add(CardanoWasm.TransactionUnspentOutput.from_json(JSON.stringify(utxo)))
  })
  console.log('1.2. end Tạo UTXO để trả phí', wasmUtxos.to_js_value())

  console.log('1.3. start Tạo UTXO thế chấp')
  const wasmCollateral = CardanoWasm.TransactionUnspentOutputs.new()
  wasmCollateral.add(CardanoWasm.TransactionUnspentOutput.from_json(JSON.stringify(collateral)))
  console.log('1.3. end Tạo UTXO thế chấp', wasmCollateral.to_js_value())

  const scriptCborHex = contract.cborHex
  const expectedScriptHash = contract.hash

  txBuilder.add_inputs_from(wasmUtxos, CardanoWasm.CoinSelectionStrategyCIP2.LargestFirstMultiAsset)

  // 3. Thêm đầu vào từ UTxO hợp đồng
  console.log('3. Thêm đầu vào từ UTxO hợp đồng')
  const scriptTxIn = CardanoWasm.TransactionInput.new(
    CardanoWasm.TransactionHash.from_bytes(Buffer.from(scriptUtxo.input.transaction_id, 'hex')),
    scriptUtxo.input.index
  )
  // Tạo giá trị (value) từ scriptUtxo.output.amount
  const scriptValue = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(scriptUtxo.output.amount.coin))
  // Thêm đầu vào hợp đồng
  txBuilder.add_inputs_from(wasmScriptUtxos, CardanoWasm.CoinSelectionStrategyCIP2.LargestFirstMultiAsset)

  // 4. Thêm Plutus Script, Redeemer và Datum
  console.log('4. Thêm Plutus Script, Redeemer và Datum')
  const plutusScript = CardanoWasm.PlutusScript.from_bytes_v3(Buffer.from(scriptCborHex, 'hex'))
  const plutusScripts = CardanoWasm.PlutusScripts.new()
  plutusScripts.add(plutusScript)
  const scriptHash = plutusScript.hash().to_hex()
  console.log('>>> / plutusScript Hash:', scriptHash)
  if (scriptHash !== expectedScriptHash) {
    console.error('Script hash mismatch, expected:', expectedScriptHash, 'actual:', scriptHash)
    throw new Error('Script hash mismatch')
  }

  // // // Tạo redeemer: Con_0 [hex(message)]
  // const message = 'Hello, World!'
  // const plutusList = CardanoWasm.PlutusList.new()
  // plutusList.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(stringToHex('test_pass'), 'hex')))
  // const redeemerData = CardanoWasm.PlutusData.new_constr_plutus_data(
  //   CardanoWasm.ConstrPlutusData.new(CardanoWasm.BigNum.from_str('0'), plutusList)
  // )

  const redeemerData = CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str('0'))

  const redeemer = CardanoWasm.Redeemer.new(
    CardanoWasm.RedeemerTag.new_spend(),
    CardanoWasm.BigNum.from_str('0'), // Chỉ số đầu vào
    redeemerData,
    CardanoWasm.ExUnits.new(
      CardanoWasm.BigNum.from_str('14000000'), // Mem
      CardanoWasm.BigNum.from_str('10000000000') // Steps
    )
  )

  // // Tạo datum: Con_0 []
  // const datum = buildGameDatumInlineDatum({
  //   play_a: buildPlayerDatum(
  //     '3969ae4e255d5150f5c27d0251d8129241e1fdb28873cad1a229fcda',
  //     'fc6beb57c9451fc1018755f470950eac27085ba9475cb08b5d314b5a'
  //   ),
  //   play_b: buildPlayerDatum(
  //     'e06f2ae361f33815f775b224789025dccc4b6413599224e70841eebf',
  //     'eee790c7bb9c497f716fcec7d92a4d68c27b48c9e301b7c547c653cd'
  //   ),
  //   encoded_choice_a: '265d94569431f75f1864cb573789807f5a6276a47c8044c37ab3ba276d72dd5b',
  //   encoded_choice_b: '',
  //   revealed_choice_a: -1,
  //   revealed_choice_b: -1,
  //   salt_a: 0,
  //   salt_b: 0,
  //   status: 1,
  //   bet_amount: 2000000,
  //   unlock_join_time: 0,
  //   unlock_revealed_time: 0,
  //   game_id: '61306232366234352d363461302d343966382d623232652d373566626338303465343163'
  // })

  // Thêm Plutus Data (datum và redeemer)
  // const plutusWitnesses = CardanoWasm.PlutusWitnesses.new()
  // plutusWitnesses.add(CardanoWasm.PlutusWitness.new(plutusScript, datum, redeemer))
  txBuilder.add_plutus_script_input(
    CardanoWasm.PlutusWitness.new_without_datum(plutusScript, redeemer),
    scriptTxIn,
    scriptValue
  )

  // 5. Thêm Required Signer
  console.log('5. Thêm Required Signer')
  const { paymentCredential, stakeCredential } = deserializeAddressCredential(collateral.output.address)
  if (!paymentCredential || !stakeCredential) {
    throw new Error('Invalid address credential')
  }
  txBuilder.add_required_signer(CardanoWasm.Ed25519KeyHash.from_bytes(Buffer.from(paymentCredential, 'hex')))

  // 6. Thêm đầu ra (Change Address)
  // NOTE: Game RPS tại tx-2 thì output vẫn phải là address của contract => increasement commit
  // Output value = script value + increase value (bet amount)
  console.log('6. Thêm đầu ra (Change Address)')
  const outputDatum = buildGameDatumInlineDatum({
    play_a: buildPlayerDatum(
      '3969ae4e255d5150f5c27d0251d8129241e1fdb28873cad1a229fcda',
      'fc6beb57c9451fc1018755f470950eac27085ba9475cb08b5d314b5a'
    ),
    play_b: buildPlayerDatum(
      'e06f2ae361f33815f775b224789025dccc4b6413599224e70841eebf',
      'eee790c7bb9c497f716fcec7d92a4d68c27b48c9e301b7c547c653cd'
    ),
    encoded_choice_a: '265d94569431f75f1864cb573789807f5a6276a47c8044c37ab3ba276d72dd5b',
    encoded_choice_b: '265d94569431f75f1864cb573789807f5a6276a47c8044c37ab3ba276d72dd5b',
    revealed_choice_a: -1,
    revealed_choice_b: -1,
    salt_a: 0,
    salt_b: 0,
    status: 1,
    bet_amount: 2000000,
    unlock_join_time: 0,
    unlock_revealed_time: 0,
    game_id: '61306232366234352d363461302d343966382d623232652d373566626338303465343163'
  })
  const outputValue = scriptValue.checked_add(CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(String(1_000_000))))
  const txOutput = CardanoWasm.TransactionOutput.new(CardanoWasm.Address.from_bech32(contract.address), outputValue)
  // txOutput.set_plutus_data(outputDatum)
  txBuilder.add_output(txOutput)

  // 7. Thêm tài sản thế chấp (Collateral)
  console.log('7. Thêm tài sản thế chấp (Collateral)')
  const collateralTxIn = CardanoWasm.TransactionInput.new(
    CardanoWasm.TransactionHash.from_bytes(Buffer.from(collateral.input.transaction_id, 'hex')),
    collateral.input.index
  )
  const collateralValue = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(collateral.output.amount.coin))
  const collateralAddress = CardanoWasm.Address.from_bech32(collateral.output.address)
  const collateralOutput = CardanoWasm.TxInputsBuilder.new()
  collateralOutput.add_regular_input(collateralAddress, collateralTxIn, collateralValue)
  txBuilder.set_collateral(collateralOutput)

  // 8. Chọn UTxO để trả phí
  // Da chon UTxO roi

  // 9. Cân bằng giao dịch
  console.log('9. Cân bằng giao dịch')
  txBuilder.add_change_if_needed(CardanoWasm.Address.from_bech32(collateral.output.address))

  // Build tx witness
  const txWitnessSet = CardanoWasm.TransactionWitnessSet.new()
  txWitnessSet.set_plutus_scripts(plutusScripts)
  const _plutusList = CardanoWasm.PlutusList.new()
  _plutusList.add(outputDatum)
  txWitnessSet.set_plutus_data(_plutusList)
  const redeemers = CardanoWasm.Redeemers.new()
  redeemers.add(redeemer)
  txWitnessSet.set_redeemers(redeemers)

  const _auxiliaryData = CardanoWasm.AuxiliaryData.new()
  _auxiliaryData.set_plutus_scripts(plutusScripts)
  txBuilder.set_auxiliary_data(_auxiliaryData)

  const costMdls = buildCostModels()
  txBuilder.remove_script_data_hash()
  txBuilder.calc_script_data_hash(costMdls)

  // 10. Tính phí và hoàn tất giao dịch
  console.log('10. Tính phí và hoàn tất giao dịch')

  const feeAmount = '0'
  const minFee = txBuilder.min_fee()
  console.log('>>> / minFee:', minFee.to_str())
  txBuilder.set_min_fee(CardanoWasm.BigNum.from_str(feeAmount))
  txBuilder.set_fee(CardanoWasm.BigNum.from_str(feeAmount))

  const tx = txBuilder.build_tx()
  // const tx = CardanoWasm.Transaction.new(
  //   txBody,
  //   txWitnessSet,
  //   _auxiliaryData // Auxiliary data
  // )

  // 11. Tạo giao dịch hoàn chỉnh (chưa ký)
  const txHex = Buffer.from(tx.to_bytes()).toString('hex')
  console.log('unsigned transaction Hex:', txHex)

  console.log('>>> / txBody:', tx.body().to_js_value())

  // 12. Ký giao dịch
  if (!rootKey) return
  const _privateSigningKey = rootKey // Derive the key using path 1852'/1815'/0'/ 1/ 0
    .derive(1852 | 0x80000000)
    .derive(1815 | 0x80000000)
    .derive(0 | 0x80000000) // Account index: 0'
    .derive(0) // 0
    .derive(0) // key index: 0
    .to_raw_key()

  const txId = deserializeTx(txHex).getId().toString()
  console.log('Transaction ID:', txId)

  return {
    txId,
    txHex
  }
}

export const buildCostModels = () => {
  const PlutusV3 = [
    100788, 420, 1, 1, 1000, 173, 0, 1, 1000, 59957, 4, 1, 11183, 32, 201305, 8356, 4, 16000, 100, 16000, 100, 16000,
    100, 16000, 100, 16000, 100, 16000, 100, 100, 100, 16000, 100, 94375, 32, 132994, 32, 61462, 4, 72010, 178, 0, 1,
    22151, 32, 91189, 769, 4, 2, 85848, 123203, 7305, -900, 1716, 549, 57, 85848, 0, 1, 1, 1000, 42921, 4, 2, 24548,
    29498, 38, 1, 898148, 27279, 1, 51775, 558, 1, 39184, 1000, 60594, 1, 141895, 32, 83150, 32, 15299, 32, 76049, 1,
    13169, 4, 22100, 10, 28999, 74, 1, 28999, 74, 1, 43285, 552, 1, 44749, 541, 1, 33852, 32, 68246, 32, 72362, 32,
    7243, 32, 7391, 32, 11546, 32, 85848, 123203, 7305, -900, 1716, 549, 57, 85848, 0, 1, 90434, 519, 0, 1, 74433, 32,
    85848, 123203, 7305, -900, 1716, 549, 57, 85848, 0, 1, 1, 85848, 123203, 7305, -900, 1716, 549, 57, 85848, 0, 1,
    955506, 213312, 0, 2, 270652, 22588, 4, 1457325, 64566, 4, 20467, 1, 4, 0, 141992, 32, 100788, 420, 1, 1, 81663, 32,
    59498, 32, 20142, 32, 24588, 32, 20744, 32, 25933, 32, 24623, 32, 43053543, 10, 53384111, 14333, 10, 43574283,
    26308, 10, 16000, 100, 16000, 100, 962335, 18, 2780678, 6, 442008, 1, 52538055, 3756, 18, 267929, 18, 76433006,
    8868, 18, 52948122, 18, 1995836, 36, 3227919, 12, 901022, 1, 166917843, 4307, 36, 284546, 36, 158221314, 26549, 36,
    74698472, 36, 333849714, 1, 254006273, 72, 2174038, 72, 2261318, 64571, 4, 207616, 8310, 4, 1293828, 28716, 63, 0,
    1, 1006041, 43623, 251, 0, 1, 100181, 726, 719, 0, 1, 100181, 726, 719, 0, 1, 100181, 726, 719, 0, 1, 107878, 680,
    0, 1, 95336, 1, 281145, 18848, 0, 1, 180194, 159, 1, 1, 158519, 8942, 0, 1, 159378, 8813, 0, 1, 107490, 3298, 1,
    106057, 655, 1, 1964219, 24520, 3
  ]
  const costModel = CardanoWasm.CostModel.new()
  PlutusV3.forEach((val, i) => {
    costModel.set(i, CardanoWasm.Int.from_str(val.toString()))
  })
  const costmdls = CardanoWasm.Costmdls.new()
  costmdls.insert(CardanoWasm.Language.new_plutus_v3(), costModel)
  return costmdls
}

export function buildGameDatumInlineDatum(datum: {
  play_a: CardanoWasm.PlutusData
  play_b: CardanoWasm.PlutusData
  encoded_choice_a: string
  encoded_choice_b: string
  revealed_choice_a: number
  revealed_choice_b: number
  salt_a: number
  salt_b: number
  status: number
  bet_amount: number
  unlock_join_time: number
  unlock_revealed_time: number
  game_id: string
}) {
  const fields = CardanoWasm.PlutusList.new()

  fields.add(datum.play_a) // PlutusData
  fields.add(datum.play_b) // PlutusData

  fields.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(datum.encoded_choice_a, 'hex')))
  fields.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(datum.encoded_choice_b, 'hex')))

  fields.add(CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str(datum.revealed_choice_a.toString())))
  fields.add(CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str(datum.revealed_choice_b.toString())))

  fields.add(CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str(datum.salt_a.toString())))
  fields.add(CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str(datum.salt_b.toString())))

  fields.add(CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str(datum.status.toString())))
  fields.add(CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str(datum.bet_amount.toString())))
  fields.add(CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str(datum.unlock_join_time.toString())))
  fields.add(CardanoWasm.PlutusData.new_integer(CardanoWasm.BigInt.from_str(datum.unlock_revealed_time.toString())))

  fields.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(datum.game_id, 'hex')))

  const plutusData = CardanoWasm.PlutusData.new_constr_plutus_data(
    CardanoWasm.ConstrPlutusData.new(
      CardanoWasm.BigNum.from_str('0'), // constructor index 0
      fields
    )
  )
  console.log('>>> / plutusData Hash:', CardanoWasm.hash_plutus_data(plutusData).to_hex())
  console.log('>>> / plutusData Hex:', plutusData.to_hex())
  return plutusData
}

export function buildPlayerDatum(paymentCredential: string, stakeCredential: string) {
  const fields = CardanoWasm.PlutusList.new()

  fields.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(paymentCredential, 'hex')))
  fields.add(CardanoWasm.PlutusData.new_bytes(Buffer.from(stakeCredential, 'hex')))

  return CardanoWasm.PlutusData.new_constr_plutus_data(
    CardanoWasm.ConstrPlutusData.new(
      CardanoWasm.BigNum.from_str('0'), // constructor index 0
      fields
    )
  )
}

export const deserializeAddressCredential = (baseAddressBech32: string) => {
  const address = CardanoWasm.Address.from_bech32(baseAddressBech32)
  const paymentCredential = address.payment_cred()
  if (!paymentCredential) {
    throw new Error('Invalid address. No payment credential')
  }
  const baseAddress = CardanoWasm.BaseAddress.from_address(address)
  if (!baseAddress) {
    throw new Error('Invalid address')
  }
  const stakeCredential = baseAddress.stake_cred()
  return {
    paymentCredential: paymentCredential.to_keyhash()?.to_hex(),
    stakeCredential: stakeCredential.to_keyhash()?.to_hex()
  }
}
