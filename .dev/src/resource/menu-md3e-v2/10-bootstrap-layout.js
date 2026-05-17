  __init__() {
    this.initResponsiveLayout();
    ui.menu.load().then((tree) => this.render(tree));
    this.initMobileMenu();
    this.initNetworkStatusCards();
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

  forEachElementMatch(scope, selector, callback) {
    if (!scope || !selector || typeof callback !== "function") return;

    if (scope instanceof HTMLElement && scope.matches(selector)) {
      callback(scope);
    }

    scope.querySelectorAll?.(selector).forEach(callback);
  },

  watchForAddedElement(watchKey, target, selector, callback, timeout = 4000) {
    if (!target || this[watchKey]) return;

    const watchers = target._md3eLazyInitWatchers || new Map();
    target._md3eLazyInitWatchers = watchers;

    const syncSelector = () => {
      target._md3eLazyInitSelector = Array.from(watchers.values())
        .map((watcher) => watcher.selector)
        .filter(Boolean)
        .join(", ");
    };

    const stop = () => {
      const watcher = watchers.get(watchKey);
      if (watcher?.timeoutId) clearTimeout(watcher.timeoutId);
      watchers.delete(watchKey);
      this[watchKey] = null;

      if (!watchers.size && target._md3eLazyInitObserver) {
        target._md3eLazyInitObserver.disconnect();
        target._md3eLazyInitObserver = null;
        target._md3eLazyInitSelector = "";
      } else {
        syncSelector();
      }
    };

    const watcher = {
      selector,
      timeoutId: setTimeout(stop, timeout),
      run: () => {
        stop();
        callback();
      },
    };

    watchers.set(watchKey, watcher);
    this[watchKey] = watcher;
    syncSelector();

    if (!target._md3eLazyInitObserver) {
      target._md3eLazyInitObserver = new MutationObserver((mutations) => {
        const matched = new Set();
        const combinedSelector = target._md3eLazyInitSelector;
        if (!combinedSelector) return;

        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== 1) continue;
            if (
              !node.matches?.(combinedSelector) &&
              !node.querySelector?.(combinedSelector)
            ) {
              continue;
            }

            for (const [key, activeWatcher] of watchers) {
              if (
                node.matches?.(activeWatcher.selector) ||
                node.querySelector?.(activeWatcher.selector)
              ) {
                matched.add(key);
              }
            }
          }
        }

        matched.forEach((key) => watchers.get(key)?.run());
      });

      target._md3eLazyInitObserver.observe(target, {
        childList: true,
        subtree: true,
      });
    }
  },

  observeDomMutations(target, subscriberKey, callback, options = {}) {
    if (
      !(target instanceof HTMLElement) ||
      !subscriberKey ||
      typeof callback !== "function"
    ) {
      return null;
    }

    const hub = target._md3eMutationHub || {
      subscribers: new Map(),
      observer: null,
      options: {
        childList: false,
        subtree: false,
        attributes: false,
        attributeFilter: new Set(),
        observeAllAttributes: false,
      },
    };
    target._md3eMutationHub = hub;

    const nextOptions = {
      childList: Boolean(options.childList),
      subtree: Boolean(options.subtree),
      attributes: Boolean(options.attributes),
      attributeFilter: Array.isArray(options.attributeFilter)
        ? options.attributeFilter
        : null,
    };

    hub.subscribers.set(subscriberKey, { callback });
    hub.options.childList = hub.options.childList || nextOptions.childList;
    hub.options.subtree = hub.options.subtree || nextOptions.subtree;
    hub.options.attributes = hub.options.attributes || nextOptions.attributes;

    if (nextOptions.attributes) {
      if (nextOptions.attributeFilter) {
        nextOptions.attributeFilter.forEach((name) =>
          hub.options.attributeFilter.add(name),
        );
      } else {
        hub.options.observeAllAttributes = true;
      }
    }

    const observerOptions = {
      childList: hub.options.childList,
      subtree: hub.options.subtree,
    };

    if (hub.options.attributes) {
      observerOptions.attributes = true;
      if (!hub.options.observeAllAttributes && hub.options.attributeFilter.size) {
        observerOptions.attributeFilter = Array.from(hub.options.attributeFilter);
      }
    }

    if (!hub.observer) {
      hub.observer = new MutationObserver((mutations) => {
        const subscribers = Array.from(hub.subscribers.values());
        subscribers.forEach((subscriber) => subscriber.callback(mutations));
      });
    } else {
      hub.observer.disconnect();
    }

    hub.observer.observe(target, observerOptions);

    return () => {
      hub.subscribers.delete(subscriberKey);
      if (!hub.subscribers.size) {
        hub.observer.disconnect();
        target._md3eMutationHub = null;
      }
    };
  },

  scheduleFrame(frameKey, callback) {
    if (!frameKey || typeof callback !== "function") return;
    if (this[frameKey]) return;

    this[frameKey] = requestAnimationFrame(() => {
      this[frameKey] = null;
      callback();
    });
  },

  scheduleElementFrame(element, frameKey, callback) {
    if (!(element instanceof HTMLElement) || !frameKey || typeof callback !== "function") {
      return;
    }

    if (element[frameKey]) {
      cancelAnimationFrame(element[frameKey]);
    }

    element[frameKey] = requestAnimationFrame(() => {
      element[frameKey] = null;
      callback();
    });
  },
