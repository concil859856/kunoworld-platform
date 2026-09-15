import type { ClipSource } from "./reel";

export type Film = {
  id: string; title: string; category: string; label: string; poster: string;
  image: string; video: string; prompt: string; aspect: "16:9" | "9:16";
  color: string; description: string;
  /** Who really rendered the film. Labelled through lib/reel.ts like every other sample. */
  source: ClipSource; model?: string; provider?: string;
};

const VEO = { source: "veo-reference", model: "google/veo-3.1", provider: "openrouter" } as const;
const WAN = { source: "wan-reference", model: "alibaba/wan-3.0", provider: "openrouter" } as const;
const SEEDANCE = { source: "seedance-reference", model: "bytedance/seedance-2.0", provider: "openrouter" } as const;
/** The same open weights the network serves, run through OpenRouter: still not made on the network. */
const H3 = { source: "h3-reference", model: "minimax/hailuo-3", provider: "openrouter" } as const;

/**
 * Site footage, one slot per clip: no clip appears in two places. The screening room (/showcase)
 * shows `showcaseFilms`; the homepage shows `heroReel`, `modelClips` and `modeClips`; /use-cases
 * plays the four `originalFilms`. The older Veo studies stay as data only so Studio links
 * (`/studio?scene=…`) and the spatial scene keep resolving their prompts.
 */

/** The screening room and the Studio's inspiration grid. */
export const showcaseFilms: Film[] = [
  { ...WAN, id:"fpv-canyon", title:"Into the canyon", category:"Action", label:"FPV IN MOTION", poster:"/media/fpv-canyon-poster.webp", image:"/media/fpv-canyon.webp", video:"/media/fpv-canyon.mp4", aspect:"16:9", color:"#b4552f", description:"A cliff edge, a slot canyon, a river inches below. One breathless dive.", prompt:"FPV racing drone footage, extremely fast. The drone dives off a cliff edge, plunges down a red sandstone canyon wall, skims inches above a winding river, threads through a narrow slot canyon and bursts out into blinding sunlight over a desert valley. Ultra-wide lens, rolling banked turns, strong motion blur." },
  { ...SEEDANCE, id:"noir-rooftop-chase", title:"The last rooftop", category:"Cinema", label:"FILM NOIR", poster:"/media/noir-rooftop-chase-poster.webp", image:"/media/noir-rooftop-chase.webp", video:"/media/noir-rooftop-chase.mp4", aspect:"16:9", color:"#5e6166", description:"Rain, a fedora and a gap between buildings. Black and white, all the way down.", prompt:"1940s black-and-white film noir. A detective in a trench coat and fedora chases a shadowy figure across rain-slick rooftops at night, leaps a gap, skids on wet tiles and catches a drainpipe. Hard low-key light, deep shadows, pouring rain, grainy 35mm film." },
  { ...WAN, id:"claymation-kitchen", title:"Breakfast rush", category:"Animation", label:"STOP-MOTION CLAY", poster:"/media/claymation-kitchen-poster.webp", image:"/media/claymation-kitchen.webp", video:"/media/claymation-kitchen.mp4", aspect:"16:9", color:"#d9803a", description:"Pancakes, a toaster with ambitions and a chef in over his head.", prompt:"Stop-motion claymation, visible fingerprints in the clay. A frantic clay chef flips pancakes that fly up, spin and splat onto a stack of plates in a chain reaction while pots boil over and a toaster fires toast across the tiny kitchen. Bright colours, handcrafted miniature set, snappy fast comedic timing." },
  { ...WAN, id:"watercolor-horses", title:"Wild horses in wet paint", category:"Art & motion", label:"PAINT IN MOTION", poster:"/media/watercolor-horses-poster.webp", image:"/media/watercolor-horses.webp", video:"/media/watercolor-horses.mp4", aspect:"16:9", color:"#b86a3c", description:"A herd at full gallop, dissolving into pigment with every stride.", prompt:"Loose watercolor painting in motion on textured paper. A herd of wild horses gallops across a misty plain, manes and dust dissolving into splashes of wet pigment, colours bleeding together with every stride. The camera tracks alongside at full speed, paper grain visible." },
  { ...SEEDANCE, id:"comic-hero", title:"Panel to panel", category:"Animation", label:"COMIC BOOK", poster:"/media/comic-hero-poster.webp", image:"/media/comic-hero.webp", video:"/media/comic-hero.mp4", aspect:"16:9", color:"#3f8a4a", description:"A brick wall, a clanking robot and a hero who won't wait for the next page.", prompt:"Comic book animation with halftone dots and thick ink lines. A masked hero in a green suit bursts through a brick wall, punches a clanking robot whose bolts fly apart, then leaps toward the camera as the frame shatters like comic panels. Bold primary colours, speed lines, dynamic angles." },
  { ...WAN, id:"roller-skate-70s", title:"Summer, 1976", category:"Retro", label:"VINTAGE FILM", poster:"/media/roller-skate-70s-poster.webp", image:"/media/roller-skate-70s.webp", video:"/media/roller-skate-70s.mp4", aspect:"16:9", color:"#c9824a", description:"Bell-bottoms, a steep street and a camera hanging out of a car window.", prompt:"Faded 1970s 16mm film. A young woman in a tie-dye t-shirt, bell-bottom jeans, roller skates and big sunglasses bombs down a steep sunny hill, carving between vintage cars, hair flying, laughing. Low tracking shot from a moving car window, light leaks, warm grain, slight gate weave." },
  { ...WAN, id:"origami-dragon", title:"The paper dragon", category:"Animation", label:"PAPERCRAFT", poster:"/media/origami-dragon-poster.webp", image:"/media/origami-dragon.webp", video:"/media/origami-dragon.mp4", aspect:"16:9", color:"#b8413a", description:"One sheet of red paper, a cardboard skyline and a storm of confetti.", prompt:"Papercraft stop-motion. A red origami dragon unfolds itself from a flat sheet, then flies fast through a city of layered cardboard buildings, paper wings flapping, scattering clouds of confetti. Soft studio light, visible folds and paper fibres, playful handmade motion." },
];

