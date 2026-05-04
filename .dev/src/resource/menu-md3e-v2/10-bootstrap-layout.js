  __init__() {
    this.initResponsiveLayout();
    ui.menu.load().then((tree) => this.render(tree));
    this.initMobileMenu();
    this.initActionButtonGroups();
    this.initMobileActionGroups();
    this.initUciIndicator();
    this.initProgressRings();
    this.initVercelTabs();
    this.initTabContentAnimation();
    this.initCustomSelects();
    this.initDescriptionPlacement();
    this.initToastAutoDismiss();
    this.initModalOverride();
  },

  isMobileViewport() {
    return window.matchMedia(MOBILE_LAYOUT_QUERY).matches;
  },

  syncLayoutMode() {
    const mode = this.isMobileViewport() ? "mobile" : "desktop";
    document.documentElement.setAttribute("data-layout-mode", mode);
    document.body?.setAttribute("data-layout-mode", mode);

    if (mode === "desktop") {
      this.setMobileMenuOpen?.(false);
    } else {
      this.collapseDesktopShell?.();
    }

    this.syncIndicatorHost();
  },

  syncIndicatorHost() {
    const indicators = document.getElementById("indicators");
    const desktopHost = document.getElementById("sidebar-indicators-slot");
    const mobileHost = document.getElementById("mobile-indicators-slot");
    if (!indicators || !desktopHost || !mobileHost) return;

    const mobile = this.isMobileViewport();
    const targetHost = mobile ? mobileHost : desktopHost;

    if (indicators.parentElement !== targetHost) {
      targetHost.appendChild(indicators);
    }

    indicators.classList.toggle("sidebar-indicators", !mobile);
    indicators.classList.toggle("mobile-nav-footer-indicators", mobile);
  },

  initResponsiveLayout() {
    if (this._responsiveLayoutInitialized) return;
    this._responsiveLayoutInitialized = true;

    const media = window.matchMedia(MOBILE_LAYOUT_QUERY);
    const apply = () => this.syncLayoutMode();

    apply();
    media.addEventListener("change", apply);
  },
