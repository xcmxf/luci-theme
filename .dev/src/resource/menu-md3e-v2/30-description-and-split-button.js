  initDescriptionPlacement() {
    const move = () => {
      document
        .querySelectorAll(".cbi-value-field > .cbi-value-description")
        .forEach((desc) => {
          if (desc._aurMoved) return;
          desc._aurMoved = true;
          const row = desc.closest(".cbi-value");
          if (!row) return;
          const title = row.querySelector(".cbi-value-title");
          if (title) {
            title.appendChild(desc);
          }
        });
    };

    move();

    const target = document.getElementById("maincontent") || document.body;
    new MutationObserver(() => requestAnimationFrame(move)).observe(target, {
      childList: true,
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
    document.querySelectorAll(".outline-select.open").forEach((s) => {
      if (s === except) return;
      this.resetDropdownPanel(
        s.querySelector(":scope > .outline-select-panel"),
      );
      s.classList.remove("open");
    });
    // Close all cbi-dropdowns
    document.querySelectorAll(".cbi-dropdown[open]").forEach((d) => {
      if (d === except) return;
      const panel = this.getCbiDropdownPanel(d);
      d.dispatchEvent(new CustomEvent("cbi-dropdown-close", {}));
      this.resetDropdownPanel(panel);
    });
  },