/** Played on /use-cases, and linked from there into the Studio. Not shown in the screening room. */
export const originalFilms: Film[] = [
  { ...VEO, id:"neon-city", title:"After the last train", category:"Cinema", label:"CINEMATIC STORYTELLING", poster:"/media/neon-city-poster.webp", image:"/media/neon-city.webp", video:"/media/neon-city.mp4", aspect:"16:9", color:"#b43a55", description:"Rain on the pavement. A city that never quite sleeps. One shot with a story to tell.", prompt:"A solitary woman in a dark coat walks away beneath a translucent umbrella on a rain-soaked futuristic city street. Crimson neon reflects in wet asphalt. A slow forward dolly follows her through fine rain and rising steam. Anamorphic cinematography, deep sapphire shadows, realistic architecture, one uninterrupted shot." },
  { ...VEO, id:"chrome-runner", title:"Designed to defy gravity", category:"Product", label:"PRODUCT IN MOTION", poster:"/media/chrome-runner-poster.webp", image:"/media/chrome-runner.webp", video:"/media/chrome-runner.mp4", aspect:"16:9", color:"#b58459", description:"A new angle on a familiar object. Light, texture, and a little impossibility.", prompt:"A single unbranded futuristic running shoe with satin silver panels, ivory mesh, and a vermilion sole floats above a polished black plinth. The shoe rotates slowly while an amber studio highlight travels across its surface. Subtle camera push, consistent product shape, luxury advertising cinematography." },
  { ...VEO, id:"astronaut-garden", title:"Life on the other side", category:"Worlds", label:"IMAGINED WORLDS", poster:"/media/astronaut-garden-poster.webp", image:"/media/astronaut-garden.webp", video:"/media/astronaut-garden.mp4", aspect:"16:9", color:"#67774c", description:"Somewhere between a distant planet and a place you almost remember.", prompt:"An astronaut stands inside a vast abandoned circular greenhouse on another planet. Lush ferns and small amber flowers fill the space. Beyond a monumental round opening, a ringed planet hangs in a pale blue sky. A gentle lateral camera glide, warm sunlight, drifting dust, delicate movement in the leaves, cinematic realism." },
  { ...VEO, id:"sculptural-fashion", title:"A moment, in vermilion", category:"Fashion", label:"VERTICAL STORIES", poster:"/media/sculptural-fashion-poster.webp", image:"/media/sculptural-fashion.webp", video:"/media/sculptural-fashion.mp4", aspect:"9:16", color:"#aa4036", description:"A sculptural silhouette. A single turn. A frame made for the small screen.", prompt:"An adult fashion model with short dark hair wears an architectural vermilion pleated gown beside a curved concrete wall and pale limestone steps. Cobalt blue sky, strong afternoon light. She makes a slow graceful half-turn as fabric moves in the breeze. A subtle camera push, stable geometry, full-length vertical composition." },
];

