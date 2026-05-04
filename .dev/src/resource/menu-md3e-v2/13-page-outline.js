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

        if (!section.id || usedIds.has(section.id)) {
          const slug = this.slugifyText(label, `section-${index + 1}`);
          section.id = `md3e-${index + 1}-${slug}`;
        }

        usedIds.add(section.id);

        return { id: section.id, label, element: section };
      })
      .filter(Boolean);
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
      outline?.remove();
      document.body?.classList.remove("md3e-has-page-outline");
      return;
    }

    if (!(outline instanceof HTMLElement)) {
      outline = E("aside", {
        class: "md3e-on-this-page",
        "aria-label": _("On this page"),
      });
      main.insertBefore(outline, content.nextSibling);
    }

    document.body?.classList.add("md3e-has-page-outline");
    outline.innerHTML = "";

    const nav = E("nav", { class: "md3e-on-this-page__nav" });
    nav.appendChild(
      E("div", { class: "md3e-on-this-page__title" }, [_("On this page")]),
    );

    const list = E("ol", { class: "md3e-on-this-page__list" });
    sections.slice(0, 8).forEach((section, index) => {
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
      links.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === "#" + id);
      });
    };

    links.forEach((link) => {
      link.addEventListener("click", (event) => {
        const targetId = link.getAttribute("href")?.slice(1);
        if (!targetId) return;

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

    sections.forEach((section) =>
      this._pageOutlineObserver.observe(section.element),
    );
  },

  initPageChrome() {
    const content = document.querySelector(".docs-content");
    if (!content || content._md3ePageChromeInit) return;

    const decorate = () => {
      content.querySelector(".md3e-page-hero")?.remove();

      const view = content.querySelector("#view");
      const map = view?.querySelector(".cbi-map") || view;
      if (!view || !map) return;

      const sections = this.getPageOutlineSections(map);
      this.syncPageOutline(sections);
    };

    decorate();

    new MutationObserver(() => {
      requestAnimationFrame(decorate);
    }).observe(content, { childList: true, subtree: true });

    content._md3ePageChromeInit = true;
  },
