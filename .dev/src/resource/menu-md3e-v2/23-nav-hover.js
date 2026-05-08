  initNavHover() {
    const nav = document.querySelector("#topmenu");
    if (!nav) return;

    const items = Array.from(nav.querySelectorAll(":scope > li"));
    if (!items.length) return;

    let hideTimer = null;
    let hasHovered = false;
    let hoverFrame = null;
    let hoverTarget = null;

    const show = (li) => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }

      hoverTarget = li;
      if (hoverFrame) return;

      hoverFrame = requestAnimationFrame(() => {
        hoverFrame = null;
        const current = hoverTarget;
        if (!current) return;

        const navRect = nav.getBoundingClientRect();
        const liRect = current.getBoundingClientRect();
        const needsJump = !hasHovered;

        requestAnimationFrame(() => {
          if (needsJump) nav.classList.add("nav-hover-jump");

          nav.style.setProperty(
            "--nav-hover-left",
            `${liRect.left - navRect.left}px`,
          );
          nav.style.setProperty("--nav-hover-width", `${liRect.width}px`);
          nav.classList.add("nav-hovering");

          if (needsJump) {
            hasHovered = true;
            requestAnimationFrame(() => nav.classList.remove("nav-hover-jump"));
          }
        });
      });
    };

    const hide = () => {
      hoverTarget = null;
      if (hoverFrame) {
        cancelAnimationFrame(hoverFrame);
        hoverFrame = null;
      }

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
