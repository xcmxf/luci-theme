  initModalOverride() {
    const origShow = ui.showModal;
    const origHide = ui.hideModal;
    if (!origShow || !origHide) return;

    let hideTimer = null;

    ui.showModal = function (title, children, ...classes) {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      document.body.classList.remove("modal-overlay-exit");
      const dlg = origShow.call(this, title, children, ...classes);
      dlg.classList.remove("modal-exit");
      return dlg;
    };

    ui.hideModal = function () {
      const overlay = document.getElementById("modal_overlay");
      const dlg = overlay?.firstElementChild;
      if (!dlg || !document.body.classList.contains("modal-overlay-active")) {
        origHide.call(this);
        return;
      }

      dlg.classList.add("modal-exit");
      document.body.classList.add("modal-overlay-exit");

      const finish = () => {
        hideTimer = null;
        dlg.classList.remove("modal-exit");
        document.body.classList.remove("modal-overlay-exit");
        origHide.call(this);
      };

      hideTimer = setTimeout(finish, 180);
    };

    /* Override displayStatus to use toast instead of modal */
    const origDisplayStatus = ui.changes?.displayStatus;
    if (origDisplayStatus) {
      let statusToast = null;

      const hasButtons = (content) => {
        if (!content) return false;
        if (content.querySelector?.(".btn")) return true;
        if (Array.isArray(content))
          return content.some((c) => c?.querySelector?.(".btn"));
        return false;
      };

      const dismissStatusToast = () => {
        if (!statusToast || !statusToast.parentNode) return;
        statusToast.classList.add("toast-exit");
        statusToast.addEventListener(
          "animationend",
          () => statusToast.remove(),
          { once: true },
        );
        setTimeout(() => {
          if (statusToast?.parentNode) statusToast.remove();
        }, 400);
        statusToast = null;
      };

      ui.changes.displayStatus = function (type, content) {
        /* Interactive content (connectivity warning) → keep as modal */
        if (type && hasButtons(content)) {
          dismissStatusToast();
          origDisplayStatus.call(this, type, content);
          return;
        }

        /* Hide → dismiss toast */
        if (!type) {
          dismissStatusToast();
          if (this.was_polling) request.poll.start();
          return;
        }

        /* Show/update status toast */
        const container = document.getElementById("maincontent");
        if (!container) {
          origDisplayStatus.call(this, type, content);
          return;
        }

        if (!statusToast || !statusToast.parentNode) {
          statusToast = E("div", { class: "alert-message" });
          statusToast._toastInit = true;
          container.insertBefore(statusToast, container.firstChild);
        }

        /* Strip 'notice' so it renders as neutral toast, not warning */
        const classes = type
          .split(/\s+/)
          .filter((c) => c && c !== "notice");
        statusToast.className = "alert-message";
        if (classes.length)
          DOMTokenList.prototype.add.apply(statusToast.classList, classes);

        if (content) L.dom.content(statusToast, content);

        if (!this.was_polling) {
          this.was_polling = request.poll.active();
          request.poll.stop();
        }
      };
    }
  },

  initToastAutoDismiss() {
    const DISMISS_DELAY = 30000;
    const container = document.getElementById("maincontent");
    if (!container) return;

    const updateIndices = () => {
      const toasts = container.querySelectorAll(
        ":scope > .alert-message:not(.toast-exit)",
      );
      toasts.forEach((t, i) => {
        t.style.setProperty("--toast-index", i);
      });
    };

    const dismissToast = (toast) => {
      if (toast._toastDismissing) return;
      toast._toastDismissing = true;
      if (toast._toastTimer) clearTimeout(toast._toastTimer);

      toast.classList.add("toast-exit");
      toast.addEventListener(
        "animationend",
        () => {
          toast.remove();
          updateIndices();
        },
        { once: true },
      );

      /* Fallback removal if animation doesn't fire */
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
          updateIndices();
        }
      }, 400);
    };

    const setupToast = (toast) => {
      if (toast._toastInit) return;
      toast._toastInit = true;

      /* Recalculate stacking indices (newest = index 0 = top) */
      updateIndices();

      /* Auto-dismiss after delay */
      toast._toastTimer = setTimeout(() => dismissToast(toast), DISMISS_DELAY);

      /* Dismiss on close button click */
      const btn = toast.querySelector(".btn");
      if (btn) {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          dismissToast(toast);
        });
      }
    };

    /* Watch for new toasts added to #maincontent */
    new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (
            node.nodeType === 1 &&
            node.classList?.contains("alert-message") &&
            node.parentNode === container
          ) {
            setupToast(node);
          }
        }
      }
    }).observe(container, { childList: true });

    /* Setup any existing toasts */
    container
      .querySelectorAll(":scope > .alert-message")
      .forEach(setupToast);
  },
