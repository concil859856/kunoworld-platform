import type { Metadata } from "next";
import type { ReactNode } from "react";

import {
  LegalDocument,
  LegalSection,
  LegalSubheading,
  Placeholder,
  ReviewNote,
  type LegalSectionDef,
  type PlaceholderDef,
} from "@/components/site/LegalDocument";

// DRAFT — pending legal review. Facts about the service reflect the code as of the draft date.
// Distinct from /privacy, which explains the encryption and provenance architecture.

export const metadata: Metadata = {
  title: "Privacy Policy (draft) — KunoWorld",
  description:
    "Draft Privacy Policy for KunoWorld’s development-preview AI video generation service: what data is collected, who receives it and how long it is kept. Pending legal review and not yet in effect.",
  robots: { index: false },
};

const SECTIONS = [
  { id: "who", title: "Who is responsible", review: true },
  { id: "collect", title: "What we collect" },
  { id: "not-collected", title: "What we do not collect" },
  { id: "use", title: "How we use it" },
  { id: "legal-bases", title: "Legal bases", review: true },
  { id: "sharing", title: "Who receives your data" },
  { id: "retention", title: "How long we keep it" },
  { id: "security", title: "Security and its current limits" },
  { id: "rights", title: "Your rights and choices", review: true },
  { id: "transfers", title: "International transfers", review: true },
  { id: "children", title: "Children" },
  { id: "changes", title: "Changes to this policy" },
  { id: "contact", title: "Contact" },
] as const satisfies readonly LegalSectionDef[];

type SectionId = (typeof SECTIONS)[number]["id"];

const PH = {
  company: { label: "[COMPANY LEGAL NAME]", note: "full legal name of the entity responsible for the data." },
  address: { label: "[REGISTERED ADDRESS]", note: "registered address of that entity." },
  effectiveDate: { label: "[EFFECTIVE DATE]", note: "date this policy takes effect." },
  privacyEmail: { label: "[PRIVACY CONTACT EMAIL]", note: "address for privacy questions and rights requests." },
  representative: {
    label: "[EU / UK REPRESENTATIVE, IF REQUIRED]",
    note: "name and contact of any required representative, or remove.",
  },
  emailProvider: { label: "[EMAIL SERVICE PROVIDER]", note: "provider that sends sign-in emails." },
  hosting: {
    label: "[HOSTING PROVIDERS AND DATA LOCATIONS]",
    note: "infrastructure providers for the gateway and website, and the countries where data is stored.",
  },
  stripeData: {
    label: "[STRIPE PAYMENT DATA RECEIVED — TO CONFIRM]",
    note: "which payment fields KunoWorld receives and stores from Stripe.",
  },
  crypto: {
    label: "[CRYPTO PAYMENT DETAILS — TO CONFIRM]",
    note: "any further data recorded for crypto payments, and any payment service provider involved.",
  },
  serverLogs: {
    label: "[SERVER LOG CONTENTS AND RETENTION — TO CONFIRM]",
    note: "what gateway, website and Cloudflare logs record (e.g. IP addresses) and for how long.",
  },
  sessionLifetime: { label: "[SESSION COOKIE LIFETIME]", note: "how long the sign-in session cookie lasts." },
  retention: {
    label: "[RETENTION PERIOD]",
    note: "a period for each category where it appears: job records, account data, sign-in tokens and sessions, payment records.",
  },
  responsePeriod: { label: "[RESPONSE PERIOD]", note: "target time to respond to rights requests." },
  authority: { label: "[SUPERVISORY AUTHORITY]", note: "the data protection authority users can complain to." },
  transferSafeguards: {
    label: "[TRANSFER SAFEGUARDS]",
    note: "mechanisms relied on for international transfers, including to GPU operators and validators.",
  },
  minimumAge: { label: "[MINIMUM AGE]", note: "minimum age to use the Service (match the Terms)." },
  noticePeriod: {
    label: "[NOTICE PERIOD FOR CHANGES]",
    note: "how much notice of material changes, and by what means (match the Terms).",
  },
} as const satisfies Record<string, PlaceholderDef>;

