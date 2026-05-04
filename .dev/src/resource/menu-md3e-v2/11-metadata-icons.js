  getModeMetadata(modeName) {
    const key = String(modeName || "").toLowerCase();

    return (
      {
        status: {
          panelTitle: _("Live system view"),
          copy: _(
            "Overview, runtime signals, and device status routes tuned for quick scanning.",
          ),
        },
        system: {
          panelTitle: _("System controls"),
          copy: _(
            "Firmware, host identity, storage, and time-sensitive maintenance settings.",
          ),
        },
        services: {
          panelTitle: _("Application stack"),
          copy: _(
            "Installed service pages and operational controls in a calmer secondary panel.",
          ),
        },
        network: {
          panelTitle: _("Traffic and transport"),
          copy: _(
            "Interfaces, wireless, routing, and policy destinations for active network work.",
          ),
        },
        admin: {
          panelTitle: _("Access and policy"),
          copy: _(
            "Authentication, permissions, and administrative routes with stronger state clarity.",
          ),
        },
        vpn: {
          panelTitle: _("Secure tunnels"),
          copy: _(
            "Encrypted transport pages and tunnel controls grouped as a focused workflow.",
          ),
        },
        nas: {
          panelTitle: _("Storage workspace"),
          copy: _(
            "File, storage, and sharing routes arranged as a durable utility surface.",
          ),
        },
        modem: {
          panelTitle: _("Cellular controls"),
          copy: _(
            "Signal, modem, and uplink routes grouped for mobile-network operations.",
          ),
        },
        statistics: {
          panelTitle: _("Observability"),
          copy: _(
            "Graphs, metrics, and diagnostics presented as a quieter monitoring surface.",
          ),
        },
      }[key] || {
        panelTitle: _("Section workspace"),
        copy: _(
          "Secondary destinations for this workspace, arranged as a supporting Material 3 panel.",
        ),
      }
    );
  },

  getWorkspaceCategories(tree) {
    return ui.menu.getChildren(tree).filter((category) => {
      if (!category || category.name === "logout") return false;
      return true;
    });
  },

  createModeIcon(modeName) {
    const key = String(modeName || "").toLowerCase();
    const specs =
      {
        status: [
          {
            tag: "path",
            attrs: {
              d: "M4 13h3l2.25-5L14 17l2.15-4H20",
            },
          },
        ],
        system: [
          {
            tag: "path",
            attrs: {
              d: "M5 6h14M5 18h14M8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm8 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
            },
          },
        ],
        services: [
          {
            tag: "path",
            attrs: {
              d: "M5 7.5 12 4l7 3.5-7 3.5-7-3.5Zm0 4.5L12 15.5 19 12M5 16.5 12 20l7-3.5",
            },
          },
        ],
        network: [
          {
            tag: "path",
            attrs: {
              d: "M4.5 10.5a11 11 0 0 1 15 0M7.5 13.5a6.5 6.5 0 0 1 9 0M10.5 16.5a2.5 2.5 0 0 1 3 0M12 20h.01",
            },
          },
        ],
        admin: [
          {
            tag: "path",
            attrs: {
              d: "M8 11V8.5a4 4 0 0 1 8 0V11M6.5 11h11v8h-11z",
            },
          },
        ],
        vpn: [
          {
            tag: "path",
            attrs: {
              d: "M12 4 6 6.5V12c0 4 2.55 6.85 6 8 3.45-1.15 6-4 6-8V6.5L12 4Zm-2.25 8.5 1.75 1.75L14.75 11",
            },
          },
        ],
        nas: [
          {
            tag: "path",
            attrs: {
              d: "M5 6.5h14v11H5zM8 10.5h.01M8 14.5h.01M11 10.5h5M11 14.5h5",
            },
          },
        ],
        modem: [
          {
            tag: "path",
            attrs: {
              d: "M6 18h12M8.5 15V9.5M12 15V6.5M15.5 15V11.5",
            },
          },
        ],
        statistics: [
          {
            tag: "path",
            attrs: {
              d: "M5 18h14M8 16V10M12 16V7M16 16v-4",
            },
          },
        ],
      }[key] || [
        {
          tag: "path",
          attrs: {
            d: "M6 6h5v5H6zm7 0h5v5h-5zM6 13h5v5H6zm7 0h5v5h-5z",
          },
        },
      ];

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");

    specs.forEach((spec) => {
      const element = document.createElementNS(
        "http://www.w3.org/2000/svg",
        spec.tag || "path",
      );
      Object.entries(spec.attrs || {}).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
      svg.appendChild(element);
    });

    return svg;
  },
