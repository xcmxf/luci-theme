  initNetworkStatusCards() {
    if (this._networkStatusCardsInitialized) return;

    const target = document.getElementById("maincontent") || document.body;
    if (!target) return;

    const enhanceCard = (card, allowNetworkCard = false) => {
      if (!(card instanceof HTMLElement)) return false;

      const isPortCard = Boolean(
        card.querySelector(":scope > .ifacebox-head.cbi-tooltip-container"),
      );

      card.classList.toggle("md3e-port-card", isPortCard);

      if (allowNetworkCard) {
        card.classList.toggle("md3e-network-card", !isPortCard);
      } else if (isPortCard) {
        card.classList.remove("md3e-network-card");
      }

      if (isPortCard) {
        card
          .querySelector(":scope > .ifacebox-head:first-child")
          ?.classList.add("md3e-port-name");
        card
          .querySelector(":scope > .ifacebox-head.cbi-tooltip-container")
          ?.classList.add("md3e-port-zone");

        const bodies = Array.from(
          card.querySelectorAll(":scope > .ifacebox-body"),
        );

        bodies[0]?.classList.add("md3e-port-link");
        bodies[1]?.classList.add("md3e-port-stats");
        bodies[1]
          ?.querySelector(":scope > .cbi-tooltip-container")
          ?.classList.add("md3e-port-traffic");
      }

      if (!isPortCard && allowNetworkCard) {
        card
          .querySelectorAll(":scope > .ifacebox-body .ifacebadge")
          .forEach((badge) => badge.classList.add("md3e-network-list-item"));
      }

      return isPortCard;
    };

    const enhance = (scope = target) => {
      const markNetworkInterfaceRow = (node) => {
        if (!(node instanceof HTMLElement)) return;

        const ifaceCell = node.matches('[data-name="_ifacebox"]')
          ? node
          : node.querySelector?.('[data-name="_ifacebox"]');
        if (!(ifaceCell instanceof HTMLElement)) return;

        const row = ifaceCell.closest("tr, .tr, .cbi-section-table-row");
        if (!(row instanceof HTMLElement)) return;

        row.classList.add("md3e-interface-row");
        ifaceCell.classList.add("md3e-interface-cell");
        row
          .querySelector('[data-name="_ifacestat"]')
          ?.classList.add("md3e-interface-status-cell");
        row
          .querySelector(
            ".cbi-section-actions, .md3e-row-actions, .md3e-row-action-cell",
          )
          ?.classList.add("md3e-interface-actions-cell");
      };

      const tables = [];
      if (
        scope instanceof HTMLElement &&
        scope.matches(".network-status-table")
      ) {
        tables.push(scope);
      }
      scope.querySelectorAll?.(".network-status-table").forEach((table) =>
        tables.push(table),
      );

      tables.forEach((table) => {
        table.classList.add("md3e-network-card-grid");

        table.querySelectorAll(":scope > .ifacebox").forEach((card) => {
          enhanceCard(card, true);
        });
      });

      const portCards = [];
      if (
        scope instanceof HTMLElement &&
        scope.matches(".ifacebox") &&
        scope.querySelector(":scope > .ifacebox-head.cbi-tooltip-container")
      ) {
        portCards.push(scope);
      }

      scope.querySelectorAll?.(".ifacebox").forEach((card) => {
        if (
          card instanceof HTMLElement &&
          card.querySelector(":scope > .ifacebox-head.cbi-tooltip-container")
        ) {
          portCards.push(card);
        }
      });

      portCards.forEach((card) => {
        if (!enhanceCard(card, false)) return;

        const grid = card.parentElement;
        if (grid && !grid.classList.contains("network-status-table")) {
          grid.classList.add("md3e-port-card-grid");
        }
      });

      if (
        scope instanceof HTMLElement &&
        scope.matches('[data-name="_ifacebox"]')
      ) {
        markNetworkInterfaceRow(scope);
      }
      scope
        .querySelectorAll?.('[data-name="_ifacebox"]')
        .forEach(markNetworkInterfaceRow);
    };

    this._networkStatusCardsInitialized = true;
    enhance(target);

    target._md3eNetworkStatusObserver = new MutationObserver((mutations) => {
      const added = new Set();

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) added.add(node);
        }
      }

      if (!added.size) return;
      this.scheduleFrame("_networkStatusCardsFrame", () => {
        added.forEach((node) => {
          if (node.isConnected) enhance(node);
        });
      });
    });

    target._md3eNetworkStatusObserver.observe(target, {
      childList: true,
      subtree: true,
    });
  },
