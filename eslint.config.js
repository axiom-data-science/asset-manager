import js from ***REMOVED***@eslint/js***REMOVED***
import globals from ***REMOVED***globals***REMOVED***
import reactHooks from ***REMOVED***eslint-plugin-react-hooks***REMOVED***
import reactRefresh from ***REMOVED***eslint-plugin-react-refresh***REMOVED***
import tseslint from ***REMOVED***typescript-eslint***REMOVED***
import { defineConfig, globalIgnores } from ***REMOVED***eslint/config***REMOVED***

export default defineConfig([
  globalIgnores([***REMOVED***dist***REMOVED***]),
  {
    files: [***REMOVED*****/*.{ts,tsx}***REMOVED***],
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
  },
])
