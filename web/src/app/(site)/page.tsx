import { priceUsd } from "@kunoworld/sdk";
import Link from "next/link";

import { Reveal } from "@/components/fx/Reveal";
import { CheckFilm } from "@/components/landing/CheckFilm";
import { CreditsRoll } from "@/components/landing/CreditsRoll";
import { CustodyStrip } from "@/components/landing/CustodyStrip";
import { HeroReel } from "@/components/landing/HeroReel";
import { FilmStocks } from "@/components/landing/FilmStocks";
import { ModeGrid } from "@/components/landing/ModeGrid";
import { StagesTonight } from "@/components/landing/StagesTonight";
import { Code } from "@/components/site/Code";
import { LiveModelsProvider } from "@/components/site/LiveModels";
import { CATALOG, isH3, ratesOf, variantLabel } from "@/lib/catalog";
import { RELAY_RETENTION_DAYS } from "@/lib/config";
import { rate, usd } from "@/lib/format";
import { FOOTAGE_NOTE } from "@/lib/reel";

import styles from "./page.module.css";

const TEASER = `
import { KunoClient } from "@kunoworld/sdk";

const kuno = new KunoClient({ apiKey });
// Encrypted here, to a stage whose hardware your code has just checked.
const job = await kuno.submit({ prompt: "A lighthouse keeper lights the lamp at dusk", model: "ltx-2.5-fast" });
// Decrypted here, and checked against the stage's signed receipt.
const { video, receipt } = await kuno.wait(job);
`;

const COMPARISON: Array<[string, string, string]> = [
  [
    "Who can read your prompt",
    "The service's own servers process it in plain text; staff access is a matter of policy.",
    "Only the sealed stage that renders it, after it proves its hardware to your browser.",
  ],
  [
    "Training on your footage",
    "Terms of service often grant a license to use uploads to improve models.",
    "Never. We can't read your footage, and nothing you make is used for training.",
  ],
  [
    "Where the finished film lives",
    "In the provider's storage, readable by the provider.",
    `Encrypted to a key only your browser holds. The relay deletes the sealed copy after ${RELAY_RETENTION_DAYS} days.`,
  ],
  [
    "Proof of how it was made",
    "Rarely anything you can check yourself.",
    "A signed certificate for every film, checkable by anyone.",
  ],
  ["What privacy costs", "Private modes are often a premium tier.", "Nothing extra. Every film is sealed."],
];

