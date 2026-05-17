  initNavHover() {
    const nav = document.querySelector("#topmenu");
    if (!nav) return;

    const items = Array.from(nav.querySelectorAll(":scope > li"));
    if (!items.length) return;

    let hideTimer = null;
    let hasHovered = false;
    let hoverTarget = null;

    const show = (li) => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }

      hoverTarget = li;
      this.scheduleElementFrame(nav, "_md3eNavHoverFrame", () => {
        const current = hoverTarget;
        if (!current) return;

        const navRect = nav.getBoundingClientRect();
        const liRect = current.getBoundingClientRect();
        const needsJump = !hasHovered;

        this.scheduleElementFrame(nav, "_md3eNavHoverWriteFrame", () => {
          if (needsJump) nav.classList.add("nav-hover-jump");

          nav.style.setProperty(
            "--nav-hover-left",
            `${liRect.left - navRect.left}px`,
          );
          nav.style.setProperty("--nav-hover-width", `${liRect.width}px`);
          nav.classList.add("nav-hovering");

          if (needsJump) {
            hasHovered = true;
            this.scheduleElementFrame(nav, "_md3eNavHoverJumpFrame", () =>
              nav.classList.remove("nav-hover-jump"),
            );
          }
        });
      });
    };

    const hide = () => {
      hoverTarget = null;

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
