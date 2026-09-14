import type { ClipSource } from "./reel";

export type Film = {
  id: string; title: string; category: string; label: string; poster: string;
  image: string; video: string; prompt: string; aspect: "16:9" | "9:16";
  color: string; description: string;
};
export const originalFilms: Film[] = [
  { id:"neon-city", title:"After the last train", category:"Cinema", label:"CINEMATIC STORYTELLING", poster:"/media/neon-city-poster.webp", image:"/media/neon-city.webp", video:"/media/neon-city.mp4", aspect:"16:9", color:"#b43a55", description:"Rain on the pavement. A city that never quite sleeps. One shot with a story to tell.", prompt:"A solitary woman in a dark coat walks away beneath a translucent umbrella on a rain-soaked futuristic city street. Crimson neon reflects in wet asphalt. A slow forward dolly follows her through fine rain and rising steam. Anamorphic cinematography, deep sapphire shadows, realistic architecture, one uninterrupted shot." },
  { id:"chrome-runner", title:"Designed to defy gravity", category:"Product", label:"PRODUCT IN MOTION", poster:"/media/chrome-runner-poster.webp", image:"/media/chrome-runner.webp", video:"/media/chrome-runner.mp4", aspect:"16:9", color:"#b58459", description:"A new angle on a familiar object. Light, texture, and a little impossibility.", prompt:"A single unbranded futuristic running shoe with satin silver panels, ivory mesh, and a vermilion sole floats above a polished black plinth. The shoe rotates slowly while an amber studio highlight travels across its surface. Subtle camera push, consistent product shape, luxury advertising cinematography." },
  { id:"astronaut-garden", title:"Life on the other side", category:"Worlds", label:"IMAGINED WORLDS", poster:"/media/astronaut-garden-poster.webp", image:"/media/astronaut-garden.webp", video:"/media/astronaut-garden.mp4", aspect:"16:9", color:"#67774c", description:"Somewhere between a distant planet and a place you almost remember.", prompt:"An astronaut stands inside a vast abandoned circular greenhouse on another planet. Lush ferns and small amber flowers fill the space. Beyond a monumental round opening, a ringed planet hangs in a pale blue sky. A gentle lateral camera glide, warm sunlight, drifting dust, delicate movement in the leaves, cinematic realism." },
  { id:"sculptural-fashion", title:"A moment, in vermilion", category:"Fashion", label:"VERTICAL STORIES", poster:"/media/sculptural-fashion-poster.webp", image:"/media/sculptural-fashion.webp", video:"/media/sculptural-fashion.mp4", aspect:"9:16", color:"#aa4036", description:"A sculptural silhouette. A single turn. A frame made for the small screen.", prompt:"An adult fashion model with short dark hair wears an architectural vermilion pleated gown beside a curved concrete wall and pale limestone steps. Cobalt blue sky, strong afternoon light. She makes a slow graceful half-turn as fabric moves in the breeze. A subtle camera push, stable geometry, full-length vertical composition." },
];
export const creativeFilms: Film[] = [
  {id:"lantern-library",title:"A thousand unwritten worlds",category:"Worlds",label:"IMPOSSIBLE ARCHITECTURE",poster:"/media/lantern-library-poster.webp",image:"/media/lantern-library.webp",video:"/media/lantern-library.mp4",aspect:"16:9",color:"#9a613d",description:"A spiral of stories. A sky of lanterns. An invitation to get a little lost.",prompt:"A monumental circular library with spiraling walnut bookshelves and suspended staircases. Hundreds of glowing paper lanterns float through the immense hall. A tiny reader in a red coat gives scale. The camera glides slowly forward through warm amber light and drifting dust. Magical realism, coherent architecture, one uninterrupted shot."},
  {id:"paper-metropolis",title:"A city, folded into being",category:"Animation",label:"HANDCRAFTED WORLDS",poster:"/media/paper-metropolis-poster.webp",image:"/media/paper-metropolis.webp",video:"/media/paper-metropolis.mp4",aspect:"16:9",color:"#bc7c5c",description:"Paper, patience, and a small red tram. A whole city in a single fold.",prompt:"An intricate miniature city made from folded coral, butter yellow, mint and ivory paper. A tower slowly opens its accordion facade as a tiny red paper tram moves along its track. A gentle lateral camera slide reveals tactile folds and delicate bridges. Soft studio light, stop-motion character, consistent surrounding buildings."},
  {id:"ember-stag",title:"The forest holds its breath",category:"Cinema",label:"CINEMATIC FANTASY",poster:"/media/ember-stag-poster.webp",image:"/media/ember-stag.webp",video:"/media/ember-stag.mp4",aspect:"16:9",color:"#9a6c41",description:"A still clearing. A quiet encounter. A little magic between the trees.",prompt:"A majestic red deer stag stands in a dark old-growth forest, illuminated by a shaft of copper light. Warm firefly-like particles drift through gentle ground fog. The stag slowly turns its head and exhales a faint breath. A very slow camera push, realistic fur and anatomy, stable antlers, atmospheric cinema."},
  {id:"prism-bloom",title:"Light learns to bloom",category:"Art & motion",label:"MATERIAL EXPLORATIONS",poster:"/media/prism-bloom-poster.webp",image:"/media/prism-bloom.webp",video:"/media/prism-bloom.mp4",aspect:"9:16",color:"#8c629e",description:"A flower made of glass. A passing light. Color that feels almost alive.",prompt:"A single iridescent blown-glass flower floats upright against a deep plum-black studio background. Its delicate translucent petals refract pink, violet, cyan and gold. The flower rotates slowly by fifteen degrees while a narrow studio light travels across its surface. Physical glass optics, coherent petals, vertical macro framing."},
  {id:"kinetic-orbit",title:"Balance, beautifully impossible",category:"Art & motion",label:"KINETIC DESIGN",poster:"/media/kinetic-orbit-poster.webp",image:"/media/kinetic-orbit.webp",video:"/media/kinetic-orbit.mp4",aspect:"16:9",color:"#a96b51",description:"Copper in orbit. Geometry with a pulse. A study in controlled impossibility.",prompt:"Three polished copper elliptical bands float around a matte ivory sphere above a low black stone plinth in a dark gallery. The bands rotate independently at a slow mechanical pace while the sphere remains stationary. Controlled warm reflections, consistent geometry, restrained museum lighting and an almost imperceptible camera push."},
];
export const showcaseFilms: Film[] = [...creativeFilms, ...originalFilms];

