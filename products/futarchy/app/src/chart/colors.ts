/** Resolve inherited tokens on the document, including for detached render buffers. */
let theme = '';
let style: CSSStyleDeclaration;
const colors = new Map<string, string>();
export function chartColor(name: string): string {
  const next = document.documentElement.dataset.theme ?? 'dark';
  if (!style || theme !== next) { theme = next; style = getComputedStyle(document.documentElement); colors.clear(); }
  let value = colors.get(name);
  if (!value) { value = style.getPropertyValue(name).trim(); colors.set(name, value); }
  return value;
}
const resolved = new Map<string, number[]>();
export function withAlpha(color: string, alpha: number): string {
  const value = color.startsWith('--') ? chartColor(color) : color.replace(/var\((--[\w-]+)\)/g, (_, token: string) => chartColor(token));
  let channels = resolved.get(value);
  if (!channels) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1);
    channels = Array.from(ctx.getImageData(0, 0, 1, 1).data); resolved.set(value, channels);
  }
  return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${Math.max(0, Math.min(1, alpha)) * channels[3] / 255})`;
}