/** Earlier studies whose stills illustrate other pages; kept so their Studio prompts still resolve. */
export const creativeFilms: Film[] = [
  { ...VEO, id:"lantern-library", title:"A thousand unwritten worlds", category:"Worlds", label:"IMPOSSIBLE ARCHITECTURE", poster:"/media/lantern-library-poster.webp", image:"/media/lantern-library.webp", video:"/media/lantern-library.mp4", aspect:"16:9", color:"#9a613d", description:"A spiral of stories. A sky of lanterns. An invitation to get a little lost.", prompt:"A monumental circular library with spiraling walnut bookshelves and suspended staircases. Hundreds of glowing paper lanterns float through the immense hall. A tiny reader in a red coat gives scale. The camera glides slowly forward through warm amber light and drifting dust. Magical realism, coherent architecture, one uninterrupted shot." },
  { ...VEO, id:"paper-metropolis", title:"A city, folded into being", category:"Animation", label:"HANDCRAFTED WORLDS", poster:"/media/paper-metropolis-poster.webp", image:"/media/paper-metropolis.webp", video:"/media/paper-metropolis.mp4", aspect:"16:9", color:"#bc7c5c", description:"Paper, patience, and a small red tram. A whole city in a single fold.", prompt:"An intricate miniature city made from folded coral, butter yellow, mint and ivory paper. A tower slowly opens its accordion facade as a tiny red paper tram moves along its track. A gentle lateral camera slide reveals tactile folds and delicate bridges. Soft studio light, stop-motion character, consistent surrounding buildings." },
  { ...VEO, id:"ember-stag", title:"The forest holds its breath", category:"Cinema", label:"CINEMATIC FANTASY", poster:"/media/ember-stag-poster.webp", image:"/media/ember-stag.webp", video:"/media/ember-stag.mp4", aspect:"16:9", color:"#9a6c41", description:"A still clearing. A quiet encounter. A little magic between the trees.", prompt:"A majestic red deer stag stands in a dark old-growth forest, illuminated by a shaft of copper light. Warm firefly-like particles drift through gentle ground fog. The stag slowly turns its head and exhales a faint breath. A very slow camera push, realistic fur and anatomy, stable antlers, atmospheric cinema." },
  { ...VEO, id:"prism-bloom", title:"Light learns to bloom", category:"Art & motion", label:"MATERIAL EXPLORATIONS", poster:"/media/prism-bloom-poster.webp", image:"/media/prism-bloom.webp", video:"/media/prism-bloom.mp4", aspect:"9:16", color:"#8c629e", description:"A flower made of glass. A passing light. Color that feels almost alive.", prompt:"A single iridescent blown-glass flower floats upright against a deep plum-black studio background. Its delicate translucent petals refract pink, violet, cyan and gold. The flower rotates slowly by fifteen degrees while a narrow studio light travels across its surface. Physical glass optics, coherent petals, vertical macro framing." },
  { ...VEO, id:"kinetic-orbit", title:"Balance, beautifully impossible", category:"Art & motion", label:"KINETIC DESIGN", poster:"/media/kinetic-orbit-poster.webp", image:"/media/kinetic-orbit.webp", video:"/media/kinetic-orbit.mp4", aspect:"16:9", color:"#a96b51", description:"Copper in orbit. Geometry with a pulse. A study in controlled impossibility.", prompt:"Three polished copper elliptical bands float around a matte ivory sphere above a low black stone plinth in a dark gallery. The bands rotate independently at a slow mechanical pace while the sphere remains stationary. Controlled warm reflections, consistent geometry, restrained museum lighting and an almost imperceptible camera push." },
];

/** Every film the Studio can open by id (`/studio?scene=…`, the spatial scene's button). */
export const studioFilms: Film[] = [...showcaseFilms, ...creativeFilms, ...originalFilms];

