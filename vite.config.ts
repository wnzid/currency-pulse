import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
function normalizeBasePath(input: string | undefined): string {
  if (!input) {
    return '/'
  }

  const trimmed = input.trim()
  if (!trimmed) {
    return '/'
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withLeadingSlash.endsWith('/')
    ? withLeadingSlash
    : `${withLeadingSlash}/`
}

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const buildBasePath = normalizeBasePath(process.env.VITE_BASE_PATH)

  return {
    plugins: [react()],
    base: command === 'build' ? buildBasePath : '/',
  }
})
