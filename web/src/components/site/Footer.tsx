import Link from "next/link";

import { LINKS } from "@/lib/config";

import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="sprockets" aria-hidden="true" />
      <div className={`wrap ${styles.grid}`}>
        <div className={styles.brand}>
          <p className={`display ${styles.wordmark}`}>
            Kuno<em>World</em>
          </p>
          <p className={styles.tag}>A private film studio. Encrypted on your device, opened only inside sealed hardware.</p>
        </div>

        <nav aria-label="Footer" className={styles.col}>
          <p className="eyebrow">Studio</p>
          <ul role="list">
            <li>
              <Link href="/studio">Open the studio</Link>
            </li>
            <li>
              <Link href="/verify">Verify a film</Link>
            </li>
            <li>
              <Link href="/developers">API &amp; SDKs</Link>
            </li>
            <li>
              <Link href="/network">How the network works</Link>
            </li>
          </ul>
        </nav>

        <div className={styles.col}>
          <p className="eyebrow">Licenses</p>
          <ul role="list">
            <li>
              MiniMax H3 is used under the{" "}
              <a href={LINKS.h3License} rel="noreferrer" target="_blank">
                MiniMax H3 Community License
              </a>
              .
            </li>
            <li>
              LTX-2.5 is used under the{" "}
              <a href={LINKS.ltxLicense} rel="noreferrer" target="_blank">
                LTX-2 Community License
              </a>
              .
            </li>
            <li className={styles.note}>
              MiniMax H3 availability depends on your region: its license doesn&apos;t yet cover the US, EU, UK or South
              Korea.
            </li>
          </ul>
        </div>

        <div className={styles.col}>
          <p className="eyebrow">Trust</p>
          <ul role="list">
            <li>Your footage is never used for training.</li>
            <li>Failed renders are refunded automatically.</li>
            <li>
              <a href="mailto:abuse@kunoworld.com">Report misuse</a>
            </li>
          </ul>
        </div>
      </div>
      <div className={`wrap ${styles.base}`}>
        <span>© 2026 KunoWorld</span>
        <span className="mono" aria-hidden="true">
          KW · 35 · 2.39:1 · 24 fps
        </span>
      </div>
    </footer>
  );
}
