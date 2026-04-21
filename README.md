# MD3E Theme

MD3E is a Material Design 3 Expressive-inspired theme for OpenWrt LuCI.

Package: `luci-theme-md3e`

The theme keeps the OpenWrt LuCI package layout from `tickcount/luci-theme`, with the UI rebuilt around a token-first Material-style system adapted for router workflows.

## Font Licenses

This repository redistributes the following third-party font files:

- `Inter` under the SIL Open Font License 1.1. See `LICENSES/Inter-OFL-1.1.txt`.
- `Geist Mono` under the SIL Open Font License 1.1. See `LICENSES/Geist-OFL-1.1.txt`.

## Credits

This theme references ideas, structure, or implementation patterns from the following repositories:

- [tickcount/luci-theme](https://github.com/tickcount/luci-theme)
  Package layout, build architecture, and the source-first workflow used by this repository.

- [saku-bruh/luci-theme-material3](https://github.com/saku-bruh/luci-theme-material3)
  Visual reference for LuCI-specific Material 3 theming patterns and prior router UI adaptation work.

- [material-components/material-web](https://github.com/material-components/material-web)
  Reference for Material token structure, especially the `md-sys-*` and `md-comp-*` style of system and component tokens.

- [openwrt/luci](https://github.com/openwrt/luci)
  Upstream LuCI templates, behaviors, and runtime constraints that the theme has to adapt to.
