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
