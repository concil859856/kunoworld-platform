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

export const metadata: Metadata = {
  title: "Terms of Service (draft) — KunoWorld",
  description:
    "Draft Terms of Service for KunoWorld’s development-preview AI video generation service. Pending legal review and not yet in effect.",
  robots: { index: false },
};

const SECTIONS = [
  { id: "acceptance", title: "Acceptance of these Terms" },
  { id: "preview", title: "The Service and its preview status" },
  { id: "accounts", title: "Eligibility, accounts and signing in" },
  { id: "modes", title: "Private and Standard modes, storage and deletion" },
  { id: "keys", title: "API keys and saved film keys" },
  { id: "share-links", title: "Share links", review: true },
  { id: "credit", title: "Credit, pricing and refunds" },
  { id: "crypto-payments", title: "Cryptocurrency payments", review: true },
  { id: "acceptable-use", title: "Acceptable use and prohibited content" },
  { id: "enforcement", title: "Content checks, strikes and reports", review: true },
  { id: "regions", title: "Regional availability of models" },
  { id: "content", title: "Your inputs, outputs and model licenses", review: true },
  { id: "receipts", title: "Provenance receipts" },
  { id: "third-parties", title: "GPU operators and other third parties" },
  { id: "termination", title: "Suspension and termination" },
  { id: "disclaimers", title: "Disclaimers", review: true },
  { id: "liability", title: "Limitation of liability", review: true },
  { id: "indemnity", title: "Indemnity", review: true },
  { id: "changes", title: "Changes to the Service and these Terms" },
  { id: "law", title: "Governing law and disputes", review: true },
  { id: "contact", title: "Contact" },
] as const satisfies readonly LegalSectionDef[];

type SectionId = (typeof SECTIONS)[number]["id"];

