# Node.js Version Compatibility for GetGSA

## ⚠️ Important: Node.js Version Requirement

This project requires **Node.js v18.x or v20.x LTS** due to native module dependencies (specifically `better-sqlite3`).

**Node.js v23.x is NOT supported** due to compilation issues with native modules.

## Current Status

✅ **Node.js v20 LTS is installed** on your system at `/opt/homebrew/opt/node@20/bin`

✅ **Dependencies are installed** with the correct Node version

## How to Run the Project

### Option 1: Use the Development Script (Recommended)

```bash
./dev.sh
```

This script automatically uses Node.js v20 and starts the development server.

### Option 2: Manual Node Version Switch

**For this terminal session only:**
```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
npm run dev
```

**Permanent switch (add to your `~/.zshrc`):**
```bash
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Option 3: Use Node Version Manager (nvm)

If you have `nvm` installed:
```bash
nvm use 20
npm run dev
```

The `.nvmrc` file in the project root will automatically select the correct version.

## Verification

Check your current Node version:
```bash
node --version
```

Should show: `v20.19.5` (or similar v20.x)

## Why This Matters

- **better-sqlite3** requires native compilation using `node-gyp`
- Node.js v23 has breaking changes in native module APIs
- Node.js v20 LTS is the stable, production-ready version

## Troubleshooting

### "npm install" fails with better-sqlite3 errors

1. Switch to Node v20:
   ```bash
   export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
   ```

2. Clean and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### "command not found: node" after switching

Make sure the path is exported in your current terminal session:
```bash
which node
# Should show: /opt/homebrew/opt/node@20/bin/node
```

## Additional Notes

- The `dev.sh` script handles all Node version switching automatically
- All npm scripts (`npm run dev`, `npm test`, `npm run build`) work correctly with v20
- Docker deployment is unaffected (uses Node v18 alpine in container)

## Quick Reference

| Command | Purpose |
|---------|---------|
| `./dev.sh` | Start development server (handles Node version) |
| `./verify.sh` | Verify installation (checks Node version) |
| `node --version` | Check current Node version |
| `npm run dev` | Start server (requires Node v20 in PATH) |
| `npm test` | Run test suite (requires Node v20 in PATH) |

## Summary

✅ **Everything is already configured correctly!**

Just use `./dev.sh` to start the application, and it will automatically use Node.js v20.
