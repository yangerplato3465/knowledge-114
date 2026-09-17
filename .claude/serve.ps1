# Start the React development server; source TSX requires Vite.
Push-Location (Split-Path -Parent $PSScriptRoot)
try { pnpm dev --port 8080 } finally { Pop-Location }