const PH = {
  company: { label: "[COMPANY LEGAL NAME]", note: "full legal name of the entity operating KunoWorld." },
  address: { label: "[REGISTERED ADDRESS]", note: "registered address of that entity." },
  effectiveDate: { label: "[EFFECTIVE DATE]", note: "date these Terms take effect." },
  legalEmail: { label: "[LEGAL CONTACT EMAIL]", note: "address for questions about these Terms and account closure." },
  abuseEmail: { label: "[ABUSE REPORT EMAIL]", note: "where to report prohibited content or misuse." },
  appeals: {
    label: "[APPEAL PROCESS FOR RESTRICTIONS AND REMOVALS]",
    note: "who reviews appeals and how independent they are of the original decision, how quickly appeals are decided, and whether any further review is available.",
  },
  retentionAfterClosure: {
    label: "[RETENTION OF RECORDS AFTER CLOSURE]",
    note: "how long billing, payment, receipt, report, strike and audit records are kept after an account is closed, and the legal reason for each.",
  },
  balanceOnClosure: {
    label: "[BALANCE ON CLOSURE POLICY]",
    note: "what happens to unused credit when a customer closes their own account: refunded, forfeited or refunded on request, and how.",
  },
  minimumAge: { label: "[MINIMUM AGE]", note: "minimum age to use the Service." },
  prices: {
    label: "[PRICES — NOT YET SET]",
    note: "the price of each model and option, and where the current price list is published. Every price shown today is a placeholder.",
  },
  tax: { label: "[TAX TREATMENT OF TOP-UPS]", note: "whether prices and top-ups include or exclude taxes." },
  refund: {
    label: "[REFUND POLICY FOR UNUSED CREDIT]",
    note: "whether and how unused credit is refunded, including on account closure or termination.",
  },
  creditExpiry: { label: "[CREDIT EXPIRY POLICY]", note: "whether prepaid credit expires." },
  crypto: {
    label: "[CRYPTO PAYMENT DETAILS — TO CONFIRM]",
    note: "supported networks and assets, confirmations, USD conversion rate source and timing, under/overpayments.",
  },
  preservation: {
    label: "[PRESERVATION HOLD PERIODS]",
    note: "how long content under a legal hold, or reported as child sexual abuse material, is preserved, and when a hold ends.",
  },
  csamReporting: {
    label: "[CSAM REPORTING OBLIGATIONS]",
    note: "which authorities or organizations child sexual abuse material must be reported to, what is sent, and under which law.",
  },
  outputTerms: {
    label: "[OUTPUT OWNERSHIP AND USAGE TERMS]",
    note: "who owns outputs and what use is allowed, consistent with the MiniMax H3 and LTX-2 Community Licenses.",
  },
  emailProvider: { label: "[EMAIL SERVICE PROVIDER]", note: "provider that sends sign-in emails." },
  liabilityCap: { label: "[LIABILITY CAP]", note: "amount or formula limiting total liability." },
  noticePeriod: { label: "[NOTICE PERIOD FOR CHANGES]", note: "how much notice of material changes, and by what means." },
  law: { label: "[GOVERNING LAW / JURISDICTION]", note: "law governing these Terms." },
  disputes: {
    label: "[DISPUTE RESOLUTION METHOD AND VENUE]",
    note: "courts or arbitration, and where disputes are heard.",
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

function SectionRef({ id }: { id: SectionId }) {
  const number = SECTIONS.findIndex((s) => s.id === id) + 1;
  return <a href={`#${id}`}>section {number}</a>;
}

const DELETE_ENDPOINT = <code>{"DELETE /v1/videos/{job_id}"}</code>;

export default function Terms() {
  return (
    <LegalDocument
      documentName="Terms of Service"
      title={
        <>
          Terms of
          <br />
          <em>Service.</em>
        </>
      }
      intro="The agreement that will govern using KunoWorld to generate video: accounts, credit, acceptable use, and what the development preview does and does not promise."
      effectiveDate={<Ph k="effectiveDate" />}
      drafted="14 September 2026"
      sections={SECTIONS}
      placeholders={Object.values(PH)}
      summary={
        <>
          <p>
            KunoWorld is a development preview. Outputs may be placeholder video, the service may be unavailable, and
            the hardware attestation checks meant to stop GPU operators from reading private content have not yet been
            validated on live confidential-computing hardware.
          </p>
          <p>
            You choose a mode for every job. Private jobs are encrypted on your device and run only on an attested
            confidential GPU. KunoWorld cannot read them, and cannot recover a lost key. Standard jobs can be read by
            KunoWorld’s systems and the GPU provider. In both modes your videos are kept until you delete them.
          </p>
          <p>
            Only you can open your videos, unless you create a share link for one. Anyone who has a link can watch that
            video, so you are responsible for who you share it with. You can revoke a link at any time.
          </p>
          <p>
            Sexual content and nudity are banned in both modes. Jobs blocked by the content checks count as strikes, and
            strikes can restrict your account. KunoWorld staff can open a video only in a few narrow cases, and every
            view is logged.
          </p>
          <p>
            You pay with prepaid credit. Prices have not been set yet. A job’s price is held when you submit it and
            refunded automatically if the job fails, is canceled or times out. Cryptocurrency payments cannot be
            reversed.
          </p>
          <p>
            Keep your email account, your API keys, your saved film keys and your recovery code safe. Don’t use the service for abusive or
            illegal content. A video’s receipt is public to anyone who has the file.
          </p>
        </>
      }
    >
      <Section id="acceptance">
        <p>
          These Terms of Service (“Terms”) are an agreement between you and <Ph k="company" />, whose registered address
          is <Ph k="address" /> (“KunoWorld”, “we”, “us”). They apply to the KunoWorld website, studio, API, software
          development kits and gateway (together, the “Service”).
        </p>
        <p>
          By creating an account, signing in, adding credit or submitting a generation job, you agree to these Terms. If
          you do not agree, do not use the Service.
        </p>
        <p>
          If you use the Service for an organization, you confirm that you are authorized to accept these Terms on its
          behalf, and “you” includes that organization.
        </p>
        <p>
          Our <a href="/privacy-policy">Privacy Policy</a> explains how we handle personal data. Our{" "}
          <a href="/privacy">Privacy &amp; provenance</a> page explains the encryption and receipt design in technical
          terms.
        </p>
      </Section>

      <Section id="preview">
        <p>
          KunoWorld generates video from text prompts and reference media using AI models, currently MiniMax H3 and
          LTX-2.5. Our gateway accepts jobs and dispatches them to independent GPU operators (“miners”) on a Bittensor
          subnet, who run the models and return the results.
        </p>
        <p>
          <strong>The Service is a development preview.</strong> That means:
        </p>
        <ul>
          <li>Outputs may be placeholder video rather than footage generated by the model you selected.</li>
          <li>
            Models, features and limits may change, and parts of the Service may be withdrawn. Prices have not been set
            yet (see <SectionRef id="credit" />).
          </li>
          <li>
            The Service may be slow, interrupted or unavailable, and jobs may fail. We make no commitment to any level
            of availability.
          </li>
          <li>
            Private mode (see <SectionRef id="modes" />) runs jobs only on GPUs that pass hardware attestation as Intel
            TDX and NVIDIA confidential-computing environments, so that GPU operators cannot read your content.{" "}
            <strong>
              These attestation checks have not yet been validated on live confidential-computing hardware.
            </strong>{" "}
            Until they are, do not submit prompts or reference media that you are not prepared to have exposed to the
            operator that processes them. Standard mode never offers that protection.
          </li>
        </ul>
        <ReviewNote>
          Confirm the status of hardware attestation on live confidential-computing hardware at publication, and remove
          or update this caveat and the matching ones in <SectionRef id="modes" />, <SectionRef id="receipts" /> and{" "}
          <SectionRef id="disclaimers" />.
        </ReviewNote>
      </Section>

      <Section id="accounts">
        <p>
          To use the Service you must be at least <Ph k="minimumAge" /> and legally able to enter into these Terms.
        </p>
        <p>
          You sign in to the website with a link sent to your email address. Use an email address you control and keep
          it secure: anyone who can read your inbox can sign in to your account.
        </p>
        <p>
          After you sign in, the website’s own server keeps your session in an HttpOnly cookie. Scripts on the page
          cannot read it. The studio, generation, your library, your account page and payments all work through that
          session, via the website’s server. Your browser never holds an API key or any gateway token.
        </p>
        <p>
          You are responsible for activity on your account, including jobs submitted and credit spent through your
          website sessions or your API keys.
        </p>
      </Section>

      <Section id="modes">
        <p>
          You choose a mode for each job: in the studio before you generate, or with the <code>privacy</code> option in
          the API and SDKs. The mode decides who can read the job’s prompt, reference media and video. It cannot be
          changed after the job is submitted.
        </p>

        <LegalSubheading id="modes-private">Private mode (the default)</LegalSubheading>
        <ul>
          <li>
            Your prompt and reference media are encrypted on your device, by the studio or an SDK. They are processed
            only on an attested confidential GPU.
          </li>
          <li>
            The stored video is encrypted. Only someone who holds its key can open it. The key stays on your own devices
            (see <SectionRef id="keys" />). If you turn on key sync, KunoWorld also stores a copy of the key that is
            encrypted on your device and that we cannot decrypt. A share link to a Private video contains its key (see{" "}
            <SectionRef id="share-links" />).
          </li>
          <li>
            <strong>KunoWorld cannot read Private videos or prompts.</strong> We cannot recover a lost key. A lost key
            means a lost video.
          </li>
          <li>
            KunoWorld still sees the job’s metadata: your account, the model, duration, resolution, aspect ratio, frame
            rate, the roles of your inputs, file sizes, timing, price, status and the receipt.
          </li>
          <li>
            Private jobs run only on GPU operators in the confidential tier. Until the attestation checks have been
            validated on live hardware (see <SectionRef id="preview" />), the operator that renders a private job may be
            able to access its content.
          </li>
          <li>
            Private mode has stricter account requirements. By default your account needs at least one credited top-up
            (by card, USDT, TAO or alpha) or a credit added by KunoWorld, no active restriction, and fewer than 2 strikes
            in the last 30 days. Private jobs also have a lower limit on how many can be started per minute. We may
            change these requirements.
          </li>
        </ul>

        <LegalSubheading id="modes-standard">Standard mode</LegalSubheading>
        <ul>
          <li>
            Your prompt, reference media and video are sent to KunoWorld readable (encrypted only in transit) and stored
            by KunoWorld.{" "}
            <strong>KunoWorld’s systems and the GPU provider that renders the job can read them.</strong>
          </li>
          <li>
            Standard jobs can run on any GPU operator, including GPUs without confidential-computing hardware.
          </li>
          <li>
            In the product, only your account can open your Standard videos. KunoWorld keeps them in your library with a
            preview image.
          </li>
          <li>
            Automated systems check Standard uploads and content (see <SectionRef id="enforcement" />). No person reads
            your content for those checks.
          </li>
          <li>
            Validators may receive a standard job’s prompt, seed and settings to check that GPU operators ran it
            faithfully.
          </li>
        </ul>
        <ReviewNote>
          Confirm whether Standard and Private jobs will be priced differently, and if so state it in{" "}
          <SectionRef id="credit" />.
        </ReviewNote>

        <LegalSubheading id="modes-who-can-see">Who else can open a video</LegalSubheading>
        <p>
          In either mode, authorized KunoWorld operators can open a video’s content only if it is the subject of a
          report of child sexual abuse material or of sexual content involving a minor, or if it is under a legal hold.
          Every such view is logged. We do not sample or randomly review videos. A Private video can be opened even then
          only if its key was provided. See <SectionRef id="enforcement" />. Share links do not change this.
        </p>
        <p>
          Anyone you give a share link to can watch that one video until the link stops working (see{" "}
          <SectionRef id="share-links" />).
        </p>

        <LegalSubheading id="modes-storage">Storage and deletion</LegalSubheading>
        <p>
          In both modes, your videos and the inputs stored for each job are kept on Cloudflare R2 object storage used by
          KunoWorld. <strong>They are kept until you delete them.</strong> Nothing expires automatically. The only
          exception is Standard uploads that no job ever used, which may be deleted after 24 hours.
        </p>
        <p>
          You can delete a video in the studio library, or with {DELETE_ENDPOINT} in the API. Deleting a video deletes
          its stored content:
        </p>
        <ul>
          <li>
            <strong>Private</strong>: the job’s encrypted files.
          </li>
          <li>
            <strong>Standard</strong>: the video, the prompt, the inputs and the preview image.
          </li>
        </ul>
        <p>
          The record of the charge, the job’s metadata and the signed receipt remain (see <SectionRef id="receipts" />).
          Deleting a video also deletes its synced key, if you use key sync, and stops its share links working.
        </p>
        <p>
          <strong>Preservation holds.</strong> Content under a legal hold, or reported as child sexual abuse material, is
          preserved until the hold ends, even if you delete it. You cannot access it while the hold lasts. How long
          holds last: <Ph k="preservation" />.
        </p>
      </Section>

      <Section id="keys">
        <LegalSubheading id="keys-api">API keys</LegalSubheading>
        <p>
          You do not need an API key to use the website. API keys are only for developers who call the API or SDKs from
          their own programs.
        </p>
        <p>
          You create and revoke API keys on your account page. We store only a SHA-256 hash of each key, so we cannot
          show you a key again or recover a lost one. Create a new key and revoke the old one instead.
        </p>
        <p>
          Anyone holding a valid API key can submit jobs that spend your credit. Keep your keys secret. Do not publish
          them or embed them where others can read them, including in web pages. Revoke any key you think has been
          exposed.
        </p>

        <LegalSubheading id="keys-film">Film keys for Private videos</LegalSubheading>
        <p>
          Each Private video is encrypted to a key that only you hold. The website studio saves that key in your
          browser’s local storage, together with the take’s prompt and settings. If you use an SDK, the key is kept
          wherever your program stores it.
        </p>
        <p>
          Anyone who can use that browser profile, or read where you store the key, can open those videos. Keep your
          device and browser profile secure, and back up your film keys. <strong>Forget all</strong> in the studio
          removes saved private takes from this browser.
        </p>
        <p>
          <strong>KunoWorld cannot recover a lost film key. A lost key means a lost video.</strong> We store only the
          encrypted files, and we cannot decrypt them for you.
        </p>
        <p>
          If you believe your account or keys have been compromised, revoke the affected keys and contact{" "}
          <a href="mailto:security@kunoworld.com">security@kunoworld.com</a>.
        </p>

        <LegalSubheading id="keys-sync">Key sync and your recovery code</LegalSubheading>
        <p>
          Key sync is optional. If you turn it on, your browser encrypts your film keys before they are uploaded, and
          KunoWorld stores only the encrypted copies so that you can unlock them on your other devices with your recovery
          code or a passkey. We cannot decrypt them.
        </p>
        <ul>
          <li>
            Your recovery code is shown once, when you set up key sync. Keep it safe and private.{" "}
            <strong>KunoWorld cannot recover a lost recovery code.</strong>
          </li>
          <li>
            Anyone who can sign in to your account and has your recovery code, or one of your passkeys, can unlock your
            synced keys and open your Private videos.
          </li>
          <li>
            Rotating your keys on your account page makes a new master key and a new recovery code. Old recovery codes
            and passkeys stop working.
          </li>
          <li>
            Turning key sync off deletes the encrypted copies from KunoWorld. Keys already saved in a browser stay there.
          </li>
          <li>
            <strong>
              If you lose every device, your recovery code and your passkeys, your keys cannot be recovered and your
              Private videos cannot be opened.
            </strong>
          </li>
        </ul>
        <ReviewNote>
          Confirm that the disclaimers and limitation of liability cover the loss of film keys, recovery codes and
          Private videos, including where key sync is not used.
        </ReviewNote>
      </Section>

      <Section id="share-links">
        <p>
          Only you can open your videos, unless you create a share link for one. Links are off by default.
        </p>
        <ul>
          <li>
            You can create a link to one finished video, with or without an expiry, and revoke it at any time on your
            account page. A video can have up to 20 working links. An account under a restriction cannot create links.
          </li>
          <li>
            <strong>Anyone who has a link can watch that video.</strong> You are responsible for who you share a link
            with. Revoking a link stops it working, but cannot undo what someone did while they had access.
          </li>
          <li>
            A link to a Private video contains that video’s key. KunoWorld still cannot see the video, but anyone with the
            full link can decrypt and watch it. Share it as carefully as the video itself.
          </li>
          <li>
            We store only a hash of each link’s token, so we cannot show you a lost link again. Create a new one instead.
          </li>
          <li>
            A link stops working when you revoke it, when it expires, when you delete the video, when the video is
            removed after a review under these Terms or placed under a legal preservation hold, or when your account is
            closed.
          </li>
          <li>
            Shared videos remain subject to these Terms, including <SectionRef id="acceptable-use" /> and{" "}
            <SectionRef id="enforcement" />. Anyone who sees a shared video can report it.
          </li>
          <li>
            Creating a link does not give KunoWorld staff any further access to your content: they can open a video only
            in the cases described in <SectionRef id="enforcement" />.
          </li>
        </ul>
        <ReviewNote>
          Confirm whether sharing a link affects the output ownership and model license terms in{" "}
          <SectionRef id="content" /> (for example, attribution when a video is distributed), and whether terms are
          needed for people who watch a shared video without an account.
        </ReviewNote>
      </Section>

      <Section id="credit">
        <p>
          The Service is paid for with prepaid credit, held in US dollars in your account. Credit can only be used to
          pay for the Service. We keep a ledger of each top-up, charge and refund on your account.
        </p>

        <LegalSubheading id="credit-adding">Adding credit</LegalSubheading>
        <p>We plan to offer the following ways to add credit. Not every method may be available at all times.</p>
        <ul>
          <li>
            <strong>Card</strong>, processed by Stripe. Stripe handles your card details under its own terms; KunoWorld
            does not store card numbers.
          </li>
          <li>
            <strong>USDT, TAO and Bittensor subnet alpha tokens</strong>, subject to <SectionRef id="crypto-payments" />.
          </li>
        </ul>
        <p>
          Taxes: <Ph k="tax" />.
        </p>

        <LegalSubheading id="credit-prices">Prices</LegalSubheading>
        <p>
          <strong>Prices have not been set yet.</strong> Every price shown on the website, in the studio or in the API
          today is a placeholder. Prices will be set before launch, and they may change after that. Prices:{" "}
          <Ph k="prices" />.
        </p>
        <p>
          The price of a job is set when you submit it, and that amount is held from your credit balance at submission.
        </p>

        <LegalSubheading id="credit-refunds">Automatic refunds</LegalSubheading>
        <p>
          If a job fails, is canceled or times out, the amount held for it is automatically refunded to your credit
          balance.
        </p>
        <ReviewNote>
          Confirm how jobs that complete with placeholder video during the preview are charged, and state it here.
        </ReviewNote>

        <LegalSubheading id="credit-unused">Unused credit</LegalSubheading>
        <p>
          Refunds of unused credit: <Ph k="refund" />.
        </p>
        <p>
          Expiry of credit: <Ph k="creditExpiry" />.
        </p>
      </Section>

      <Section id="crypto-payments">
        <p>
          When you pay in USDT, TAO or Bittensor subnet alpha tokens, we record the blockchain network, the transaction
          hash and the wallet address against your account.
        </p>
        <p>
          Supported networks and assets, the number of confirmations required before credit is added, the rate used to
          convert a payment into US-dollar credit, and how underpayments and overpayments are handled:{" "}
          <Ph k="crypto" />.
        </p>
        <p>Before you pay in cryptocurrency, understand that:</p>
        <ul>
          <li>
            <strong>Transactions are irreversible.</strong> We cannot cancel or reverse a transaction once it has been
            sent.
          </li>
          <li>
            <strong>Transactions are public.</strong> The transaction and the wallet addresses involved are permanently
            visible on the blockchain.
          </li>
          <li>
            <strong>Mistakes may be unrecoverable.</strong> Funds sent on the wrong network, in the wrong asset or to the
            wrong address may be lost, and we may be unable to credit or return them.
          </li>
          <li>The value of cryptocurrencies can change quickly.</li>
          <li>
            You are responsible for network fees and for complying with any laws that apply to your use of
            cryptocurrency.
          </li>
        </ul>
      </Section>

      <Section id="acceptable-use">
        <p>
          These rules apply in both modes. You must not use the Service to create, upload, request or distribute:
        </p>
        <ul>
          <li>
            <strong>Child sexual abuse material</strong>, or any content that sexualizes minors, whether real, drawn or
            synthetic.
          </li>
          <li>
            <strong>Sexual content and nudity</strong>: sexual or sexually explicit content, and nudity intended to
            arouse. This is banned in Private and Standard mode alike. There is no setting that allows it.
          </li>
          <li>
            <strong>Non-consensual intimate imagery</strong>, including sexual or nude depictions of a real, identifiable
            person without their consent.
          </li>
          <li>
            <strong>Impersonation and deception</strong>: content showing a real person saying or doing something they
            did not, where it is intended or likely to deceive; content presented as a genuine recording of real events
            in order to mislead; or content used for fraud, scams or election manipulation.
          </li>
          <li>
            <strong>Illegal content</strong>, or content that infringes another person’s intellectual property, privacy
            or publicity rights.
          </li>
          <li>Content that harasses or threatens people or incites violence against them.</li>
          <li>Anything prohibited by the license of the model that processes your job.</li>
        </ul>
        <p>You must not misuse the Service or its infrastructure, including by:</p>
        <ul>
          <li>attempting to break, bypass or weaken the Service’s encryption, attestation, receipt signing or payment systems;</li>
          <li>forging, altering or misrepresenting provenance receipts;</li>
          <li>
            making payments you are not authorized to make, or trying to obtain credit or refunds you are not entitled
            to;
          </li>
          <li>
            circumventing the regional restrictions in <SectionRef id="regions" />, for example by disguising your
            location;
          </li>
          <li>
            accessing another person’s account, sessions, API keys, film keys or recovery codes, or a share link that was
            not given to you; or
          </li>
          <li>interfering with, overloading or disrupting the Service, its GPU operators or its validators.</li>
        </ul>
        <p>
          In Private mode your prompts and reference media are encrypted on your device, so KunoWorld cannot read them.
          In Standard mode its systems can. Either way, you remain responsible for what you submit and how you use the
          results.
        </p>
        <p>
          Child sexual abuse material is reported as the law requires: <Ph k="csamReporting" />.
        </p>
        <p>
          If you find a security vulnerability, report it to{" "}
          <a href="mailto:security@kunoworld.com">security@kunoworld.com</a> rather than exploiting it. Report a video
          that breaks these rules on our <a href="/report">report page</a>, and other misuse of the Service to{" "}
          <Ph k="abuseEmail" />.
        </p>
        <ReviewNote>
          Confirm the reporting obligations for child sexual abuse material and other unlawful content in each
          jurisdiction where KunoWorld operates, including for a Private video opened with a key supplied in a report
          and for content under a legal hold.
        </ReviewNote>
      </Section>

      <Section id="enforcement">
        <LegalSubheading id="enforcement-checks">Content checks</LegalSubheading>
        <p>Automated content checks enforce these Terms, including the ban on sexual content and nudity.</p>
        <ul>
          <li>
            <strong>Private jobs</strong>: the checks run inside the confidential GPU, on your prompt and on the frames
            it renders. A check reports only that it blocked a job, never the content.
          </li>
          <li>
            <strong>Standard jobs</strong>: the checks run on KunoWorld’s systems, on your uploads and the job’s
            content. No person reads your content for these checks.
          </li>
        </ul>
        <p>
          A job a check blocks fails with a content-policy error. A Standard upload a check refuses is not accepted.
        </p>

        <LegalSubheading id="enforcement-strikes">Strikes and restrictions</LegalSubheading>
        <p>
          Every job blocked by a content check, in either mode, and every Standard upload refused by a check, is one
          strike on your account. By default:
        </p>
        <ul>
          <li>3 strikes in 24 hours restrict your account for 1 hour;</li>
          <li>5 strikes in 7 days restrict it for 7 days; and</li>
          <li>10 strikes in 30 days restrict it until we review it.</li>
        </ul>
        <p>
          A restricted account cannot start new jobs in either mode until the restriction ends. Your account page shows
          your strike counts, whether Private mode is available to you and when any restriction ends. We may change
          these thresholds, and we may also act on an account under <SectionRef id="termination" />.
        </p>

        <LegalSubheading id="enforcement-reports">Reports</LegalSubheading>
        <p>
          Anyone can report a video on our <a href="/report">report page</a>, identifying it by its certificate digest,
          its job ID or a link. Reports of child sexual abuse material and of sexual content involving minors are handled
          first.
        </p>

        <LegalSubheading id="enforcement-access">When KunoWorld staff can open a video</LegalSubheading>
        <p>
          KunoWorld operators (moderators and admins) sign in with their own email account and are given a role. There
          is no shared admin login. An operator can open a video’s content only when:
        </p>
        <ul>
          <li>it is the subject of a report of child sexual abuse material or of sexual content involving a minor; or</li>
          <li>it is under a legal hold.</li>
        </ul>
        <p>
          Every time an operator opens a video’s content, it is recorded in an audit log.{" "}
          <strong>We do not sample or randomly review new or stored videos.</strong>
        </p>
        <p>
          For a Private video, an operator can open it even in those two cases only if its key was provided. A report of
          child sexual abuse material, or of sexual content involving a minor, may include the video’s output key. We
          accept output keys only with those two report reasons. A key opens only that one video.
        </p>

        <LegalSubheading id="enforcement-other">Other reports and outcomes</LegalSubheading>
        <p>
          Other reports, such as harassment, copyright infringement, violent extremism or non-consensual intimate
          imagery, are handled without opening the video. We use the report, the job’s metadata and the account’s
          history.
        </p>
        <p>
          After handling a report we may dismiss it, remove the content, restrict the account or close it. Each action
          is recorded with who took it, when and why. Reported content may be placed under a preservation hold (see{" "}
          <SectionRef id="modes" />).
        </p>
        <LegalSubheading id="enforcement-appeals">Appeals</LegalSubheading>
        <p>
          If you think a strike, a restriction, the removal of one of your videos, or a decision on a report about your
          account was a mistake, you can appeal it from the Appeals section of your account page. You say why in up to
          2,000 characters. You can have one open appeal about each decision, and send up to 5 appeals a day.
        </p>
        <p>
          A KunoWorld moderator reviews the appeal from the record: the decision, the report and the account’s history.
          Appeals are decided without opening your content. The moderator upholds the decision or overturns it, and we
          email you the outcome with the moderator’s note. The outcome also shows on your account page.
        </p>
        <ul>
          <li>An overturned strike no longer counts toward restrictions or Private mode.</li>
          <li>An overturned restriction, or a restriction or ban placed by a decision on a report, is lifted.</li>
          <li>
            A removed video can be restored only if its content is still stored, which happens only when it was kept under
            a preservation hold. Otherwise its content is gone, and we will tell you so.
          </li>
        </ul>
        <p>
          Who reviews appeals, how quickly they are decided, and whether any further review is available:{" "}
          <Ph k="appeals" />.
        </p>
        <ReviewNote>
          Confirm whether jobs blocked by a content check are charged or refunded, and whether reporters or account
          holders are told the outcome of a report.
        </ReviewNote>
      </Section>

      <Section id="regions">
        <p>
          Models are offered only where their licenses allow. The MiniMax H3 Community License excludes the European
          Union, the United Kingdom, South Korea and the United States unless MiniMax authorizes otherwise. When a
          request comes from one of those regions, the gateway routes it to LTX-2.5 instead of MiniMax H3.
        </p>
        <p>
          We determine your country from information Cloudflare derives from the IP address of your request, which may
          be inaccurate. Availability may change if model licenses or authorizations change.
        </p>
        <ReviewNote>
          Confirm how customers are told that a job was routed to a different model, and whether the price differs.
        </ReviewNote>
      </Section>

      <Section id="content">
        <LegalSubheading id="content-inputs">Your inputs</LegalSubheading>
        <p>
          You keep whatever rights you have in the prompts and reference media you submit. You permit us, and the GPU
          operators that process your jobs, to store, transmit and process them as needed to provide the Service. That
          includes running automated content checks, and letting authorized operators open content in the limited cases
          described in <SectionRef id="enforcement" />.
        </p>
        <p>
          You confirm that you have all the rights and permissions needed to submit your inputs, including the consent
          of any identifiable person shown in reference media.
        </p>

        <LegalSubheading id="content-outputs">Outputs</LegalSubheading>
        <p>
          Ownership of outputs and the terms on which you may use them: <Ph k="outputTerms" />.
        </p>
        <p>
          Outputs are produced by third-party models and are subject to those models’ licenses, currently the MiniMax
          H3 Community License and the LTX-2 Community License. These licenses may limit how outputs can be used, and
          you are responsible for complying with them.
        </p>
        <p>
          AI models can produce similar outputs for different users, and outputs may be inaccurate, unexpected or
          objectionable. Review outputs before relying on or publishing them.
        </p>
        <ReviewNote>
          Determine what rights, if any, KunoWorld can grant in outputs under each model license, including commercial
          use, attribution and any use restrictions that must be passed on to customers.
        </ReviewNote>
      </Section>

      <Section id="receipts">
        <p>
          Each completed job produces a receipt signed by the worker that rendered it. The receipt records the model, the
          worker, timings, the output format and the SHA-256 hash of the output file.
        </p>
        <p>
          <strong>Receipts are public by hash.</strong> While we keep a receipt, anyone who has the video file, or its
          hash, can look it up, for example on our <a href="/verify">verification page</a>. A receipt stays after you
          delete the video. It never contains your prompt or reference media.
        </p>
        <p>
          Metadata about finished jobs, and their receipts, are also made available to the network’s validators, who
          use them to score GPU operators.
        </p>
        <p>
          A receipt shows that a worker holding a particular key signed a particular file. It does not show that the
          events depicted are real, and it will not match a copy that has been edited or re-encoded. Until the
          attestation checks have been validated on live hardware, a receipt also does not prove that the job ran inside
          verified confidential-computing hardware.
        </p>
      </Section>

      <Section id="third-parties">
        <p>
          GPU operators and validators are independent participants in a Bittensor subnet. They are not our employees
          or agents, and we do not control their hardware or facilities.
        </p>
        <p>
          In Standard mode, the GPU provider that renders your job can see its prompt, reference media and video, and may
          not use confidential-computing hardware. Validators may also receive a standard job’s prompt, seed and
          settings.
        </p>
        <p>
          The Service also relies on third-party providers, including Stripe for card payments,{" "}
          <Ph k="emailProvider" /> for sign-in emails, and Cloudflare for network services and for the R2 object storage
          where videos and job inputs are kept. Their own terms may apply when you use features they provide.
        </p>
      </Section>

      <Section id="termination">
        <p>
          You can stop using the Service at any time, delete your videos, and revoke your API keys and share links.
        </p>
        <LegalSubheading id="termination-export">Downloading your data</LegalSubheading>
        <p>
          You can download a copy of your data from your account page at any time. It includes your account details,
          balance, charges and payments, your jobs and their receipts, your strikes and appeals, your Standard prompts,
          videos and uploads, and your Private videos as the encrypted files we store, which only your keys open. Content
          you deleted, or that was removed after a review, is not included. The copy is deleted automatically 7 days after
          it is ready.
        </p>
        <LegalSubheading id="termination-closing">Closing your account</LegalSubheading>
        <p>
          You can close your account yourself on your account page. To protect you, closing needs a sign-in from the last
          10 minutes (we email you a link to confirm it’s you) and your email address typed out. Closing is permanent:
        </p>
        <ul>
          <li>videos still rendering are canceled and refunded;</li>
          <li>
            your videos, prompts, uploads and data exports are deleted, except content under a preservation hold, which is
            kept until the hold ends (see <SectionRef id="modes" />);
          </li>
          <li>
            your sign-in sessions and API keys stop working, your share links end, your synced keys are deleted, linked
            wallets are unlinked, and any operator role ends; and
          </li>
          <li>your email address is removed from the account, so signing in again with it creates a new, empty account.</li>
        </ul>
        <p>
          We keep billing and ledger records, payments, job records and receipts, reports, strikes, restrictions and the
          audit log: <Ph k="retentionAfterClosure" />. Unused credit when you close your account:{" "}
          <Ph k="balanceOnClosure" />. It is not refunded automatically.
        </p>
        <p>
          We may suspend or end your access, restrict your account, revoke API keys, remove content, or cancel or refuse
          jobs if we reasonably believe you have breached these Terms (including through strikes and reports, see{" "}
          <SectionRef id="enforcement" />), if the law requires it, or if it is needed to protect the Service, its users,
          GPU operators or others. We may also end the preview or discontinue the Service.
        </p>
        <p>
          What happens to unused credit when an account is closed, suspended or terminated: <Ph k="refund" />.
        </p>
        <p>
          The sections on credit, cryptocurrency payments, acceptable use, inputs and outputs, provenance receipts,
          disclaimers, limitation of liability, indemnity and governing law continue to apply after your access ends.
        </p>
        <ReviewNote>
          Decide what notice and explanation will be given for suspensions and terminations KunoWorld starts, and whether
          the appeal route above applies to them. Confirm what records are kept after a customer closes their account and
          for how long, and the policy for unused credit on closure.
        </ReviewNote>
      </Section>

      <Section id="disclaimers">
        <p>
          To the fullest extent permitted by law, the Service is provided “as is” and “as available”, without warranties
          of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose,
          title and non-infringement.
        </p>
        <p>
          In particular, we do not warrant that the Service will be available, uninterrupted or error-free; that jobs
          will complete; that outputs will be accurate, lawful, suitable for your purpose or free of third-party rights;
          or, until the hardware attestation checks have been validated on live confidential-computing hardware, that
          private content will be kept confidential from the GPU operator that processes it. Standard content is not
          confidential from KunoWorld’s systems or the GPU provider.
        </p>
        <p>
          Some jurisdictions do not allow certain warranties to be excluded, so some of these exclusions may not apply to
          you.
        </p>
      </Section>

      <Section id="liability">
        <p>
          To the fullest extent permitted by law, KunoWorld and its affiliates, officers, employees and suppliers will not
          be liable for any indirect, incidental, special, consequential, exemplary or punitive damages, or for any loss
          of profits, revenue, data, goodwill or content, arising out of or relating to the Service or these Terms.
        </p>
        <p>
          To the fullest extent permitted by law, our total liability for all claims relating to the Service or these
          Terms is limited to <Ph k="liabilityCap" />.
        </p>
        <p>Nothing in these Terms limits liability that cannot be limited under applicable law.</p>
      </Section>

      <Section id="indemnity">
        <p>
          To the extent permitted by law, you will defend, indemnify and hold harmless KunoWorld and its affiliates,
          officers, employees and suppliers against claims, losses and expenses (including reasonable legal fees) arising
          from your inputs, your use of outputs, your breach of these Terms, or your violation of any law or third-party
          right.
        </p>
      </Section>

      <Section id="changes">
        <p>
          The Service is under active development and will change. We may update these Terms. When we do, we will post
          the new version on this page with a new effective date, and for material changes we will give{" "}
          <Ph k="noticePeriod" /> notice before they take effect. If you keep using the Service after changes take
          effect, you accept the updated Terms.
        </p>
      </Section>

      <Section id="law">
        <p>
          These Terms are governed by the laws of <Ph k="law" />, without regard to conflict-of-laws rules.
        </p>
        <p>
          Disputes arising from these Terms or the Service will be resolved by <Ph k="disputes" />.
        </p>
        <p>
          If you are a consumer, nothing in these Terms affects rights you have under the mandatory laws of the country
          where you live.
        </p>
      </Section>

      <Section id="contact">
        <p>
          <Ph k="company" />
          <br />
          <Ph k="address" />
        </p>
        <p>
          Questions about these Terms: <Ph k="legalEmail" />
          <br />
          Security reports: <a href="mailto:security@kunoworld.com">security@kunoworld.com</a>
          <br />
          Personal data: see our <a href="/privacy-policy">Privacy Policy</a>
        </p>
      </Section>
    </LegalDocument>
  );
}
