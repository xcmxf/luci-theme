# Development Guide

This guide covers the development workflow for the MD3E theme, from environment setup to package-ready build output.

## Prerequisites

- **Node.js v20.19+**
- **pnpm** managed through Corepack
- **Tailwind CSS knowledge**
- **Network access** to an OpenWrt device when using the live proxy workflow

## Environment Setup

### 1. Clone and Install

```bash
git clone <your-fork-or-repo-url>
cd luci-theme-md3e/.dev/

corepack enable
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Set `VITE_OPENWRT_HOST` in `.env` to your router address, for example `http://192.168.1.1`.

## Development Workflow

### Start Development Server

```bash
cd luci-theme-md3e/.dev/
pnpm dev
```

The development server starts on `http://127.0.0.1:5173` by default and proxies requests to the configured OpenWrt host.

### Start Local Preview Harness

```bash
cd luci-theme-md3e/.dev/
pnpm preview
```

This starts a router-free local preview page at `http://127.0.0.1:4173/` and redirects root to `preview.html` automatically. Use this route-shaped preview page for subsequent content-area iterations.

### Proxy Behavior

1. `/cgi-bin` and `/luci-static` requests are proxied to the OpenWrt device.
2. CSS requests to `/luci-static/md3e/main.css` are rewritten to `.dev/src/media/main.css`.
3. JS requests for theme resources are served directly from `.dev/src/resource/`.
4. The dev server injects Vite HMR support into proxied HTML responses.
5. `/` redirects to `/cgi-bin/luci`.

### Live Reload Behavior

- **CSS changes**: full page reload
- **JS changes**: full page reload
- **Template changes** (`.ut`): copy to the router and restart `uhttpd`

### Device-First Visual Verification

For visual changes that target real LuCI pages, verify on the local OpenWrt
device before calling the task done. Local preview and headless fixtures are
useful for quick checks, but they do not replace the device pass.

Default flow:

1. Build or verify so `htdocs/luci-static/` is current.
2. Copy only the changed generated assets into the device `/www` tree, for
   example `htdocs/luci-static/md3e/main.css` to
   `/www/luci-static/md3e/main.css`.
3. Clear LuCI runtime cache after template or JS changes.
4. For direct `/www` CSS replacement, ensure the served page uses a fresh
   asset cache key. The theme header appends `asset_cache_version` to
   `main.css`; bump the device-side UCI value for local visual checks when
   the package release version is unchanged.
5. Confirm the deployed static asset with an HTTP fetch and hash comparison
   from the workstation.
6. Open the affected LuCI page on the device and check desktop/mobile and
   light/dark rendering when the change can affect layout or contrast.

Keep local device addresses, credentials, screenshots, and ad hoc logs out of
the tracked repository.

## Building for Production

### Build Command

```bash
cd luci-theme-md3e/.dev/
pnpm build
```

Build output lands in `../htdocs/luci-static/`.

### Build Output

```text
htdocs/luci-static/
├── md3e/
│   ├── main.css
│   ├── fonts/
│   └── images/
└── resources/
    └── menu-md3e-v2.js
```

### Build Process

1. Vite builds the CSS entry point `src/media/main.css`
2. The custom PostCSS step removes `@layer` wrappers for LuCI compatibility
3. Static assets are copied from `.dev/public/md3e/`
4. JS resources are minified independently with Terser

### Tailwind Source Scope

Production Tailwind scanning is allowlisted from `src/media/main/00-tailwind-sources.css` with `source(none)`. Only `ucode/template/themes/md3e`, `.dev/src/media`, and `.dev/src/resource` are scanned. Local docs and `preview.html` remain outside the production source set so preview text cannot create accidental utility output.

## Maintenance Checks

```bash
cd luci-theme-md3e/.dev/
npm run verify
```

The verifier checks formatting, package/cache version alignment, the shared layout breakpoint used by the real LuCI shell and local preview, mirrored static assets/orphans, whether `htdocs/luci-static/` matches a fresh `.dev` build, Terser output safety, Tailwind source scope, and CSS size budgets.

The shared mobile/desktop shell breakpoint is maintained in `src/shared/layout-breakpoints.js`. CSS part files and assembled LuCI JS use the documented `__MD3E_MOBILE_LAYOUT_MAX_WIDTH__` / `__MD3E_DESKTOP_LAYOUT_MIN_WIDTH__` tokens, which `scripts/assemble-sources.js` resolves into browser-compatible media query values. The LuCI `header.ut` template keeps one server-side `mobile_layout_max_width` constant for template-local CSS, and `verify-breakpoints` enforces that it matches the shared source and derives the desktop threshold.

## Split Source Entries

The build entry files are assembled from smaller source parts:

- `src/media/main.css` is assembled from `src/media/main/*.css`.
- `public/md3e/components.css` is assembled from `src/public-md3e/components/*.css`.
- `src/resource/menu-md3e-v2.js` is assembled from `src/resource/menu-md3e-v2/*.js`.

Source part files use two-digit numeric prefixes to make cascade and execution order explicit. Keep names scoped to the responsibility they own, for example `20-layout-shell.css`, `23-tables-forms-segmented.css`, `22-tabs.js`, and `50-root-and-desktop-rendering.js`. When adding or renaming a part, update `scripts/source-assemblies.js`; `verify:source-parts` fails if a numbered part is left out of the manifest.

After editing source parts, run:

```bash
cd luci-theme-md3e/.dev/
npm run assemble
```

The `dev`, `preview`, `build`, and `verify` scripts run assembly automatically before they use the entry files.

## Package Compilation

### Via GitHub Actions

Use [`.github/workflows/package-check.yml`](../../.github/workflows/package-check.yml) to verify `.ipk` and `.apk` package builds on pushes, pull requests, or manual dispatch.

## Directory Structure

```text
luci-theme-md3e/
├── .dev/
│   ├── docs/
│   │   └── DEVELOPMENT.md
│   ├── public/md3e/
│   ├── scripts/
│   │   └── clean.js
│   ├── src/
│   │   ├── assets/icons/
│   │   ├── media/main.css
│   │   └── resource/menu-md3e-v2.js
│   ├── .env.example
│   ├── .prettierrc
│   ├── package.json
│   ├── pnpm-lock.yaml
│   └── vite.config.ts
├── .github/
├── htdocs/luci-static/
│   ├── md3e/
│   └── resources/menu-md3e-v2.js
├── root/etc/uci-defaults/30_luci-theme-md3e
├── ucode/template/themes/md3e/
├── Makefile
└── README.md
```

## Tools and Technologies

- **Tailwind CSS v4**
- **Vite**
- **pnpm**
- **lightningcss**
- **Terser**
- **Prettier**
