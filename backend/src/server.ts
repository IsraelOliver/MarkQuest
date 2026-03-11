import { createApp } from './app/create-app.js'
import { env } from './config/env.js'

const app = createApp()

app
  .listen({ port: env.PORT, host: env.HOST })
  .then(() => {
    app.log.info(`API running on http://${env.HOST}:${env.PORT}`)
  })
  .catch((error) => {
    app.log.error(error)
    process.exit(1)
  })
