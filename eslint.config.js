import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config([
  {
    ignores: ['dist', 'node_modules'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    rules: {
      // shadcn/ui files co-export variant helpers (cva) beside components.
      // Fast-refresh hint only; keep as a warning like the Vite template.
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Experimental react-hooks v7 rule; flags intentional "init state from
      // props/external source" effects (e.g. auto-selecting the first item).
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Cucumber BDD steps run in Node, not the browser, and the World pattern
    // intentionally aliases `this` for use inside fetch stubs.
    files: ['features/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-this-alias': 'off',
    },
  },
])
