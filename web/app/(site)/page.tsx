import Link from "next/link";
import { ArrowLeftRight, ArrowUpRight, AudioLines, Clapperboard, Code2, Diamond, Fingerprint, Flag, ImagePlay, Images, KeyRound, Link2, LockKeyhole, MoveRight, Plus, RotateCcw, ScanLine, ShieldCheck, Type, WandSparkles, type LucideIcon } from "lucide-react";
import "@/app/home.css";
import { Reveal } from "@/components/site/motion";
import { CinematicHero } from "@/components/site/cinematic-hero";
import { ModelCarousel, ModeTabs, type ModelCardData, type ModeTabData } from "@/components/site/home-sections";
import { CATALOG, FAMILY_H3, FAMILY_LTX, stockFor } from "@/lib/catalog";
import { sampleNote } from "@/lib/reel";
import { heroReel, modeClips, modelClips } from "@/lib/showcase";
import { creationModes, homeFaq, homeModes, homeTools, modelStrengths, posts, type HomeTool } from "@/lib/site-content";

/** Director is SDK-only today, so its card and modes point to the docs rather than the studio. */
const SDK_ONLY = "h3-reference";

const VARIANT: Record<string, string> = { "ltx-2.5-fast": "Fast", "ltx-2.5-pro": "Pro", "ltx-2.5-4k": "4K", "h3-turbo": "H3 Turbo", h3: "H3", "h3-reference": "H3 Director" };
const TILE_NAME: Record<string, string> = { "ltx-2.5-fast": "LTX Fast", "ltx-2.5-pro": "LTX Pro", "ltx-2.5-4k": "LTX 4K", "h3-turbo": "H3 Turbo", h3: "H3", "h3-reference": "H3 Director" };

/** The profiles supporting any of these protocol modes, grouped by family: "LTX-2.5 Fast, Pro · MiniMax H3 Director". */
function modelsFor(modes: string[]): string {
  const supporting = CATALOG.filter((p) => p.modes.some((m) => modes.includes(m)));
  const names = (family: string) => supporting.filter((p) => p.family === family).map((p) => VARIANT[p.id] ?? p.name);
  const ltx = names(FAMILY_LTX);
  const h3 = names(FAMILY_H3);
  return [ltx.length ? `LTX-2.5 ${ltx.join(", ")}` : "", h3.length ? `MiniMax ${h3.join(", ")}` : ""].filter(Boolean).join(" · ");
}

/** The tile's small print: who offers the mode, and whether it's SDK-only. */
function tileMeta(tool: HomeTool): string | null {
  if (!tool.mode) return null;
  const supporting = CATALOG.filter((p) => p.modes.some((m) => m === tool.mode));
  if (supporting.length === 1 && supporting[0].id === SDK_ONLY) return "H3 Director · SDK";
  if (supporting.length <= 2) return supporting.map((p) => TILE_NAME[p.id] ?? p.name).join(" · ");
  return `${supporting.length} models`;
}

const TOOL_ICONS: Record<string, LucideIcon> = { text: Type, image: ImagePlay, last: Flag, "first-last": ArrowLeftRight, keyframes: Diamond, retake: RotateCcw, storyboard: Clapperboard, audio: AudioLines, reference: Images, edit: WandSparkles, extend: MoveRight, privacy: LockKeyhole, share: Link2, keys: KeyRound, verify: ShieldCheck, sdk: Code2 };

function ToolTile({ tool }: { tool: HomeTool }) {
  const Icon = TOOL_ICONS[tool.id] ?? ArrowUpRight;
  const meta = tileMeta(tool);
  return (
    <li>
      <a className="tool-tile" href={tool.href}>
        <span className="tool-icon"><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></span>
        <span className="tool-name">{tool.title}</span>
        <span className="tool-copy">{tool.copy}</span>
        {meta && <span className="tool-meta">{meta}</span>}
        <ArrowUpRight className="tool-arrow" size={16} aria-hidden="true" />
      </a>
    </li>
  );
}

