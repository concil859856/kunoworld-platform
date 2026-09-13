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
  { id: "accounts", title: "Eligibility and accounts" },
  { id: "keys", title: "API keys and saved film keys" },
  { id: "credit", title: "Credit, pricing and refunds" },
  { id: "crypto-payments", title: "Cryptocurrency payments", review: true },
  { id: "acceptable-use", title: "Acceptable use and prohibited content" },
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
  minimumAge: { label: "[MINIMUM AGE]", note: "minimum age to use the Service." },
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
      drafted="13 September 2026"
      sections={SECTIONS}
      placeholders={Object.values(PH)}
      summary={
        <>
          <p>
            KunoWorld is a development preview. Outputs may be placeholder video, the service may be unavailable, and
            the hardware protection meant to stop GPU operators from reading your content is not in place yet.
          </p>
          <p>
            You pay with prepaid credit. A job’s price is held when you submit it and refunded automatically if the job
            fails, is canceled or times out. Cryptocurrency payments cannot be reversed.
          </p>
          <p>
            Keep your API keys and your browser’s saved takes safe, don’t use the service for abusive or illegal
            content, and remember that a video’s receipt is public to anyone who has the file.
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
          <li>Models, features, limits and prices may change, and parts of the Service may be withdrawn.</li>
          <li>
            The Service may be slow, interrupted or unavailable, and jobs may fail. We make no commitment to any level
            of availability.
          </li>
          <li>
            The Service is designed to run jobs inside Intel TDX and NVIDIA confidential-computing enclaves so that GPU
            operators cannot read your content. <strong>That protection is not in place yet</strong>: hardware
            attestation verification has not been implemented. Do not submit prompts or reference media that you are not
            prepared to have exposed to the operator that processes them.
          </li>
        </ul>
      </Section>

      <Section id="accounts">
        <p>
          To use the Service you must be at least <Ph k="minimumAge" /> and legally able to enter into these Terms.
        </p>
        <p>
          You sign in with a link sent to your email address. Use an email address you control and keep it secure:
          anyone who can read your inbox can sign in to your account. After you sign in, the website keeps you signed in
          with a session cookie.
        </p>
        <p>
          You are responsible for activity on your account, including jobs submitted and credit spent through your
          sessions or API keys.
        </p>
      </Section>

      <Section id="keys">
        <p>
          You can create several API keys for your account and revoke any of them. We store only a SHA-256 hash of each
          key, so we cannot show you a key again or recover a lost one. Create a new key and revoke the old one instead.
        </p>
        <p>
          Anyone holding a valid API key can submit jobs that spend your credit. Keep your keys secret, do not publish
          them or embed them where others can read them, and revoke any key you think has been exposed.
        </p>
        <p>
          The studio saves each take in your browser’s local storage: the prompt, its settings and the key that decrypts
          the finished film. Anyone who can use that browser profile can open those films. Keep your device and browser
          profile secure, and use <strong>Forget all</strong> in the studio to remove saved takes. The gateway stores
          only encrypted results and cannot decrypt them for you, so a film whose key is lost cannot be recovered.
        </p>
        <p>
          Encrypted results are deleted from the gateway after 7 days by default. Download and decrypt any film you want
          to keep before then.
        </p>
        <p>
          If you believe your account or keys have been compromised, revoke the affected keys and contact{" "}
          <a href="mailto:security@kunoworld.com">security@kunoworld.com</a>.
        </p>
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
          Prices shown on the website are estimates for the preview and may change. The price of a job is set when you
          submit it, and that amount is held from your credit balance at submission.
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
        <p>You must not use the Service to create, upload, request or distribute:</p>
        <ul>
          <li>
            <strong>Child sexual abuse material</strong>, or any content that sexualizes minors, whether real, drawn or
            synthetic.
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
          <li>accessing another person’s account, sessions or API keys; or</li>
          <li>interfering with, overloading or disrupting the Service, its GPU operators or its validators.</li>
        </ul>
        <p>
          Your prompts and reference media are encrypted on your device, so the gateway cannot read them. That does not
          change your responsibility for what you submit and how you use the results.
        </p>
        <p>
          If you find a security vulnerability, report it to{" "}
          <a href="mailto:security@kunoworld.com">security@kunoworld.com</a> rather than exploiting it. Report other
          misuse of the Service to <Ph k="abuseEmail" />.
        </p>
        <ReviewNote>
          Decide how apparent child sexual abuse material and other unlawful content will be reported to authorities,
          and what moderation is possible when content is encrypted before it reaches the gateway.
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
          operators that process your jobs, to store, transmit and process them as needed to provide the Service.
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
          <strong>Receipts are public by hash.</strong> Anyone who has the video file, or its hash, can look up its
          receipt, for example on our <a href="/verify">verification page</a>. A receipt never contains your prompt or
          reference media.
        </p>
        <p>
          Metadata about finished jobs, and their receipts, are also made available to the network’s validators, who
          use them to score GPU operators.
        </p>
        <p>
          A receipt shows that a worker holding a particular key signed a particular file. It does not show that the
          events depicted are real, and it will not match a copy that has been edited or re-encoded. While hardware
          attestation verification is not implemented, a receipt also does not prove that the job ran inside verified
          confidential-computing hardware.
        </p>
      </Section>

      <Section id="third-parties">
        <p>
          GPU operators and validators are independent participants in a Bittensor subnet. They are not our employees
          or agents, and we do not control their hardware or facilities.
        </p>
        <p>
          The Service also relies on third-party providers, including Stripe for card payments,{" "}
          <Ph k="emailProvider" /> for sign-in emails, and Cloudflare for network services. Their own terms may apply
          when you use features they provide.
        </p>
      </Section>

      <Section id="termination">
        <p>
          You can stop using the Service at any time and revoke your API keys. To ask us to close your account, contact{" "}
          <Ph k="legalEmail" />.
        </p>
        <p>
          We may suspend or end your access, revoke API keys, or cancel or refuse jobs if we reasonably believe you have
          breached these Terms, if the law requires it, or if it is needed to protect the Service, its users, GPU
          operators or others. We may also end the preview or discontinue the Service.
        </p>
        <p>
          What happens to unused credit when an account is closed, suspended or terminated: <Ph k="refund" />.
        </p>
        <p>
          The sections on credit, cryptocurrency payments, acceptable use, inputs and outputs, provenance receipts,
          disclaimers, limitation of liability, indemnity and governing law continue to apply after your access ends.
        </p>
        <ReviewNote>
          Decide what notice, explanation and appeal route, if any, will be given for suspensions and terminations.
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
          or, while hardware attestation is not implemented, that your content will be kept confidential from the GPU
          operator that processes it.
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
