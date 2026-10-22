// Keep every screen and top-layer dialog on the same 720 × 1558 design canvas.
export const uiScale = () => 2 * Math.min(1, innerWidth / 720, innerHeight / 1558);
export function syncAppViewport() {
  const scale = uiScale(), style = document.documentElement.style;
  style.setProperty('--canvas-fit', scale / 2);
  style.setProperty('--ui-scale', scale);
  style.setProperty('--canvas-top', `${(innerHeight - 779 * scale) / 2}px`);
  style.setProperty('--canvas-left', `${(innerWidth - 360 * scale) / 2}px`);
}
syncAppViewport();
