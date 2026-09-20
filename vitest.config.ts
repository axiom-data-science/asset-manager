import { resolve } from ***REMOVED***path***REMOVED***
import { defineConfig } from ***REMOVED***vitest/config***REMOVED***

export default defineConfig({
    resolve: {
        alias: {
            ***REMOVED***@***REMOVED***: resolve(__dirname, ***REMOVED***./src***REMOVED***),
        },
    },
    test: {
        environment: ***REMOVED***node***REMOVED***,
    },
})