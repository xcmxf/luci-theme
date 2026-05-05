import "../media/main.css";
import "../../public/md3e/components.css";

const THEME_KEY = "md3e.theme";
const PREVIEW_AUTH_KEY = "md3e.preview.auth";
const MOBILE_LAYOUT_MAX_WIDTH = 920;
const MOBILE_LAYOUT_QUERY = `(max-width: ${MOBILE_LAYOUT_MAX_WIDTH}px)`;

function isMobileViewport() {
  return window.matchMedia(MOBILE_LAYOUT_QUERY).matches;
}

function syncLayoutMode() {
  const mode = isMobileViewport() ? "mobile" : "desktop";
  document.documentElement.setAttribute("data-layout-mode", mode);
  document.body?.setAttribute("data-layout-mode", mode);
}

function setTheme(theme) {
  const current = ["light", "dark", "device"].includes(theme)
    ? theme
    : "device";
  const isDark =
    current === "dark" ||
    (current === "device" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.add("theme-transition");
  document.documentElement.setAttribute("data-darkmode", String(isDark));
  localStorage.setItem(THEME_KEY, current);
  window.dispatchEvent(new CustomEvent("md3e:themechange"));
  window.setTimeout(
    () => document.documentElement.classList.remove("theme-transition"),
    400,
  );
}

function syncThemeButtons() {
  const isDark =
    document.documentElement.getAttribute("data-darkmode") === "true";

  document.querySelectorAll(".theme-toggle").forEach((button) => {
    button.classList.toggle("is-dark", isDark);
  });
}

function toggleTheme() {
  const isDark =
    document.documentElement.getAttribute("data-darkmode") === "true";
  setTheme(isDark ? "light" : "dark");
  syncThemeButtons();
}

function initTheme() {
  setTheme(localStorage.getItem(THEME_KEY));
  syncThemeButtons();

  document.querySelectorAll(".theme-toggle").forEach((button) => {
    button.addEventListener("click", toggleTheme);
  });

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      const theme = localStorage.getItem(THEME_KEY) || "device";
      if (theme === "device") {
        setTheme("device");
        syncThemeButtons();
      }
    });
}

function initHeaderBlur() {
  const overlay = document.getElementById("header-blur-overlay");
  if (!overlay) return;

  const update = () => {
    overlay.setAttribute("data-is-opaque", window.scrollY > 24 ? "true" : "false");
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
}

function initSidebarSections() {
  document.querySelectorAll(".sidebar-toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const section = toggle.closest(".sidebar-section");
      if (!section) return;

      const willExpand = !section.classList.contains("expanded");
      section
        .closest(".sidebar-sections")
        ?.querySelectorAll(".sidebar-section")
        .forEach((peer) => {
          peer.classList.remove("expanded");
          peer
            .querySelector(":scope > .sidebar-toggle")
            ?.setAttribute("aria-expanded", "false");
        });

      section.classList.toggle("expanded", willExpand);
      toggle.setAttribute("aria-expanded", String(willExpand));
    });
  });
}

function initMobileMenu() {
  const overlay = document.getElementById("mobile-menu-overlay");
  const openButton = document.getElementById("mobile-menu-btn");
  const closeButton = document.getElementById("mobile-nav-close");

  if (!overlay || !openButton) return;
  if (overlay.dataset.md3eMobileInit === "true") return;
  overlay.dataset.md3eMobileInit = "true";

  const setOpen = (open) => {
    if (open && !isMobileViewport()) return;
    overlay.classList.toggle("mobile-menu-open", open);
    document.body.classList.toggle("mobile-menu-open", open);
    document.body.style.overflow = open ? "hidden" : "";
    openButton.setAttribute("aria-expanded", String(open));

    if (open) {
      window.requestAnimationFrame(() =>
        window.__md3ePreviewMobileExpandActive?.(),
      );
    } else {
      window.__md3ePreviewMobileReset?.();
    }
  };

  const close = () => {
    setOpen(false);
  };

  const open = () => {
    setOpen(true);
  };

  openButton.addEventListener("click", (event) => {
    event.preventDefault();
    if (overlay.classList.contains("mobile-menu-open")) close();
    else open();
  });

  closeButton?.addEventListener("click", close);

  overlay.addEventListener("click", (event) => {
    if (event.target.closest(".mobile-nav .md3e-mobile-secondary-link, .mobile-nav .header-logout-btn")) {
      close();
      return;
    }
    if (event.target === overlay) close();
  });

  if (!window.__md3ePreviewMobileEscHandler) {
    window.__md3ePreviewMobileEscHandler = (event) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", window.__md3ePreviewMobileEscHandler);
  }

  const media = window.matchMedia(MOBILE_LAYOUT_QUERY);
  media.addEventListener("change", () => {
    syncLayoutMode();
    if (!media.matches && overlay.classList.contains("mobile-menu-open")) {
      close();
    }
  });
}

