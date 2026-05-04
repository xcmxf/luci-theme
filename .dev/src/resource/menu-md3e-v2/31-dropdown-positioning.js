  resetDropdownPanel(panel) {
    if (!(panel instanceof HTMLElement)) return;
    panel.classList.remove("align-end");
    panel.classList.remove("above");
    panel.style.removeProperty("position");
    panel.style.removeProperty("top");
    panel.style.removeProperty("right");
    panel.style.removeProperty("bottom");
    panel.style.removeProperty("left");
    panel.style.removeProperty("min-width");
    panel.style.removeProperty("max-height");
    panel.style.removeProperty("max-width");
  },

  positionDropdownPanel(anchor, panel) {
    if (!(anchor instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
      return;
    }

    const viewportPadding = 16;
    const panelGap = 8;
    const anchorRect = anchor.getBoundingClientRect();
    const viewportWidth = window.visualViewport?.width || window.innerWidth;
    const viewportHeight =
      window.visualViewport?.height || window.innerHeight;
    const anchorWidth = Math.ceil(anchorRect.width);

    this.resetDropdownPanel(panel);

    const naturalWidth = Math.max(panel.scrollWidth, anchorWidth);
    const naturalHeight = Math.max(panel.scrollHeight, 0);
    const availableRight = Math.max(
      anchorWidth,
      Math.floor(viewportWidth - anchorRect.left - viewportPadding),
    );
    const availableLeft = Math.max(
      anchorWidth,
      Math.floor(anchorRect.right - viewportPadding),
    );
    const alignEnd =
      naturalWidth > availableRight && availableLeft > availableRight;
    const maxWidth = Math.max(
      anchorWidth,
      alignEnd ? availableLeft : availableRight,
    );
    const availableBelow = Math.max(
      0,
      Math.floor(
        viewportHeight - anchorRect.bottom - viewportPadding - panelGap,
      ),
    );
    const availableAbove = Math.max(
      0,
      Math.floor(anchorRect.top - viewportPadding - panelGap),
    );
    const openAbove =
      naturalHeight > availableBelow && availableAbove > availableBelow;

    panel.classList.toggle("align-end", alignEnd);
    panel.classList.toggle("above", openAbove);
    panel.style.position = "absolute";
    panel.style.minWidth = `${anchorWidth}px`;
    panel.style.maxHeight = `${openAbove ? availableAbove : availableBelow}px`;
    panel.style.maxWidth = `${maxWidth}px`;

    if (alignEnd) {
      panel.style.left = "auto";
      panel.style.right = "0";
    } else {
      panel.style.left = "0";
      panel.style.right = "auto";
    }

    if (openAbove) {
      panel.style.top = "auto";
      panel.style.bottom = `calc(100% + ${panelGap}px)`;
    } else {
      panel.style.top = `calc(100% + ${panelGap}px)`;
      panel.style.bottom = "auto";
    }
  },
