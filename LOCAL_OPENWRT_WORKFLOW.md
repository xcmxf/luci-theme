# Local OpenWrt Theme Update Workflow

This note is for quick local LuCI theme iteration against a running OpenWrt
router or VM.

## Ask Before Starting

Before using any command, ask the user for:

- LuCI/OpenWrt address, for example `http://192.168.1.1/cgi-bin/luci/`
- SSH host or IP, usually the LuCI host without `http://` and path
- SSH username, commonly `root`
- SSH password, including whether it is empty

Do not store credentials in this repository or hard-code them into scripts.

## Rules

- Do not update build, release, asset, or icon cache version numbers unless the
  user explicitly asks.
- Do not revert unrelated dirty files.
- Prefer syncing only the files changed in this local working tree.
- Clear LuCI runtime cache after syncing templates or JS.
- Verify in the browser after syncing, especially on these reference pages:
  - `/cgi-bin/luci/admin/status/overview`
  - `/cgi-bin/luci/admin/network/interfaces`
  - `/cgi-bin/luci/admin/system/system`

## Common Remote Paths

Use `find` first if the install layout is uncertain:

```powershell
ssh root@<openwrt-host> 'find /usr /www -path "*themes/md3e/header.ut" -o -path "*luci-static/md3e/components.css" -o -path "*resources/menu-md3e-v2.js" 2>/dev/null'
```

Typical paths:

```text
/usr/share/ucode/luci/template/themes/md3e/header.ut
/usr/share/ucode/luci/template/themes/md3e/sysauth.ut
/www/luci-static/md3e/components.css
/www/luci-static/md3e/main.css
/www/luci-static/md3e/images/logo.svg
/www/luci-static/resources/menu-md3e-v2.js
```

## Sync Commands

Use `scp -O` for better compatibility with OpenWrt Dropbear.

Template changes:

```powershell
scp -O ucode\template\themes\md3e\header.ut root@<openwrt-host>:/usr/share/ucode/luci/template/themes/md3e/header.ut
scp -O ucode\template\themes\md3e\sysauth.ut root@<openwrt-host>:/usr/share/ucode/luci/template/themes/md3e/sysauth.ut
```

CSS changes:

```powershell
scp -O htdocs\luci-static\md3e\components.css root@<openwrt-host>:/www/luci-static/md3e/components.css
scp -O htdocs\luci-static\md3e\main.css root@<openwrt-host>:/www/luci-static/md3e/main.css
```

LuCI resource JS changes:

```powershell
scp -O htdocs\luci-static\resources\menu-md3e-v2.js root@<openwrt-host>:/www/luci-static/resources/menu-md3e-v2.js
```

Logo or image changes:

```powershell
scp -O htdocs\luci-static\md3e\images\logo.svg root@<openwrt-host>:/www/luci-static/md3e/images/logo.svg
```

Clear LuCI cache:

```powershell
ssh root@<openwrt-host> 'rm -rf /tmp/luci-* /tmp/luci-indexcache 2>/dev/null || true'
```

## Browser Verification Checklist

After syncing, hard-refresh the LuCI page or open a fresh browser context.

Check:

- Login page uses the current logo and theme styles.
- Navigation/sidebar/header/footer are unchanged unless that was the task.
- Main content is not hidden behind the side rail.
- No horizontal page scroll unless the specific component intentionally scrolls.
- Dark mode and light mode both render correctly.
- If browser theme auto-detection was changed, verify:

```js
document.documentElement.getAttribute("data-darkmode");
document.body.getAttribute("data-darkmode");
document.documentElement.getAttribute("data-theme-mode");
localStorage.getItem("md3e.theme");
localStorage.getItem("md3e.theme.source");
matchMedia("(prefers-color-scheme: dark)").matches;
```

Expected automatic theme behavior:

- With no manual theme selected, `data-theme-mode` should be `device`.
- Browser dark mode should set `data-darkmode` to `true`.
- Browser light mode should set `data-darkmode` to `false`.
- After the user manually toggles the theme, `md3e.theme.source` should be
  `manual`, and browser theme changes should not override it.

## Useful Git Checks

Before syncing, inspect exactly what changed:

```powershell
git status --short
git diff --stat
git diff -- <path>
```

Before finishing, make sure no version number was changed accidentally:

```powershell
git diff -- ucode\template\themes\md3e\header.ut | Select-String -Pattern 'release_cache_version|asset_cache_version|icon_cache_version'
```
