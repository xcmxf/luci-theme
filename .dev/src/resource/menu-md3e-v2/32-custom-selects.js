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

      if (panel._md3ePositionFrame) {
        cancelAnimationFrame(panel._md3ePositionFrame);
      }

      panel._md3ePositionFrame = requestAnimationFrame(() => {
        panel._md3ePositionFrame = null;
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
      };

      const close = () => {
        if (!isOpen) return;
        isOpen = false;
        this._openOutlineSelects.delete(wrap);
        this.resetDropdownPanel(panel);
        wrap.classList.remove("open");
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
            return;
          }
          if (!wrap.contains(e.target)) wrap._md3eCloseOutlineSelect?.();
        });

        const openBtn = e.target.closest(".cbi-dropdown > .open");
        if (!openBtn) return;

        const dropdown = openBtn.closest(".cbi-dropdown");
        if (!dropdown) return;
        this.closeAllDropdowns(dropdown);
        requestAnimationFrame(() => syncCbiDropdownPanel(dropdown));
      };
      document.addEventListener("click", this._customSelectClickHandler);
    }

    this._customSelectObserver = new MutationObserver((mutations) => {
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
        requestAnimationFrame(() => {
          addedSelects.forEach((select) => {
            if (select.isConnected) replace(select);
          });
        });
      }

      if (!dropdowns.size) return;

      requestAnimationFrame(() => {
        dropdowns.forEach((dropdown) => syncCbiDropdownPanel(dropdown));
      });
    }).observe(target, {
      childList: true,
      attributes: true,
      attributeFilter: ["open"],
      subtree: true,
    });

    if (!this._dropdownViewportHandler) {
      this._dropdownViewportHandler = () => {
        requestAnimationFrame(() => {
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
      window.addEventListener("resize", this._dropdownViewportHandler);
      window.addEventListener("scroll", this._dropdownViewportHandler, true);
    }
  },