function initPreviewMobileDrawerSections() {
  const primaryList = document.querySelector(".mobile-nav .md3e-mobile-primary-list");
  if (!(primaryList instanceof HTMLElement)) return;
  if (primaryList.dataset.md3eInit === "true") return;
  primaryList.dataset.md3eInit = "true";

  const items = Array.from(
    primaryList.querySelectorAll(":scope > .md3e-mobile-primary-item"),
  );
  const sections = new Map();

  const setExpandedMode = (modeName = null) => {
    sections.forEach(({ item, toggle, panel }) => {
      const expanded = Boolean(modeName) && toggle.dataset.mode === modeName;
      item.dataset.expanded = String(expanded);
      toggle.setAttribute("aria-expanded", String(expanded));
      panel.setAttribute("aria-hidden", String(!expanded));
      panel.hidden = !expanded;
    });
  };

  primaryList.querySelectorAll(".md3e-mobile-primary-toggle").forEach((toggle) => {
    const item = toggle.closest(".md3e-mobile-primary-item");
    if (!(item instanceof HTMLElement)) return;

    const mode = toggle.dataset.mode || "status";
    const links = Array.from(item.querySelectorAll(".md3e-mobile-secondary-link"));
    const isActivePrimary =
      toggle.classList.contains("active") || item.classList.contains("active");

    if (isActivePrimary) {
      toggle.setAttribute("aria-current", "page");
    }

    item.querySelectorAll(".md3e-mobile-secondary-list, .md3e-mobile-secondary-copy").forEach((node) => {
      node.remove();
    });

    if (!links.length) {
      toggle.classList.add("is-static");
      toggle.setAttribute("aria-expanded", "false");
      return;
    }

    const panelId = `md3e-preview-mobile-secondary-${mode}`;
    const panelWrap = document.createElement("div");
    panelWrap.className = "md3e-mobile-secondary-wrap";
    panelWrap.id = panelId;
    panelWrap.setAttribute("aria-hidden", "true");
    panelWrap.hidden = true;

    const panel = document.createElement("div");
    panel.className = "md3e-mobile-secondary-panel";

    const list = document.createElement("ul");
    list.className = "md3e-mobile-secondary-list";

    links.forEach((link) => {
      const li = document.createElement("li");
      li.className = "md3e-mobile-secondary-item";
      const clonedLink = link.cloneNode(true);
      if (clonedLink instanceof HTMLElement && clonedLink.classList.contains("active")) {
        clonedLink.setAttribute("aria-current", "page");
      }
      li.appendChild(clonedLink);
      list.appendChild(li);
    });

    panel.appendChild(list);
    panelWrap.appendChild(panel);
    item.appendChild(panelWrap);

    sections.set(mode, { item, toggle, panel: panelWrap });
    toggle.setAttribute("aria-controls", panelId);

    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      const expanded = item.dataset.expanded === "true";
      setExpandedMode(expanded ? null : mode);
    });
  });

  const activeToggle =
    primaryList.querySelector(".md3e-mobile-primary-toggle.active") ||
    primaryList.querySelector(
      ".md3e-mobile-primary-item.active .md3e-mobile-primary-toggle",
    );
  const activeMode = activeToggle?.dataset.mode || "status";

  window.__md3ePreviewMobileReset = () => setExpandedMode(null);
  window.__md3ePreviewMobileExpandActive = () => setExpandedMode(activeMode);
  window.__md3ePreviewMobileExpandActive();
}

