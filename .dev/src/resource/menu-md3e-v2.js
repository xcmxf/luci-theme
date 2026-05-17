"use strict";
"require baseclass";
"require ui";
"require request";

const MOBILE_LAYOUT_MAX_WIDTH = 920;
const MOBILE_LAYOUT_QUERY = `(max-width: ${MOBILE_LAYOUT_MAX_WIDTH}px)`;

return baseclass.extend({
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
  getModeMetadata(modeName) {
    const key = String(modeName || "").toLowerCase();

    return (
      {
        status: {
          panelTitle: _("Live system view"),
          copy: _(
            "Overview, runtime signals, and device status routes tuned for quick scanning.",
          ),
        },
        system: {
          panelTitle: _("System controls"),
          copy: _(
            "Firmware, host identity, storage, and time-sensitive maintenance settings.",
          ),
        },
        services: {
          panelTitle: _("Application stack"),
          copy: _(
            "Installed service pages and operational controls in a calmer secondary panel.",
          ),
        },
        network: {
          panelTitle: _("Traffic and transport"),
          copy: _(
            "Interfaces, wireless, routing, and policy destinations for active network work.",
          ),
        },
        admin: {
          panelTitle: _("Access and policy"),
          copy: _(
            "Authentication, permissions, and administrative routes with stronger state clarity.",
          ),
        },
        vpn: {
          panelTitle: _("Secure tunnels"),
          copy: _(
            "Encrypted transport pages and tunnel controls grouped as a focused workflow.",
          ),
        },
        nas: {
          panelTitle: _("Storage workspace"),
          copy: _(
            "File, storage, and sharing routes arranged as a durable utility surface.",
          ),
        },
        modem: {
          panelTitle: _("Cellular controls"),
          copy: _(
            "Signal, modem, and uplink routes grouped for mobile-network operations.",
          ),
        },
        statistics: {
          panelTitle: _("Observability"),
          copy: _(
            "Graphs, metrics, and diagnostics presented as a quieter monitoring surface.",
          ),
        },
      }[key] || {
        panelTitle: _("Section workspace"),
        copy: _(
          "Secondary destinations for this workspace, arranged as a supporting Material 3 panel.",
        ),
      }
    );
  },

  getWorkspaceCategories(tree) {
    return ui.menu.getChildren(tree).filter((category) => {
      if (!category || category.name === "logout") return false;
      return true;
    });
  },

  createModeIcon(modeName) {
    const key = String(modeName || "").toLowerCase();
    const specs =
      {
        status: [
          {
            tag: "path",
            attrs: {
              d: "M4 13h3l2.25-5L14 17l2.15-4H20",
            },
          },
        ],
        system: [
          {
            tag: "path",
            attrs: {
              d: "M5 6h14M5 18h14M8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm8 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
            },
          },
        ],
        services: [
          {
            tag: "path",
            attrs: {
              d: "M5 7.5 12 4l7 3.5-7 3.5-7-3.5Zm0 4.5L12 15.5 19 12M5 16.5 12 20l7-3.5",
            },
          },
        ],
        network: [
          {
            tag: "path",
            attrs: {
              d: "M4.5 10.5a11 11 0 0 1 15 0M7.5 13.5a6.5 6.5 0 0 1 9 0M10.5 16.5a2.5 2.5 0 0 1 3 0M12 20h.01",
            },
          },
        ],
        admin: [
          {
            tag: "path",
            attrs: {
              d: "M8 11V8.5a4 4 0 0 1 8 0V11M6.5 11h11v8h-11z",
            },
          },
        ],
        vpn: [
          {
            tag: "path",
            attrs: {
              d: "M12 4 6 6.5V12c0 4 2.55 6.85 6 8 3.45-1.15 6-4 6-8V6.5L12 4Zm-2.25 8.5 1.75 1.75L14.75 11",
            },
          },
        ],
        nas: [
          {
            tag: "path",
            attrs: {
              d: "M5 6.5h14v11H5zM8 10.5h.01M8 14.5h.01M11 10.5h5M11 14.5h5",
            },
          },
        ],
        modem: [
          {
            tag: "path",
            attrs: {
              d: "M6 18h12M8.5 15V9.5M12 15V6.5M15.5 15V11.5",
            },
          },
        ],
        statistics: [
          {
            tag: "path",
            attrs: {
              d: "M5 18h14M8 16V10M12 16V7M16 16v-4",
            },
          },
        ],
      }[key] || [
        {
          tag: "path",
          attrs: {
            d: "M6 6h5v5H6zm7 0h5v5h-5zM6 13h5v5H6zm7 0h5v5h-5z",
          },
        },
      ];

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");

    specs.forEach((spec) => {
      const element = document.createElementNS(
        "http://www.w3.org/2000/svg",
        spec.tag || "path",
      );
      Object.entries(spec.attrs || {}).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
      svg.appendChild(element);
    });

    return svg;
  },
  buildRailLogoButton() {
    const source = document.querySelector(
      "header .brand-logo, header .mobile-header-brand-logo",
    );
    const logoSrc = source?.getAttribute("src");
    if (!logoSrc) return null;

    const brand = document.querySelector(
      "header .brand, header .mobile-header-brand",
    );
    const label =
      document.querySelector("header .brand-text")?.textContent?.trim() ||
      brand?.getAttribute("aria-label") ||
      _("Home");

    return E(
      "a",
      {
        class: "md3e-rail-logo",
        href: brand?.getAttribute("href") || L.url(),
        "aria-label": label,
        title: label,
      },
      [E("img", { src: logoSrc, alt: "", width: "28", height: "28" })],
    );
  },

  buildModeLink(mode, href, isActive, variant = "desktop") {
    const link = E("a", {
      class:
        "md3e-mode-link" +
        (variant === "mobile" ? " md3e-mode-link--mobile" : "") +
        (isActive ? " active" : ""),
      href,
      "data-mode": mode.name,
    });

    const icon = E("span", {
      class: "md3e-mode-link__icon",
      "aria-hidden": "true",
    });
    icon.appendChild(this.createModeIcon(mode.name));

    link.appendChild(icon);
    link.appendChild(
      E("span", { class: "md3e-mode-link__label" }, [_(mode.title)]),
    );

    return link;
  },

  buildModeButton(mode, isActive) {
    const button = E("button", {
      class: "md3e-mode-link" + (isActive ? " active" : ""),
      type: "button",
      "data-mode": mode.name,
      "aria-pressed": String(isActive),
      "aria-expanded": "false",
    });

    const icon = E("span", {
      class: "md3e-mode-link__icon",
      "aria-hidden": "true",
    });
    icon.appendChild(this.createModeIcon(mode.name));

    button.appendChild(icon);
    button.appendChild(
      E("span", { class: "md3e-mode-link__label" }, [_(mode.title)]),
    );

    return button;
  },

  buildSubnavList(category, baseUrl) {
    const list = E("ul", { class: "sidebar-list md3e-subnav-list" });
    const pages = ui.menu.getChildren(category);

    if (!pages.length) {
      list.appendChild(
        E("li", { class: "sidebar-item" }, [
          E("span", { class: "md3e-subnav-empty" }, [
            _("No secondary destinations in this section."),
          ]),
        ]),
      );
      return list;
    }

    pages.forEach((page) => {
      const isActive =
        category.name === L.env.dispatchpath[1] &&
        page.name === L.env.dispatchpath[2];

      list.appendChild(
        E("li", { class: "sidebar-item" + (isActive ? " active" : "") }, [
          E(
            "a",
            {
              class: "sidebar-link md3e-subnav-link" + (isActive ? " active" : ""),
              href: L.url(baseUrl, category.name, page.name),
            },
            [_(page.title)],
          ),
        ]),
      );
    });

    return list;
  },

  buildNavPanel(category, baseUrl) {
    const panel = E("nav", {
      class: "sidebar-nav",
      "aria-label": _(category.title),
    });

    panel.appendChild(
      E("div", { class: "md3e-nav-panel-scroll" }, [
        this.buildSubnavList(category, baseUrl),
      ]),
    );

    return panel;
  },

  buildMobilePrimaryButton(category, isActive, panelId = null) {
    const attrs = {
      class: "md3e-mobile-primary-toggle" + (isActive ? " active" : ""),
      type: "button",
      "data-mode": category.name,
      "aria-expanded": "false",
    };

    if (panelId) {
      attrs["aria-controls"] = panelId;
    }

    if (isActive) {
      attrs["aria-current"] = "page";
    }

    const button = E("button", attrs);

    const icon = E("span", {
      class: "md3e-mobile-primary-link__icon",
      "aria-hidden": "true",
    });
    icon.appendChild(this.createModeIcon(category.name));

    const label = E("span", { class: "md3e-mobile-primary-link__label" }, [
      _(category.title),
    ]);

    const arrow = E("span", {
      class: "md3e-mobile-primary-link__arrow",
      "aria-hidden": "true",
    });

    button.append(icon, label, arrow);
    return button;
  },

  buildMobileSecondaryList(category, baseUrl) {
    const pages = ui.menu.getChildren(category);
    const list = E("ul", { class: "md3e-mobile-secondary-list" });

    pages.forEach((page) => {
      const isActive =
        category.name === L.env.dispatchpath[1] &&
        page.name === L.env.dispatchpath[2];

      list.appendChild(
        E("li", { class: "md3e-mobile-secondary-item" }, [
          E(
            "a",
            {
              class:
                "md3e-mobile-secondary-link" + (isActive ? " active" : ""),
              href: L.url(baseUrl, category.name, page.name),
              ...(isActive ? { "aria-current": "page" } : {}),
            },
            [_(page.title)],
          ),
        ]),
      );
    });

    return list;
  },

  buildMobileSecondaryPanel(category, baseUrl, panelId, expanded = false) {
    const attrs = {
      class: "md3e-mobile-secondary-wrap",
      id: panelId,
      "aria-hidden": String(!expanded),
    };
    if (!expanded) {
      attrs.hidden = "";
    }

    const wrap = E("div", attrs);
    const panel = E("div", { class: "md3e-mobile-secondary-panel" });

    panel.appendChild(this.buildMobileSecondaryList(category, baseUrl));
    wrap.appendChild(panel);

    return wrap;
  },
  slugifyText(value, fallback = "section") {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback;
  },

  getPageOutlineSections(map) {
    if (!(map instanceof HTMLElement)) return [];

    const usedIds = new Set();

    return Array.from(map.children)
      .filter((node) => node.classList?.contains("cbi-section"))
      .map((section, index) => {
        const titleNode = section.querySelector(
          ":scope > .cbi-title h3, :scope > .cbi-title h2, :scope > h3, :scope > h2",
        );
        const label = this.getPageOutlineLabel(titleNode);
        if (label === "-") return null;
        if (!label) return null;
        if (!this.hasPageOutlineBodyContent(section, titleNode)) return null;

        if (!section.id || usedIds.has(section.id)) {
          const slug = this.slugifyText(label, `section-${index + 1}`);
          section.id = `md3e-${index + 1}-${slug}`;
        }

        usedIds.add(section.id);

        return { id: section.id, label, element: section };
      })
      .filter(Boolean);
  },

  isPageOutlineOmittedNode(node) {
    if (!(node instanceof HTMLElement)) return false;
    const hiddenState = ["hid", "den"].join("");
    if (node[hiddenState] || node.getAttribute("aria-" + hiddenState) === "true") {
      return true;
    }

    const style = window.getComputedStyle?.(node);
    const displayName = ["dis", "play"].join("");
    const displayNone = ["no", "ne"].join("");
    const visibilityName = ["vis", "ibility"].join("");
    const visibilityHidden = hiddenState;
    const visibilityCollapsed = ["coll", "apse"].join("");
    return Boolean(
      style &&
        (style[displayName] === displayNone ||
          style[visibilityName] === visibilityHidden ||
          style[visibilityName] === visibilityCollapsed),
    );
  },

  hasPageOutlineBodyContent(section, titleNode) {
    if (!(section instanceof HTMLElement)) return false;
    if (this.isPageOutlineOmittedNode(section)) return false;

    const tableElement = ["ta", "ble"].join("");
    const ignoreSelectors = [
      ".cbi-title",
      ".md3e-on-this-page",
      "script",
      "style",
      "template",
    ].join(", ");
    const contentSelectors = [
      tableElement,
      "svg",
      "canvas",
      "img",
      "input",
      "select",
      "textarea",
      ".ifacebox",
      ".ifacebadge",
      ".cbi-section-node",
      ".cbi-value",
      ".cbi-map-descr",
      ".alert-message",
    ].join(", ");

    return Array.from(section.children).some((child) => {
      if (!(child instanceof HTMLElement)) return false;
      if (titleNode && (child === titleNode || child.contains(titleNode))) {
        return false;
      }
      if (child.matches(ignoreSelectors)) return false;
      if (this.isPageOutlineOmittedNode(child)) return false;
      if (child.matches(contentSelectors) || child.querySelector(contentSelectors)) {
        return true;
      }

      const text = child.textContent?.replace(/\s+/g, " ").trim();
      return Boolean(text);
    });
  },

  getPageOutlineLabel(titleNode) {
    if (!(titleNode instanceof HTMLElement)) return "";

    const clone = titleNode.cloneNode(true);
    clone
      .querySelectorAll("button, .cbi-section-hide, .cbi-button")
      .forEach((node) => node.remove());

    const rawText = clone.textContent || "";
    const hideLabels = [_("Hide"), "Hide", "隐藏"].filter(Boolean);
    const label = hideLabels.reduce(
      (text, hideLabel) => text.split(hideLabel).join(""),
      rawText,
    );

    return label.replace(/\s+/g, " ").trim();
  },

  syncPageOutlineScrollState(outline) {
    if (!(outline instanceof HTMLElement)) return;
    if (this._pageOutlineScrollStateInit) return;

    this._pageOutlineScrollStateInit = true;
    let timer = null;

    const markScrolling = () => {
      const current = document.querySelector(".md3e-on-this-page");
      if (!(current instanceof HTMLElement)) return;

      current.classList.add("is-scrolling");
      if (timer) clearTimeout(timer);

      timer = setTimeout(() => {
        current.classList.remove("is-scrolling");
      }, 220);
    };

    window.addEventListener("wheel", markScrolling, { passive: true });
    window.addEventListener("scroll", markScrolling, { passive: true });
  },

  syncPageOutline(sections) {
    const main = document.querySelector("#maincontent");
    const content = document.querySelector(".docs-content");
    if (!main || !content) return;

    let outline = main.querySelector(":scope > .md3e-on-this-page");
    if (!sections || sections.length < 2) {
      if (this._pageOutlineObserver) {
        this._pageOutlineObserver.disconnect();
        this._pageOutlineObserver = null;
      }

      outline?.remove();
      document.body?.classList.remove("md3e-has-page-outline");
      return;
    }

    const visibleSections = sections.slice(0, 8);
    const visibleSectionIds = new Set(
      visibleSections.map((section) => section.id),
    );

    if (!(outline instanceof HTMLElement)) {
      outline = E("aside", {
        class: "md3e-on-this-page",
        "aria-label": _("On this page"),
      });
      main.insertBefore(outline, content.nextSibling);
    }

    const outlineKey = visibleSections
      .map((section) => `${section.id}:${section.label}`)
      .join("|");
    const sameElements =
      Array.isArray(outline._md3eOutlineElements) &&
      outline._md3eOutlineElements.length === visibleSections.length &&
      visibleSections.every(
        (section, index) => outline._md3eOutlineElements[index] === section.element,
      );
    if (outline.dataset.md3eOutlineKey === outlineKey && sameElements) {
      document.body?.classList.add("md3e-has-page-outline");
      return;
    }

    document.body?.classList.add("md3e-has-page-outline");
    outline.dataset.md3eOutlineKey = outlineKey;
    outline._md3eOutlineElements = visibleSections.map(
      (section) => section.element,
    );
    outline.innerHTML = "";

    const nav = E("nav", { class: "md3e-on-this-page__nav" });
    nav.appendChild(
      E("div", { class: "md3e-on-this-page__title" }, [_("On this page")]),
    );

    const list = E("ol", { class: "md3e-on-this-page__list" });
    visibleSections.forEach((section, index) => {
      list.appendChild(
        E("li", { class: "md3e-on-this-page__item" }, [
          E(
            "a",
            {
              class: "md3e-on-this-page__link" + (index === 0 ? " active" : ""),
              href: "#" + section.id,
            },
            [section.label],
          ),
        ]),
      );
    });

    nav.appendChild(list);
    outline.appendChild(nav);
    this.syncPageOutlineScrollState(outline);

    if (this._pageOutlineObserver) {
      this._pageOutlineObserver.disconnect();
    }

    const links = Array.from(
      outline.querySelectorAll(".md3e-on-this-page__link"),
    );
    const setActive = (id) => {
      if (!visibleSectionIds.has(id)) return false;

      links.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === "#" + id);
      });

      return true;
    };

    links.forEach((link) => {
      link.addEventListener("click", (event) => {
        const targetId = link.getAttribute("href")?.slice(1);
        if (!targetId) return;
        if (!visibleSectionIds.has(targetId)) return;

        const target = document.getElementById(targetId);
        if (!(target instanceof HTMLElement)) return;

        event.preventDefault();
        this._pageOutlineManualActiveUntil = Date.now() + 1400;
        setActive(targetId);
        history.replaceState(null, "", "#" + targetId);
        target.scrollIntoView({ block: "start", behavior: "smooth" });
        target.classList.add("md3e-outline-target-focus");

        if (target._md3eOutlineFocusTimer) {
          clearTimeout(target._md3eOutlineFocusTimer);
        }

        target._md3eOutlineFocusTimer = setTimeout(() => {
          target.classList.remove("md3e-outline-target-focus");
          delete target._md3eOutlineFocusTimer;
        }, 1400);
      });
    });

    this._pageOutlineObserver = new IntersectionObserver(
      (entries) => {
        if (Date.now() < (this._pageOutlineManualActiveUntil || 0)) return;

        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

        if (visible?.target?.id) {
          setActive(visible.target.id);
        }
      },
      {
        rootMargin: "-18% 0px -64% 0px",
        threshold: [0, 0.1, 0.4],
      },
    );

    visibleSections.forEach((section) =>
      this._pageOutlineObserver.observe(section.element),
    );
  },

  initPageChrome() {
    const content = document.querySelector(".docs-content");
    if (!content || content._md3ePageChromeInit) return;

    const getMap = () => {
      const view = content.querySelector("#view");
      return view?.querySelector(".cbi-map") || view;
    };

    const hasOutlineCandidate = () => {
      const map = getMap();
      return this.getPageOutlineSections(map).length >= 2;
    };

    if (!hasOutlineCandidate()) {
      this.watchForAddedElement(
        "_pageChromeBootstrapObserver",
        content,
        ".cbi-map, .cbi-section, .cbi-section-node, .cbi-section-table, .cbi-value, .alert-message",
        () => this.initPageChrome(),
      );
      return;
    }

    const decorate = () => {
      content.querySelector(".md3e-page-hero")?.remove();

      const map = getMap();
      if (!map) return;

      const sections = this.getPageOutlineSections(map);
      this.syncPageOutline(sections);
    };

    decorate();

    const isPageChromeMutation = (mutation) => {
      const pageChromeSelector =
        ".cbi-map, .cbi-section, .cbi-section-node, .cbi-section-table, .cbi-value, .alert-message";

      if (
        mutation.target instanceof HTMLElement
      ) {
        if (
          mutation.target.matches(pageChromeSelector) ||
          mutation.target.closest(".cbi-title, h2, h3")
        ) {
          return true;
        }
      }

      return [...mutation.addedNodes, ...mutation.removedNodes].some((node) => {
        if (node.nodeType !== 1) return false;
        return (
          node.matches?.(pageChromeSelector) ||
          node.querySelector?.(pageChromeSelector)
        );
      });
    };

    this.observeDomMutations(content, "page-chrome", (mutations) => {
      if (!mutations.some(isPageChromeMutation)) return;
      this.scheduleFrame("_pageChromeDecorateFrame", decorate);
    }, {
      childList: true,
      attributes: true,
      attributeFilter: ["hidden", "style", "class", "aria-hidden"],
      subtree: true,
    });

    content._md3ePageChromeInit = true;
  },
  initUciIndicator() {
    const original = ui.changes?.setIndicator;
    if (!original) return;

    ui.changes.setIndicator = function (n) {
      original.call(this, n);
      document
        .querySelector('[data-indicator="uci-changes"]')
        ?.setAttribute("data-count", n || 0);
    };
  },

  initProgressRings() {
    if (this._progressRingsInitialized) return;

    const target = document.getElementById("maincontent") || document.body;
    if (!target.querySelector(".cbi-progressbar")) {
      this.watchForAddedElement(
        "_progressRingBootstrapObserver",
        target,
        ".cbi-progressbar",
        () => this.initProgressRings(),
      );
      return;
    }

    this._progressRingsInitialized = true;
    const syncBar = (bar) => {
      if (!(bar instanceof HTMLElement)) return;

      const source = bar.querySelector(":scope > div");
      if (!(source instanceof HTMLElement)) return;

      const ring = this.ensureProgressRing(bar);
      this.syncProgressRing(bar, source, ring);

      if (!source._md3eProgressObserved) {
        source._md3eProgressObserved = new MutationObserver(() => {
          this.syncProgressRing(bar, source, ring);
        });
        source._md3eProgressObserved.observe(source, {
          attributes: true,
          attributeFilter: ["style"],
        });
      }
    };

    const syncAll = (scope = document) => {
      this.forEachElementMatch(scope, ".cbi-progressbar", syncBar);
    };

    syncAll(document);

    this._progressRingThemeHandler = () => syncAll(target);
    window.addEventListener("md3e:themechange", this._progressRingThemeHandler);

    this.observeDomMutations(target, "progress-rings", (mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== "childList") continue;
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          syncAll(node);
        }
      }
    }, {
      childList: true,
      subtree: true,
    });
  },

  ensureProgressRing(bar) {
    let ring = bar.querySelector(":scope > .md3e-progress-ring");

    if (!(ring instanceof HTMLElement)) {
      ring = document.createElement("span");
      ring.className = "md3e-progress-ring";
      ring.setAttribute("aria-hidden", "true");
      bar.insertBefore(ring, bar.firstChild);
    }

    if (!ring._md3eProgressArc) {
      ring.textContent = "";

      const radius = 14.5;
      const circumference = 2 * Math.PI * radius;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const track = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );
      const arc = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );

      svg.setAttribute("viewBox", "0 0 40 40");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");

      track.setAttribute("cx", "20");
      track.setAttribute("cy", "20");
      track.setAttribute("r", radius);
      track.setAttribute("fill", "none");
      track.setAttribute("stroke-width", "2.85");

      arc.setAttribute("cx", "20");
      arc.setAttribute("cy", "20");
      arc.setAttribute("r", radius);
      arc.setAttribute("fill", "none");
      arc.setAttribute("stroke-width", "3.3");
      arc.setAttribute("stroke-linecap", "round");
      arc.setAttribute("transform", "rotate(-90 20 20)");
      arc.setAttribute("stroke-dasharray", circumference.toFixed(2));

      svg.append(track, arc);
      ring.appendChild(svg);
      ring._md3eProgressTrack = track;
      ring._md3eProgressArc = arc;
      ring._md3eProgressCircumference = circumference;
    }

    return ring;
  },

  syncProgressRing(bar, source, ring) {
    const percent = Math.max(
      0,
      Math.min(100, Number.parseFloat(source.style.width) || 0),
    );

    bar.style.setProperty("--progress", `${percent}%`);
    this.updateProgressRingSvg(
      ring,
      percent / 100,
      this.getProgressRingPalette(bar),
    );
  },

  getProgressRingPalette(bar) {
    const styles = getComputedStyle(bar);
    const isDark =
      document.documentElement.getAttribute("data-darkmode") === "true";

    return {
      isDark,
      track: this.resolveProgressRingColor(
        styles.getPropertyValue("--md-sys-color-secondary-container").trim(),
        isDark ? "#353246" : "#ddd7ff",
      ),
      progress: this.resolveProgressRingColor(
        styles.getPropertyValue("--md-sys-color-secondary").trim(),
        isDark ? "#c6bcff" : "#7365f6",
      ),
    };
  },

  resolveProgressRingColor(value, fallback) {
    if (!this._progressRingColorCtx) {
      this._progressRingColorCtx = document.createElement("canvas").getContext(
        "2d",
      );
    }

    const ctx = this._progressRingColorCtx;
    if (!ctx) return fallback;

    ctx.fillStyle = fallback;

    try {
      ctx.fillStyle = value || fallback;
    } catch {}

    return ctx.fillStyle || fallback;
  },

  updateProgressRingSvg(ring, progress, palette) {
    if (!ring?._md3eProgressTrack || !ring?._md3eProgressArc) return;

    const clamped = Math.max(0, Math.min(1, progress || 0));
    const circumference = ring._md3eProgressCircumference;
    const dashOffset = circumference * (1 - clamped);
    const trackOpacity = palette.isDark ? 0.34 : 0.72;

    ring._md3eProgressTrack.setAttribute("stroke", palette.track);
    ring._md3eProgressTrack.setAttribute("stroke-opacity", trackOpacity);
    ring._md3eProgressArc.setAttribute("stroke", palette.progress);
    ring._md3eProgressArc.setAttribute(
      "stroke-dashoffset",
      dashOffset.toFixed(2),
    );
  },
  initModalOverride() {
    const origShow = ui.showModal;
    const origHide = ui.hideModal;
    if (!origShow || !origHide) return;

    let hideTimer = null;

    ui.showModal = function (title, children, ...classes) {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      document.body.classList.remove("modal-overlay-exit");
      const dlg = origShow.call(this, title, children, ...classes);
      dlg.classList.remove("modal-exit");
      return dlg;
    };

    ui.hideModal = function () {
      const overlay = document.getElementById("modal_overlay");
      const dlg = overlay?.firstElementChild;
      if (!dlg || !document.body.classList.contains("modal-overlay-active")) {
        origHide.call(this);
        return;
      }

      dlg.classList.add("modal-exit");
      document.body.classList.add("modal-overlay-exit");

      const finish = () => {
        hideTimer = null;
        dlg.classList.remove("modal-exit");
        document.body.classList.remove("modal-overlay-exit");
        origHide.call(this);
      };

      hideTimer = setTimeout(finish, 180);
    };

    /* Override displayStatus to use toast instead of modal */
    const origDisplayStatus = ui.changes?.displayStatus;
    if (origDisplayStatus) {
      let statusToast = null;

      const hasButtons = (content) => {
        if (!content) return false;
        if (content.querySelector?.(".btn")) return true;
        if (Array.isArray(content))
          return content.some((c) => c?.querySelector?.(".btn"));
        return false;
      };

      const dismissStatusToast = () => {
        if (!statusToast || !statusToast.parentNode) return;
        statusToast.classList.add("toast-exit");
        statusToast.addEventListener(
          "animationend",
          () => statusToast.remove(),
          { once: true },
        );
        setTimeout(() => {
          if (statusToast?.parentNode) statusToast.remove();
        }, 400);
        statusToast = null;
      };

      ui.changes.displayStatus = function (type, content) {
        /* Interactive content (connectivity warning) → keep as modal */
        if (type && hasButtons(content)) {
          dismissStatusToast();
          origDisplayStatus.call(this, type, content);
          return;
        }

        /* Hide → dismiss toast */
        if (!type) {
          dismissStatusToast();
          if (this.was_polling) request.poll.start();
          return;
        }

        /* Show/update status toast */
        const container = document.getElementById("maincontent");
        if (!container) {
          origDisplayStatus.call(this, type, content);
          return;
        }

        if (!statusToast || !statusToast.parentNode) {
          statusToast = E("div", { class: "alert-message" });
          statusToast._toastInit = true;
          container.insertBefore(statusToast, container.firstChild);
        }

        /* Strip 'notice' so it renders as neutral toast, not warning */
        const classes = type
          .split(/\s+/)
          .filter((c) => c && c !== "notice");
        statusToast.className = "alert-message";
        if (classes.length)
          DOMTokenList.prototype.add.apply(statusToast.classList, classes);

        if (content) L.dom.content(statusToast, content);

        if (!this.was_polling) {
          this.was_polling = request.poll.active();
          request.poll.stop();
        }
      };
    }
  },

  initToastAutoDismiss() {
    const DISMISS_DELAY = 30000;
    const container = document.getElementById("maincontent");
    if (!container) return;

    const updateIndices = () => {
      const toasts = container.querySelectorAll(
        ":scope > .alert-message:not(.toast-exit)",
      );
      toasts.forEach((t, i) => {
        t.style.setProperty("--toast-index", i);
      });
    };

    const dismissToast = (toast) => {
      if (toast._toastDismissing) return;
      toast._toastDismissing = true;
      if (toast._toastTimer) clearTimeout(toast._toastTimer);

      toast.classList.add("toast-exit");
      toast.addEventListener(
        "animationend",
        () => {
          toast.remove();
          updateIndices();
        },
        { once: true },
      );

      /* Fallback removal if animation doesn't fire */
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
          updateIndices();
        }
      }, 400);
    };

    const setupToast = (toast) => {
      if (toast._toastInit) return;
      toast._toastInit = true;

      /* Recalculate stacking indices (newest = index 0 = top) */
      updateIndices();

      /* Auto-dismiss after delay */
      toast._toastTimer = setTimeout(() => dismissToast(toast), DISMISS_DELAY);

      /* Dismiss on close button click */
      const btn = toast.querySelector(".btn");
      if (btn) {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          dismissToast(toast);
        });
      }
    };

    /* Watch for new toasts added to #maincontent */
    this.observeDomMutations(container, "toast-auto-dismiss", (mutations) => {
      for (const m of mutations) {
        if (m.type !== "childList") continue;
        for (const node of m.addedNodes) {
          if (
            node.nodeType === 1 &&
            node.classList?.contains("alert-message") &&
            node.parentNode === container
          ) {
            setupToast(node);
          }
        }
      }
    }, { childList: true });

    /* Setup any existing toasts */
    container
      .querySelectorAll(":scope > .alert-message")
      .forEach(setupToast);
  },
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
      const updateActiveIndicator = () => {
        this.scheduleElementFrame(tabMenu, "_md3eTabActiveFrame", () => {
          const active = tabMenu.querySelector("li.cbi-tab");
          if (!active) return;

          const menuRect = tabMenu.getBoundingClientRect();
          const activeRect = active.getBoundingClientRect();
          const needsJump = !activeReady;

          this.scheduleElementFrame(tabMenu, "_md3eTabActiveWriteFrame", () => {
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
              this.scheduleElementFrame(
                tabMenu,
                "_md3eTabActiveJumpFrame",
                () => tabMenu.classList.remove("tab-active-jump"),
              );
            }
          });
        });
      };

      tabMenu._md3eUpdateActiveIndicator = updateActiveIndicator;
      this._vercelTabMenus.add(tabMenu);

      let lastHoverTop = null;
      let hoverHideTimer = null;
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
        this.scheduleElementFrame(tabMenu, "_md3eTabHoverFrame", () => {
          const current = hoverTarget;
          if (!current) return;

          const menuRect = tabMenu.getBoundingClientRect();
          const liRect = current.getBoundingClientRect();
          const newTop = liRect.top - menuRect.top;

          /* First hover (no previous position) or row jump: skip transition. */
          const needsJump =
            lastHoverTop === null ||
            (lastHoverTop !== null && Math.abs(newTop - lastHoverTop) > 2);

          this.scheduleElementFrame(tabMenu, "_md3eTabHoverWriteFrame", () => {
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
              this.scheduleElementFrame(
                tabMenu,
                "_md3eTabHoverJumpFrame",
                () => tabMenu.classList.remove("tab-hover-jump"),
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

      this.scheduleElementFrame(
        tabMenu,
        "_md3eTabInitialActiveFrame",
        updateActiveIndicator,
      );
    };

    const bindExistingTabs = (scope = document) => {
      if (scope instanceof HTMLElement && scope.matches(".cbi-tabmenu")) {
        bindTabMenu(scope);
      }

      scope.querySelectorAll?.(".cbi-tabmenu").forEach(bindTabMenu);
    };

    bindExistingTabs(document);

    this.observeDomMutations(target, "vercel-tabs", (mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== "childList") continue;
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          bindExistingTabs(node);
        }
      }
    }, { childList: true, subtree: true });
  },
  initNavHover() {
    const nav = document.querySelector("#topmenu");
    if (!nav) return;

    const items = Array.from(nav.querySelectorAll(":scope > li"));
    if (!items.length) return;

    let hideTimer = null;
    let hasHovered = false;
    let hoverTarget = null;

    const show = (li) => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }

      hoverTarget = li;
      this.scheduleElementFrame(nav, "_md3eNavHoverFrame", () => {
        const current = hoverTarget;
        if (!current) return;

        const navRect = nav.getBoundingClientRect();
        const liRect = current.getBoundingClientRect();
        const needsJump = !hasHovered;

        this.scheduleElementFrame(nav, "_md3eNavHoverWriteFrame", () => {
          if (needsJump) nav.classList.add("nav-hover-jump");

          nav.style.setProperty(
            "--nav-hover-left",
            `${liRect.left - navRect.left}px`,
          );
          nav.style.setProperty("--nav-hover-width", `${liRect.width}px`);
          nav.classList.add("nav-hovering");

          if (needsJump) {
            hasHovered = true;
            this.scheduleElementFrame(nav, "_md3eNavHoverJumpFrame", () =>
              nav.classList.remove("nav-hover-jump"),
            );
          }
        });
      });
    };

    const hide = () => {
      hoverTarget = null;

      hideTimer = setTimeout(() => {
        nav.classList.remove("nav-hovering");
        hasHovered = false;
      }, 80);
    };

    items.forEach((li) => {
      li.addEventListener("mouseenter", () => show(li));
    });
    nav.addEventListener("mouseleave", hide);
  },
  initTabContentAnimation() {
    const target = document.getElementById("maincontent") || document.body;
    if (this._tabContentAnimationInitialized) return;

    if (
      !target.querySelector(
        ".cbi-tabmenu, .cbi-section-node-tabbed, .cbi-map-tabbed",
      )
    ) {
      this.watchForAddedElement(
        "_tabContentBootstrapObserver",
        target,
        ".cbi-tabmenu, .cbi-section-node-tabbed, .cbi-map-tabbed",
        () => this.initTabContentAnimation(),
      );
      return;
    }

    this._tabContentAnimationInitialized = true;
    let animating = false;

    const replayAnimation = (el, className) => {
      if (!(el instanceof HTMLElement)) return;

      el.classList.remove(className);
      this.scheduleElementFrame(el, "_md3eReplayFrame", () => {
        this.scheduleElementFrame(el, "_md3eReplayWriteFrame", () => {
          el.classList.add(className);
          el.addEventListener(
            "animationend",
            () => el.classList.remove(className),
            { once: true },
          );
        });
      });
    };

    /* ── Content blur animation (fade in / out) ── */

    target.addEventListener(
      "click",
      (e) => {
        const link = e.target.closest(".cbi-tabmenu li a");
        if (!link || animating || e._tabAnimBypass) return;

        const clickedLi = link.closest("li");
        if (clickedLi?.classList.contains("cbi-tab")) return;

        const tabMenu = link.closest(".cbi-tabmenu");
        const section = tabMenu?.closest(".cbi-section, .cbi-map");
        const activePanel = section?.querySelector(
          "[data-tab-active='true'][data-tab-title]",
        );

        if (!activePanel) return;

        e.stopPropagation();
        e.preventDefault();
        animating = true;

        activePanel.classList.add("tab-content-exit");
        activePanel.addEventListener(
          "animationend",
          () => {
            activePanel.classList.remove("tab-content-exit");
            animating = false;

            const bypass = new MouseEvent("click", { bubbles: true });
            bypass._tabAnimBypass = true;
            link.dispatchEvent(bypass);
          },
          { once: true },
        );
      },
      true,
    );

    /* ── Container height animation (independent via ResizeObserver) ── */

    const reduceHeightMotion = () =>
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const maxAnimatedHeight = 720;
    const maxAnimatedDelta = 360;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target;
        if (el._htLock) continue;

        const newH = Math.round(entry.borderBoxSize[0].blockSize);
        const oldH = el._htPrev;
        el._htPrev = newH;

        if (oldH === undefined || oldH === newH) continue;
        if (
          reduceHeightMotion() ||
          Math.max(oldH, newH) > maxAnimatedHeight ||
          Math.abs(newH - oldH) > maxAnimatedDelta
        ) {
          continue;
        }

        el._htLock = true;
        el.classList.add("tab-height-anim");
        el.style.height = oldH + "px";
        this.scheduleElementFrame(el, "_md3eHeightWriteFrame", () => {
          el.style.height = newH + "px";
        });

        const done = () => {
          el.classList.remove("tab-height-anim");
          el.style.height = "";
          el._htLock = false;
        };

        const onEnd = (e) => {
          if (e.propertyName !== "height") return;
          el.removeEventListener("transitionend", onEnd);
          clearTimeout(tid);
          done();
        };

        el.addEventListener("transitionend", onEnd);
        const tid = setTimeout(() => {
          el.removeEventListener("transitionend", onEnd);
          done();
        }, 500);
      }
    });

    const watch = (c) => {
      if (c._htWatched) return;
      c._htWatched = true;
      ro.observe(c);
    };

    this.forEachElementMatch(
      target,
      ".cbi-section-node-tabbed, .cbi-map-tabbed",
      watch,
    );

    /* ── View load animation (blur-in after spinner) ── */

    const watchView = (v) => {
      if (v._viewWatched) return;
      v._viewWatched = true;

      new MutationObserver((muts) => {
        for (const m of muts) {
          for (const n of m.removedNodes) {
            if (!n.classList?.contains("spinning")) continue;
            replayAnimation(v, "tab-content-enter");
            return;
          }
        }
      }).observe(v, { childList: true });
    };

    const view = target.querySelector("#view");
    if (view) watchView(view);

    const isTabContentMutation = (mutation) => {
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "data-tab-active"
      ) {
        return true;
      }

      if (mutation.type !== "childList") return false;

      return Array.from(mutation.addedNodes).some(
        (node) =>
          node.nodeType === 1 &&
          (node.id === "view" ||
            node.matches?.(".cbi-section-node-tabbed, .cbi-map-tabbed") ||
            node.querySelector?.(
              ".cbi-section-node-tabbed, .cbi-map-tabbed, #view",
            )),
      );
    };

    this.observeDomMutations(target, "tab-content-animation", (muts) => {
      if (!muts.some(isTabContentMutation)) return;

      for (const m of muts) {
        if (
          m.type === "attributes" &&
          m.attributeName === "data-tab-active" &&
          m.target.getAttribute("data-tab-active") === "true" &&
          m.target.hasAttribute("data-tab-title")
        ) {
          replayAnimation(m.target, "tab-content-enter");
          continue;
        }

        if (m.type !== "childList") continue;

        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          this.forEachElementMatch(
            n,
            ".cbi-section-node-tabbed, .cbi-map-tabbed",
            watch,
          );
          if (n.id === "view") watchView(n);
        }
      }
    }, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-tab-active"],
    });
  },
  initDescriptionPlacement() {
    const syncValueState = (row) => {
      if (!(row instanceof HTMLElement) || !row.classList.contains("cbi-value")) {
        return;
      }

      const field = row.querySelector(":scope > .cbi-value-field");
      const hasOpenDropdown = Boolean(
        row.querySelector(".cbi-dropdown[open], .outline-select.open"),
      );
      const hasProgress = Boolean(
        row.querySelector(".cbi-progressbar, .progress"),
      );
      const hasTextarea = Boolean(field?.querySelector("textarea"));
      const hasControl = Boolean(
        field?.querySelector(":scope > :is(input, select, textarea, .cbi-dropdown, .control-group)"),
      );
      const hasDisabledDropdown = Boolean(
        field?.querySelector(":scope > .cbi-dropdown[disabled]"),
      );
      const hasLocalTime = Boolean(field?.querySelector("#localtime"));
      const hasStandardLayout = Boolean(
        row.querySelector(":scope > .cbi-value-title") ||
          row.querySelector(":scope > .cbi-value-field"),
      );
      const hasPortDropdown = Boolean(
        field?.querySelector(":scope > .cbi-dropdown:not(.btn):not(.cbi-button)"),
      );

      row.classList.toggle("md3e-value-dropdown-open", hasOpenDropdown);
      field?.classList.toggle("md3e-value-field-dropdown-open", hasOpenDropdown);
      row.classList.toggle("md3e-value-progress", hasProgress);
      row.classList.toggle("md3e-value-custom-mount", !hasStandardLayout);
      row.classList.toggle("md3e-value-port-dropdown", hasPortDropdown);
      field?.classList.toggle("md3e-value-field-textarea", hasTextarea);
      field?.classList.toggle("md3e-value-field-control", hasControl);
      field?.classList.toggle("md3e-value-field-disabled-dropdown", hasDisabledDropdown);
      field?.classList.toggle("md3e-value-field-localtime", hasLocalTime);
    };

    const syncValueStates = (scope = document) => {
      if (scope instanceof HTMLElement) {
        if (scope.matches(".cbi-value")) syncValueState(scope);
        scope.querySelectorAll?.(".cbi-value").forEach(syncValueState);
      } else {
        document.querySelectorAll(".cbi-value").forEach(syncValueState);
      }
    };

    const move = (scope = document) => {
      const descriptions = [];

      if (
        scope instanceof HTMLElement &&
        scope.matches(".cbi-value-field > .cbi-value-description")
      ) {
        descriptions.push(scope);
      }

      scope
        .querySelectorAll(".cbi-value-field > .cbi-value-description")
        ?.forEach((desc) => descriptions.push(desc));

      descriptions.forEach((desc) => {
        if (desc._aurMoved) return;
        desc._aurMoved = true;
        const row = desc.closest(".cbi-value");
        if (!row) return;
        const title = row.querySelector(".cbi-value-title");
        if (title) {
          title.appendChild(desc);
        }
      });

      syncValueStates(scope);
    };

    move();

    const target = document.getElementById("maincontent") || document.body;
    const pendingScopes = new Set();

    this.observeDomMutations(target, "description-placement", (mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.target instanceof HTMLElement
        ) {
          const row = mutation.target.closest(".cbi-value");
          if (row) pendingScopes.add(row);
          return;
        }

        if (
          mutation.type === "childList" &&
          mutation.target instanceof HTMLElement
        ) {
          const row = mutation.target.closest(".cbi-value");
          if (row) pendingScopes.add(row);
        }

        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) pendingScopes.add(node);
        });
      });

      if (!pendingScopes.size) return;

      this.scheduleFrame("_descriptionPlacementFrame", () => {
        pendingScopes.forEach((scope) => move(scope));
        pendingScopes.clear();
      });
    }, {
      childList: true,
      attributes: true,
      attributeFilter: ["open", "class", "disabled"],
      subtree: true,
    });
  },

  getCbiDropdownPanel(dropdown) {
    if (!(dropdown instanceof HTMLElement)) return null;
    return (
      dropdown.querySelector(":scope > ul.dropdown") ||
      dropdown.querySelector(":scope > ul:not(.preview)")
    );
  },

  syncSplitButtonLabel(splitButton) {
    if (!(splitButton instanceof HTMLElement)) return;
    const menu = this.getCbiDropdownPanel(splitButton);
    if (!(menu instanceof HTMLElement)) return;

    const current =
      menu.querySelector(":scope > li[display]") ||
      menu.querySelector(":scope > li[selected]") ||
      menu.querySelector(":scope > li");
    const label = current?.textContent?.trim() || _("Save & Apply");

    splitButton.dataset.md3eSplitLabel = label;
    splitButton.setAttribute("aria-label", label);

    let labelNode = splitButton.querySelector(":scope > .md3e-split-button__label");
    if (!(labelNode instanceof HTMLElement)) {
      labelNode = document.createElement("span");
      labelNode.className = "md3e-split-button__label";
      labelNode.setAttribute("aria-hidden", "true");
      splitButton.insertBefore(labelNode, splitButton.firstElementChild);
    }
    labelNode.textContent = label;

    const more = splitButton.querySelector(":scope > .more");
    if (more instanceof HTMLElement) {
      more.textContent = "";
      more.setAttribute("aria-hidden", "true");
    }

    splitButton.querySelectorAll(":scope > ul.preview").forEach((preview) => {
      preview.hidden = true;
      preview.setAttribute("aria-hidden", "true");
    });

    const toggle = splitButton.querySelector(":scope > .open");
    if (toggle instanceof HTMLElement) {
      toggle.textContent = "";
      toggle.setAttribute("role", "button");
      toggle.setAttribute("aria-label", _("Show more apply options"));
    }
  },

  initSplitButton(splitButton) {
    if (!(splitButton instanceof HTMLElement)) return;

    splitButton.classList.add("md3e-split-button");
    splitButton.dataset.md3eSplitButton = "true";
    this.syncSplitButtonLabel(splitButton);

    if (splitButton.dataset.md3eSplitButtonInit === "true") return;
    splitButton.dataset.md3eSplitButtonInit = "true";

    const menu = this.getCbiDropdownPanel(splitButton);
    if (menu instanceof HTMLElement) {
      new MutationObserver(() => this.syncSplitButtonLabel(splitButton)).observe(
        menu,
        {
          attributes: true,
          childList: true,
          subtree: true,
        },
      );
    }
  },

  closeAllDropdowns(except) {
    // Close all outline-selects
    const outlineSelects = new Set([
      ...(this._openOutlineSelects || []),
      ...document.querySelectorAll(".outline-select.open"),
    ]);
    outlineSelects.forEach((s) => {
      if (!s.isConnected) {
        this._openOutlineSelects?.delete(s);
        return;
      }
      if (s === except) return;
      if (s._md3eCloseOutlineSelect) {
        s._md3eCloseOutlineSelect();
        return;
      }
      this.resetDropdownPanel(s.querySelector(":scope > .outline-select-panel"));
      s.classList.remove("open");
    });
    // Close all cbi-dropdowns
    const cbiDropdowns = new Set([
      ...(this._openCbiDropdowns || []),
      ...document.querySelectorAll(".cbi-dropdown[open]"),
    ]);
    cbiDropdowns.forEach((d) => {
      if (!d.isConnected) {
        this._openCbiDropdowns?.delete(d);
        return;
      }
      if (d === except) return;
      const panel = this.getCbiDropdownPanel(d);
      d.dispatchEvent(new CustomEvent("cbi-dropdown-close", {}));
      this.resetDropdownPanel(panel);
    });
  },
  resetDropdownPanel(panel) {
    if (!(panel instanceof HTMLElement)) return;
    if (panel._md3ePositionFrame) {
      cancelAnimationFrame(panel._md3ePositionFrame);
      panel._md3ePositionFrame = null;
    }

    panel.classList.remove("align-end");
    panel.classList.remove("above");
    panel.style.removeProperty("position");
    panel.style.removeProperty("top");
    panel.style.removeProperty("right");
    panel.style.removeProperty("bottom");
    panel.style.removeProperty("left");
    panel.style.removeProperty("min-width");
    panel.style.removeProperty("max-height");
    panel.style.removeProperty("max-width");
  },

  measureDropdownPanel(anchor, panel) {
    if (!(anchor instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
      return null;
    }

    const anchorRect = anchor.getBoundingClientRect();
    return {
      anchorRect,
      anchorWidth: Math.ceil(anchorRect.width),
      naturalWidth: Math.max(panel.scrollWidth, Math.ceil(anchorRect.width)),
      naturalHeight: Math.max(panel.scrollHeight, 0),
      viewportWidth: window.visualViewport?.width || window.innerWidth,
      viewportHeight: window.visualViewport?.height || window.innerHeight,
    };
  },

  positionDropdownPanel(anchor, panel) {
    if (!(anchor instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
      return;
    }

    const viewportPadding = 16;
    const panelGap = 8;
    const metrics = this.measureDropdownPanel(anchor, panel);
    if (!metrics) return;

    const {
      anchorRect,
      anchorWidth,
      naturalWidth,
      naturalHeight,
      viewportWidth,
      viewportHeight,
    } = metrics;
    const availableRight = Math.max(
      anchorWidth,
      Math.floor(viewportWidth - anchorRect.left - viewportPadding),
    );
    const availableLeft = Math.max(
      anchorWidth,
      Math.floor(anchorRect.right - viewportPadding),
    );
    const alignEnd =
      naturalWidth > availableRight && availableLeft > availableRight;
    const maxWidth = Math.max(
      anchorWidth,
      alignEnd ? availableLeft : availableRight,
    );
    const availableBelow = Math.max(
      0,
      Math.floor(
        viewportHeight - anchorRect.bottom - viewportPadding - panelGap,
      ),
    );
    const availableAbove = Math.max(
      0,
      Math.floor(anchorRect.top - viewportPadding - panelGap),
    );
    const openAbove =
      naturalHeight > availableBelow && availableAbove > availableBelow;

    panel.classList.toggle("align-end", alignEnd);
    panel.classList.toggle("above", openAbove);
    panel.style.position = "absolute";
    panel.style.minWidth = `${anchorWidth}px`;
    panel.style.maxHeight = `${openAbove ? availableAbove : availableBelow}px`;
    panel.style.maxWidth = `${maxWidth}px`;

    if (alignEnd) {
      panel.style.left = "auto";
      panel.style.right = "0";
    } else {
      panel.style.left = "0";
      panel.style.right = "auto";
    }

    if (openAbove) {
      panel.style.top = "auto";
      panel.style.bottom = `calc(100% + ${panelGap}px)`;
    } else {
      panel.style.top = `calc(100% + ${panelGap}px)`;
      panel.style.bottom = "auto";
    }
  },
  initCustomSelects() {
    if (this._customSelectsInitialized) return;

    const target = document.getElementById("maincontent") || document.body;
    if (!target.querySelector("select, .cbi-dropdown")) {
      this.watchForAddedElement(
        "_customSelectBootstrapObserver",
        target,
        "select, .cbi-dropdown",
        () => this.initCustomSelects(),
      );
      return;
    }

    this._customSelectsInitialized = true;
    this._openOutlineSelects = this._openOutlineSelects || new Set();
    this._openCbiDropdowns = this._openCbiDropdowns || new Set();

    const schedulePanelPosition = (anchor, panel) => {
      if (!(anchor instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
        return;
      }

      this.scheduleElementFrame(panel, "_md3ePositionFrame", () => {
        this.positionDropdownPanel(anchor, panel);
        panel
          .querySelector(":scope > .outline-select-option.selected")
          ?.scrollIntoView({ block: "nearest" });
      });
    };

    const syncCbiDropdownPanel = (dropdown) => {
      if (!(dropdown instanceof HTMLElement)) return;
      const panel = this.getCbiDropdownPanel(dropdown);
      if (!(panel instanceof HTMLElement)) return;

      if (dropdown.hasAttribute("open")) {
        this._openCbiDropdowns.add(dropdown);
        schedulePanelPosition(dropdown, panel);
      } else {
        this._openCbiDropdowns.delete(dropdown);
        this.resetDropdownPanel(panel);
      }
      this._syncDropdownViewportListeners?.();
    };

    const replace = (sel) => {
      if (!(sel instanceof HTMLSelectElement)) return;
      if (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768) return;
      if (sel.multiple || sel.size > 1) return;
      if (sel._outlineReplaced || sel.closest(".outline-select")) return;
      sel._outlineReplaced = true;

      const opts = Array.from(sel.options);
      if (!opts.length) return;

      const wrap = document.createElement("div");
      wrap.className = "outline-select";
      wrap.tabIndex = 0;
      if (sel.disabled) wrap.classList.add("disabled");

      const trigger = document.createElement("div");
      trigger.className = "outline-select-trigger";

      const val = document.createElement("span");
      val.className = "outline-select-value";
      val.textContent = sel.options[sel.selectedIndex]?.text || "";

      const chevron = document.createElement("span");
      chevron.className = "outline-select-chevron";

      trigger.append(val, chevron);

      const panel = document.createElement("div");
      panel.className = "outline-select-panel";

      const buildOptions = () => {
        panel.innerHTML = "";
        Array.from(sel.options).forEach((opt) => {
          const item = document.createElement("div");
          item.className =
            "outline-select-option" +
            (opt.index === sel.selectedIndex ? " selected" : "");
          item.dataset.value = opt.value;
          item.dataset.index = opt.index;
          item.textContent = opt.text;
          item.addEventListener("click", (e) => {
            e.stopPropagation();
            sel.selectedIndex = opt.index;
            sel.dispatchEvent(new Event("change", { bubbles: true }));
            val.textContent = opt.text;
            panel
              .querySelectorAll(".selected")
              .forEach((o) => o.classList.remove("selected"));
            item.classList.add("selected");
            close();
          });
          panel.appendChild(item);
        });
      };

      buildOptions();
      wrap.append(trigger, panel);

      sel.style.display = "none";
      sel.insertAdjacentElement("afterend", wrap);

      let isOpen = false;

      const open = () => {
        if (isOpen || sel.disabled) return;
        this.closeAllDropdowns(wrap);
        isOpen = true;
        this._openOutlineSelects.add(wrap);
        wrap.classList.add("open");
        schedulePanelPosition(wrap, panel);
        this._syncDropdownViewportListeners?.();
      };

      const close = () => {
        if (!isOpen) return;
        isOpen = false;
        this._openOutlineSelects.delete(wrap);
        this.resetDropdownPanel(panel);
        wrap.classList.remove("open");
        this._syncDropdownViewportListeners?.();
      };

      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        isOpen ? close() : open();
      });

      wrap._md3eCloseOutlineSelect = close;

      wrap.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          isOpen ? close() : open();
        } else if (e.key === "Escape") {
          close();
        } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const items = Array.from(
            panel.querySelectorAll(".outline-select-option"),
          );
          const cur = panel.querySelector(".outline-select-option.selected");
          const idx = items.indexOf(cur);
          const next =
            e.key === "ArrowDown"
              ? Math.min(idx + 1, items.length - 1)
              : Math.max(idx - 1, 0);
          if (items[next]) items[next].click();
        }
      });

      // Sync if select changes externally
      new MutationObserver(() => {
        val.textContent = sel.options[sel.selectedIndex]?.text || "";
        buildOptions();
      }).observe(sel, { attributes: true, childList: true, subtree: true });
    };

    const replaceAll = (scope = target) => {
      this.forEachElementMatch(scope, "select", replace);
    };

    replaceAll(target);
    target
      .querySelectorAll?.(".cbi-dropdown[open]")
      .forEach(syncCbiDropdownPanel);

    if (!this._customSelectClickHandler) {
      this._customSelectClickHandler = (e) => {
        Array.from(this._openOutlineSelects || []).forEach((wrap) => {
          if (!wrap.isConnected) {
            this._openOutlineSelects.delete(wrap);
            this._syncDropdownViewportListeners?.();
            return;
          }
          if (!wrap.contains(e.target)) wrap._md3eCloseOutlineSelect?.();
        });

        const openBtn = e.target.closest(".cbi-dropdown > .open");
        if (!openBtn) return;

        const dropdown = openBtn.closest(".cbi-dropdown");
        if (!dropdown) return;
        this.closeAllDropdowns(dropdown);
        this.scheduleFrame("_customSelectClickFrame", () =>
          syncCbiDropdownPanel(dropdown),
        );
      };
      document.addEventListener("click", this._customSelectClickHandler);
    }

    this.observeDomMutations(target, "custom-selects", (mutations) => {
      const dropdowns = new Set();
      const addedSelects = new Set();

      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType !== 1) return;
            this.forEachElementMatch(node, "select", (select) => {
              addedSelects.add(select);
            });
          });
          return;
        }

        if (
          mutation.type === "attributes" &&
          mutation.target instanceof HTMLElement &&
          mutation.target.matches(".cbi-dropdown")
        ) {
          dropdowns.add(mutation.target);
        }
      });

      if (addedSelects.size) {
        this.scheduleFrame("_customSelectAddedFrame", () => {
          addedSelects.forEach((select) => {
            if (select.isConnected) replace(select);
          });
        });
      }

      if (!dropdowns.size) return;

      this.scheduleFrame("_customSelectDropdownFrame", () => {
        dropdowns.forEach((dropdown) => syncCbiDropdownPanel(dropdown));
      });
    }, {
      childList: true,
      attributes: true,
      attributeFilter: ["open"],
      subtree: true,
    });

    const syncViewportListeners = () => {
      const hasOpen =
        Array.from(this._openOutlineSelects || []).some((wrap) => wrap.isConnected) ||
        Array.from(this._openCbiDropdowns || []).some(
          (dropdown) => dropdown.isConnected && dropdown.hasAttribute("open"),
        );

      if (hasOpen === this._dropdownViewportListening) return;
      this._dropdownViewportListening = hasOpen;

      const method = hasOpen ? "addEventListener" : "removeEventListener";
      window[method]("resize", this._dropdownViewportHandler);
      window[method]("scroll", this._dropdownViewportHandler, true);
    };

    if (!this._dropdownViewportHandler) {
      this._dropdownViewportHandler = () => {
        this.scheduleFrame("_customSelectViewportFrame", () => {
          const openSelects = Array.from(this._openOutlineSelects || []).filter(
            (wrap) => wrap.isConnected,
          );
          const openDropdowns = Array.from(this._openCbiDropdowns || []).filter(
            (dropdown) => dropdown.isConnected && dropdown.hasAttribute("open"),
          );
          if (!openSelects.length && !openDropdowns.length) return;

          openSelects.forEach((wrap) => {
            schedulePanelPosition(
              wrap,
              wrap.querySelector(":scope > .outline-select-panel"),
            );
          });
          openDropdowns.forEach((dropdown) => syncCbiDropdownPanel(dropdown));
        });
      };
    }

    this._syncDropdownViewportListeners = syncViewportListeners;
    syncViewportListeners();
  },
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
      document.documentElement.style.overflow = open ? "hidden" : "";
      document.body.classList.toggle("mobile-menu-open", open);

      if (open) {
        this.scheduleFrame("_mobileMenuExpandActiveFrame", () =>
          this.expandActiveMobilePrimaryItem?.(),
        );
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
  initNetworkStatusCards() {
    if (this._networkStatusCardsInitialized) return;

    const target = document.getElementById("maincontent") || document.body;
    if (!target) return;

    const enhanceCard = (card, allowNetworkCard = false) => {
      if (!(card instanceof HTMLElement)) return false;

      const isPortCard = Boolean(
        card.querySelector(":scope > .ifacebox-head.cbi-tooltip-container"),
      );

      card.classList.toggle("md3e-port-card", isPortCard);

      if (allowNetworkCard) {
        card.classList.toggle("md3e-network-card", !isPortCard);
      } else if (isPortCard) {
        card.classList.remove("md3e-network-card");
      }

      if (isPortCard) {
        card
          .querySelector(":scope > .ifacebox-head:first-child")
          ?.classList.add("md3e-port-name");
        card
          .querySelector(":scope > .ifacebox-head.cbi-tooltip-container")
          ?.classList.add("md3e-port-zone");

        const bodies = Array.from(
          card.querySelectorAll(":scope > .ifacebox-body"),
        );

        bodies[0]?.classList.add("md3e-port-link");
        bodies[1]?.classList.add("md3e-port-stats");
        bodies[1]
          ?.querySelector(":scope > .cbi-tooltip-container")
          ?.classList.add("md3e-port-traffic");
      }

      if (!isPortCard && allowNetworkCard) {
        card
          .querySelectorAll(":scope > .ifacebox-body .ifacebadge")
          .forEach((badge) => badge.classList.add("md3e-network-list-item"));
      }

      return isPortCard;
    };

    const enhance = (scope = target) => {
      const markNetworkInterfaceRow = (node) => {
        if (!(node instanceof HTMLElement)) return;

        const ifaceCell = node.matches('[data-name="_ifacebox"]')
          ? node
          : node.querySelector?.('[data-name="_ifacebox"]');
        if (!(ifaceCell instanceof HTMLElement)) return;

        const row = ifaceCell.closest("tr, .tr, .cbi-section-table-row");
        if (!(row instanceof HTMLElement)) return;

        row.classList.add("md3e-interface-row");
        ifaceCell.classList.add("md3e-interface-cell");
        row
          .querySelector('[data-name="_ifacestat"]')
          ?.classList.add("md3e-interface-status-cell");
        row
          .querySelector(
            ".cbi-section-actions, .md3e-row-actions, .md3e-row-action-cell",
          )
          ?.classList.add("md3e-interface-actions-cell");
      };

      const tables = [];
      if (
        scope instanceof HTMLElement &&
        scope.matches(".network-status-table")
      ) {
        tables.push(scope);
      }
      scope.querySelectorAll?.(".network-status-table").forEach((table) =>
        tables.push(table),
      );

      tables.forEach((table) => {
        table.classList.add("md3e-network-card-grid");

        table.querySelectorAll(":scope > .ifacebox").forEach((card) => {
          enhanceCard(card, true);
        });
      });

      const portCards = [];
      if (
        scope instanceof HTMLElement &&
        scope.matches(".ifacebox") &&
        scope.querySelector(":scope > .ifacebox-head.cbi-tooltip-container")
      ) {
        portCards.push(scope);
      }

      scope.querySelectorAll?.(".ifacebox").forEach((card) => {
        if (
          card instanceof HTMLElement &&
          card.querySelector(":scope > .ifacebox-head.cbi-tooltip-container")
        ) {
          portCards.push(card);
        }
      });

      portCards.forEach((card) => {
        if (!enhanceCard(card, false)) return;

        const grid = card.parentElement;
        if (grid && !grid.classList.contains("network-status-table")) {
          grid.classList.add("md3e-port-card-grid");
        }
      });

      if (
        scope instanceof HTMLElement &&
        scope.matches('[data-name="_ifacebox"]')
      ) {
        markNetworkInterfaceRow(scope);
      }
      scope
        .querySelectorAll?.('[data-name="_ifacebox"]')
        .forEach(markNetworkInterfaceRow);
    };

    this._networkStatusCardsInitialized = true;
    enhance(target);

    this.observeDomMutations(target, "network-status-cards", (mutations) => {
      const added = new Set();

      for (const mutation of mutations) {
        if (mutation.type !== "childList") continue;
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) added.add(node);
        }
      }

      if (!added.size) return;
      this.scheduleFrame("_networkStatusCardsFrame", () => {
        added.forEach((node) => {
          if (node.isConnected) enhance(node);
        });
      });
    }, {
      childList: true,
      subtree: true,
    });
  },
  initActionButtonGroups() {
    const target = document.getElementById("maincontent") || document.body;
    if (!target) return;

    const enhance = (actions) => {
      if (!(actions instanceof HTMLElement)) return;
      if (actions.dataset.md3eActionGroupInit === "true") return;
      actions.dataset.md3eActionGroupInit = "true";

      const directChildren = Array.from(actions.children).filter(
        (child) => child instanceof HTMLElement,
      );
      const splitButton = directChildren.find((child) =>
        child.matches(".cbi-dropdown"),
      );
      actions.classList.toggle("md3e-has-split-button", Boolean(splitButton));

      if (splitButton) {
        this.initSplitButton(splitButton);
      }

      const secondaryButtons = directChildren.filter(
        (child) =>
          child !== splitButton &&
          child.matches("button, .btn, .cbi-button, a.btn, input.btn"),
      );

      if (!secondaryButtons.length) return;

      let group = actions.querySelector(":scope > .md3e-action-group");
      if (!(group instanceof HTMLElement)) {
        group = document.createElement("div");
        group.className = "md3e-action-group";
        actions.insertBefore(group, secondaryButtons[0]);
      }

      secondaryButtons.forEach((button) => {
        group.appendChild(button);
      });
    };

    const markRowActionCells = (scope = target) => {
      const rows = new Set();

      if (scope instanceof HTMLElement) {
        const row = scope.matches("tr, .tr")
          ? scope
          : scope.closest("tr, .tr");
        if (row instanceof HTMLElement) rows.add(row);
      }

      this.forEachElementMatch(scope, "tr, .tr, td, .td", (element) => {
        if (!(element instanceof HTMLElement)) return;

        const row = element.matches("tr, .tr")
          ? element
          : element.closest("tr, .tr");
        if (row instanceof HTMLElement) rows.add(row);
      });

      rows.forEach((row) => {
        const cells = Array.from(row.children).filter(
          (child) =>
            child instanceof HTMLElement && child.matches("td, .td"),
        );
        const buttonSelector = ".cbi-button, .btn, button, a.btn, input.btn";
        let actionCount = 0;

        cells.forEach((cell) => {
          cell.classList.remove("md3e-row-action-cell", "md3e-row-actions");
          cell
            .querySelectorAll(":scope > .md3e-row-action-cluster")
            .forEach((cluster) =>
              cluster.classList.remove("md3e-row-action-cluster"),
            );
        });

        for (let index = cells.length - 1; index >= 0; index -= 1) {
          const cell = cells[index];
          const actionClusters = Array.from(cell.children).filter(
            (child) =>
              child instanceof HTMLElement &&
              child.matches("div") &&
              child.querySelector(`:scope > :is(${buttonSelector})`),
          );
          actionClusters.forEach((cluster) =>
            cluster.classList.add("md3e-row-action-cluster"),
          );

          const buttons = Array.from(cell.querySelectorAll(buttonSelector));
          const compactText =
            cell.textContent.trim().replace(/\s+/g, " ").length <= 32;
          const isActionCell = buttons.length > 0 && compactText;

          cell.classList.toggle("md3e-row-action-cell", isActionCell);
          cell.classList.toggle(
            "md3e-row-actions",
            isActionCell && buttons.length >= 2,
          );

          if (!isActionCell) {
            break;
          }

          actionCount += 1;
        }

        row.classList.toggle("md3e-has-row-actions", actionCount >= 2);
      });
    };

    target.querySelectorAll(".cbi-page-actions").forEach(enhance);
    markRowActionCells(target);

    this.observeDomMutations(target, "action-button-groups", (mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== "childList") continue;
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches?.(".cbi-page-actions")) enhance(node);
          node.querySelectorAll?.(".cbi-page-actions").forEach(enhance);
          markRowActionCells(node);
        }
      }
    }, {
      childList: true,
      subtree: true,
    });
  },

  initMobileActionGroups() {
    const target = document.getElementById("maincontent") || document.body;

    const syncDirtyClass = () => {
      const anyDirty = target.querySelector(".cbi-page-actions[data-dirty='true']");
      document.body.classList.toggle("mobile-page-actions-visible", Boolean(anyDirty));
    };

    const setDirty = (actions, dirty) => {
      if (!actions.length) return;
      actions.forEach((action) => {
        action.dataset.dirty = dirty ? "true" : "false";
      });
      syncDirtyClass();
    };

    const getActionsForElement = (el) => {
      const scopes = [
        el.closest(".cbi-section"),
        el.closest(".cbi-map"),
        el.closest("form"),
      ].filter(Boolean);

      for (const scope of scopes) {
        const actions = Array.from(scope.querySelectorAll(".cbi-page-actions"));
        if (actions.length) return actions;
      }

      return Array.from(target.querySelectorAll(".cbi-page-actions"));
    };

    target.addEventListener("input", (event) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        setDirty(getActionsForElement(event.target), true);
      }
    }, true);

    target.addEventListener("change", (event) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        setDirty(getActionsForElement(event.target), true);
      }
    }, true);

    target.addEventListener("click", (event) => {
      const btn = event.target.closest(".cbi-button-reset, .cbi-button-save, .cbi-button-apply, .btn.primary");
      if (btn) {
        const actions = btn.closest(".cbi-page-actions");
        if (actions) {
          const resetDelay = btn.matches(".cbi-button-reset") ? 40 : 160;
          setTimeout(() => setDirty([actions], false), resetDelay);
        }
      }
    }, true);

    syncDirtyClass();
  },
  renderMobileMenu(tree, url) {
    const list = document.querySelector("#mobile-nav-list");
    const categories = this.getWorkspaceCategories(tree);

    if (!list || !categories.length) return;

    const activeCategory =
      categories.find((category) => category.name === L.env.dispatchpath[1]) ||
      categories[0];

    list.innerHTML = "";
    const primary = E("nav", {
      class: "md3e-mobile-primary-nav",
      "aria-label": _("Primary navigation"),
    });
    const stage = E("div", { class: "md3e-mobile-drawer-stage" });
    const primaryList = E("ul", { class: "md3e-mobile-primary-list" });
    const sections = new Map();

    const setExpandedMode = (modeName = null) => {
      sections.forEach(({ item, toggle, panel }) => {
        const expanded = Boolean(modeName) && toggle.dataset.mode === modeName;
        item.dataset.expanded = String(expanded);
        toggle.setAttribute("aria-expanded", String(expanded));
        panel.setAttribute("aria-hidden", String(!expanded));
        if (expanded) {
          panel.removeAttribute("hidden");
        } else {
          panel.setAttribute("hidden", "");
        }
      });
    };

    categories.forEach((category) => {
      const isActive = category.name === activeCategory.name;
      const item = E("li", {
        class: "md3e-mobile-primary-item" + (isActive ? " active" : ""),
        "data-expanded": "false",
      });
      const pages = ui.menu.getChildren(category);
      const panelId = `md3e-mobile-secondary-${category.name}`;
      const toggle = this.buildMobilePrimaryButton(category, isActive, panelId);

      item.appendChild(toggle);

      if (pages.length) {
        const panel = this.buildMobileSecondaryPanel(
          category,
          url,
          panelId,
          false,
        );
        item.appendChild(panel);
        sections.set(category.name, { item, toggle, panel });

        toggle.addEventListener("click", (event) => {
          event.preventDefault();
          const expanded = item.dataset.expanded === "true";
          setExpandedMode(expanded ? null : category.name);
        });
      } else {
        toggle.classList.add("is-static");
        toggle.removeAttribute("aria-controls");
        toggle.setAttribute("aria-disabled", "true");
        toggle.setAttribute("aria-expanded", "false");
      }

      primaryList.appendChild(item);
    });

    stage.append(primaryList);
    primary.appendChild(stage);
    list.appendChild(primary);

    this.resetMobilePrimaryItems = () => setExpandedMode(null);
    this.expandActiveMobilePrimaryItem = () =>
      setExpandedMode(activeCategory.name);
    this.expandActiveMobilePrimaryItem?.();
  },
  render(tree) {
    this.renderModeMenu(tree);
    this.initPageChrome();

    if (L.env.dispatchpath.length >= 3) {
      let node = tree;
      let url = "";

      for (let i = 0; i < 3 && node; i++) {
        const segment = L.env.dispatchpath[i];
        node = node.children?.[segment];
        url += (url ? "/" : "") + segment;
      }

      if (node) this.renderTabMenu(node, url);
    }

  },

  renderTabMenu(tree, url, level = 0) {
    const container = document.querySelector("#tabmenu");
    const ul = E("ul", { class: "tabs" });
    const children = ui.menu.getChildren(tree);
    let activeNode = null;

    children.forEach((child) => {
      const isActive = L.env.dispatchpath[3 + level] === child.name;

      ul.appendChild(
        E(
          "li",
          {
            class: `tabmenu-item-${child.name}${isActive ? " active" : ""}`,
          },
          [E("a", { href: L.url(url, child.name) }, [_(child.title)])],
        ),
      );

      if (isActive) activeNode = child;
    });

    if (!ul.children.length) return E([]);

    container.appendChild(ul);
    container.style.display = "";

    if (activeNode) {
      this.renderTabMenu(activeNode, `${url}/${activeNode.name}`, level + 1);
    }

    return ul;
  },

  renderMainMenu(tree, url) {
    const sidebar = document.querySelector("#sidebar-nav-host");
    const categories = this.getWorkspaceCategories(tree);

    if (!categories.length || !sidebar) return;

    const pageCategory =
      categories.find((category) => category.name === L.env.dispatchpath[1]) ||
      categories[0];
    const pageMeta = this.getModeMetadata(pageCategory.name);
    this.desktopPageCategory = pageCategory;

    this.activeModeMeta = {
      title: _(pageCategory.title),
      description: pageMeta.copy,
    };

    sidebar.innerHTML = "";

    const shell = E("div", { class: "md3e-nav-shell is-collapsed" });
    const rail = E("nav", {
      class: "md3e-mode-rail",
      "aria-label": _("Primary navigation"),
    });
    const railLogo = this.buildRailLogoButton();
    if (railLogo) rail.appendChild(railLogo);

    const panel = E("div", {
      class: "md3e-nav-panel",
      "aria-hidden": "true",
    });

    const updateButtons = (selectedMode = pageCategory.name) => {
      rail.querySelectorAll(".md3e-mode-link").forEach((button) => {
        const isSelected = button.dataset.mode === selectedMode;
        button.classList.toggle("active", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
        button.setAttribute(
          "aria-expanded",
          String(
            !shell.classList.contains("is-collapsed") &&
              button.dataset.mode === shell.dataset.panelMode,
          ),
        );
      });
    };

    const renderPanel = (category) => {
      panel.innerHTML = "";
      panel.appendChild(this.buildNavPanel(category, url));
      shell.dataset.panelMode = category.name;
      this.desktopPanelCategory = category;
      updateButtons(category.name);
    };

    const syncShellExpandedState = (expanded) => {
      document.body?.classList.toggle("md3e-nav-expanded", expanded);
    };

    const collapse = () => {
      shell.classList.add("is-collapsed");
      shell.classList.remove("is-expanded");
      syncShellExpandedState(false);
      panel.setAttribute("aria-hidden", "true");
      shell.dataset.panelMode = pageCategory.name;
      updateButtons(pageCategory.name);
    };

    const expand = (category) => {
      renderPanel(category);
      shell.classList.remove("is-collapsed");
      shell.classList.add("is-expanded");
      syncShellExpandedState(true);
      panel.setAttribute("aria-hidden", "false");
      updateButtons(category.name);
    };

    categories.forEach((category) => {
      const button = this.buildModeButton(
        category,
        category.name === pageCategory.name,
      );

      button.addEventListener("click", () => {
        const isCollapsed = shell.classList.contains("is-collapsed");
        const isSameMode = shell.dataset.panelMode === category.name;

        if (isCollapsed) {
          expand(category);
          return;
        }

        if (isSameMode) {
          collapse();
          return;
        }

        expand(category);
      });

      rail.appendChild(button);
    });

    renderPanel(pageCategory);
    shell.appendChild(rail);
    shell.appendChild(panel);
    sidebar.appendChild(shell);

    this.desktopShellElement = shell;
    this.collapseDesktopShell = collapse;
    this.expandDesktopShell = expand;
    syncShellExpandedState(false);
    this.syncLayoutMode();

    if (!this._desktopShellClickHandler) {
      this._desktopShellClickHandler = (event) => {
        const currentShell = this.desktopShellElement;
        if (!currentShell) return;
        if (this.isMobileViewport()) return;
        if (currentShell.classList.contains("is-collapsed")) return;
        if (currentShell.contains(event.target)) return;
        this.collapseDesktopShell?.();
      };
      document.addEventListener("click", this._desktopShellClickHandler);
    }

    if (!this._desktopShellEscHandler) {
      this._desktopShellEscHandler = (event) => {
        const currentShell = this.desktopShellElement;
        if (!currentShell) return;
        if (event.key === "Escape" && !currentShell.classList.contains("is-collapsed")) {
          this.collapseDesktopShell?.();
        }
      };
      document.addEventListener("keydown", this._desktopShellEscHandler);
    }

  },

  renderModeMenu(tree) {
    const ul = document.querySelector("#modemenu");
    const children = ui.menu.getChildren(tree);
    let activeChild = null;

    children.forEach((child, index) => {
      const isActive = L.env.requestpath.length
        ? child.name === L.env.requestpath[0]
        : index === 0;

      ul.appendChild(
        E(
          "li",
          {
            class: isActive ? "active" : "",
          },
          [E("a", { href: L.url(child.name) }, [_(child.title)])],
        ),
      );

      if (isActive) activeChild = child;
    });

    if (activeChild) {
      this.renderMainMenu(activeChild, activeChild.name);
      this.renderMobileMenu(activeChild, activeChild.name);
    }

    if (ul.children.length > 1) {
      ul.style.display = "";
    }
  },
});
