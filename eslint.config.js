import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'src/aws-exports.js']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Migration note: the repo currently contains many explicit `any`s.
      // We intentionally defer typing cleanup; lint should not block progress.
      '@typescript-eslint/no-explicit-any': 'off',

      // This rule is overly strict for common state synchronization patterns.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