const PREVIEW_NAV_PANELS = {
  status: {
    kicker: "Status",
    title: "Live system view",
    copy: "Overview, runtime signals, and feedback states tuned for quick scanning.",
    items: [
      ["Overview", "#section-overview"],
      ["Quick Settings", "#section-settings"],
      ["Segmented Views", "#section-tabs"],
      ["Client Table", "#section-table"],
      ["Feedback States", "#section-feedback"],
    ],
  },
  network: {
    kicker: "Network",
    title: "Traffic and transport",
    copy: "Adaptive navigation, submenu structure, and route-level status treatment.",
    items: [
      ["Navigation Rail", "#section-navigation"],
      ["Nested Menus", "#section-submenus"],
      ["Feedback States", "#section-feedback"],
      ["Client Table", "#section-table"],
    ],
  },
  services: {
    kicker: "Services",
    title: "Application stack",
    copy: "Operational pages, heavier content blocks, and denser service-facing shells.",
    items: [
      ["Dense Logs", "#section-logs"],
      ["Feedback States", "#section-feedback"],
      ["Action Group", "#page-actions"],
    ],
  },
  system: {
    kicker: "System",
    title: "System controls",
    copy: "Settings-heavy views, forms, and section hierarchy for ongoing configuration work.",
    items: [
      ["Quick Settings", "#section-settings"],
      ["Segmented Views", "#section-tabs"],
      ["Client Table", "#section-table"],
    ],
  },
  admin: {
    kicker: "Admin",
    title: "Access and policy",
    copy: "Confirmation actions, account-facing controls, and persistent page actions.",
    items: [
      ["Feedback States", "#section-feedback"],
      ["Action Group", "#page-actions"],
      ["Dense Logs", "#section-logs"],
    ],
  },
};

function createPreviewNavPanel(mode) {
  const data = PREVIEW_NAV_PANELS[mode] || PREVIEW_NAV_PANELS.status;
  const wrapper = document.createElement("div");
  wrapper.className = "md3e-nav-panel";

  const nav = document.createElement("nav");
  nav.className = "sidebar-nav";
  nav.setAttribute("aria-label", data.kicker);

  const scroll = document.createElement("div");
  scroll.className = "md3e-nav-panel-scroll";

  const list = document.createElement("ul");
  list.className = "sidebar-list md3e-subnav-list";

  data.items.forEach(([label, href], index) => {
    const item = document.createElement("li");
    item.className = "sidebar-item" + (index === 0 ? " active" : "");

    const link = document.createElement("a");
    link.className =
      "sidebar-link md3e-subnav-link" + (index === 0 ? " active" : "");
    link.href = href;
    link.textContent = label;

    item.appendChild(link);
    list.appendChild(item);
  });

  scroll.appendChild(list);
  nav.append(scroll);
  wrapper.appendChild(nav);

  return wrapper;
}

