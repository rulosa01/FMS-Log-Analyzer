import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Served at fmsdetective.com/lite/
  base: '/lite/',
  plugins: [react()],
})
