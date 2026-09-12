import Image from "next/image";

import styles from "./LogoMark.module.css";

/*
 * The KunoWorld monogram.
 *
 * The source artwork is white on its own dark square; the square is keyed out in
 * scripts so the mark sits on whatever surface it lands on. Intrinsic size is the
 * generated file's (393×256) — keep these in step with scripts that rewrite it.
 */

const RATIO = 393 / 256;

export function LogoMark({ height = 22, className = "" }: { height?: number; className?: string }) {
  return (
    <Image
      src="/logo-mark-wide.png"
      alt=""
      aria-hidden="true"
      width={Math.round(height * RATIO)}
      height={height}
      className={`${styles.mark} ${className}`}
      priority
    />
  );
}
