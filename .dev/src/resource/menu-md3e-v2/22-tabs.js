  initVercelTabs() {
    if (this._vercelTabsInitialized) return;

    const target = document.getElementById("maincontent") || document.body;
    if (!target.querySelector(".cbi-tabmenu")) {
      this.watchForAddedElement(
        "_vercelTabsBootstrapObserver",
        target,
        ".cbi-tabmenu",
        () => this.initVercelTabs(),
      );
      return;
    }

    this._vercelTabsInitialized = true;
    this._vercelTabMenus = this._vercelTabMenus || new Set();

    const scheduleResizeSync = () => {
      clearTimeout(this._vercelTabsResizeTimer);
      this._vercelTabsResizeTimer = setTimeout(() => {
        this._vercelTabMenus?.forEach((menu) => {
          menu._md3eUpdateActiveIndicator?.();
        });
      }, 100);
    };

    if (!this._vercelTabsResizeHandler) {
      this._vercelTabsResizeHandler = scheduleResizeSync;
      window.addEventListener("resize", this._vercelTabsResizeHandler);
    }

    const bindTabMenu = (tabMenu) => {
      if (tabMenu.dataset.vercelInit) return;
      tabMenu.dataset.vercelInit = "1";

      const items = Array.from(tabMenu.querySelectorAll("li"));
      if (!items.length) return;

      let activeReady = false;
      let activeFrame = null;

      const updateActiveIndicator = () => {
        if (activeFrame) return;

        activeFrame = requestAnimationFrame(() => {
          activeFrame = null;

          const active = tabMenu.querySelector("li.cbi-tab");
          if (!active) return;

          const menuRect = tabMenu.getBoundingClientRect();
          const activeRect = active.getBoundingClientRect();
          const needsJump = !activeReady;

          requestAnimationFrame(() => {
            if (needsJump) tabMenu.classList.add("tab-active-jump");

            tabMenu.style.setProperty(
              "--tab-active-left",
              `${activeRect.left - menuRect.left}px`,
            );
            tabMenu.style.setProperty(
              "--tab-active-width",
              `${activeRect.width}px`,
            );
            tabMenu.style.setProperty(
              "--tab-active-top",
              `${activeRect.bottom - menuRect.top}px`,
            );

            if (needsJump) {
              activeReady = true;
              requestAnimationFrame(() =>
                tabMenu.classList.remove("tab-active-jump"),
              );
            }
          });
        });
      };

      tabMenu._md3eUpdateActiveIndicator = updateActiveIndicator;
      this._vercelTabMenus.add(tabMenu);

      let lastHoverTop = null;
      let hoverHideTimer = null;
      let hoverFrame = null;
      let hoverTarget = null;

      const updateHoverIndicator = (li) => {
        if (!li) {
          hoverHideTimer = setTimeout(() => {
            tabMenu.classList.remove("tab-hovering");
            lastHoverTop = null;
          }, 80);
          return;
        }
        if (hoverHideTimer) {
          clearTimeout(hoverHideTimer);
          hoverHideTimer = null;
        }

        hoverTarget = li;
        if (hoverFrame) return;

        hoverFrame = requestAnimationFrame(() => {
          hoverFrame = null;
          const current = hoverTarget;
          if (!current) return;

          const menuRect = tabMenu.getBoundingClientRect();
          const liRect = current.getBoundingClientRect();
          const newTop = liRect.top - menuRect.top;

          /* First hover (no previous position) or row jump: skip transition. */
          const needsJump =
            lastHoverTop === null ||
            (lastHoverTop !== null && Math.abs(newTop - lastHoverTop) > 2);

          requestAnimationFrame(() => {
            if (needsJump) tabMenu.classList.add("tab-hover-jump");

            tabMenu.style.setProperty(
              "--tab-hover-left",
              `${liRect.left - menuRect.left}px`,
            );
            tabMenu.style.setProperty("--tab-hover-width", `${liRect.width}px`);
            tabMenu.style.setProperty("--tab-hover-top", `${newTop}px`);
            tabMenu.classList.add("tab-hovering");
            lastHoverTop = newTop;

            if (needsJump) {
              requestAnimationFrame(() =>
                tabMenu.classList.remove("tab-hover-jump"),
              );
            }
          });
        });
      };

      items.forEach((li) => {
        li.addEventListener("mouseenter", () => updateHoverIndicator(li));
      });
      tabMenu.addEventListener("mouseleave", () => updateHoverIndicator(null));

      const observer = new MutationObserver(updateActiveIndicator);
      items.forEach((li) =>
        observer.observe(li, { attributes: true, attributeFilter: ["class"] }),
      );

      requestAnimationFrame(updateActiveIndicator);
    };

    const bindExistingTabs = (scope = document) => {
      if (scope instanceof HTMLElement && scope.matches(".cbi-tabmenu")) {
        bindTabMenu(scope);
      }

      scope.querySelectorAll?.(".cbi-tabmenu").forEach(bindTabMenu);
    };

    bindExistingTabs(document);

    this._vercelTabsObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          bindExistingTabs(node);
        }
      }
    });
    this._vercelTabsObserver.observe(target, { childList: true, subtree: true });
  },
