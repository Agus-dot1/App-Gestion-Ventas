## Overview

Switch the setup source to a public GitHub Release asset so users get a direct, one‑click download link. Configure the app to read a `NEXT_PUBLIC_SETUP_URL` and (optionally) implement native Electron download for auto‑save with progress.

## Step 1: Publish the Asset

1. Ensure the installer file (e.g., `SalesManagerSetup.exe` or `.zip`) is built and ready.
2. Create a tag: for example `v1.1.0` (match your app version if desired).
3. Create a GitHub Release for that tag:

   * Go to your repo → Releases → “Draft a new release”.

   * Select tag `v1.1.0` (or create it), add release notes.

   * Upload the installer file; note its exact `asset_name`.
4. Copy the direct download URL (public repo):

   * Format: `https://github.com/<owner>/<repo>/releases/download/<tag>/<asset_name>`

   * Example: `https://github.com/you/App-Gestion-Ventas/releases/download/v1.1.0/SalesManagerSetup.exe`

## Step 2: Configure Environment

1. Add to `.env`:

   * `NEXT_PUBLIC_SETUP_URL=https://github.com/<owner>/<repo>/releases/download/<tag>/<asset_name>`
2. Keep `NEXT_PUBLIC_GDRIVE_SETUP_FILE_ID` as fallback if you want dual-provider support.

## Step 3: Renderer Update (Ajustes)

1. In `app/ajustes/page.tsx`, update `handleDownloadSetup` to:

   * Prefer `process.env.NEXT_PUBLIC_SETUP_URL` when present.

   * Fallback to Drive ID.

   * In web build: `window.open(url, '_blank')` starts the download immediately for GitHub Releases.

   * In desktop: keep current behavior via `openExternal(url)` for now.

## Step 4 (Optional): Native Electron Download

1. Add IPC `download:setup` to `electron/main.ts` and use `webContents.downloadURL(url)`; handle `will-download`:

   * Set default save path to `app.getPath('downloads')` (no prompt), or show Save As dialog.

   * Emit progress (`download:progress`) and completion (`download:done`).
2. Expose `download.setup`, `download.onProgress`, `download.onDone` in `electron/preload.js` and type them in `types/electron.d.ts`.
3. Update Ajustes UI to show progress and final path.

## Validation

* Test with the GitHub URL in both web and Electron builds: the download should begin immediately in browser; Electron can auto‑save with the optional native implementation.

* Confirm toasts and disabled states behave correctly.

## Deliverables

* Release asset published with a stable direct URL.

* `.env` configured with `NEXT_PUBLIC_SETUP_URL`.

* Ajustes page updated to prefer GitHub URL.

* (Optional) Electron native download implemented for seamless in‑app save.