/**
 * Homepage sample clips: the hero reel, one clip per model card and one per creation-mode tab.
 *
 * Pure data. To swap in a new pick, edit `src`, `poster`, `alt` and the provenance fields of an
 * entry (or reorder `heroReel`); no component changes. Posters are the clip's first frame so
 * nothing jumps when the video starts, and a clip for a full-bleed or cropped slot must not be
 * letterboxed. Keep every clip in one slot only.
 *
 * HONESTY RULE: `source` decides the label every slot shows, through lib/reel.ts `provenanceOf`.
 * Everything here was rendered through OpenRouter — with Wan 3.0, Seedance 2.0, MiniMax H3 (the
 * weights the network serves, but not on a sealed stage) or, for the input-driven mode demos,
 * Google Veo 3.1. None of it was made on the KunoWorld network. Only a certificate-backed network
 * film may use source "kuno".
 */
export interface SampleClip {
  /** Stable key, usually the file stem. */
  id: string;
  src: string;
  poster: string;
  /** Describes the shot for screen readers. */
  alt: string;
  title: string;
  category: string;
  source: ClipSource;
  /** The exact model id that rendered it, e.g. "alibaba/wan-3.0". */
  model?: string;
  /** The service that ran it, e.g. "openrouter". */
  provider?: string;
  aspect: "16:9" | "9:16";
  /** CSS object-position for crops (phones, portrait cards). Defaults to the centre. */
  focus?: string;
  /** Media the sample was genuinely rendered from. Never list frames it wasn't given. */
  inputs?: { src: string; alt: string; role: string }[];
  /** Shown beside the provenance line, e.g. how a stand-in differs from the real mode. */
  note?: string;
}

/** The homepage hero, played in order and looped. People and motion. */
export const heroReel: SampleClip[] = [
  { ...WAN, id: "salt-flat-gown", title: "Red silk on white salt", category: "People", src: "/media/salt-flat-gown.mp4", poster: "/media/salt-flat-gown-poster.webp", aspect: "16:9", alt: "A model in a flowing crimson silk gown twirls on white salt flats as the fabric streams in the wind." },
  { ...SEEDANCE, id: "breakdance", title: "Windmill under the overpass", category: "People", src: "/media/breakdance.mp4", poster: "/media/breakdance-poster.webp", aspect: "16:9", alt: "A b-boy in a red tracksuit spins into a windmill and a one-hand freeze under a highway bridge." },
  { ...SEEDANCE, id: "anime-rooftops", title: "Lantern cut", category: "Anime", src: "/media/anime-rooftops.mp4", poster: "/media/anime-rooftops-poster.webp", aspect: "16:9", alt: "A hand-drawn anime swordswoman leaps across moonlit rooftops and slices through a falling lantern." },
  { ...SEEDANCE, id: "motocross-jump", title: "Backflip over the dune", category: "Action", src: "/media/motocross-jump.mp4", poster: "/media/motocross-jump-poster.webp", aspect: "16:9", alt: "A motocross rider backflips over a desert dune and roars away in a spray of sand." },
  { ...WAN, id: "color-powder-dancer", title: "Colour, thrown", category: "People", src: "/media/color-powder-dancer.mp4", poster: "/media/color-powder-dancer-poster.webp", aspect: "16:9", alt: "A dancer in white spins through bursts of pink, yellow and blue powder against a black background." },
];

