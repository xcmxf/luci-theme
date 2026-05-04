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

    const collapse = () => {
      shell.classList.add("is-collapsed");
      shell.classList.remove("is-expanded");
      panel.setAttribute("aria-hidden", "true");
      shell.dataset.panelMode = pageCategory.name;
      updateButtons(pageCategory.name);
    };

    const expand = (category) => {
      renderPanel(category);
      shell.classList.remove("is-collapsed");
      shell.classList.add("is-expanded");
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
