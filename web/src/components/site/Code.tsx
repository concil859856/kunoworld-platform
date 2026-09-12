import type { ReactNode } from "react";

import styles from "./Code.module.css";

type Lang = "js" | "python" | "sh";

const KEYWORDS: Record<Lang, string[]> = {
  js: ["import", "from", "const", "let", "await", "new", "async", "return", "for", "of", "if", "export", "function"],
  python: ["from", "import", "with", "as", "def", "return", "for", "in", "if", "print", "None", "True", "False"],
  sh: ["npm", "pip", "install", "export", "curl", "uv"],
};

/** Minimal highlighter: comments, strings and keywords. Enough for short snippets, no dependencies. */
function highlight(code: string, lang: Lang): ReactNode[] {
  const comment = lang === "js" ? "\\/\\/[^\\n]*" : "#[^\\n]*";
  const pattern = new RegExp(`(${comment})|("(?:[^"\\\\\\n]|\\\\.)*"|'(?:[^'\\\\\\n]|\\\\.)*'|\`[^\`]*\`)|\\b(${KEYWORDS[lang].join("|")})\\b`, "g");
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of code.matchAll(pattern)) {
    const index = m.index ?? 0;
    if (index > last) out.push(code.slice(last, index));
    const cls = m[1] ? styles.comment : m[2] ? styles.string : styles.keyword;
    out.push(
      <span key={key++} className={cls}>
        {m[0]}
      </span>,
    );
    last = index + m[0].length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

export function Code({ code, lang = "js", title }: { code: string; lang?: Lang; title?: string }) {
  return (
    <figure className={styles.figure}>
      {title && (
        <figcaption className={styles.title}>
          <span className="mono">{title}</span>
          <span className={styles.lang}>{lang === "js" ? "JavaScript" : lang === "python" ? "Python" : "Shell"}</span>
        </figcaption>
      )}
      <pre className={styles.pre} tabIndex={0}>
        <code>{highlight(code.trim(), lang)}</code>
      </pre>
    </figure>
  );
}
