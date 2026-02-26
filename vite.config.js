import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: Replace 'REPOSITORY_NAME' below with your actual GitHub repository name
  // For example, if your repo is github.com/username/aussie-rescue, base should be '/aussie-rescue/'
  // If you are using a custom domain or User Page (username.github.io), you can remove this or set it to '/'
  base: '/REPOSITORY_NAME/',
})
