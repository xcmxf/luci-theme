#
# Copyright (C) 2025 eamonxg
# Licensed under the Apache License, Version 2.0.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-theme-md3e
PKG_VERSION:=1.0.0
PKG_RELEASE:=5
PKG_LICENSE:=Apache-2.0 OFL-1.1
PKG_MAINTAINER:=md3e theme contributors

LUCI_TYPE:=theme
LUCI_TITLE:=MD3E Theme (A Material Design 3 Expressive-inspired LuCI theme)
LUCI_DEPENDS:=+luci-base
LUCI_DESCRIPTION:=Material Design 3 Expressive-inspired LuCI theme for OpenWrt.
LUCI_PKGARCH:=all

define Package/luci-theme-md3e/postrm
[ -n "$${IPKG_INSTROOT}" ] || {
	if [ "$$(uci -q get luci.main.mediaurlbase)" = "/luci-static/md3e" ]; then
		uci -q set luci.main.mediaurlbase='/luci-static/bootstrap'
	fi
	uci -q delete luci.themes.MD3E
	uci -q commit luci
}
endef

LUCI_MINIFY_CSS:=
CONFIG_LUCI_CSSTIDY:=

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
