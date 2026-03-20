# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores([***REMOVED***dist***REMOVED***]),
  {
    files: [***REMOVED*****/*.{ts,tsx}***REMOVED***],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: [***REMOVED***./tsconfig.node.json***REMOVED***, ***REMOVED***./tsconfig.app.json***REMOVED***],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from ***REMOVED***eslint-plugin-react-x***REMOVED***
import reactDom from ***REMOVED***eslint-plugin-react-dom***REMOVED***

export default defineConfig([
  globalIgnores([***REMOVED***dist***REMOVED***]),
  {
    files: [***REMOVED*****/*.{ts,tsx}***REMOVED***],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs[***REMOVED***recommended-typescript***REMOVED***],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: [***REMOVED***./tsconfig.node.json***REMOVED***, ***REMOVED***./tsconfig.app.json***REMOVED***],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
