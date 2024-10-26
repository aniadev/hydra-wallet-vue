import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetUno,
  presetWebFonts,
  transformerDirectives,
  transformerVariantGroup
} from 'unocss'

export default defineConfig({
  shortcuts: [
    // ...
    {
      container:
        'w-full mx-auto sm:max-w-[540px] md:max-w-[720px] lg:max-w-[960px] xl:max-w-[1170px] 2xl:max-w-[1320px]'
    },
    ['text-title-1', 'font-600 text-[33px] leading-[56px]'],
    ['text-title-2', 'font-600 text-[24px] leading-[40px]'],
    ['text-title-3', 'font-700 text-[20px] leading-[40px]'],
    ['text-title-4', 'font-600 text-[16px] leading-[24px]'],
    ['text-title-5', 'font-600 text-[14px] leading-[24px]'],
    ['text-title-6', 'font-500 text-[14px] leading-[24px]'],
    ['text-body-1', 'font-500 text-[16px] leading-[24px]'],
    ['text-body-2', 'font-400 text-[14px] leading-[24px]'],
    ['text-body-3', 'font-500 text-[12px] leading-[16px]'],
    ['text-caption', 'font-400 text-[12px] leading-[16px]'],

    ['text-xs-regular', 'font-400 text-[12px] leading-[18px]'],
    ['text-xs-medium', 'font-500 text-[12px] leading-[18px]'],
    ['text-xs-semibold', 'font-600 text-[12px] leading-[18px]'],
    ['text-xs-bold', 'font-700 text-[12px] leading-[18px]'],

    ['text-sm-regular', 'font-400 text-[14px] leading-[20px]'],
    ['text-sm-medium', 'font-500 text-[14px] leading-[20px]'],
    ['text-sm-semibold', 'font-600 text-[14px] leading-[20px]'],
    ['text-sm-bold', 'font-700 text-[14px] leading-[20px]'],

    ['text-md-regular', 'font-400 text-[16px] leading-[24px]'],
    ['text-md-medium', 'font-500 text-[16px] leading-[24px]'],
    ['text-md-semibold', 'font-600 text-[16px] leading-[24px]'],
    ['text-md-bold', 'font-700 text-[16px] leading-[24px]'],

    ['text-lg-regular', 'font-400 text-[18px] leading-[28px]'],
    ['text-lg-medium', 'font-500 text-[18px] leading-[28px]'],
    ['text-lg-semibold', 'font-600 text-[18px] leading-[28px]'],
    ['text-lg-bold', 'font-700 text-[18px] leading-[28px]'],

    ['text-xl-regular', 'font-400 text-[20px] leading-[30px]'],
    ['text-xl-medium', 'font-500 text-[20px] leading-[30px]'],
    ['text-xl-semibold', 'font-600 text-[20px] leading-[30px]'],
    ['text-xl-bold', 'font-700 text-[20px] leading-[30px]'],

    ['text-2xl-regular', 'font-400 text-[24px] leading-[32px]'],
    ['text-2xl-medium', 'font-500 text-[24px] leading-[32px]'],
    ['text-2xl-semibold', 'font-600 text-[24px] leading-[32px]'],
    ['text-2xl-bold', 'font-700 text-[24px] leading-[32px]'],
    // Buttons
    [
      'btn-primary',
      'bg-primary text-white rounded-2 h-10 !border-primary !hover:(bg-green-300) focus:(ring-green-300) active:(bg-green-300) disabled:(!bg-green-400 !text-green-700)'
    ],
    [
      'btn-secondary',
      'bg-gray-900 text-white rounded-2 h-10 !ring-gray-700 !hover:(bg-gray-700 ) focus:(ring-gray-700) active:(bg-gray-700) disabled:(!bg-gray-400 !text-gray-700)'
    ],
    [
      'btn-tertiary',
      '!bg-green-50 !text-gray-900 !rounded-2 !h-10 hover:(!text-green-500 !border-green-300) focus:(!ring-green-300) active:(!bg-green-300)'
    ]
  ],
  theme: {
    colors: {
      primary: '#16BD4F',
      secondary: '#292D32',
      green: {
        '25': '#F6FEF9',
        '50': '#ECFDF3',
        '100': '#D1FADF',
        '200': '#A6F4C5',
        '300': '#6CE9A6',
        '400': '#32D583',
        '500': '#12B76A',
        '600': '#039855',
        '700': '#027A48',
        '800': '#05603A',
        '900': '#054F31'
      },
      success: {
        '25': '#F6FEF9',
        '50': '#ECFDF3',
        '100': '#D1FADF',
        '200': '#A6F4C5',
        '300': '#6CE9A6',
        '400': '#32D583',
        '500': '#12B76A',
        '600': '#039855',
        '700': '#027A48',
        '800': '#05603A',
        '900': '#054F31'
      },
      error: {
        '25': '#FFFBFA',
        '50': '#FEF3F2',
        '100': '#FEE4E2',
        '200': '#FECDCA',
        '300': '#FDA29B',
        '400': '#F97066',
        '500': '#F04438',
        '600': '#D92D20',
        '700': '#B42318',
        '800': '#912018',
        '900': '#7A271A'
      },
      warning: {
        '25': '#FFFCF5',
        '50': '#FFFAEB',
        '100': '#FEF0C7',
        '200': '#FEDF89',
        '300': '#FEC84B',
        '400': '#FDB022',
        '500': '#F79009',
        '600': '#DC6803',
        '700': '#B54708',
        '800': '#93370D',
        '900': '#7A2E0E'
      },
      gray: {
        '25': '#FCFCFD',
        '50': '#F9FAFB',
        '100': '#F2F4F7',
        '200': '#EAECF0',
        '300': '#D0D5DD',
        '400': '#98A2B3',
        '500': '#667085',
        '600': '#475467',
        '700': '#344054',
        '800': '#1D2939',
        '900': '#1E2329'
      }
    }
  },
  presets: [
    presetUno(), // Mặc định (@unocss/preset-wind).
    presetAttributify(), // CSS trên DOM như 1 Attribute(@unocss/preset-attributify)
    presetIcons({
      scale: 1.2,
      warn: true
    }), // Sử dụng bất kỳ icon nào làm class or attribute.(@unocss/preset-icons)
    presetWebFonts({
      fonts: {
        sans: 'Roboto',
        mono: ['Fira Code', 'Fira Mono:400,700']
      }
    }) // sử dụng bất kì Font mà thư viện có sẵn hoặc có thể tự custome font (@unocss/preset-web-fonts)
  ],
  transformers: [
    transformerDirectives(), // @apply, @screen and theme() directive (@unocss/transformer-directives)
    transformerVariantGroup() // nhóm CSS lại với nhau => hover:(bg-gray-400 font-medium) (@unocss/transformer-variant-group)
  ]
})