export default function Landing(){
 const cards: ModelCardData[] = modelStrengths.flatMap(({ id, strength }) => {
  const profile = CATALOG.find((p) => p.id === id);
  if (!profile) return [];
  const sdkOnly = id === SDK_ONLY;
  return [{ id, strength, sdkOnly, family: stockFor(profile).brand, name: profile.name, maxDuration: `${profile.limits.max_duration_s} s`, resolutions: Object.keys(profile.limits.sizes).join(" · "), href: sdkOnly ? "/docs#creation-modes" : `/studio?model=${id}`, cta: sdkOnly ? "See the SDK guide" : "Try it", clip: modelClips[id] }];
 });
 const modes: ModeTabData[] = creationModes.map(({ modes: protocolModes, ...mode }) => ({ ...mode, models: modelsFor(protocolModes), clip: modeClips[mode.id] }));
 const footage = sampleNote([...heroReel, ...Object.values(modelClips), ...Object.values(modeClips)]);
 return <>
<CinematicHero/>

<section id="models" className="home-block models-section" aria-labelledby="models-title">
 <ModelCarousel cards={cards} heading={{ id: "models-title", kicker: "01 / THE MODELS", title: "The right model", accent: "for every shot.", lead: "Two open-weight families, from quick drafts to 4K finals and scenes directed from your own references." }}/>
 <div className="home-notes">
  <p><strong>MiniMax H3</strong> is used under the MiniMax H3 Community License and isn’t available in every region. Where it isn’t, a compatible LTX-2.5 profile may run instead, and the studio shows which. <a href="/docs#model-routing">How routing works</a></p>
  <p>{footage} <a href="/showcase">More in the screening room</a></p>
 </div>
</section>

<section id="creation-modes" className="home-block modes-section" aria-labelledby="modes-title">
 <div className="home-head"><div><span className="section-kicker">02 / WAYS TO CREATE</span><h2 id="modes-title">Begin with a sentence.<br/><em>Or a single frame.</em></h2></div><a className="text-link" href="/docs#creation-modes">Read about creation modes <ArrowUpRight size={17}/></a></div>
 <ModeTabs modes={modes}/>
</section>

<section className="home-block tools-section" aria-labelledby="tools-title">
 <div className="home-head"><div><span className="section-kicker">03 / EVERY TOOL</span><h2 id="tools-title">Every mode.<br/><em>Every tool.</em></h2></div><p className="home-head-aside">{homeModes.length} creation modes across {CATALOG.length} models, plus the tools that keep your work private, shareable and verifiable.</p></div>
 <div className="tool-group"><h3 className="tool-group-title">Creation modes</h3><ul className="tool-grid">{homeModes.map((tool) => <ToolTile key={tool.id} tool={tool}/>)}</ul></div>
 <div className="tool-group"><h3 className="tool-group-title">Platform tools</h3><ul className="tool-grid tool-grid-tools">{homeTools.map((tool) => <ToolTile key={tool.id} tool={tool}/>)}</ul></div>
</section>

<section className="privacy-section"><Reveal className="privacy-title"><span className="section-kicker">04 / YOUR WORLD BELONGS TO YOU</span><h2>Create freely.<br/><em>Know the journey.</em></h2><p>Private creation and verifiable origins are at the heart of KunoWorld’s protocol.</p><a href="/privacy" className="text-link">How privacy works <ArrowUpRight size={17}/></a></Reveal><div className="privacy-features">{[{icon:LockKeyhole,title:"Private from the first word.",copy:"The SDK encrypts prompts and reference media on your device before sending them to the gateway."},{icon:Fingerprint,title:"An origin you can inspect.",copy:"Every completed protocol job returns a signed receipt, checked against the video by your SDK."},{icon:ScanLine,title:"Built to be verifiable.",copy:"Worker identity and evidence are bound to the generation. Hardware verification remains in development."}].map(c=><Reveal className="privacy-feature" key={c.title}><c.icon size={24} strokeWidth={1.3}/><div><h3>{c.title}</h3><p>{c.copy}</p></div></Reveal>)}</div><p className="privacy-status">Development preview · Real GPU inference and production hardware attestation are still being completed. <a href="/docs#project-status">Read project status <ArrowUpRight size={12}/></a></p></section>
<section className="developer-band"><div><span className="section-kicker">FOR THE BUILDERS OF NEW WORLDS</span><h2>Your vision.<br/>Your application.<br/><em>Our video protocol.</em></h2><p>Bring encrypted video creation into the tools you’re building, with JavaScript and Python SDKs.</p><div className="button-row"><a href="/developers" className="ocean-button button-dark">Build with KunoWorld <ArrowUpRight size={17}/></a><a href="/api" className="text-link">Explore the API <ArrowUpRight size={15}/></a></div></div><div className="landing-code"><div><span/><span/><span/><p>your-next-world.ts</p></div><pre><span className="code-muted">{'// A little code. A world of possibility.'}</span>{'\n\n'}<span className="code-lilac">const</span>{' job = '}<span className="code-lilac">await</span>{' kuno.submit({\n  '}<span className="code-mint">prompt</span>{': '}<span className="code-sand">{'"A city unfolding from a sheet of paper."'}</span>{',\n  '}<span className="code-mint">model</span>{': '}<span className="code-sand">{'"ltx-2.5-fast"'}</span>{',\n  durationS: 5,\n});\n\n'}<span className="code-lilac">const</span>{' { video, receipt } =\n  '}<span className="code-lilac">await</span>{' kuno.wait(job);'}</pre><a href="/docs#quickstart">Start with the complete example <ArrowUpRight size={14}/></a></div></section>
<section className="section-pad journal-section"><Reveal className="section-intro"><span className="section-kicker">THE KUNOWORLD JOURNAL</span><div><h2>Notes from<br/><em>the imagination.</em></h2></div><Link href="/blog" className="text-link">All stories <ArrowUpRight size={17}/></Link></Reveal><div className="journal-grid">{posts.slice(0,3).map(p=><a href={`/blog/${p.slug}`} className="journal-card" key={p.slug}><div className="journal-image"><img src={p.image} alt="" loading="lazy"/><ArrowUpRight size={20}/></div><span>{p.category} <i>•</i> {p.read}</span><h3>{p.title}</h3></a>)}</div></section>

<section id="faq" className="home-block faq-section" aria-labelledby="faq-title">
 <div className="faq-intro"><span className="section-kicker">QUESTIONS, ANSWERED</span><h2 id="faq-title">Good to know<br/><em>before you begin.</em></h2><p>The documentation goes deeper on privacy modes, models and the SDKs.</p><a className="text-link" href="/docs">Read the docs <ArrowUpRight size={17}/></a></div>
 <div className="faq-list">{homeFaq.map((item) => <details key={item.q} className="faq-item"><summary><span>{item.q}</span><Plus size={18} aria-hidden="true"/></summary><div className="faq-answer"><p>{item.a}</p>{item.link && <a href={item.link.href}>{item.link.label} <ArrowUpRight size={14}/></a>}</div></details>)}</div>
</section>

<section className="final-horizon"><img src="/media/prism-bloom.webp" alt="Prismatic light refracting through a sculptural glass flower" loading="lazy"/><div/><span>THE NEXT FRAME IS YOURS.</span><h2>Go on.<br/><em>Make a world.</em></h2><a href="/studio" className="ocean-button button-white">Start creating <ArrowUpRight size={18}/></a></section>
</>}
