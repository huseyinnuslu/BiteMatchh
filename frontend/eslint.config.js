import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Vite PWA tarafindan uretilen servis calisani kendi ortamina ait global'leri
  // kullanir; React kaynak kodu denetiminden ayri tutulur.
  globalIgnores(['dist', 'public/sw.js']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Bunlar mevcut, calisan effect kaliplarina dair React Compiler tavsiyeleri.
      // Beta oncesi gorunur kalsinlar ama gercek build/lint hatasini maskelemesinler.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-refresh/only-export-components': 'off',
      // Kullanilmayan adlar teknik borc olarak raporlanir; calisan beta akisini
      // yalnizca kozmetik bir import nedeniyle engellemez.
      'no-unused-vars': 'warn',
    },
  },
])
