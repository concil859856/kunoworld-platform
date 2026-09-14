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
    "Draft Privacy Policy for KunoWorld’s development-preview AI video generation service: what data is collected, who can see it and how long it is kept. Pending legal review and not yet in effect.",
  robots: { index: false },
};

const SECTIONS = [
  { id: "who", title: "Who is responsible", review: true },
  { id: "modes", title: "Private and Standard modes" },
  { id: "collect", title: "What we collect" },
  { id: "not-collected", title: "What we do not collect" },
  { id: "use", title: "How we use it" },
  { id: "moderation", title: "Content checks, reports and who can open a video" },
  { id: "legal-bases", title: "Legal bases", review: true },
  { id: "sharing", title: "Who receives your data" },
  { id: "legal-requests", title: "Legal requests", review: true },
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
    note: "infrastructure providers for the gateway and website (including Cloudflare R2), and the countries where data is stored.",
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
    note: "a period for each category where it appears: job records and receipts, charge and payment records, account data, sign-in tokens and sessions, strike records, reports, and operator audit logs. Not videos, which are kept until deleted.",
  },
  preservation: {
    label: "[PRESERVATION HOLD PERIODS]",
    note: "how long content under a legal hold, or reported as child sexual abuse material, is preserved, and when a hold ends.",
  },
  responsePeriod: { label: "[RESPONSE PERIOD]", note: "target time to respond to rights requests." },
  legalRequests: {
    label: "[LEGAL REQUEST POLICY]",
    note: "how legal requests are verified and answered, whether affected users are notified, and any transparency reporting.",
  },
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
const DELETE_ENDPOINT = <code>{"DELETE /v1/videos/{job_id}"}</code>;

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
      intro="What KunoWorld collects when you generate video, who can see it, how long it is kept, and where the preview’s protections stop today."
      effectiveDate={<Ph k="effectiveDate" />}
      drafted="14 September 2026"
      sections={SECTIONS}
      placeholders={Object.values(PH)}
      summary={
        <>
          <p>
            You choose a mode for every job. In Private mode (the default) your prompt and inputs are encrypted on your
            device and processed only on an attested confidential GPU. The video is stored encrypted, and its key stays
            on your devices. KunoWorld cannot read Private videos or prompts, and cannot recover a lost key. In Standard
            mode KunoWorld’s systems and the GPU provider can read your prompt, inputs and video.
          </p>
          <p>
            In both modes your videos are stored on Cloudflare R2 until you delete them. Nothing expires automatically.
            Deleting a video deletes its content; the charge record, job metadata and signed receipt stay.
          </p>
          <p>
            KunoWorld staff can open a video only if it is reported as child sexual abuse material or sexual content
            involving a minor, or if it is under a legal hold. Every view is logged. There is no random review. A Private
            video can be opened even then only if its key was provided in such a report.
          </p>
          <p>
            A video’s receipt is public to anyone with its hash, and receipts are shared with network validators. The
            hardware attestation checks have not yet been validated on live hardware, so during the preview GPU
            operators may be able to see private content. The website has no analytics, advertising or third-party
            tracking scripts.
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

      <Section id="modes">
        <p>Each job is Private or Standard, and the mode changes what we can see.</p>

        <LegalSubheading id="modes-private">Private (the default)</LegalSubheading>
        <ul>
          <li>
            <strong>How it works:</strong> your prompt and reference media are encrypted on your device. They are
            processed only on an attested confidential GPU. The stored video is encrypted, and only someone who holds its
            key can open it.
          </li>
          <li>
            <strong>Where the key is:</strong> on your own devices. In the website studio it is kept in your browser’s
            local storage. If you use an SDK, it is wherever you store it. We cannot recover a lost key. A lost key means
            a lost video.
          </li>
          <li>
            <strong>What KunoWorld cannot see:</strong> your Private prompts, reference media and videos. We receive only
            encrypted files.
          </li>
          <li>
            <strong>What KunoWorld still sees:</strong> metadata. That is your account, the model, duration, resolution,
            aspect ratio, frame rate, the roles of your inputs, file sizes, timing, price, status and the receipt. We also
            see your payment records, and whether a job was blocked by a content check.
          </li>
          <li>
            <strong>Where it runs:</strong> only on GPU operators in the confidential tier. See{" "}
            <SectionRef id="security" /> for the current limits of that protection.
          </li>
        </ul>

        <LegalSubheading id="modes-standard">Standard</LegalSubheading>
        <ul>
          <li>
            <strong>Who can read the prompt, reference media and video:</strong> KunoWorld’s systems, and the GPU
            provider that renders the job, which may not use confidential-computing hardware.
          </li>
          <li>
            <strong>Who can open the video in the product:</strong> only your account.
          </li>
          <li>
            <strong>What KunoWorld keeps:</strong> the prompt, negative prompt, seed, options, reference media, the video
            and a preview image from it, in addition to everything kept for private jobs.
          </li>
          <li>
            <strong>Automated checks:</strong> our systems check Standard uploads and content. No person reads your
            content for these checks.
          </li>
          <li>
            <strong>Validators</strong> may receive the prompt, seed, settings and the hashes and file types of reference
            media, to check that GPU operators ran the job faithfully.
          </li>
        </ul>

        <LegalSubheading id="modes-both">In both modes</LegalSubheading>
        <p>
          Videos and job inputs are stored on Cloudflare R2 until you delete them (see <SectionRef id="retention" />).
          KunoWorld staff can open a video’s content only in the narrow cases in <SectionRef id="moderation" />.
        </p>
      </Section>

      <Section id="collect">
        <LegalSubheading id="collect-account">Account and sign-in</LegalSubheading>
        <ul>
          <li>Your email address.</li>
          <li>Sign-in tokens from the links we email you, stored as hashes, and your sign-in sessions.</li>
          <li>
            If you are a developer: your API keys, stored only as SHA-256 hashes (we never store the key itself), and
            whether each key has been revoked.
          </li>
          <li>
            If you are a KunoWorld operator (a moderator or admin): your role, alongside your email sign-in.
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
            <strong>Private jobs: encrypted content.</strong> Your prompts and reference media are encrypted on your
            device (using HPKE) before they are uploaded, and the video comes back encrypted. We store these encrypted
            files on Cloudflare R2 and cannot read them.
          </li>
          <li>
            <strong>Standard jobs: readable content.</strong> Your prompt, negative prompt, seed, options and reference
            media are received and stored readable on Cloudflare R2, and so are the finished video and a preview image
            from it. Automated systems check uploads and content.
          </li>
          <li>
            <strong>Job metadata</strong>, in both modes, which is not encrypted: the job’s privacy mode, the model,
            generation mode, duration, resolution, aspect ratio, frame rate and the roles of your inputs; file sizes; the
            price; the job’s status and timings; any error codes; the signed receipt; and the SHA-256 hash of the output
            file.
          </li>
          <li>The timing of your requests can also be observed.</li>
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

        <LegalSubheading id="collect-safety">Account safety and reports</LegalSubheading>
        <ul>
          <li>
            <strong>Strikes</strong>: which of your jobs were blocked by a content check, or Standard uploads refused by a
            check, and when, and any restriction on your account with when it ends. For a blocked job only the fact that
            it was blocked is recorded, not its content. For a refused upload we keep its hash and details such as its
            size and type, not the file.
          </li>
          <li>Whether your account is eligible for Private mode, and the reasons if it is not.</li>
          <li>
            <strong>Reports you send</strong>: which video (its digest, job ID or link), the reason and details you give,
            your email address if you give it, and your IP address, which is used to limit how many reports can be sent.
            An output key is accepted only with a report of child sexual abuse material or of sexual content involving a
            minor.
          </li>
          <li>
            <strong>Audit log</strong>: a record of each time an operator opens a video’s content, and of each action
            taken on a report or account, with who took it, when and why.
          </li>
        </ul>

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
            <strong>Session cookie.</strong> After you sign in, the website’s own server keeps your session in an
            HttpOnly cookie. Scripts on the page cannot read it. Its lifetime: <Ph k="sessionLifetime" />.
          </li>
          <li>
            <strong>No API key or gateway token in your browser.</strong> The studio, generation, your library, your
            account page and payments all work through that session, via the website’s server. Your browser never holds
            an API key or any gateway token.
          </li>
          <li>
            <strong>Private film keys.</strong> The studio saves each private take in your browser’s local storage: the
            prompt, its settings and the key that decrypts the video. We do not receive this. Anyone who can use that
            browser profile can open those videos. <strong>Forget all</strong> in the studio removes them from the
            browser. If the key is lost, we cannot recover the video. Standard takes are listed from your account on our
            servers instead.
          </li>
          <li>
            <strong>Mode choice.</strong> The studio remembers whether you last chose Private or Standard in this
            browser’s local storage.
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
            <strong>Readable prompts, reference media or videos of private jobs.</strong> For private jobs we receive and
            store only encrypted files. They are decrypted only on the attested confidential GPU that processes your job;
            see <SectionRef id="security" /> for the current limits of that protection. Standard jobs are different: we
            receive and store their content readable (see <SectionRef id="modes" />).
          </li>
          <li>
            <strong>Your film keys.</strong> They stay on your devices. The only exception is an output key someone
            includes in a report of child sexual abuse material or of sexual content involving a minor (see{" "}
            <SectionRef id="moderation" />).
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
            <strong>Email address, sign-in tokens and sessions</strong>: to send sign-in links, sign you in, keep you
            signed in, and let the studio, your library, your account page and payments work through the website’s
            server.
          </li>
          <li>
            <strong>API key hashes</strong>: to authenticate developers’ requests and let them revoke keys.
          </li>
          <li>
            <strong>Operator roles</strong>: to limit what each KunoWorld operator can do.
          </li>
          <li>
            <strong>Credit balance, ledger and payment records</strong>: to add credit, hold the price of each job,
            automatically refund jobs that fail, are canceled or time out, and keep financial records.
          </li>
          <li>
            <strong>Encrypted content</strong> of private jobs: to deliver your job to a GPU operator, and to store the
            encrypted files until you delete them.
          </li>
          <li>
            <strong>Standard content</strong>: to send the job to a GPU provider, return the video to you, keep it in your
            library with a preview image until you delete it, let validators check the operator’s work, and run automated
            content checks.
          </li>
          <li>
            <strong>Strike, eligibility, report and audit records</strong>: to restrict accounts after repeated blocked
            jobs, decide whether Private mode is available, handle reports, and record every time an operator opens a
            video.
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

      <Section id="moderation">
        <LegalSubheading id="moderation-checks">Automated content checks and strikes</LegalSubheading>
        <p>
          Sexual or sexually explicit content, and nudity intended to arouse, is banned in both modes. Automated content
          checks enforce this and the rest of our <a href="/terms">Terms of Service</a>.
        </p>
        <ul>
          <li>
            <strong>Private jobs</strong>: the checks run inside the confidential GPU, on the prompt and on the rendered
            frames. A check reports only that it blocked the job, so nobody at KunoWorld sees the content of a blocked
            private job.
          </li>
          <li>
            <strong>Standard jobs</strong>: the checks run on KunoWorld’s systems, on uploads and content. No person
            reads your content for these checks. For a refused upload we keep only its hash and details such as its size
            and type, not the file.
          </li>
        </ul>
        <p>
          A blocked job, or a refused Standard upload, is a strike on your account. Repeated strikes restrict your account
          for a time (by default 1 hour after 3 strikes in 24 hours, 7 days after 5 in 7 days, and until review after 10
          in 30 days) and can make Private mode unavailable. Your account page shows your strike counts and any
          restriction.
        </p>

        <LegalSubheading id="moderation-access">Who can open a video</LegalSubheading>
        <p>
          KunoWorld operators (moderators and admins) sign in with their own email account and are given a role. There
          is no shared admin token. An operator can open a video’s content only when:
        </p>
        <ul>
          <li>it is the subject of a report of child sexual abuse material or of sexual content involving a minor; or</li>
          <li>it is under a legal hold.</li>
        </ul>
        <p>
          Every such view is recorded in an audit log. <strong>We do not sample or randomly review new or stored videos.</strong>
        </p>
        <p>
          For a Private video, an operator can open it even in those two cases only if its key was provided. A report of
          child sexual abuse material, or of sexual content involving a minor, may include the video’s output key. We
          accept output keys only with those two report reasons. A key opens only that one video, and only while its
          encrypted files are still stored.
        </p>

        <LegalSubheading id="moderation-other">Other reports</LegalSubheading>
        <p>
          Other reports, such as harassment, copyright infringement, violent extremism or non-consensual intimate
          imagery, are handled without opening the video. We use the report, the job’s metadata and the account’s
          history. Actions include removing the content and restricting or closing the account.
        </p>
        <p>
          Every action on a report (dismissing it, removing content, restricting or closing an account) is logged with
          who took it, when and why.
        </p>

        <LegalSubheading id="moderation-holds">Preservation holds</LegalSubheading>
        <p>
          Content under a legal hold, or reported as child sexual abuse material, is preserved until the hold ends, even
          if its owner deletes it. The owner cannot access it while the hold lasts. How long holds last:{" "}
          <Ph k="preservation" />.
        </p>
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
            address. Its R2 object storage holds the videos and job inputs of both modes: encrypted files for Private
            jobs, readable content for Standard jobs. Other hosting and infrastructure providers: <Ph k="hosting" />.
          </li>
          <li>
            <strong>GPU operators (“miners”)</strong> receive your prompts and reference media sealed to their worker,
            together with the job parameters. The worker decrypts the content to generate your video and returns the
            result encrypted. Private jobs go only to attested operators in the confidential tier, sealed on your device.
            Standard jobs can go to any operator, including ones without confidential-computing hardware, and are sealed
            by KunoWorld. Operators are independent third parties on a Bittensor subnet.
          </li>
          <li>
            <strong>Validators</strong> on the network receive metadata about finished jobs and their receipts, which
            they use to score GPU operators. For standard jobs they may also receive the prompt, seed, settings and the
            hashes and file types of reference media, to check the operators’ work.
          </li>
          <li>
            <strong>KunoWorld operators</strong>: moderators and admins who handle reports. They can open a video’s
            content only in the cases in <SectionRef id="moderation" />, and every view is logged.
          </li>
          <li>
            <strong>The public.</strong> Anyone who has a video file or its hash can look up its receipt: the model,
            worker, timings and format, never the prompt or reference media.
          </li>
          <li>
            <strong>Authorities and others</strong>, where the law requires it or where it is needed to protect rights,
            safety or the Service. See <SectionRef id="legal-requests" />.
          </li>
        </ul>
        <ReviewNote>
          Confirm the full list of service providers, and whether other disclosures (for example, in a sale or
          reorganization of the business) should be described.
        </ReviewNote>
      </Section>

      <Section id="legal-requests">
        <p>
          When we receive a legal request for information about an account, what we are able to produce depends on the
          mode of its jobs and on what we still hold.
        </p>
        <LegalSubheading id="legal-requests-all">For every account</LegalSubheading>
        <p>
          Account and sign-in records, payment and ledger records, job metadata and receipts, strike and restriction
          records, reports and audit logs, for as long as we keep them (see <SectionRef id="retention" />).
        </p>
        <LegalSubheading id="legal-requests-standard">Standard jobs</LegalSubheading>
        <p>
          In addition, the prompt, reference media and video, until you delete them, or for longer if they are under a
          preservation hold.
        </p>
        <LegalSubheading id="legal-requests-private">Private jobs</LegalSubheading>
        <p>
          We cannot produce the readable prompt, reference media or video of a private job, because we do not hold the
          keys. We can produce its encrypted files until you delete them (or for longer under a preservation hold), and
          they cannot be read without your key. The only exception is a private video whose output key was given to us
          in a report of child sexual abuse material or of sexual content involving a minor.
        </p>
        <p>
          How we assess and respond to requests, and whether we notify affected users: <Ph k="legalRequests" />.
        </p>
        <ReviewNote>
          Confirm the obligations that apply in each jurisdiction where KunoWorld operates, including preservation
          requests, legal holds, and any duty to report child sexual abuse material or other unlawful content.
        </ReviewNote>
      </Section>

      <Section id="retention">
        <ul>
          <li>
            <strong>Videos and job inputs, in both modes</strong>: kept on Cloudflare R2 until you delete them. Nothing
            expires automatically. For Private jobs this is the encrypted files. For Standard jobs it is the prompt,
            reference media, video and preview image.
          </li>
          <li>
            <strong>Deleting a video</strong>: delete it in the studio library or with {DELETE_ENDPOINT}. This deletes
            the stored content (Private: the encrypted files; Standard: the video, prompt, inputs and preview image). The
            charge record, the job metadata and the signed receipt remain.
          </li>
          <li>
            <strong>Unused Standard uploads</strong>: uploads that no job ever used are deleted after 24 hours. This
            applies only to unused uploads.
          </li>
          <li>
            <strong>Content under a preservation hold</strong>: kept until the hold ends, even if you delete it, and you
            cannot access it in that time. Hold periods: <Ph k="preservation" />.
          </li>
          <li>
            <strong>Job records</strong> (the metadata and receipt described above): kept after the video is deleted,
            for <Ph k="retention" />. While a receipt is kept, it can be looked up publicly by hash.
          </li>
          <li>
            <strong>Strike and restriction records</strong>: <Ph k="retention" />.
          </li>
          <li>
            <strong>Reports, review records and operator audit logs</strong>: <Ph k="retention" />.
          </li>
          <li>
            <strong>Account data</strong>: <Ph k="retention" />.
          </li>
          <li>
            <strong>Sign-in tokens and sessions</strong>: <Ph k="retention" />.
          </li>
          <li>
            <strong>Credit ledger, charge and payment records</strong>: <Ph k="retention" />.
          </li>
          <li>
            <strong>Server and network logs</strong>: see <SectionRef id="collect">What we collect</SectionRef>.
          </li>
          <li>
            <strong>Private film keys in your browser</strong>: until you use Forget all or clear this site’s data in
            your browser. Without the key, the stored encrypted video cannot be opened.
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
          <li>
            in Private mode, encrypting prompts and reference media on your device before upload, storing videos only
            encrypted, and processing jobs only on attested confidential GPUs;
          </li>
          <li>storing API keys and sign-in tokens only as hashes;</li>
          <li>
            a session kept by the website’s server in an HttpOnly cookie, which scripts on the page cannot read, so your
            browser never holds an API key or gateway token;
          </li>
          <li>
            individual email sign-in and roles for KunoWorld operators, with no shared admin token, and an audit log of
            every time an operator opens a video; and
          </li>
          <li>signed receipts that let you check a result against the file you received.</li>
        </ul>
        <p>
          <strong>Current limits.</strong> During the preview:
        </p>
        <ul>
          <li>
            <strong>Hardware attestation has not yet been validated on live hardware.</strong> The Service runs Private
            jobs only on GPUs that pass attestation as Intel TDX and NVIDIA confidential-computing environments, so that
            GPU operators cannot read your content. Those checks have not yet been validated on live
            confidential-computing hardware. Until they are, the operator processing your job may be able to access your
            prompt, reference media and output.
          </li>
          <li>
            <strong>Standard mode is not end-to-end encrypted.</strong> KunoWorld’s systems and the GPU provider can read
            standard content. Choose Private mode for anything you don’t want them to see.
          </li>
          <li>
            <strong>Metadata is visible.</strong> Encryption does not hide job parameters, file sizes or the timing of
            requests.
          </li>
          <li>
            <strong>Your device matters.</strong> Your devices hold the keys that decrypt your Private videos. Anyone with
            access to your browser profile can open saved takes, and a compromised device can expose your content. If you
            lose a key, we cannot recover the video.
          </li>
        </ul>
        <ReviewNote>
          Confirm the status of hardware attestation on live confidential-computing hardware at publication, and update
          this section and the summary.
        </ReviewNote>
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
          Some limits apply. We cannot decrypt the content of private jobs, so we cannot provide it in readable form. The
          content of standard jobs that we still hold can be provided or deleted. Content under a preservation hold
          cannot be deleted until the hold ends. We cannot delete blockchain records, or recall receipts and metadata
          that have already been looked up or supplied to validators. We may need to keep some records to meet legal
          obligations.
        </p>
        <p>
          You can also act directly: delete videos, in either mode, in the studio library or with {DELETE_ENDPOINT};
          revoke API keys on your account page; use Forget all in the studio; or clear this site’s cookies and storage in
          your browser.
        </p>
      </Section>

      <Section id="transfers">
        <p>
          GPU operators and validators take part in a decentralized network and may be located in any country. Our
          service providers process data in <Ph k="hosting" />. Your data, including encrypted content, standard-mode
          content and job metadata, may therefore be transferred to and processed in countries other than your own,
          which may have different data protection laws.
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