export default function Home() {
  return (
    <LiveModelsProvider>
      <section className={styles.hero} aria-labelledby="hero-title" data-hero="true">
        <HeroReel />
        <div className={`wrap ${styles.heroInner}`}>
          <p className="eyebrow">A private AI film studio · MiniMax H3 &amp; LTX-2.5</p>
          <h1 id="hero-title" className={`display ${styles.headline}`}>
            Films develop <br />
            in the <em>dark.</em>
          </h1>
          <div className={styles.heroFoot}>
            <p className={styles.sub}>
              KunoWorld makes video inside sealed hardware. Your prompts, images and footage are encrypted on your device
              and opened only inside the stage that renders them. Not the stage&apos;s owner. Not us.
            </p>
            <div className={styles.ctas}>
              <Link href="/studio" className="btn btn-primary">
                Start creating
              </Link>
              <Link href="#modes" className="btn">
                See what it makes
              </Link>
            </div>
          </div>
        </div>
        <p className={styles.footageNote}>{FOOTAGE_NOTE}</p>
      </section>

      <section id="modes" className={`wrap ${styles.section}`} aria-labelledby="modes-title">
        <Reveal className={styles.head}>
          <div>
            <p className="eyebrow">Ten ways in</p>
            <h2 id="modes-title" className={`display ${styles.h2}`}>
              However the shot <em>starts.</em>
            </h2>
          </div>
          <p className={styles.intro}>
            Most services give you a prompt box and an image slot. KunoWorld routes ten kinds of request across two
            model families — keyframes pinned to timecodes, a scene built from your own cast, picture driven by your
            soundtrack, a single window retaken. Every one of them runs sealed.
          </p>
        </Reveal>
        <ModeGrid />
      </section>

      <section className={styles.section} aria-labelledby="custody-title">
        <div className={`wrap ${styles.head}`}>
          <div>
            <p className="eyebrow">Chain of custody</p>
            <h2 id="custody-title" className={`display ${styles.h2}`}>
              Five frames. <em>No one else in the room.</em>
            </h2>
          </div>
          <p className={styles.intro}>
            From the moment you press Generate to the moment you press play, your film is only ever readable in two
            places: your browser, and the sealed stage making it.
          </p>
        </div>
        <CustodyStrip />
      </section>

      <section className={`wrap ${styles.section}`} aria-labelledby="stocks-title">
        <div className={styles.head}>
          <div>
            <p className="eyebrow">Two film stocks</p>
            <h2 id="stocks-title" className={`display ${styles.h2}`}>
              Choose your <em>stock.</em>
            </h2>
          </div>
          <p className={styles.intro}>
            Two open-weight model families, each with its own grain. Both run sealed; both come with a certificate. The
            studio shows what each can do before you spend anything.
          </p>
        </div>
        <FilmStocks />
      </section>

      <section className={`wrap ${styles.section}`} aria-labelledby="credits-title">
        <div className={styles.split}>
          <div className={styles.splitText}>
            <p className="eyebrow">The certificate</p>
            <h2 id="credits-title" className={`display ${styles.h2}`}>
              Every film ends with <em>its credits.</em>
            </h2>
            <p className={styles.intro}>
              The stage signs a receipt for every film it delivers: which model made it, which sealed hardware it ran on,
              which software, and the exact fingerprint of the file. Your browser checks it before showing you the
              film. Anyone you send the film to can check it too.
            </p>
          </div>
          <CreditsRoll />
        </div>
      </section>

      <section id="check" className={`wrap ${styles.section}`} aria-labelledby="check-title">
        <div className={styles.head}>
          <div>
            <p className="eyebrow">Proof, not promises</p>
            <h2 id="check-title" className={`display ${styles.h2}`}>
              Check any <em>KunoWorld</em> film.
            </h2>
          </div>
          <p className={styles.intro}>
            Drop a video in. If a sealed stage made that exact file, you&apos;ll see its credits. If not, you&apos;ll
            see that too.
          </p>
        </div>
        <CheckFilm />
      </section>

      <section className={`wrap ${styles.section}`} aria-labelledby="stages-title">
        <div className={styles.head}>
          <div>
            <p className="eyebrow">Live</p>
            <h2 id="stages-title" className={`display ${styles.h2}`}>
              The stages <em>tonight.</em>
            </h2>
          </div>
          <p className={styles.intro}>
            Your films are made by independent GPU servers around the world — each one sealed, each one checked. No
            single company holds your footage.
          </p>
        </div>
        <StagesTonight />
      </section>

      <section className={`wrap ${styles.section}`} aria-labelledby="pricing-title">
        <div className={styles.head}>
          <div>
            <p className="eyebrow">Pricing</p>
            <h2 id="pricing-title" className={`display ${styles.h2}`}>
              Priced by the <em>second.</em>
            </h2>
          </div>
          <p className={styles.intro}>
            You pay for the seconds of film you ask for, at the stock and resolution you choose. Privacy isn&apos;t a
            tier — every film is sealed and every film gets a certificate.
          </p>
        </div>
        <div className={styles.pricing}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className="sr-only">Price per second of output, by model and resolution</caption>
              <thead>
                <tr>
                  <th scope="col">Stock</th>
                  <th scope="col">Resolution</th>
                  <th scope="col">Per second</th>
                  <th scope="col">A 10-second film</th>
                </tr>
              </thead>
              <tbody>
                {CATALOG.flatMap((p) =>
                  ratesOf(p).map(([res, perSecond], i) => (
                    <tr key={`${p.id}-${res}`} data-first={i === 0}>
                      <th scope="row">
                        {i === 0 ? (
                          <>
                            <span className={styles.stockCell}>{isH3(p) ? p.name : `LTX-2.5 ${variantLabel(p)}`}</span>
                          </>
                        ) : (
                          <span className="sr-only">{p.name}</span>
                        )}
                      </th>
                      <td>{res}</td>
                      <td className="mono">{rate(perSecond)}</td>
                      <td className="mono">{usd(priceUsd(p, res, 10))}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
          <ul className={styles.truths} role="list">
            <li>
              <strong>The exact cost is on the Generate button,</strong> before you spend anything.
            </li>
            <li>
              <strong>Failed renders are refunded automatically</strong> — including ones stopped by the content check.
            </li>
            <li>
              <strong>Your footage is never used for training.</strong> We can&apos;t read it to begin with.
            </li>
            <li>
              <strong>Accounts and billing are on the way.</strong> Today, studio access is by API key.
            </li>
          </ul>
        </div>
      </section>

      <section className={`wrap ${styles.section}`} aria-labelledby="footage-title">
        <div className={styles.head}>
          <div>
            <p className="eyebrow">What happens to your footage</p>
            <h2 id="footage-title" className={`display ${styles.h2}`}>
              A quieter kind of <em>studio.</em>
            </h2>
          </div>
          <p className={styles.intro}>
            How most AI video services work today, next to how KunoWorld works. Read your provider&apos;s terms; these
            differ.
          </p>
        </div>
        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.compare}`}>
            <caption className="sr-only">How footage is handled: common practice compared with KunoWorld</caption>
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Question</span>
                </th>
                <th scope="col">Common elsewhere</th>
                <th scope="col">At KunoWorld</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map(([q, elsewhere, here]) => (
                <tr key={q}>
                  <th scope="row">{q}</th>
                  <td>{elsewhere}</td>
                  <td className={styles.here}>{here}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.caveat}>
          The honest limit: sealed hardware keeps the machine&apos;s owner and their software out. It isn&apos;t designed to
          stop someone with physical access probing the server&apos;s memory — which is why our enterprise tier runs only
          in verified data centers.
        </p>
      </section>

      <section className={`wrap ${styles.section}`} aria-labelledby="dev-title">
        <div className={styles.devTeaser}>
          <div className={styles.splitText}>
            <p className="eyebrow">For developers</p>
            <h2 id="dev-title" className={`display ${styles.h2}`}>
              The same seal, <em>in your code.</em>
            </h2>
            <p className={styles.intro}>
              The JavaScript and Python SDKs do the encryption and the hardware check on your side, so your users&apos;
              media never reaches us readable. Every result comes with its signed receipt.
            </p>
            <div className={styles.ctas}>
              <Link href="/developers" className="btn">
                Read the API guide
              </Link>
            </div>
          </div>
          <Code code={TEASER} lang="js" title="generate.mjs" />
        </div>
      </section>
    </LiveModelsProvider>
  );
}
