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

    new MutationObserver((mutations) => {
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
    }).observe(target, {
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
