import { mergeConfig } from 'vite'
import appConfig from './vite.config'

export default mergeConfig(appConfig, {
    server: {
        port: 4423,
        open: '/import-test.html',
    },
})