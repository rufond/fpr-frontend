import process from 'node:process'

const backendTarget = process.env.FPR_BACKEND_URL || 'http://127.0.0.1:8080'

export default defineNuxtConfig({
  ssr: false,
  buildDir: '.nuxt',
  compatibilityDate: '2026-08-18',

  devtools: {
    enabled: false,
  },

  runtimeConfig: {
    public: {
      realtimeUrl: process.env.FPR_DEV_REALTIME_URL || '',
    },
  },

  css: ['~/assets/css/base.css'],

  app: {
    head: {
      htmlAttrs: {
        lang: 'ru',
      },
      title: 'Фонд первичных размещений',
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
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
        },
      },
    },
  },
})
