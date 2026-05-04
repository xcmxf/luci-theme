  initMobileMenu() {
    const overlay = document.querySelector("#mobile-menu-overlay");
    const menuToggle = document.querySelector("#mobile-menu-btn");
    const closeBtn = document.querySelector("#mobile-nav-close");

    if (!menuToggle || !overlay) return;
    if (overlay.dataset.md3eMobileInit === "true") return;
    overlay.dataset.md3eMobileInit = "true";

    const resetMobileDrawer = () => {
      this.resetMobilePrimaryItems?.();
    };

    const setOpen = (open) => {
      if (open && !this.isMobileViewport()) return;

      overlay.classList.toggle("mobile-menu-open", open);
      menuToggle.classList.toggle("active", open);
      menuToggle.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
      document.body.classList.toggle("mobile-menu-open", open);

      if (open) {
        requestAnimationFrame(() => this.expandActiveMobilePrimaryItem?.());
      } else {
        resetMobileDrawer();
      }
    };

    this.setMobileMenuOpen = setOpen;

    menuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      setOpen(!overlay.classList.contains("mobile-menu-open"));
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", () => setOpen(false));
    }

    overlay.addEventListener("click", (e) => {
      if (e.target.closest(".mobile-nav .md3e-mobile-secondary-link, .mobile-nav a.header-logout-btn")) {
        setOpen(false);
        return;
      }
      if (e.target === overlay) setOpen(false);
    });

    if (!this._mobileEscHandler) {
      this._mobileEscHandler = (e) => {
        if (
          e.key === "Escape" &&
          overlay.classList.contains("mobile-menu-open")
        ) {
          this.setMobileMenuOpen?.(false);
        }
      };
      document.addEventListener("keydown", this._mobileEscHandler);
    }
  },
