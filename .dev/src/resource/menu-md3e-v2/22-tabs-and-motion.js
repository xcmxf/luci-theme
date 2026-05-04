  initVercelTabs() {
    const bindTabMenu = (tabMenu) => {
      const items = Array.from(tabMenu.querySelectorAll("li"));
      if (!items.length) return;

      let activeReady = false;

      const updateActiveIndicator = () => {
        const active = tabMenu.querySelector("li.cbi-tab");
        if (!active) return;
        const menuRect = tabMenu.getBoundingClientRect();
        const activeRect = active.getBoundingClientRect();

        /* Skip transition on first placement so the underline appears instantly */
        if (!activeReady) {
          tabMenu.classList.add("tab-active-jump");
          void tabMenu.offsetWidth;
        }

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

        if (!activeReady) {
          void tabMenu.offsetWidth;
          tabMenu.classList.remove("tab-active-jump");
          activeReady = true;
        }
      };

      let lastHoverTop = null;
      let hoverHideTimer = null;

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
        const menuRect = tabMenu.getBoundingClientRect();
        const liRect = li.getBoundingClientRect();
        const newTop = liRect.top - menuRect.top;

        /* First hover (no previous position) or row jump — skip transition */
        const needsJump =
          lastHoverTop === null ||
          (lastHoverTop !== null && Math.abs(newTop - lastHoverTop) > 2);

        if (needsJump) {
          tabMenu.classList.add("tab-hover-jump");
          void tabMenu.offsetWidth;
        }

        tabMenu.style.setProperty(
          "--tab-hover-left",
          `${liRect.left - menuRect.left}px`,
        );
        tabMenu.style.setProperty("--tab-hover-width", `${liRect.width}px`);
        tabMenu.style.setProperty("--tab-hover-top", `${newTop}px`);
        tabMenu.classList.add("tab-hovering");

        if (needsJump) {
          void tabMenu.offsetWidth;
          tabMenu.classList.remove("tab-hover-jump");
        }

        lastHoverTop = newTop;
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

      let resizeTimer;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(updateActiveIndicator, 100);
      });
    };

    const waitForTabs = new MutationObserver(() => {
      document.querySelectorAll(".cbi-tabmenu").forEach((menu) => {
        if (menu.dataset.vercelInit) return;
        menu.dataset.vercelInit = "1";
        bindTabMenu(menu);
      });
    });

    const target = document.getElementById("maincontent") || document.body;
    waitForTabs.observe(target, { childList: true, subtree: true });

    document.querySelectorAll(".cbi-tabmenu").forEach((menu) => {
      menu.dataset.vercelInit = "1";
      bindTabMenu(menu);
    });
  },

  initNavHover() {
    const nav = document.querySelector("#topmenu");
    if (!nav) return;

    const items = Array.from(nav.querySelectorAll(":scope > li"));
    if (!items.length) return;

    let hideTimer = null;
    let hasHovered = false;

    const show = (li) => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      const navRect = nav.getBoundingClientRect();
      const liRect = li.getBoundingClientRect();

      if (!hasHovered) {
        nav.classList.add("nav-hover-jump");
        void nav.offsetWidth;
      }

      nav.style.setProperty(
        "--nav-hover-left",
        `${liRect.left - navRect.left}px`,
      );
      nav.style.setProperty("--nav-hover-width", `${liRect.width}px`);
      nav.classList.add("nav-hovering");

      if (!hasHovered) {
        void nav.offsetWidth;
        nav.classList.remove("nav-hover-jump");
        hasHovered = true;
      }
    };

    const hide = () => {
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
    let animating = false;

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

    new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (
          m.type === "attributes" &&
          m.attributeName === "data-tab-active" &&
          m.target.getAttribute("data-tab-active") === "true" &&
          m.target.hasAttribute("data-tab-title")
        ) {
          m.target.classList.remove("tab-content-enter");
          void m.target.offsetWidth;
          m.target.classList.add("tab-content-enter");
          m.target.addEventListener(
            "animationend",
            () => m.target.classList.remove("tab-content-enter"),
            { once: true },
          );
        }
      });
    }).observe(target, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-tab-active"],
    });

    /* ── Container height animation (independent via ResizeObserver) ── */

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target;
        if (el._htLock) continue;

        const newH = Math.round(entry.borderBoxSize[0].blockSize);
        const oldH = el._htPrev;
        el._htPrev = newH;

        if (oldH === undefined || oldH === newH) continue;

        el._htLock = true;
        el.classList.add("tab-height-anim");
        el.style.height = oldH + "px";
        void el.offsetWidth;
        el.style.height = newH + "px";

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

    target
      .querySelectorAll(".cbi-section-node-tabbed, .cbi-map-tabbed")
      .forEach(watch);

    /* ── View load animation (blur-in after spinner) ── */

    const watchView = (v) => {
      if (v._viewWatched) return;
      v._viewWatched = true;

      new MutationObserver((muts) => {
        for (const m of muts) {
          for (const n of m.removedNodes) {
            if (!n.classList?.contains("spinning")) continue;
            v.classList.remove("tab-content-enter");
            void v.offsetWidth;
            v.classList.add("tab-content-enter");
            v.addEventListener(
              "animationend",
              () => v.classList.remove("tab-content-enter"),
              { once: true },
            );
            return;
          }
        }
      }).observe(v, { childList: true });
    };

    const view = document.getElementById("view");
    if (view) watchView(view);

    new MutationObserver((muts) => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          if (n.matches?.(".cbi-section-node-tabbed, .cbi-map-tabbed"))
            watch(n);
          n.querySelectorAll?.(".cbi-section-node-tabbed, .cbi-map-tabbed")
            .forEach(watch);
          if (n.id === "view") watchView(n);
        }
      }
    }).observe(target, { childList: true, subtree: true });
  },