function initPreviewNavShell() {
  const shell = document.querySelector(".docs-sidebar .md3e-nav-shell");
  if (!(shell instanceof HTMLElement)) return;
  if (shell.dataset.md3eDesktopInit === "true") return;
  shell.dataset.md3eDesktopInit = "true";

  const buttons = Array.from(shell.querySelectorAll(".md3e-mode-link"));
  if (!buttons.length) return;

  const pageMode =
    buttons.find((button) => button.classList.contains("active"))?.dataset.mode ||
    "status";

  const updateButtons = (selectedMode = pageMode) => {
    buttons.forEach((button) => {
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

  const renderPanel = (mode) => {
    shell.querySelector(".md3e-nav-panel")?.remove();
    shell.appendChild(createPreviewNavPanel(mode));
    shell.dataset.panelMode = mode;
    updateButtons(mode);
  };

  const collapse = () => {
    shell.classList.add("is-collapsed");
    shell.classList.remove("is-expanded");
    shell.dataset.panelMode = pageMode;
    updateButtons(pageMode);
  };

  const expand = (mode) => {
    renderPanel(mode);
    shell.classList.remove("is-collapsed");
    shell.classList.add("is-expanded");
    updateButtons(mode);
  };

  renderPanel(pageMode);
  collapse();

  buttons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();

      const mode = button.dataset.mode || pageMode;
      const isCollapsed = shell.classList.contains("is-collapsed");
      const isSameMode = shell.dataset.panelMode === mode;

      if (isCollapsed) {
        expand(mode);
        return;
      }

      if (isSameMode) {
        collapse();
        return;
      }

      expand(mode);
    });
  });

  window.__md3ePreviewDesktopShell = shell;
  window.__md3ePreviewDesktopCollapse = collapse;

  if (!window.__md3ePreviewDesktopClickHandler) {
    window.__md3ePreviewDesktopClickHandler = (event) => {
      const currentShell = window.__md3ePreviewDesktopShell;
      if (!currentShell) return;
      if (isMobileViewport()) return;
      if (currentShell.classList.contains("is-collapsed")) return;
      if (currentShell.contains(event.target)) return;
      window.__md3ePreviewDesktopCollapse?.();
    };
    document.addEventListener("click", window.__md3ePreviewDesktopClickHandler);
  }

  if (!window.__md3ePreviewDesktopEscHandler) {
    window.__md3ePreviewDesktopEscHandler = (event) => {
      const currentShell = window.__md3ePreviewDesktopShell;
      if (!currentShell) return;
      if (event.key === "Escape" && !currentShell.classList.contains("is-collapsed")) {
        window.__md3ePreviewDesktopCollapse?.();
      }
    };
    document.addEventListener("keydown", window.__md3ePreviewDesktopEscHandler);
  }
}

function initActionButtonGroups() {
  const target = document.getElementById("maincontent") || document.body;
  if (!target) return;

  const syncSplitButtonLabel = (splitButton) => {
    if (!(splitButton instanceof HTMLElement)) return;
    const menu =
      splitButton.querySelector(":scope > ul.dropdown") ||
      splitButton.querySelector(":scope > ul:not(.preview)");
    if (!(menu instanceof HTMLElement)) return;

    const current =
      menu.querySelector(":scope > li[display]") ||
      menu.querySelector(":scope > li[selected]") ||
      menu.querySelector(":scope > li");
    const label = current?.textContent?.trim() || "Save & Apply";

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
      toggle.setAttribute("aria-label", "Show more apply options");
    }
  };

  const initSplitButton = (splitButton) => {
    if (!(splitButton instanceof HTMLElement)) return;
    splitButton.classList.add("md3e-split-button");
    splitButton.dataset.md3eSplitButton = "true";
    syncSplitButtonLabel(splitButton);

    if (splitButton.dataset.md3eSplitButtonInit === "true") return;
    splitButton.dataset.md3eSplitButtonInit = "true";

    const menu =
      splitButton.querySelector(":scope > ul.dropdown") ||
      splitButton.querySelector(":scope > ul:not(.preview)");
    if (menu instanceof HTMLElement) {
      new MutationObserver(() => syncSplitButtonLabel(splitButton)).observe(
        menu,
        {
          attributes: true,
          childList: true,
          subtree: true,
        },
      );
    }
  };

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

    if (splitButton) {
      initSplitButton(splitButton);
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

  target.querySelectorAll(".cbi-page-actions").forEach(enhance);
}

