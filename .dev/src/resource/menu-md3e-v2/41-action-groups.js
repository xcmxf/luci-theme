  initActionButtonGroups() {
    const target = document.getElementById("maincontent") || document.body;
    if (!target) return;

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
        this.initSplitButton(splitButton);
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

    if (target._md3eActionGroupObserver) return;

    target._md3eActionGroupObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches?.(".cbi-page-actions")) enhance(node);
          node.querySelectorAll?.(".cbi-page-actions").forEach(enhance);
        }
      }
    });

    target._md3eActionGroupObserver.observe(target, {
      childList: true,
      subtree: true,
    });
  },

  initMobileActionGroups() {
    const target = document.getElementById("maincontent") || document.body;

    const syncDirtyClass = () => {
      const anyDirty = target.querySelector(".cbi-page-actions[data-dirty='true']");
      document.body.classList.toggle("mobile-page-actions-visible", Boolean(anyDirty));
    };

    const setDirty = (actions, dirty) => {
      if (!actions.length) return;
      actions.forEach((action) => {
        action.dataset.dirty = dirty ? "true" : "false";
      });
      syncDirtyClass();
    };

    const getActionsForElement = (el) => {
      const scopes = [
        el.closest(".cbi-section"),
        el.closest(".cbi-map"),
        el.closest("form"),
      ].filter(Boolean);

      for (const scope of scopes) {
        const actions = Array.from(scope.querySelectorAll(".cbi-page-actions"));
        if (actions.length) return actions;
      }

      return Array.from(target.querySelectorAll(".cbi-page-actions"));
    };

    target.addEventListener("input", (event) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        setDirty(getActionsForElement(event.target), true);
      }
    }, true);

    target.addEventListener("change", (event) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        setDirty(getActionsForElement(event.target), true);
      }
    }, true);

    target.addEventListener("click", (event) => {
      const btn = event.target.closest(".cbi-button-reset, .cbi-button-save, .cbi-button-apply, .btn.primary");
      if (btn) {
        const actions = btn.closest(".cbi-page-actions");
        if (actions) {
          const resetDelay = btn.matches(".cbi-button-reset") ? 40 : 160;
          setTimeout(() => setDirty([actions], false), resetDelay);
        }
      }
    }, true);

    syncDirtyClass();
  },
