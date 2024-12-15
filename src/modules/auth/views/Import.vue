<script setup lang="ts">
  // import { useAuth } from '@/composables/useAuth'
  import telegramHelper, { Constants } from '@/helpers/telegram.helper'
  import getRepository, { RepoName } from '@/repositories'
  import { WalletRepository } from '@/repositories/wallet'
  import { recursiveToCamel } from '@/utils/format'
  import { message } from 'ant-design-vue'
  import { storeToRefs } from 'pinia'

  const steps = ['SEED_PHRASE', 'SELECT_ACCOUNT']
  const step = ref<'SEED_PHRASE' | 'SELECT_ACCOUNT'>('SEED_PHRASE')

  const walletApi = getRepository(RepoName.Wallet) as WalletRepository

  const form = reactive({
    mnemonic: '',
    passPhrase: ''
  })

  const auth = useAuthV2()
  const { rootKey } = storeToRefs(auth)

  const loadingLogin = ref(false)
  const router = useRouter()
  const route = useRoute()

  function handleImportByMnemonic() {
    // validate mnemonic
    if (form.mnemonic) {
      try {
        loadingLogin.value = true
        const walletAddress = useWalletCore().getBaseAddressFromMnemonic(form.mnemonic).to_address().to_bech32()
        // get root key
        const _rootKey = useWalletCore().getRootKeyByMnemonic(form.mnemonic)
        rootKey.value = _rootKey

        if (!form.passPhrase) {
          message.error('Password is required', 2)
          return
        }
        walletApi
          .restoreWallet({
            name: walletAddress,
            mnemonic_sentence: form.mnemonic.split(' '),
            passphrase: form.passPhrase
          })
          .then(rs => {
            // auth.setCurrentWallet(recursiveToCamel(rs))
            // auth.setCurrentWalletAddress({
            //   id: rs.id,
            //   address: walletAddress
            // })
            auth.login(
              {
                ...recursiveToCamel(rs),
                seedPhrase: form.mnemonic
              },
              {
                id: rs.id,
                address: walletAddress
              }
            )
            if (telegramHelper.ready) {
              const _rootKey = useWalletCore().getRootKeyByMnemonic(form.mnemonic)
              telegramHelper.storage.setItem(Constants.StorageKeys.WalletAddress, walletAddress)
              telegramHelper.storage.setItem(Constants.StorageKeys.WalletData, JSON.stringify(recursiveToCamel(rs)))
              telegramHelper.storage.setItem(Constants.StorageKeys.Rootkey, _rootKey.to_hex())
            }
            if (route.query.redirect && router.resolve(decodeURIComponent(route.query.redirect as string))) {
              const path = decodeURIComponent(route.query.redirect as string)
              router.push(path)
            } else {
              router.push({ name: 'Home' })
            }
          })
          .catch(err => {
            if (err?.data?.detail?.code === 'bad_request') {
              message.error('Error passphrase', 2)
              return
            }
            message.error('Something wrong here. Please try again later!', 2)
          })
      } catch (error: any) {
        console.log(error)
        if (error.message === 'Invalid mnemonic') {
          message.error('Invalid Seed Phrase', 2)
        }
      } finally {
        loadingLogin.value = false
      }
    }
  }

  onMounted(() => {
    console.log(auth)
    if (auth.isLogged) {
      message.info('You are already logged in', 2)
      router.push({ name: 'Home' })
    }
  })
</script>

<template>
  <div class="h-full w-full p-4">
    <div class="flex flex-col" v-if="step === 'SEED_PHRASE'">
      <div class="mb-6 flex w-full justify-between">
        <a-button type="ghost" class="" size="large" @click="$router.push({ name: 'Home' })">
          <icon icon="ic:outline-arrow-back" height="20" />
        </a-button>
      </div>
      <div class="mb-2">
        <p class="text-title-1 font-700 mb-2 text-left leading-8">Recover using Seed Phrase</p>
        <p class="text-body-1 font-700 text-left">Enter the backup passphrase associated with the account.</p>
      </div>
      <div class="">
        <a-form :model="form" layout="vertical">
          <a-textarea
            v-model:value="form.mnemonic"
            placeholder="Seed phrase"
            :auto-size="{ minRows: 4, maxRows: 6 }"
            class="!rounded-4"
          />
          <a-form-item label="Password" name="passPhrase" class="mt-4">
            <a-input-password v-model:value="form.passPhrase" placeholder="Password" type="password">
              <template #prefix>
                <icon icon="ic:outline-lock" height="18" color="#4d4d4d" />
              </template>
            </a-input-password>
          </a-form-item>
        </a-form>
        <a-button
          type="primary"
          class="!rounded-4 btn-secondary mt-4 !h-[56px] w-full"
          size="large"
          :disabled="!form.mnemonic || !form.passPhrase"
          :loading="loadingLogin"
          @click="handleImportByMnemonic"
        >
          Continue
        </a-button>
      </div>
    </div>
  </div>
</template>
