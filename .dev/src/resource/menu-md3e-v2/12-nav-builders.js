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