function initMobileActionGroups() {
  const target = document.getElementById("maincontent") || document.body;
  const actions = document.querySelector(".cbi-page-actions");
  if (!actions) return;

  const fields = target.querySelectorAll("input, select, textarea");
  const initial = new Map();

  const snapshot = (field) => {
    if (field instanceof HTMLInputElement) {
      return field.type === "checkbox" || field.type === "radio"
        ? String(field.checked)
        : field.value;
    }
    return field.value;
  };

  const syncVisibility = () => {
    const dirty = Array.from(fields).some((field) => {
      if (
        !(field instanceof HTMLInputElement ||
          field instanceof HTMLSelectElement ||
          field instanceof HTMLTextAreaElement)
      ) {
        return false;
      }

      if (field.closest(".cbi-page-actions")) return false;
      return initial.get(field) !== snapshot(field);
    });

    document.body.classList.toggle("mobile-page-actions-visible", dirty);
    actions.dataset.dirty = dirty ? "true" : "false";
  };

  fields.forEach((field) => initial.set(field, snapshot(field)));

  target.addEventListener("input", syncVisibility, true);
  target.addEventListener("change", syncVisibility, true);

  document
    .querySelectorAll(
      ".cbi-page-actions .cbi-button-reset, .cbi-page-actions .cbi-button-save, .cbi-page-actions .cbi-button-apply",
    )
    .forEach((button) => {
      button.addEventListener("click", () => {
        if (button.classList.contains("cbi-button-reset")) {
          window.setTimeout(() => {
            fields.forEach((field) => initial.set(field, snapshot(field)));
            syncVisibility();
          }, 40);
          return;
        }

        actions.dataset.dirty = "false";
        document.body.classList.remove("mobile-page-actions-visible");
      });
    });
}

