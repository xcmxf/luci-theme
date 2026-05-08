// Shared shell layout breakpoint used by CSS assembly, LuCI menu code, and
// the local preview harness. Keep the desktop threshold derived so the 1px
// boundary cannot drift when the mobile threshold changes.
const mobileMaxWidth = 920;

export const layoutBreakpoints = Object.freeze({
  mobileMaxWidth,
  desktopMinWidth: mobileMaxWidth + 1,
});

export const layoutBreakpointTokens = Object.freeze({
  mobileMaxWidth: "__MD3E_MOBILE_LAYOUT_MAX_WIDTH__",
  desktopMinWidth: "__MD3E_DESKTOP_LAYOUT_MIN_WIDTH__",
});

export const mobileLayoutQuery = `(max-width: ${layoutBreakpoints.mobileMaxWidth}px)`;