/**
 * Homepage sample clips: the hero reel, one clip per model card and one per creation-mode tab.
 *
 * Pure data. To swap in a new pick, edit `src`, `poster`, `alt` and the provenance fields of an
 * entry (or reorder `heroReel`); no component changes. Posters should be the clip's first frame so
 * nothing jumps when the video starts, and a clip for a full-bleed or cropped slot must not be
 * letterboxed.
 *
 * HONESTY RULE (scripts/reel.manifest.json): `source` decides the label every slot shows, through
 * lib/reel.ts `provenanceOf`. Everything below was rendered with Google Veo 3.1 through OpenRouter:
 * not on the KunoWorld network, and not by the models the network serves. Only a certificate-backed
 * network film may use source "kuno".
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
  /** The exact model id that rendered it, e.g. "google/veo-3.1". */
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

const VEO = { source: "veo-reference", model: "google/veo-3.1", provider: "openrouter" } as const;

/** The homepage hero, played in order and looped. People and motion. */
export const heroReel: SampleClip[] = [
  { ...VEO, id: "neon-city", title: "After the last train", category: "People", src: "/media/neon-city.mp4", poster: "/media/neon-city-poster.webp", aspect: "16:9", focus: "62% 50%", alt: "A woman with a translucent umbrella walks away down a rain-soaked neon street at night." },
  { ...VEO, id: "mode-reference", title: "Spray on the pier", category: "People", src: "/reel/mode-reference.mp4", poster: "/reel/mode-reference.jpg", aspect: "16:9", focus: "34% 50%", alt: "A woman in a yellow raincoat walks a stone pier as spray bursts over the wall." },
  { ...VEO, id: "hero-wave", title: "The wave breaks", category: "Motion", src: "/reel/hero-wave.mp4", poster: "/reel/hero-wave.jpg", aspect: "16:9", alt: "A wave breaks in slow motion on black sand, its spray backlit by a low sun." },
  { ...VEO, id: "mode-text", title: "The keeper’s stair", category: "People", src: "/reel/mode-text.mp4", poster: "/reel/mode-text.jpg", aspect: "16:9", focus: "58% 50%", alt: "A keeper climbs a spiral staircase with a lantern, light spilling up the stone wall." },
  { ...VEO, id: "astronaut-garden", title: "Life on the other side", category: "Worlds", src: "/media/astronaut-garden.mp4", poster: "/media/astronaut-garden-poster.webp", aspect: "16:9", alt: "An astronaut stands in an overgrown greenhouse beneath a ringed planet." },
];

