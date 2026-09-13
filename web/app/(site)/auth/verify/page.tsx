import type { Metadata } from "next";

import styles from "@/components/site/Account.module.css";

export const metadata: Metadata = {
  title: "Finish signing in — KunoWorld",
  robots: { index: false },
  // The URL carries the sign-in code: never send it to another site in a Referer header. Not
  // "no-referrer", which also blanks Origin on this page's own POST and breaks the same-site check.
  referrer: "same-origin",
};

export default async function Verify({ searchParams }: { searchParams: Promise<{ token?: string; next?: string }> }) {
  const { token, next } = await searchParams;
  return (
    <div className={styles.account}>
      <header className="page-heading">
        <span className="section-kicker">SIGNING IN</span>
        <h1>
          One more
          <br />
          <em>step.</em>
        </h1>
        <p>Confirm to finish signing in to KunoWorld on this device.</p>
      </header>
      <div className="inner-content">
        {token ? (
          <form method="post" action="/auth/session" className={styles.panel}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="next" value={next ?? "/account"} />
            <button type="submit" className="ocean-button button-dark">
              Continue signing in
            </button>
            <p className={styles.fine}>
              We ask for this click so that an email security scanner opening your link can&apos;t use it up before you
              do.
            </p>
          </form>
        ) : (
          <div className={styles.panel}>
            <p>This link is missing its sign-in code.</p>
            <a className="text-link" href="/signin">
              Request a new link
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
