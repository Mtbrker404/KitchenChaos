import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// `npm run dev`      -> HTTPS on your network (needed for WebXR on the Pico)
// `npm run dev:http` -> plain HTTP, for desktop testing on localhost only
export default defineConfig(({ mode }) => ({
  plugins: mode === 'http' ? [] : [basicSsl()],
  server: { host: true },
}))
