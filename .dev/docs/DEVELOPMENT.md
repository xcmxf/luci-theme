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

This starts a router-free local preview page at `http://127.0.0.1:4173/` and redirects root to `preview-luci-real.html` automatically. Use this real-route preview page for subsequent content-area iterations.

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
