/*
 * The KunoWorld monogram.
 *
 * Rendered as a mask filled with currentColor rather than an <img>, because the nav
 * inverts: transparent with white type over the hero, near-white with ink type once
 * scrolled or on an inner page. The artwork is a white glyph on transparency, so a
 * flat image would disappear against the light state. As a mask it inherits colour
 * exactly like the icon it replaces.
 */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`logo-mark ${className}`.trim()}
      style={{ "--logo-size": `${size}px` } as React.CSSProperties}
      aria-hidden="true"
    />
  );
}