/** One looping sample per model card, keyed by profile id (lib/profiles.json). A card without one shows no video. */
export const modelClips: Record<string, SampleClip> = {
  "ltx-2.5-fast": { ...WAN, id: "mouse-market-chase", title: "Night market dash", category: "Animation", src: "/media/mouse-market-chase.mp4", poster: "/media/mouse-market-chase-poster.webp", aspect: "16:9", alt: "A cartoon mouse courier skateboards through a lantern-lit night market, dodging bouncing oranges." },
  "ltx-2.5-pro": { ...SEEDANCE, id: "cheetah-sprint", title: "Full sprint", category: "Wildlife", src: "/media/cheetah-sprint.mp4", poster: "/media/cheetah-sprint-poster.webp", aspect: "16:9", alt: "A cheetah bursts out of golden grass and sprints across the savanna." },
  "ltx-2.5-4k": { ...WAN, id: "synthwave-drive", title: "Neon grid", category: "Retro", src: "/media/synthwave-drive.mp4", poster: "/media/synthwave-drive-poster.webp", aspect: "16:9", alt: "A red coupe races down a glowing neon grid toward a striped synthwave sun." },
  "h3-turbo": { ...H3, id: "pixel-knight", title: "Level one", category: "Pixel art", src: "/media/pixel-knight.mp4", poster: "/media/pixel-knight-poster.webp", aspect: "16:9", alt: "A pixel-art knight dashes through a side-scrolling forest, jumping spikes and slashing a slime into coins." },
  h3: { ...H3, id: "lowpoly-fox", title: "Autumn run", category: "Low-poly 3D", src: "/media/lowpoly-fox.mp4", poster: "/media/lowpoly-fox-poster.webp", aspect: "16:9", alt: "A low-poly fox leaps a crystal-blue stream as angular autumn leaves swirl behind it." },
  "h3-reference": { ...WAN, id: "impasto-night-ride", title: "Ride through the stars", category: "Painting", src: "/media/impasto-night-ride.mp4", poster: "/media/impasto-night-ride-poster.webp", aspect: "16:9", alt: "A cyclist rides a brushstroke road beneath a swirling, star-filled oil-painted sky." },
};

export type CreationModeId = "text" | "image" | "first-last" | "keyframes" | "references" | "edit";

/**
 * One sample per creation-mode tab. Text to video uses a new text-prompted film. Veo can genuinely
 * take a first frame and a first plus last frame, so those two were rendered from the stills listed
 * in `inputs`. Veo has no keyframes, references or editing, so those tabs show text-prompted
 * stand-ins and say so in `note`.
 */
export const modeClips: Record<CreationModeId, SampleClip> = {
  text: { ...SEEDANCE, id: "hoverbike-chase", title: "Into the light tunnel", category: "Text to video", src: "/media/hoverbike-chase.mp4", poster: "/media/hoverbike-chase-poster.webp", aspect: "16:9", alt: "A rider on a glowing hoverbike weaves through rainy neon traffic and dives into a tunnel of light." },
  image: { ...VEO, id: "mode-image", title: "Harbour at dawn", category: "Image to video", src: "/reel/mode-image.mp4", poster: "/reel/mode-image.jpg", aspect: "16:9", alt: "A still harbour at dawn comes alive as a boat eases away from the quay.", inputs: [{ src: "/stills/in-first-frame.jpg", role: "First frame", alt: "A still harbour at dawn, boats at their moorings, mist on the water." }] },
  "first-last": { ...VEO, id: "mode-first-last", title: "The storm comes in", category: "First & last frame", src: "/reel/mode-first-last.mp4", poster: "/reel/mode-first-last.jpg", aspect: "16:9", alt: "A storm rolls across a beach, from calm water to rain sweeping the sand.", inputs: [{ src: "/stills/in-keyframe-1.jpg", role: "First frame", alt: "An empty beach under a calm pale sky." }, { src: "/stills/in-keyframe-3.jpg", role: "Last frame", alt: "The same beach in heavy rain sweeping across the sand." }] },
  keyframes: { ...VEO, id: "mode-keyframes", title: "A storm in three beats", category: "Keyframes", src: "/reel/mode-keyframes.mp4", poster: "/reel/mode-keyframes.jpg", aspect: "16:9", alt: "A storm builds over a beach in three beats, from calm water to rain sweeping the sand.", note: "Text-prompted stand-in: the sample model can’t take keyframes" },
  references: { ...VEO, id: "mode-reference", title: "Spray on the pier", category: "References", src: "/reel/mode-reference.mp4", poster: "/reel/mode-reference.jpg", aspect: "16:9", alt: "A woman in a yellow raincoat walks a stone pier as spray bursts over the wall.", note: "Text-prompted stand-in: the sample model can’t take reference media" },
  edit: { ...VEO, id: "mode-edit", title: "Snow on the coast road", category: "Edit & retake", src: "/reel/mode-edit.mp4", poster: "/reel/mode-edit.jpg", aspect: "16:9", alt: "A coast road in daylight turns to heavy snowfall on the same camera move.", note: "Text-prompted stand-in: the sample model can’t edit an existing clip" },
};
