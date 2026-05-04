  initCustomSelects() {
    const syncCbiDropdownPanel = (dropdown) => {
      if (!(dropdown instanceof HTMLElement)) return;
      const panel = this.getCbiDropdownPanel(dropdown);
      if (!(panel instanceof HTMLElement)) return;

      if (dropdown.hasAttribute("open")) {
        this.positionDropdownPanel(dropdown, panel);
      } else {
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
        wrap.classList.add("open");
        const rect = wrap.getBoundingClientRect();
        const below = window.innerHeight - rect.bottom;
        panel.classList.toggle("above", below < 200 && rect.top > 200);
        this.positionDropdownPanel(wrap, panel);
        const cur = panel.querySelector(".selected");
        if (cur) cur.scrollIntoView({ block: "nearest" });
      };

      const close = () => {
        if (!isOpen) return;
        isOpen = false;
        this.resetDropdownPanel(panel);
        wrap.classList.remove("open");
      };

      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        isOpen ? close() : open();
      });

      document.addEventListener("click", (e) => {
        if (!wrap.contains(e.target)) close();
      });

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

    const replaceAll = () => {
      document.querySelectorAll("select").forEach(replace);
    };

    replaceAll();

    // Close outline-selects when cbi-dropdown opens
    document.addEventListener("click", (e) => {
      const openBtn = e.target.closest(".cbi-dropdown > .open");
      if (openBtn) {
        const dropdown = openBtn.closest(".cbi-dropdown");
        if (!dropdown) return;
        this.closeAllDropdowns(dropdown);
        requestAnimationFrame(() => syncCbiDropdownPanel(dropdown));
      }
    });

    const target = document.getElementById("maincontent") || document.body;
    new MutationObserver(() => {
      requestAnimationFrame(replaceAll);
    }).observe(target, { childList: true, subtree: true });

    new MutationObserver((mutations) => {
      const dropdowns = new Set();
      mutations.forEach((mutation) => {
        if (
          mutation.target instanceof HTMLElement &&
          mutation.target.matches(".cbi-dropdown")
        ) {
          dropdowns.add(mutation.target);
        }
      });

      if (!dropdowns.size) return;

      requestAnimationFrame(() => {
        dropdowns.forEach((dropdown) => syncCbiDropdownPanel(dropdown));
      });
    }).observe(target, {
      attributes: true,
      attributeFilter: ["open"],
      subtree: true,
    });

    if (!this._dropdownViewportHandler) {
      this._dropdownViewportHandler = () => {
        requestAnimationFrame(() => {
          document.querySelectorAll(".outline-select.open").forEach((wrap) => {
            this.positionDropdownPanel(
              wrap,
              wrap.querySelector(":scope > .outline-select-panel"),
            );
          });
          document
            .querySelectorAll(".cbi-dropdown[open]")
            .forEach((dropdown) => syncCbiDropdownPanel(dropdown));
        });
      };
      window.addEventListener("resize", this._dropdownViewportHandler);
      window.addEventListener("scroll", this._dropdownViewportHandler, true);
    }
  },
