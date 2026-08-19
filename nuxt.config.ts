import process from 'node:process'

const backendTarget = process.env.FPR_BACKEND_URL || 'http://127.0.0.1:8080'

export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2026-08-18',

  devtools: {
    enabled: false,
  },

  css: ['~/assets/css/base.css'],

  app: {
    head: {
      htmlAttrs: {
        lang: 'ru',
      },
      title: 'Фонд первичных размещений',
      meta: [
        {
          name: 'description',
          content: 'Неофициальный информационный сайт о ЗПИФ «Фонд первичных размещений».',
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
      ],
    },
  },

  vue: {
    optionsApi: false,
  },

  vite: {
    build: {
      cssCodeSplit: true,
    },
    server: {
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  },
})