function Ph({ k }: { k: keyof typeof PH }) {
  return <Placeholder>{PH[k].label}</Placeholder>;
}

function Section({ id, children }: { id: SectionId; children: ReactNode }) {
  return (
    <LegalSection of={SECTIONS} id={id}>
      {children}
    </LegalSection>
  );
}

function SectionRef({ id, children }: { id: SectionId; children?: ReactNode }) {
  const number = SECTIONS.findIndex((s) => s.id === id) + 1;
  return <a href={`#${id}`}>{children ?? `section ${number}`}</a>;
}

const SECURITY_EMAIL = <a href="mailto:security@kunoworld.com">security@kunoworld.com</a>;

export default function PrivacyPolicy() {
  return (
    <LegalDocument
      documentName="Privacy Policy"
      title={
        <>
          Privacy
          <br />
          <em>Policy.</em>
        </>
      }
      intro="What KunoWorld collects when you generate video, who receives it, how long it is kept, and where the preview’s protections stop today."
      effectiveDate={<Ph k="effectiveDate" />}
      drafted="13 September 2026"
      sections={SECTIONS}
      placeholders={Object.values(PH)}
      summary={
        <>
          <p>
            Your prompts and reference media are encrypted on your device. The gateway stores that ciphertext for 7
            days by default, and keeps job metadata and receipts after that. The website has no analytics, advertising
            or third-party tracking scripts.
          </p>
          <p>
            A video’s receipt is public to anyone with its hash, and receipts are shared with network validators. GPU
            operators decrypt content to render it, and hardware attestation is not implemented yet, so during the
            preview they may be able to see it.
          </p>
        </>
      }
    >
      <Section id="who">
        <p>
          This Privacy Policy explains how <Ph k="company" />, whose registered address is <Ph k="address" />{" "}
          (“KunoWorld”, “we”, “us”), handles personal data when you use the KunoWorld website, studio, API, software
          development kits and gateway (the “Service”).
        </p>
        <p>
          Contact for privacy questions: <Ph k="privacyEmail" />. Representative: <Ph k="representative" />.
        </p>
        <p>
          KunoWorld is a development preview. This policy describes the Service as built, including account, sign-in
          and payment features that are still being developed. For a technical explanation of the encryption and
          receipt design, see <a href="/privacy">Privacy &amp; provenance</a>.
        </p>
        <ReviewNote>
          Confirm KunoWorld’s role (for example, controller or processor) for each category of data, and the roles of
          GPU operators and validators.
        </ReviewNote>
      </Section>

      <Section id="collect">
        <LegalSubheading id="collect-account">Account and sign-in</LegalSubheading>
        <ul>
          <li>Your email address.</li>
          <li>Sign-in tokens from the links we email you, stored as hashes, and your sign-in sessions.</li>
          <li>
            Your API keys, stored only as SHA-256 hashes (we never store the key itself), and whether each key has been
            revoked.
          </li>
        </ul>

        <LegalSubheading id="collect-payments">Credit and payments</LegalSubheading>
        <ul>
          <li>Your prepaid US-dollar credit balance, and a ledger of top-ups, charges and refunds.</li>
          <li>
            For card payments, which Stripe processes: <Ph k="stripeData" />. We do not store card numbers.
          </li>
          <li>
            For cryptocurrency payments (USDT, TAO or Bittensor subnet alpha tokens): the blockchain network, the
            transaction hash and the wallet address. Further details: <Ph k="crypto" />.
          </li>
        </ul>

        <LegalSubheading id="collect-jobs">Generation jobs</LegalSubheading>
        <ul>
          <li>
            <strong>Encrypted content.</strong> Your prompts and reference media are encrypted on your device (using
            HPKE) before they are uploaded, and results come back encrypted. The gateway stores this ciphertext and
            cannot read it.
          </li>
          <li>
            <strong>Job metadata</strong>, which is not encrypted: the model, generation mode, duration, resolution,
            aspect ratio, frame rate and the roles of your inputs; the price; the job’s status and timings; any error
            codes; the signed receipt; and the SHA-256 hash of the output file.
          </li>
          <li>The sizes of encrypted uploads and results, and the timing of your requests, can also be observed.</li>
        </ul>

        <LegalSubheading id="collect-receipts">Provenance receipts</LegalSubheading>
        <p>
          Each completed job has a receipt signed by the worker that rendered it. It records the model, the worker,
          timings, the output format and the hash of the output file. Receipts can be looked up publicly by that hash
          (see <SectionRef id="sharing" />).
        </p>
        <ReviewNote>
          Confirm whether receipts, or the job metadata made available to validators, include an account identifier or
          any other data that could link a video to a person.
        </ReviewNote>

        <LegalSubheading id="collect-country">Your country</LegalSubheading>
        <p>
          The gateway reads your country from the <code>cf-ipcountry</code> request header, which Cloudflare derives
          from your IP address. We use it to apply the regional limits in model licenses.
        </p>
        <ReviewNote>Confirm whether the country is stored with job records or used only while handling a request.</ReviewNote>

        <LegalSubheading id="collect-logs">Server and network logs</LegalSubheading>
        <p>
          <Ph k="serverLogs" />
        </p>

        <LegalSubheading id="collect-device">Your device, cookies and local storage</LegalSubheading>
        <ul>
          <li>
            <strong>Session cookie.</strong> After you sign in, the website sets an HttpOnly session cookie that keeps
            you signed in. Its lifetime: <Ph k="sessionLifetime" />.
          </li>
          <li>
            <strong>Studio library.</strong> The studio saves each take in your browser’s local storage: the prompt, its
            settings and the key that decrypts the film, so your library survives a reload. We do not receive this
            library; your prompt reaches the gateway only in encrypted form when you submit a job. Anyone who can use
            that browser profile can open those films. <strong>Forget all</strong> in the studio removes them.
          </li>
          <li>
            <strong>API key.</strong> The studio holds the API key you use in memory for the session.
          </li>
          <li>
            <strong>No tracking scripts.</strong> The website does not currently use analytics, advertising or
            third-party tracking scripts.
          </li>
        </ul>
        <p>
          The showcase images and videos on the website were generated with external models through OpenRouter. They are
          not user data.
        </p>
      </Section>

      <Section id="not-collected">
        <ul>
          <li>
            <strong>Plaintext prompts, reference media or videos.</strong> The gateway receives and stores only encrypted
            versions. They are decrypted by the GPU operator that processes your job; see{" "}
            <SectionRef id="security" /> for the current limits of that protection.
          </li>
          <li>
            <strong>Card numbers.</strong> Card details are processed by Stripe, and we do not store them.
          </li>
          <li>
            <strong>Analytics or advertising data.</strong> We do not run analytics, advertising or third-party
            tracking scripts on the website.
          </li>
        </ul>
      </Section>

      <Section id="use">
        <ul>
          <li>
            <strong>Email address, sign-in tokens and sessions</strong>: to send sign-in links, sign you in and keep you
            signed in.
          </li>
          <li>
            <strong>API key hashes</strong>: to authenticate requests and let you revoke keys.
          </li>
          <li>
            <strong>Credit balance, ledger and payment records</strong>: to add credit, hold the price of each job,
            automatically refund jobs that fail, are canceled or time out, and keep financial records.
          </li>
          <li>
            <strong>Encrypted content</strong>: to deliver your job to a GPU operator and return the encrypted result to
            you.
          </li>
          <li>
            <strong>Job metadata</strong>: to route, price and run jobs, report their status and errors, and operate the
            Service.
          </li>
          <li>
            <strong>Receipts and output hashes</strong>: to let you and others check where a video came from, and to let
            validators score GPU operators.
          </li>
          <li>
            <strong>Country</strong>: to route requests to a model licensed for your region.
          </li>
          <li>
            Any of the above, where needed: to keep the Service secure, prevent abuse, enforce our{" "}
            <a href="/terms">Terms of Service</a> and meet legal obligations.
          </li>
        </ul>
        <ReviewNote>
          State KunoWorld’s position on using customer content or metadata to train or improve models, and what GPU
          operators are permitted to do with content they process.
        </ReviewNote>
      </Section>

      <Section id="legal-bases">
        <p>Where data protection law requires a legal basis for processing, we expect to rely on:</p>
        <ul>
          <li>
            <strong>performance of a contract</strong>: accounts, sign-in, credit, payments and running your jobs;
          </li>
          <li>
            <strong>legitimate interests</strong>: security, abuse prevention, applying model license regions,
            publishing provenance receipts and supplying job metadata to validators;
          </li>
          <li>
            <strong>legal obligations</strong>: for example, keeping financial records; and
          </li>
          <li>
            <strong>consent</strong>, where the law requires it.
          </li>
        </ul>
        <ReviewNote>
          Confirm the basis for each purpose, particularly public receipts and validator access, which may need a
          balancing assessment or a different basis.
        </ReviewNote>
      </Section>

      <Section id="sharing">
        <ul>
          <li>
            <strong>Stripe</strong> processes card payments and receives the payment details you give it, under its own
            privacy policy.
          </li>
          <li>
            <strong>Public blockchains.</strong> If you pay in cryptocurrency, the transaction, including wallet addresses
            and amounts, is recorded publicly on the blockchain, where anyone can see it and it cannot be deleted.
          </li>
          <li>
            <strong>Our email service provider</strong>, <Ph k="emailProvider" />, receives your email address and the
            sign-in links we send you.
          </li>
          <li>
            <strong>Cloudflare</strong> handles network traffic to the gateway and derives your country from your IP
            address. Other hosting and infrastructure providers: <Ph k="hosting" />.
          </li>
          <li>
            <strong>GPU operators (“miners”)</strong> receive your encrypted prompts and reference media, together with
            the job parameters. The worker decrypts the content to generate your video and returns the result encrypted.
            Operators are independent third parties on a Bittensor subnet.
          </li>
          <li>
            <strong>Validators</strong> on the network receive metadata about finished jobs and their receipts, which
            they use to score GPU operators.
          </li>
          <li>
            <strong>The public.</strong> Anyone who has a video file or its hash can look up its receipt: the model,
            worker, timings and format, never the prompt or reference media.
          </li>
          <li>
            <strong>Authorities and others</strong>, where the law requires it or where it is needed to protect rights,
            safety or the Service.
          </li>
        </ul>
        <ReviewNote>
          Confirm the full list of service providers, and whether other disclosures (for example, in a sale or
          reorganization of the business) should be described.
        </ReviewNote>
      </Section>

      <Section id="retention">
        <ul>
          <li>
            <strong>Encrypted uploads and results</strong>: kept for 7 days by default, then deleted.
          </li>
          <li>
            <strong>Job records</strong> (the metadata and receipt described above): kept after the encrypted content is
            deleted, for <Ph k="retention" />. While a receipt is kept, it can be looked up publicly by hash.
          </li>
          <li>
            <strong>Account data</strong>: <Ph k="retention" />.
          </li>
          <li>
            <strong>Sign-in tokens and sessions</strong>: <Ph k="retention" />.
          </li>
          <li>
            <strong>Credit ledger and payment records</strong>: <Ph k="retention" />.
          </li>
          <li>
            <strong>Server and network logs</strong>: see <SectionRef id="collect">What we collect</SectionRef>.
          </li>
          <li>
            <strong>Studio library in your browser</strong>: until you use Forget all or clear this site’s data in your
            browser.
          </li>
          <li>
            <strong>Data held by others</strong>: blockchain records are permanent, and validators, or anyone who has
            looked up a receipt, may keep copies we cannot delete.
          </li>
        </ul>
      </Section>

      <Section id="security">
        <p>Protections in the Service include:</p>
        <ul>
          <li>encrypting prompts and reference media on your device before upload, so the gateway stores only ciphertext;</li>
          <li>storing API keys and sign-in tokens only as hashes;</li>
          <li>an HttpOnly session cookie, which scripts on the page cannot read; and</li>
          <li>signed receipts that let you check a result against the file you received.</li>
        </ul>
        <p>
          <strong>Current limits.</strong> During the preview:
        </p>
        <ul>
          <li>
            <strong>Hardware attestation is not implemented.</strong> The Service is designed to run jobs in Intel TDX
            and NVIDIA confidential-computing enclaves so that GPU operators cannot read your content. Verification of
            that hardware has not been implemented, so this protection is not in place: the operator processing your job
            may be able to access your prompt, reference media and output.
          </li>
          <li>
            <strong>Metadata is visible.</strong> Encryption does not hide job parameters, the sizes of encrypted data or
            the timing of requests.
          </li>
          <li>
            <strong>Your device matters.</strong> Your browser holds the keys that decrypt your films. Anyone with access
            to your browser profile can open saved takes, and a compromised device can expose your content.
          </li>
        </ul>
        <p>No system is completely secure. Please report security issues to {SECURITY_EMAIL}.</p>
      </Section>

      <Section id="rights">
        <p>Depending on where you live, you may have the right to:</p>
        <ul>
          <li>access the personal data we hold about you;</li>
          <li>correct inaccurate data;</li>
          <li>have your data deleted;</li>
          <li>restrict or object to certain processing;</li>
          <li>receive your data in a portable format;</li>
          <li>withdraw consent, where processing is based on consent; and</li>
          <li>
            complain to a data protection authority: <Ph k="authority" />.
          </li>
        </ul>
        <p>
          To make a request, email <Ph k="privacyEmail" /> from the address linked to your account. We may need to
          verify your identity. We aim to respond within <Ph k="responsePeriod" />.
        </p>
        <p>
          Some limits apply. We cannot decrypt your encrypted content, so we cannot provide it in readable form. We
          cannot delete blockchain records, or recall receipts and metadata that have already been looked up or supplied
          to validators. We may need to keep some records to meet legal obligations.
        </p>
        <p>
          You can also act directly: revoke API keys, use Forget all in the studio, or clear this site’s cookies and
          storage in your browser.
        </p>
      </Section>

      <Section id="transfers">
        <p>
          GPU operators and validators take part in a decentralized network and may be located in any country. Our
          service providers process data in <Ph k="hosting" />. Your data, including encrypted content and job
          metadata, may therefore be transferred to and processed in countries other than your own, which may have
          different data protection laws.
        </p>
        <p>
          Safeguards for these transfers: <Ph k="transferSafeguards" />.
        </p>
      </Section>

      <Section id="children">
        <p>
          The Service is not intended for anyone under <Ph k="minimumAge" />, and they must not create an account. If you
          believe someone under that age has given us personal data, contact <Ph k="privacyEmail" /> so that it can be
          deleted.
        </p>
      </Section>

      <Section id="changes">
        <p>
          We may update this policy as the Service develops. We will post the new version on this page with a new
          effective date, and give <Ph k="noticePeriod" /> notice of material changes.
        </p>
      </Section>

      <Section id="contact">
        <p>
          <Ph k="company" />
          <br />
          <Ph k="address" />
        </p>
        <p>
          Privacy questions and requests: <Ph k="privacyEmail" />
          <br />
          Representative: <Ph k="representative" />
          <br />
          Security reports: {SECURITY_EMAIL}
          <br />
          Terms of use: see our <a href="/terms">Terms of Service</a>
        </p>
      </Section>
    </LegalDocument>
  );
}