function initPreviewLoginScene() {
  const canvas = document.querySelector(".preview-login-stage .login-canvas");
  const loginScreen = document.querySelector(".preview-login-stage .login-screen");
  if (!(canvas instanceof HTMLCanvasElement) || !(loginScreen instanceof HTMLElement)) {
    return;
  }

  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
  });
  if (!gl) return;

  const vsSource = [
    "#version 300 es",
    "precision mediump float;",
    "in vec2 a_pos;",
    "uniform vec2 u_resolution;",
    "out vec2 fragCoord;",
    "void main() {",
    "  gl_Position = vec4(a_pos, 0.0, 1.0);",
    "  fragCoord = (a_pos + 1.0) * 0.5 * u_resolution;",
    "  fragCoord.y = u_resolution.y - fragCoord.y;",
    "}",
  ].join("\n");

  const fsSource = [
    "#version 300 es",
    "precision mediump float;",
    "in vec2 fragCoord;",
    "uniform float u_time;",
    "uniform float u_opacities[10];",
    "uniform vec3 u_colors[6];",
    "uniform float u_total_size;",
    "uniform float u_dot_size;",
    "uniform float u_speed;",
    "uniform vec2 u_resolution;",
    "out vec4 fragColor;",
    "float PHI = 1.61803398874989484820459;",
    "float random(vec2 xy) {",
    "  return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);",
    "}",
    "void main() {",
    "  vec2 st = fragCoord.xy;",
    "  st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));",
    "  st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));",
    "  float opacity = step(0.0, st.x) * step(0.0, st.y);",
    "  vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));",
    "  float frequency = 5.0;",
    "  float show_offset = random(st2);",
    "  float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency));",
    "  opacity *= u_opacities[int(rand * 10.0)];",
    "  opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));",
    "  opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));",
    "  vec3 color = u_colors[int(show_offset * 6.0)];",
    "  vec2 cg = u_resolution / 2.0 / u_total_size;",
    "  float d = distance(cg, st2);",
    "  float t_off = d * 0.01 + (random(st2) * 0.15);",
    "  opacity *= step(t_off, u_time * u_speed);",
    "  opacity *= clamp((1.0 - step(t_off + 0.1, u_time * u_speed)) * 1.25, 1.0, 1.25);",
    "  fragColor = vec4(color * opacity, opacity);",
    "}",
  ].join("\n");

  const compileShader = (type, source) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  };

  const program = gl.createProgram();
  if (!program) return;

  const vertexShader = compileShader(gl.VERTEX_SHADER, vsSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fsSource);
  if (!vertexShader || !fragmentShader) return;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );

  const positionLocation = gl.getAttribLocation(program, "a_pos");
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  const timeLocation = gl.getUniformLocation(program, "u_time");
  const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  const speedLocation = gl.getUniformLocation(program, "u_speed");
  const colorsLocation = gl.getUniformLocation(program, "u_colors");
  const opacitiesLocation = gl.getUniformLocation(program, "u_opacities");
  const totalSizeLocation = gl.getUniformLocation(program, "u_total_size");
  const dotSizeLocation = gl.getUniformLocation(program, "u_dot_size");
  const colorCtx = document.createElement("canvas").getContext("2d");

  const parseColor = (value, fallback = "#ffffff") => {
    if (!colorCtx) return [1, 1, 1];
    colorCtx.fillStyle = fallback;
    try {
      colorCtx.fillStyle = value || fallback;
    } catch {}
    const normalized = colorCtx.fillStyle;
    const match = normalized.match(/^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
    if (!match) return [1, 1, 1];
    return [
      Number.parseFloat(match[1]) / 255,
      Number.parseFloat(match[2]) / 255,
      Number.parseFloat(match[3]) / 255,
    ];
  };

  const mixColor = (a, b, t) => [
    a[0] * (1 - t) + b[0] * t,
    a[1] * (1 - t) + b[1] * t,
    a[2] * (1 - t) + b[2] * t,
  ];

  const applyPalette = () => {
    const isDark = document.documentElement.getAttribute("data-darkmode") === "true";
    const hasError = loginScreen.hasAttribute("data-error");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const styles = getComputedStyle(document.documentElement);
    const accent = parseColor(styles.getPropertyValue("--accent").trim(), isDark ? "#122231" : "#dbe8f6");
    const accentStrong = parseColor(
      styles.getPropertyValue("--accent-foreground").trim(),
      isDark ? "#c8ddf3" : "#004477",
    );
    const highlight = parseColor(
      styles.getPropertyValue("--surface-highlight").trim(),
      isDark ? "#1e1f22" : "#ffffff",
    );
    const error = parseColor(styles.getPropertyValue("--error").trim(), "#ffdedb");
    const errorStrong = parseColor(
      styles.getPropertyValue("--error-foreground").trim(),
      "#782a29",
    );

    const palette = hasError
      ? [
          errorStrong,
          mixColor(errorStrong, error, 0.25),
          mixColor(errorStrong, highlight, 0.18),
          mixColor(error, errorStrong, 0.35),
          mixColor(errorStrong, error, 0.48),
          mixColor(error, highlight, 0.2),
        ]
      : isDark
        ? [
            mixColor(accent, highlight, 0.18),
            mixColor(accentStrong, accent, 0.26),
            mixColor(accentStrong, highlight, 0.32),
            mixColor(accent, highlight, 0.08),
            mixColor(accentStrong, highlight, 0.54),
            mixColor(accentStrong, accent, 0.4),
          ]
        : [
            mixColor(accentStrong, accent, 0.32),
            mixColor(accentStrong, highlight, 0.6),
            mixColor(accent, highlight, 0.22),
            mixColor(accentStrong, highlight, 0.46),
            mixColor(accent, highlight, 0.14),
            mixColor(accentStrong, accent, 0.5),
          ];

    gl.uniform1fv(opacitiesLocation, [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1.0]);
    gl.uniform3fv(colorsLocation, palette.flat());
    gl.uniform1f(totalSizeLocation, prefersReducedMotion ? 24 : 20);
    gl.uniform1f(dotSizeLocation, prefersReducedMotion ? 4 : 6);
    gl.uniform1f(speedLocation, prefersReducedMotion ? 0.16 : isDark ? 0.34 : 0.4);
    gl.blendFunc(gl.SRC_ALPHA, isDark ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
  };

  gl.enable(gl.BLEND);

  const resize = () => {
    canvas.width = canvas.clientWidth * 2;
    canvas.height = canvas.clientHeight * 2;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
  };

  resize();
  applyPalette();
  window.addEventListener("resize", resize);
  window.addEventListener("md3e:themechange", applyPalette);
  window.addEventListener("md3e:preview-login-scene-refresh", () => {
    resize();
    applyPalette();
  });

  const start = performance.now();
  const frame = () => {
    gl.uniform1f(timeLocation, (performance.now() - start) / 1000);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    window.requestAnimationFrame(frame);
  };

  frame();
}

function setPreviewAuthState(state) {
  const nextState = state === "logged-out" ? "logged-out" : "logged-in";
  const overlay = document.getElementById("mobile-menu-overlay");
  const openButton = document.getElementById("mobile-menu-btn");

  document.body.setAttribute("data-preview-auth", nextState);
  localStorage.setItem(PREVIEW_AUTH_KEY, nextState);

  document.body.classList.remove("mobile-menu-open");
  document.body.style.overflow = "";
  overlay?.classList.remove("mobile-menu-open");
  openButton?.setAttribute("aria-expanded", "false");
  window.scrollTo(0, 0);

  if (nextState === "logged-out") {
    const user = document.getElementById("preview-luci-username");
    const password = document.getElementById("preview-luci-password");

    window.requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent("md3e:preview-login-scene-refresh"));
    });

    window.setTimeout(() => {
      if (
        user instanceof HTMLInputElement &&
        password instanceof HTMLInputElement
      ) {
        if (user.value.trim()) password.focus();
        else user.focus();
      }
    }, 40);
  }
}