/** One looping sample per model card, keyed by profile id (lib/profiles.json). A card without one shows no video. */
export const modelClips: Record<string, SampleClip> = {
  "ltx-2.5-fast": { ...VEO, id: "paper-metropolis", title: "A city, folded into being", category: "Animation", src: "/media/paper-metropolis.mp4", poster: "/media/paper-metropolis-poster.webp", aspect: "16:9", alt: "A miniature paper city where a tower unfolds as a small red paper tram passes." },
  "ltx-2.5-pro": { ...VEO, id: "chrome-runner", title: "Designed to defy gravity", category: "Product", src: "/media/chrome-runner.mp4", poster: "/media/chrome-runner-poster.webp", aspect: "16:9", focus: "52% 50%", alt: "A silver and vermilion running shoe turns slowly above a black plinth." },
  "ltx-2.5-4k": { ...VEO, id: "lantern-library", title: "A thousand unwritten worlds", category: "Worlds", src: "/media/lantern-library.mp4", poster: "/media/lantern-library-poster.webp", aspect: "16:9", alt: "Glowing paper lanterns drift through a vast spiral library." },
  "h3-turbo": { ...VEO, id: "ember-stag", title: "The forest holds its breath", category: "Cinema", src: "/media/ember-stag.mp4", poster: "/media/ember-stag-poster.webp", aspect: "16:9", focus: "66% 50%", alt: "A red deer stag turns its head in a misty forest lit by drifting embers." },
  h3: { ...VEO, id: "sculptural-fashion", title: "A moment, in vermilion", category: "Fashion", src: "/media/sculptural-fashion.mp4", poster: "/media/sculptural-fashion-poster.webp", aspect: "9:16", focus: "50% 58%", alt: "A model in a pleated vermilion gown turns slowly beside a curved concrete wall." },
  "h3-reference": { ...VEO, id: "prism-bloom", title: "Light learns to bloom", category: "Art & motion", src: "/media/prism-bloom.mp4", poster: "/media/prism-bloom-poster.webp", aspect: "9:16", focus: "50% 45%", alt: "An iridescent blown-glass flower turns slowly as light travels across its petals." },
};

export type CreationModeId = "text" | "image" | "first-last" | "keyframes" | "references" | "edit";

/**
 * One sample per creation-mode tab. Veo can genuinely take a first frame and a first plus last
 * frame, so those two were rendered from the stills listed in `inputs`. Veo has no keyframes,
 * references or editing, so those tabs show text-prompted stand-ins and say so in `note`.
 */
export const modeClips: Record<CreationModeId, SampleClip> = {
  text: { ...VEO, id: "mode-text", title: "The keeper’s stair", category: "Text to video", src: "/reel/mode-text.mp4", poster: "/reel/mode-text.jpg", aspect: "16:9", alt: "A keeper climbs a spiral staircase with a lantern, light spilling up the stone wall." },
  image: { ...VEO, id: "mode-image", title: "Harbour at dawn", category: "Image to video", src: "/reel/mode-image.mp4", poster: "/reel/mode-image.jpg", aspect: "16:9", alt: "A still harbour at dawn comes alive as a boat eases away from the quay.", inputs: [{ src: "/stills/in-first-frame.jpg", role: "First frame", alt: "A still harbour at dawn, boats at their moorings, mist on the water." }] },
  "first-last": { ...VEO, id: "mode-first-last", title: "The storm comes in", category: "First & last frame", src: "/reel/mode-first-last.mp4", poster: "/reel/mode-first-last.jpg", aspect: "16:9", alt: "A storm rolls across a beach, from calm water to rain sweeping the sand.", inputs: [{ src: "/stills/in-keyframe-1.jpg", role: "First frame", alt: "An empty beach under a calm pale sky." }, { src: "/stills/in-keyframe-3.jpg", role: "Last frame", alt: "The same beach in heavy rain sweeping across the sand." }] },
  keyframes: { ...VEO, id: "mode-keyframes", title: "A storm in three beats", category: "Keyframes", src: "/reel/mode-keyframes.mp4", poster: "/reel/mode-keyframes.jpg", aspect: "16:9", alt: "A storm builds over a beach in three beats, from calm water to rain sweeping the sand.", note: "Text-prompted stand-in: the sample model can’t take keyframes" },
  references: { ...VEO, id: "mode-reference", title: "Spray on the pier", category: "References", src: "/reel/mode-reference.mp4", poster: "/reel/mode-reference.jpg", aspect: "16:9", alt: "A woman in a yellow raincoat walks a stone pier as spray bursts over the wall.", note: "Text-prompted stand-in: the sample model can’t take reference media" },
  edit: { ...VEO, id: "mode-edit", title: "Snow on the coast road", category: "Edit & retake", src: "/reel/mode-edit.mp4", poster: "/reel/mode-edit.jpg", aspect: "16:9", alt: "A coast road in daylight turns to heavy snowfall on the same camera move.", note: "Text-prompted stand-in: the sample model can’t edit an existing clip" },
};
