import Link from "next/link";
import type { Metadata } from "next";
import { ArrowDown, ArrowUpRight, Aperture, Clapperboard, Layers3, MoveUpRight, Smartphone, Sparkles } from "lucide-react";
import { AmbientVideo, Reveal } from "@/components/site/motion";
import { originalFilms } from "@/lib/showcase";
import { sampleNote } from "@/lib/reel";
import "@/app/use-cases.css";

export const metadata: Metadata = {
  title: "Use cases — KunoWorld",
  description: "Explore creative directions for AI video: product films, cinematic worlds, vertical stories, and motion built from reference frames.",
};

const directions = [
  { id: "product", number: "01", label: "Product & advertising", icon: Aperture },
  { id: "cinema", number: "02", label: "Cinematic worlds", icon: Clapperboard },
  { id: "social", number: "03", label: "Social & editorial", icon: Smartphone },
  { id: "reference", number: "04", label: "Reference to motion", icon: Layers3 },
];

export default function UseCasesPage() {
  return (
    <div className="use-cases-page">
      <header className="cases-hero">
        <Reveal className="cases-hero-copy">
          <span className="section-kicker">A TOOL FOR EVERY KIND OF IMAGINATION</span>
          <h1>One idea.<br />A thousand<br /><em>directions.</em></h1>
          <p>A product with a story. A world that doesn’t exist. A moment that makes you stop scrolling. Give your next idea a moving image.</p>
          <a href="/studio" className="ocean-button button-dark">Find your first frame <ArrowUpRight size={17} /></a>
          <a href="#creative-directions" className="cases-explore"><ArrowDown size={14} /> Explore the possibilities</a>
        </Reveal>
        <Reveal className="cases-hero-board">
          <div className="cases-board-main">
            <img src="/media/neon-city.webp" alt="A cinematic city scene illuminated by neon light" />
            <span className="cases-frame-label">SCENE 01 / ANOTHER WORLD</span>
            <span className="cases-board-cross" aria-hidden="true">+</span>
          </div>
          <div className="cases-board-detail">
            <img src="/media/chrome-runner.webp" alt="A sculptural chrome running shoe in a product study" />
            <span>AN OBJECT. A NEW PERSPECTIVE.</span>
          </div>
          <div className="cases-board-caption"><span>THE CREATIVE DIRECTION IS YOURS.</span><MoveUpRight size={19} strokeWidth={1.2} /></div>
        </Reveal>
      </header>

      <nav className="cases-direction-nav" id="creative-directions" aria-label="Explore video use cases">
        {directions.map(({ id, number, label, icon: Icon }) => (
          <a href={`#${id}`} key={id}><span>{number}</span><Icon size={19} strokeWidth={1.25} /><strong>{label}</strong><ArrowDown size={14} /></a>
        ))}
      </nav>

      <section className="cases-section cases-product" id="product" aria-labelledby="product-heading">
        <Reveal className="cases-media-wrap">
          <div className="cases-media cases-product-media">
            <AmbientVideo src="/media/chrome-runner-seedance.mp4" poster="/media/chrome-runner-seedance-poster.webp" label="Pause product study video" />
            <span className="cases-frame-label">PRODUCT STUDY / CHROME RUNNER</span>
          </div>
          <div className="cases-media-caption"><span>Light. Texture. A different point of view.</span><span>01 / 04</span></div>
        </Reveal>
        <Reveal className="cases-copy">
          <span className="section-kicker">01 / PRODUCT & ADVERTISING</span>
          <h2 id="product-heading">Give an object<br /><em>a starring role.</em></h2>
          <p>Explore the look of a launch film before committing to a shoot. Try a suspended sneaker, a perfume bottle in shifting light, or a slow reveal of an everyday object.</p>
          <ul className="cases-points">
            <li>Use a product image to establish the opening frame.</li>
            <li>Explore lighting, materials, and camera movement in separate takes.</li>
            <li>Build individual shots to bring into your own edit.</li>
          </ul>
          <div className="cases-prompt"><span>A DIRECTION TO TRY</span><p>“A chrome running shoe suspended above dark water. A gentle quarter-orbit catches shifting reflections across its surface. One soft overhead light.”</p></div>
          <div className="cases-specs"><span>LTX-2.5 PRO</span><span>TEXT OR IMAGE TO VIDEO</span></div>
          <a href="/studio?scene=chrome-runner&model=ltx-2.5-pro" className="text-link">Explore a product film <ArrowUpRight size={17} /></a>
        </Reveal>
      </section>

      <section className="cases-cinema" id="cinema" aria-labelledby="cinema-heading">
        <div className="cases-cinema-top">
          <Reveal><span className="section-kicker">02 / CINEMATIC WORLDS</span><h2 id="cinema-heading">Scout a location<br /><em>that only exists in your head.</em></h2></Reveal>
          <Reveal><p>Set the mood for a film, pitch a visual direction, or explore an opening shot. Start with a place, a time of day, and one deliberate camera move.</p><a href="/studio?scene=neon-city&model=h3" className="text-link">Build your establishing shot <ArrowUpRight size={17} /></a></Reveal>
        </div>
        <Reveal className="cases-cinema-film">
          <AmbientVideo src="/media/neon-city-seedance.mp4" poster="/media/neon-city-seedance-poster.webp" label="Pause cinematic city video" />
          <span className="cases-frame-label">WORLD STUDY / AFTER THE RAIN</span>
          <div className="cases-cinema-film-title"><span>A PLACE YOU HAVEN’T BEEN. YET.</span><p>Somewhere<br /><em>after midnight.</em></p></div>
        </Reveal>
        <div className="cases-cinema-notes">
          <div><span>THE WORLD</span><p>A neon city after the rain. Empty streets, wet pavement, a little mystery.</p></div>
          <div><span>THE CAMERA</span><p>A slow forward glide at street level. Give the viewer time to discover the scene.</p></div>
          <div><span>THE STARTING POINT</span><p>Try MiniMax H3 for a short scene, or LTX-2.5 Pro to explore guidance and negative prompts.</p></div>
        </div>
      </section>

      <section className="cases-section cases-social" id="social" aria-labelledby="social-heading">
        <Reveal className="cases-copy">
          <span className="section-kicker">03 / SOCIAL & EDITORIAL</span>
          <h2 id="social-heading">Make a little<br /><em>room for the unexpected.</em></h2>
          <p>Think in moments, not a whole campaign at once. A striking silhouette. Fabric caught in motion. An impossible detail that earns a second look.</p>
          <ul className="cases-points">
            <li>Choose a 9:16 frame for a vertical composition.</li>
            <li>Keep one subject and one movement at the center.</li>
            <li>Explore short variations before assembling your story.</li>
          </ul>
          <div className="cases-prompt"><span>A DIRECTION TO TRY</span><p>“A sculptural fashion portrait. Architectural folds of fabric move softly in the breeze. A still camera, warm directional light, an uncluttered background.”</p></div>
          <div className="cases-specs"><span>LTX-2.5 FAST</span><span>VERTICAL COMPOSITION</span></div>
          <a href="/studio?scene=sculptural-fashion&model=ltx-2.5-fast&aspect=9:16" className="text-link">Start a visual story <ArrowUpRight size={17} /></a>
        </Reveal>
        <Reveal className="cases-social-board">
          <div className="cases-social-note"><span>MAKE THE<br />SCROLL<br /><em>pause.</em></span><Sparkles size={23} strokeWidth={1.1} /></div>
          <div className="cases-social-frame">
            <AmbientVideo src="/media/sculptural-fashion-wan.mp4" poster="/media/sculptural-fashion-wan-poster.webp" label="Pause fashion study video" />
            <span className="cases-frame-label">MOTION / EDITORIAL</span>
          </div>
          <div className="cases-social-format"><span>9:16</span><p>A different frame.<br />A whole new feeling.</p></div>
        </Reveal>
      </section>

      <section className="cases-section cases-reference" id="reference" aria-labelledby="reference-heading">
        <Reveal className="cases-media-wrap">
          <div className="cases-media cases-reference-media"><AmbientVideo src="/media/astronaut-garden-seedance.mp4" poster="/media/astronaut-garden-seedance-poster.webp" label="Pause astronaut garden video" /><span className="cases-frame-label">IMAGINATION STUDY / A QUIET DISCOVERY</span></div>
          <div className="cases-reference-strip"><img src="/media/astronaut-garden.webp" alt="Still frame of an astronaut exploring a garden" loading="lazy" /><div><span>YOUR STARTING FRAME</span><p>Keep the composition.<br />Imagine what happens next.</p></div><ArrowUpRight size={21} strokeWidth={1.25} /></div>
        </Reveal>
        <Reveal className="cases-copy">
          <span className="section-kicker">04 / REFERENCE TO MOTION</span>
          <h2 id="reference-heading">The image is<br /><em>only the beginning.</em></h2>
          <p>Bring a concept frame, an illustration, or a photograph you have the rights to use. Describe the movement and atmosphere you want to explore from that starting point.</p>
          <ul className="cases-points">
            <li>Use image to video to begin with your own composition.</li>
            <li>Choose Frames in the studio to supply a first and last image.</li>
            <li>Explore multiple references and editing modes through the SDK.</li>
          </ul>
          <div className="cases-prompt"><span>A DIRECTION TO TRY</span><p>“An astronaut pauses in an overgrown greenhouse. Leaves stir gently as the camera moves closer. Soft light filters through the glass above.”</p></div>
          <a href="/studio?mode=image_to_video&model=ltx-2.5-pro" className="text-link">Bring your starting image <ArrowUpRight size={17} /></a>
          <a href="/docs#creation-modes" className="cases-secondary-link">Read about reference workflows <ArrowUpRight size={13} /></a>
        </Reveal>
      </section>

      <section className="cases-workflow" aria-labelledby="workflow-heading">
        <Reveal className="cases-workflow-heading"><span className="section-kicker">FROM CREATIVE DIRECTION TO FIRST TAKE</span><h2 id="workflow-heading">A little intention.<br /><em>A better starting point.</em></h2><p>Whatever you’re making, give each shot one clear job.</p></Reveal>
        <div className="cases-workflow-grid">
          <Reveal><span className="cases-step">01 / FRAME THE IDEA</span><h3>Start with a single shot.</h3><p>Choose your subject, action, camera move, and light. Keep the first experiment simple enough to learn from.</p><Link href="/blog/directing-the-impossible" className="text-link">Find your direction <ArrowUpRight size={15} /></Link></Reveal>
          <Reveal><span className="cases-step">02 / CHOOSE YOUR TOOLS</span><h3>Match the model to the moment.</h3><p>Compare durations, aspect ratios, and creation modes. Select the controls that matter to your scene.</p><a href="/models" className="text-link">Explore the model catalog <ArrowUpRight size={15} /></a></Reveal>
          <Reveal><span className="cases-step">03 / SIGN IN AND CREATE</span><h3>Sign in with your email.</h3><p>Open the studio signed in, choose Private or Standard, and generate. Building your own app instead? Create an API key on your account page.</p><a href="/docs#studio" className="text-link">Get your workflow ready <ArrowUpRight size={15} /></a></Reveal>
        </div>
        <p className="cases-preview-note">{sampleNote(originalFilms)} KunoWorld is a development preview; production GPU serving is still being built. <a href="/docs#project-status">See project status <ArrowUpRight size={12} /></a></p>
      </section>

      <section className="cases-finale"><span className="section-kicker">THE NEXT DIRECTION IS YOURS</span><h2>What will you<br /><em>make of it?</em></h2><a href="/studio" className="ocean-button button-dark">Open the studio <ArrowUpRight size={18} /></a></section>
    </div>
  );
}