function initPreviewAuth() {
  const savedState = localStorage.getItem(PREVIEW_AUTH_KEY) || "logged-in";
  const loginScreen = document.querySelector(".preview-login-stage .login-screen");
  const loginForm = document.querySelector(".preview-login-form");
  const loginError = document.querySelector(".preview-login-error");
  const user = document.getElementById("preview-luci-username");
  const password = document.getElementById("preview-luci-password");

  setPreviewAuthState(savedState);

  document.querySelectorAll(".js-preview-logout").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      setPreviewAuthState("logged-out");
    });
  });

  if (
    !loginForm ||
    !(user instanceof HTMLInputElement) ||
    !(password instanceof HTMLInputElement)
  ) {
    return;
  }

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const valid = user.value.trim() && password.value.trim();

    if (!valid) {
      loginScreen?.setAttribute("data-error", "true");
      if (loginError instanceof HTMLElement) loginError.hidden = false;
      window.dispatchEvent(new CustomEvent("md3e:preview-login-scene-refresh"));
      if (!user.value.trim()) user.focus();
      else password.focus();
      return;
    }

    loginScreen?.removeAttribute("data-error");
    if (loginError instanceof HTMLElement) loginError.hidden = true;
    window.dispatchEvent(new CustomEvent("md3e:preview-login-scene-refresh"));
    password.value = "";
    setPreviewAuthState("logged-in");
  });
}

function initTabs() {
  document.querySelectorAll("[data-preview-tabs]").forEach((tabList) => {
    const group = tabList.getAttribute("data-preview-tabs");
    if (!group) return;

    tabList.querySelectorAll("li").forEach((item) => {
      item.addEventListener("click", (event) => {
        event.preventDefault();
        const target = item.getAttribute("data-preview-target");
        if (!target) return;

        tabList.querySelectorAll("li").forEach((peer) => {
          peer.classList.remove("cbi-tab", "active");
        });

        item.classList.add(
          tabList.classList.contains("cbi-tabmenu") ? "cbi-tab" : "active",
        );

        document
          .querySelectorAll(`[data-preview-group="${group}"] [data-preview-panel]`)
          .forEach((panel) => {
            panel.setAttribute(
              "data-tab-active",
              panel.getAttribute("data-preview-panel") === target ? "true" : "false",
            );
          });
      });
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  syncLayoutMode();
  initTheme();
  initPreviewLoginScene();
  initPreviewAuth();
  initHeaderBlur();
  initSidebarSections();
  initPreviewNavShell();
  initMobileMenu();
  initPreviewMobileDrawerSections();
  initActionButtonGroups();
  initMobileActionGroups();
  initTabs();
});
