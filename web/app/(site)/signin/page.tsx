import type { Metadata } from "next";

import { SignInForm } from "@/components/site/SignInForm";
import styles from "@/components/site/Account.module.css";

export const metadata: Metadata = {
  title: "Sign in — KunoWorld",
  description: "Sign in to KunoWorld with a one-time link sent to your email.",
};

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <div className={styles.account}>
      <header className="page-heading">
        <span className="section-kicker">YOUR ACCOUNT</span>
        <h1>
          Sign in
          <br />
          <em>without a password.</em>
        </h1>
        <p>Enter your email and we&apos;ll send you a link. It works once and expires in 15 minutes.</p>
      </header>
      <div className="inner-content">
        <SignInForm next={next} expired={error === "invalid_link"} />
      </div>
    </div>
  );
}
