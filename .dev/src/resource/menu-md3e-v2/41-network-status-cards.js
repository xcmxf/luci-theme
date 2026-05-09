  initNetworkStatusCards() {
    if (this._networkStatusCardsInitialized) return;

    const target = document.getElementById("maincontent") || document.body;
    if (!target) return;

    const enhance = (scope = target) => {
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
          if (!(card instanceof HTMLElement)) return;

          const isPortCard = Boolean(
            card.querySelector(":scope > .ifacebox-head.cbi-tooltip-container"),
          );
          card.classList.toggle("md3e-port-card", isPortCard);
          card.classList.toggle("md3e-network-card", !isPortCard);

          if (!isPortCard) {
            card
              .querySelectorAll(":scope > .ifacebox-body .ifacebadge")
              .forEach((badge) =>
                badge.classList.add("md3e-network-list-item"),
              );
          }
        });
      });
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
      requestAnimationFrame(() => {
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
