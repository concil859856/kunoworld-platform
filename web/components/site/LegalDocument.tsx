import type { ReactNode } from "react";

import styles from "./LegalDocument.module.css";

export type LegalSectionDef = { id: string; title: string; review?: boolean };
export type PlaceholderDef = { label: string; note: string };

/** An unfilled value (entity name, date, policy decision) that must be completed before publishing. */
export function Placeholder({ children }: { children: string }) {
  return <mark className={styles.placeholder}>{children}</mark>;
}

/** An inline flag for a question counsel needs to answer before publishing. */
export function ReviewNote({ children }: { children: ReactNode }) {
  return (
    <p className={styles.review}>
      <strong>For legal review:</strong> {children}
    </p>
  );
}

/** A numbered, anchor-linked section. The number is its position in `of`. */
export function LegalSection<const T extends readonly LegalSectionDef[]>({
  of,
  id,
  children,
}: {
  of: T;
  id: T[number]["id"];
  children: ReactNode;
}) {
  const index = of.findIndex((s) => s.id === id);
  const section: LegalSectionDef | undefined = of[index];
  if (!section) throw new Error(`Unknown legal section: ${id}`);

  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className={styles.heading}>
        <span className={styles.number}>{index + 1}.</span>
        <span>{section.title}</span>
      </h2>
      {section.review && <p className={styles.reviewTag}>Marked for legal review</p>}
      {children}
    </section>
  );
}

export function LegalSubheading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h3 id={id} className={styles.subheading}>
      {children}
    </h3>
  );
}

type LegalDocumentProps = {
  documentName: string;
  title: ReactNode;
  intro: ReactNode;
  effectiveDate: ReactNode;
  drafted: string;
  summary: ReactNode;
  sections: readonly LegalSectionDef[];
  placeholders: readonly PlaceholderDef[];
  children: ReactNode;
};

export function LegalDocument({
  documentName,
  title,
  intro,
  effectiveDate,
  drafted,
  summary,
  sections,
  placeholders,
  children,
}: LegalDocumentProps) {
  const reviewSections = sections.filter((s) => s.review);

  return (
    <>
      <header className="page-heading">
        <span className="section-kicker">LEGAL · DRAFT</span>
        <h1>{title}</h1>
        <p>{intro}</p>
      </header>

      <div className="inner-content">
        <div className={styles.draftWrap} role="note">
          <div className="notice">
            <strong>Draft pending legal review — not yet in effect.</strong>
            This {documentName} has not been reviewed by a lawyer and does not currently govern the use of KunoWorld. It
            describes the service as built, including account, sign-in and payment features that are still being
            developed. Highlighted items such as <Placeholder>[COMPANY LEGAL NAME]</Placeholder> must be completed, and
            sections marked for legal review must be checked, before it is published. Nothing here is legal advice.
          </div>
        </div>

        <div className="about-copy">
          <h2>
            The short
            <br />
            <em>version.</em>
          </h2>
          <div>
            {summary}
            <p className={styles.summaryNote}>
              This summary is for orientation only and is not part of the {documentName}.
            </p>
          </div>
        </div>

        <div className={styles.layout}>
          <nav className={styles.toc} aria-label={`${documentName} contents`}>
            <span className="section-kicker">CONTENTS</span>
            <ol>
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.title}</a>
                </li>
              ))}
              <li>
                <a href="#to-complete">To complete before publishing</a>
              </li>
            </ol>
          </nav>

          <article className={styles.body}>
            <p className={styles.meta}>
              Effective date: {effectiveDate}
              <br />
              Draft prepared: {drafted}
            </p>

            {children}

            <aside id="to-complete" className={styles.complete} aria-labelledby="to-complete-heading">
              <div className="notice">
                <h2 id="to-complete-heading" className={styles.completeTitle}>
                  To complete before publishing
                </h2>
                <p className={styles.completeLead}>Every placeholder used in this draft:</p>
                <ul className={styles.completeList}>
                  {placeholders.map((p) => (
                    <li key={p.label}>
                      <Placeholder>{p.label}</Placeholder> — {p.note}
                    </li>
                  ))}
                </ul>
                {reviewSections.length > 0 && (
                  <>
                    <h3 className={styles.completeSubtitle}>Sections marked for legal review</h3>
                    <ul className={styles.completeList}>
                      {reviewSections.map((s) => (
                        <li key={s.id}>
                          <a href={`#${s.id}`}>{s.title}</a>
                        </li>
                      ))}
                    </ul>
                    <p className={styles.completeLead}>
                      Inline “For legal review” notes in other sections also need an answer.
                    </p>
                  </>
                )}
              </div>
            </aside>
          </article>
        </div>
      </div>
    </>
  );
}
