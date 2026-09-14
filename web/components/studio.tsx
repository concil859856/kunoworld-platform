"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { showcaseFilms } from "@/lib/showcase";
import { LogoMark } from "@/components/site/LogoMark";
import { ArrowDownToLine, Link2, ArrowUpRight, BadgeCheck, Check, ChevronRight, CircleHelp, Code2, Eye, Film, Flag, FolderOpen, Layers3, LoaderCircle, LockKeyhole, Plus, ShieldCheck, Sparkles, WandSparkles, X, Zap } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SpatialScene, DepthCard } from "@/components/spatial-scene";
import { CATALOG, profilesOrCatalog } from "@/lib/catalog";
import { useComposer } from "@/lib/composerState";
import { useLibrary } from "@/lib/useLibrary";
import { MODE_LABEL } from "@/lib/validation";
import { makeClient, useApiKey } from "@/lib/kuno";
import { isActive } from "@/lib/library";
import { PRIVACY_COPY, STANDARD_RETENTION_DAYS, eligibilityReason } from "@/lib/privacy-copy";
import { Composer, type Submission } from "@/components/studio/Composer";
import { Inspector } from "@/components/studio/Inspector";
import type { GoldenManifest, ModelProfile, ModelsResponse } from "@kunoworld/sdk";
import { KunoClient } from "@kunoworld/sdk";
const profiles = CATALOG;
const FALLBACK_WORD:Record<string,string>={region:"not licensed in your region",switched_off:"switched off right now",capacity:"no stages were free"};
const scenes = showcaseFilms.map(s=>({id:s.id,name:s.title,category:s.label,poster:s.poster,subtitle:"A starting point for your imagination",prompt:s.prompt,aspect:s.aspect}));
type View = "create" | "library" | "models" | "privacy" | "developers";
function Navigation({ view, navigate }: { view: View; navigate: (v: View) => void }) {
  const { setOpenMobile } = useSidebar();
  const go = (v: View) => { navigate(v); setOpenMobile(false); };
  return <Sidebar className="studio-sidebar"><Link href="/" className="brand" aria-label="KunoWorld home"><LogoMark size={30}/><span>kunoworld</span></Link><SidebarContent><div className="nav-heading">WORKSPACE</div><SidebarMenu>{([{id:"create",label:"Create a video",icon:WandSparkles},{id:"library",label:"My creations",icon:FolderOpen},{id:"models",label:"Models",icon:Layers3}] as const).map(item => <SidebarMenuItem key={item.id}><SidebarMenuButton isActive={view===item.id} onClick={()=>go(item.id)}><item.icon/><span>{item.label}</span>{item.id==="create"&&<Plus className="ml-auto" size={15}/>}</SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu><div className="nav-heading">KUNOWORLD</div><SidebarMenu>{([{id:"privacy",label:"Privacy & proof",icon:ShieldCheck},{id:"developers",label:"For developers",icon:Code2}] as const).map(item=><SidebarMenuItem key={item.id}><SidebarMenuButton isActive={view===item.id} onClick={()=>go(item.id)}><item.icon/><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarContent><SidebarFooter className="sidebar-bottom"><div className="private-card"><LockKeyhole size={21}/><strong>Your ideas. Yours alone.</strong><p>Built for private creation, from the first word to the final frame.</p><button onClick={()=>go("privacy")}>Inside KunoWorld <ArrowUpRight size={13} className="inline ml-1"/></button></div><SidebarMenuButton asChild><a href="/docs"><CircleHelp size={18}/><span>Studio guide</span><ArrowUpRight size={14} className="ml-auto"/></a></SidebarMenuButton><div className="mt-5 flex items-center gap-3 px-2"><div className="avatar">K</div><div><div className="text-[13px] text-[#e4eada]">Personal workspace</div><div className="text-[12px] text-[#8b957e] mt-1">Development preview</div></div></div></SidebarFooter></Sidebar>;
}
export default function Home() {
  const [models,setModels]=useState<ModelsResponse|null>(null);
  const [sessionKey,setSessionKey]=useState<string|null>(null);
  const [view,setView]=useState<View>("create");const [selectedId,setSelectedId]=useState<string|null>(null);const [libraryOpen,setLibraryOpen]=useState(false);const [librarySearch,setLibrarySearch]=useState("");
  const [connectOpen,setConnectOpen]=useState(false);
  const [endpoint,setEndpoint]=useState("");
  const [apiKey,setApiKey]=useState("");
  const [manifest,setManifest]=useState<GoldenManifest|null>(null);
  const [manifestName,setManifestName]=useState("");
  const [client,setClient]=useState<KunoClient|null>(null);
  const [connecting,setConnecting]=useState(false);
  const [connectError,setConnectError]=useState("");
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState("");
  const [error,setError]=useState("");
  const [activeModels,setActiveModels]=useState<ModelProfile[]|null>(null);
  const abortRef=useRef<AbortController|null>(null);
  const profilesList=profilesOrCatalog(models?.models);
  const composer=useComposer(profilesList);
  const library=useLibrary(client,sessionKey);const selectedTake=library.entries.find(e=>e.id===selectedId)??library.entries[library.entries.length-1]??null;
  const storedKey=useApiKey();
  // Development convenience: when a gateway is explicitly configured and this browser
  // already holds an API key, connect without the dialog. The dialog stays the production
  // path, where you pin your own golden manifest; here the SDK trusts the one the gateway
  // publishes. Gated on the raw env var rather than API_BASE, which defaults to localhost
  // and would make every deployment look "configured".
  useEffect(()=>{
    const base=process.env.NEXT_PUBLIC_KUNO_API;
    if(client||!base||!storedKey)return;
    let alive=true;
    void (async()=>{
      try{
        const c=makeClient(storedKey);
        const available=await c.models(0);
        if(!alive)return;
        setClient(c);setSessionKey(storedKey);setActiveModels(available.models);setModels(available);
        setStatus("Connected to the development gateway.");
      }catch{/* leave the dialog as the way in */}
    })();
    return()=>{alive=false;};
  },[client,storedKey]);
  // Signed in on this site: its server holds the session and hands the studio a short-lived token
  // for making videos, refreshed before it expires. The library is keyed to the account, not to a
  // token that changes every hour.
  useEffect(()=>{
    let alive=true;let timer:ReturnType<typeof setTimeout>|undefined;
    const connectSignedIn=async()=>{
      try{
        const res=await fetch("/auth/studio-token",{method:"POST"});
        if(!res.ok||!alive)return;
        const grant=await res.json() as {token:string;expires_at:number;account_id:string};
        const c=makeClient(grant.token);
        const available=await c.models(0);
        if(!alive)return;
        setClient(c);setSessionKey(`account:${grant.account_id}`);setActiveModels(available.models);setModels(available);
        setStatus("Signed in. Videos are charged to your account.");
        timer=setTimeout(()=>{if(alive)void connectSignedIn();},Math.max(30_000,grant.expires_at*1000-Date.now()-5*60_000));
      }catch{/* not signed in, or the gateway is unreachable: the dialog stays the way in */}
    };
    void connectSignedIn();
    return()=>{alive=false;if(timer)clearTimeout(timer);};
  },[]);
  useEffect(()=>{
    const query=new URLSearchParams(window.location.search);
    const scene=showcaseFilms.find(s=>s.id===query.get("scene"));
    if(scene){composer.actions.setPrompt(scene.prompt);composer.actions.patchSettings({aspectRatio:scene.aspect});}
    const requested=profiles.find(p=>p.id===query.get("model")&&p.modes.includes("text_to_video"));
    if(requested)composer.actions.setProfile(requested);
    if(query.get("mode")==="image_to_video")composer.actions.setTab("frames");
    if(query.get("aspect")==="9:16")composer.actions.patchSettings({aspectRatio:"9:16"});
  },[]);
  const titles:Record<View,string>={create:"Create a video",library:"My creations",models:"Meet your creative engines",privacy:"Private by design",developers:"Build with KunoWorld"};
  useEffect(()=>()=>{abortRef.current?.abort();},[]);
  useEffect(()=>{
    const context=(document as Document & {modelContext?:{registerTool:(tool:unknown,options:unknown)=>void}}).modelContext;
    if(!context?.registerTool)return;
    const controller=new AbortController();
    try{context.registerTool({name:"stage_video_prompt",title:"Stage a video prompt",description:"Fill the KunoWorld video prompt for review. Does not submit a job or spend funds.",inputSchema:{type:"object",properties:{prompt:{type:"string",minLength:1,maxLength:4000}},required:["prompt"],additionalProperties:false},annotations:{readOnlyHint:false},execute(input:unknown){const value=input as {prompt?:unknown};if(!value||typeof value.prompt!=="string"||!value.prompt.trim()||value.prompt.length>4000)throw new Error("A prompt of 1–4000 characters is required.");composer.actions.setPrompt(value.prompt);setView("create");return{staged:true,submitted:false,prompt:value.prompt};}},{signal:controller.signal});}catch{/* Browser registration is optional. */}
    return()=>controller.abort();
  },[]);
  function applyScene(index:number){const scene=scenes[index];if(!scene)return;composer.actions.setPrompt(scene.prompt);setView("create");setError("");}
  async function connect(){
    setConnectError("");
    try{const url=new URL(endpoint);if(url.protocol!=="https:"&&!(url.protocol==="http:"&&["localhost","127.0.0.1","[::1]"].includes(url.hostname)))throw new Error("Use an HTTPS gateway URL, or HTTP on localhost for development.");if(url.username||url.password||url.search||url.hash)throw new Error("Use the gateway base URL without credentials, a query, or a fragment.");if(!apiKey.trim())throw new Error("Enter your gateway API key.");if(!manifest)throw new Error("Choose your trusted golden manifest JSON file.");setConnecting(true);const c=new KunoClient({baseUrl:url.href.replace(/\/$/,""),apiKey:apiKey.trim(),manifest,fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(30000)})});const available=await c.models(0);await c.list(1);setClient(c);setSessionKey(apiKey.trim());setActiveModels(available.models);setModels(available);setConnectOpen(false);setApiKey("");setStatus("Gateway connected. Development generation uses simulated hardware.");}catch(e){setConnectError(e instanceof Error?e.message:"Could not connect to this gateway.");}finally{setConnecting(false);}
  }
  async function runJob(sub: Submission){
    setError("");setStatus("");
    if(!client){setConnectOpen(true);return;}
    const s=composer.state.settings;
    setBusy(true);
    try{
      await library.submit({
        request:{prompt:sub.prompt,model:sub.requested.id,mode:sub.mode,durationS:s.durationS,resolution:s.resolution,aspectRatio:s.aspectRatio,audio:s.audio,inputs:sub.inputs,privacy:sub.privacy},
        mode:sub.mode,requestedProfileId:sub.requested.id,predictedProfileId:sub.predicted.id,
        fallbackReason:sub.fallbackReason,estimate:sub.estimate,inputs:sub.summaries,
      },{tab:composer.state.tab,editOp:composer.state.editOp,settings:s});
      setView("library");
    }finally{setBusy(false);}
  }
  async function cancel(){const e=[...library.entries].reverse().find(x=>x.handle&&isActive(x));if(e)await library.cancel(e);}
  return <SidebarProvider style={{"--sidebar-width":"224px"} as React.CSSProperties}><Navigation view={view} navigate={setView}/><main className="workspace-main"><header className="topbar"><div className="crumb"><SidebarTrigger className="mobile-menu"/><span>Workspace</span><ChevronRight size={14}/><strong>{view==="create"?"Create a video":view==="library"?"My creations":view==="models"?"Models":view==="privacy"?"Privacy & provenance":"For developers"}</strong></div><div className="top-actions"><Link href="/" className="studio-home-link">Back to website <ArrowUpRight size={13}/></Link><span className="preview-label">Development preview</span>{!client&&<Link href="/signin?next=/studio" className="studio-signin-link">Sign in</Link>}<button className="connection" onClick={()=>setConnectOpen(true)}>{client?<Check size={15}/>:<Zap size={15}/>} {client?"Gateway connected":"Connect gateway"}</button><button className="library-toggle" onClick={()=>setLibraryOpen(true)}><FolderOpen size={14}/> Library · {library.entries.length}</button><div className="avatar" aria-label="Personal workspace">K</div></div></header><aside className="library-drawer" aria-label="Library" data-open={libraryOpen}><div className="library-drawer-head"><strong>Your takes</strong><button onClick={()=>setLibraryOpen(false)} aria-label="Close">Close</button></div><input type="search" className="select-control" aria-label="Search the library" placeholder="Search your takes" value={librarySearch} onChange={e=>setLibrarySearch(e.target.value)}/><p className="library-drawer-note">Search runs on your device.</p><ul className="library-drawer-list">{[...library.entries].reverse().filter(e=>e.prompt.toLowerCase().includes(librarySearch.trim().toLowerCase())).map(e=><li key={e.id}><button onClick={()=>{setSelectedId(e.id);setView("library");setLibraryOpen(false);}}><span>{e.prompt||"No prompt"}</span><span className="library-drawer-step">{e.privacy==="standard"?"Standard · ":""}{e.step}</span></button></li>)}</ul>{library.entries.length===0&&<p className="library-drawer-note">No takes yet.</p>}</aside><div className="content-wrap">
    <div className="intro"><div><div className="eyebrow">{view==="create"?"YOUR NEXT GREAT IDEA STARTS HERE":"THE KUNOWORLD STUDIO"}</div><h1>{view==="create"?<>Your imagination, <span>in motion.</span></>:titles[view]}</h1><p>{view==="create"?"A few words. A whole new world. What will you create today?":view==="library"?"Your videos and signed receipts, together in one place.":view==="models"?"Find the right balance of speed, detail, and creative control.":view==="privacy"?"A closer look at how your ideas travel through KunoWorld.":"The same encrypted generation workflow, in your own application."}</p></div>{view==="create"&&<button className="text-button" onClick={()=>setView("developers")}><CircleHelp size={16}/> A quick studio guide <ArrowUpRight size={14}/></button>}</div>
    {view==="create"&&<><div className="creation-grid"><Composer composer={composer} models={models} busy={busy} onGenerate={runJob} onCancel={cancel}/>{error&&<p role="alert" className="status-message error-message">{error}</p>}{status&&<p role="status" className="status-message">{status}</p>}<SpatialScene onUsePrompt={sceneId=>applyScene(scenes.findIndex(scene=>scene.id===sceneId))}/></div><div className="section-heading"><div><h2>A spark for your next story</h2><p>Original creative studies. Pick a scene to make it your own.</p></div><Sparkles size={18} className="text-[#a3b48a]"/></div><div className="inspiration-grid">{scenes.map((s,i)=><DepthCard key={s.name} onClick={()=>applyScene(i)} label={`Use prompt: ${s.name}`}><div className="scene-image"><img src={s.poster} alt={s.name} loading="lazy"/><span className="scene-type">{s.category}</span><span className="scene-action"><ArrowUpRight size={14}/></span></div><div className="scene-caption"><div><strong>{s.name}</strong><span>{s.subtitle}</span></div><Plus size={16}/></div></DepthCard>)}</div></>}
    {view==="library"&&<div className="grid gap-6">{library.notice&&<p role="status" className="status-message">{library.notice}</p>}<div className="result-actions"><button onClick={library.exportBackup}><ArrowDownToLine size={16}/> Back up film keys</button><label className="attach-button" style={{cursor:"pointer"}}><Plus size={14}/> Restore keys<input type="file" accept=".json,application/json" className="sr-only" aria-label="Restore keys" onChange={ev=>{const f=ev.target.files?.[0];if(f)void library.restore(f);ev.target.value="";}}/></label><button onClick={library.forgetAll}><X size={16}/> Forget all</button></div><div className="library-layout"><div className="library-shelf">{library.entries.length===0?<div className="empty-view"><FolderOpen size={40} strokeWidth={1}/><h2>A world waiting to happen.</h2><p>Your takes are kept in this browser with their film keys, so they survive a reload. Back the keys up before clearing site data.</p><button className="generate-button" onClick={()=>setView("create")}><Plus size={16}/> Create your first video</button></div>:[...library.entries].reverse().map(e=>{const film=library.films[e.id];const digest=e.receipt?.body.content_digest;const prof=profilesList.find(p=>p.id===e.profileId);const attribution=prof?.license?.attribution??null;return <article className="info-card" data-step={e.step} data-take={e.id} data-privacy={e.privacy??"private"} data-selected={selectedTake?.id===e.id} onClick={()=>setSelectedId(e.id)} onFocusCapture={()=>setSelectedId(e.id)} key={e.id}>{film?.url?<video className="result-video" controls src={film.url} poster={film.poster}/>:<>{film?.poster&&<img className="result-video take-poster" src={film.poster} alt={e.prompt?`Preview: ${e.prompt}`:"Preview"}/>}<button className="generate-button" disabled={e.step!=="ready"||film?.opening} aria-label={e.prompt?`Open take: ${e.prompt}`:"Open take"} onClick={()=>void library.openFilm(e)}>{film?.opening?<LoaderCircle size={16} className="spin"/>:<Film size={16}/>} {e.step==="ready"?(film?.opening?"Opening…":"Open take"):e.step}</button></>}<p className="mt-4">{e.prompt||<span className="text-[#8b9581]">No prompt</span>}</p><p className="privacy-badge" data-privacy={e.privacy??"private"} title={PRIVACY_COPY[e.privacy??"private"].sentence}>{e.privacy==="standard"?<Eye size={12} aria-hidden/>:<LockKeyhole size={12} aria-hidden/>}{PRIVACY_COPY[e.privacy??"private"].label}</p><div className="text-[12px] text-[#b7c3a7] mt-3">{prof?.name??e.profileId} ·{MODE_LABEL[e.mode]} · {e.step}{e.price!==null&&` · $${e.price.toFixed(2)}`}{e.fallbackReason&&` · Fallback: ${FALLBACK_WORD[e.fallbackReason]??e.fallbackReason}`}</div>{attribution&&<p className="attribution-badge">Made with {attribution}</p>}{film?.error&&<p role="alert" className="status-message error-message">{film.error.title}. {film.error.detail}</p>}{e.error&&<div role="alert" className="status-message error-message take-error"><p>{e.error.title}. {e.error.detail}</p>{e.error.reasons&&e.error.reasons.length>0&&<ul>{e.error.reasons.map(r=><li key={r}>{eligibilityReason(r)}</li>)}</ul>}{e.error.link&&<a href={e.error.link.href}>{e.error.link.label}</a>}</div>}<div className="result-actions">{film?.url&&<a href={film.url} download={`kunoworld-${e.id}.mp4`}><ArrowDownToLine size={16}/> Download video</a>}{e.receipt&&<a href={`data:application/json,${encodeURIComponent(JSON.stringify(e.receipt,null,2))}`} download={`kunoworld-${e.id}-receipt.json`}><BadgeCheck size={16}/> Signed receipt</a>}{digest&&<button onClick={()=>{const link=`${window.location.origin}/verify?sha256=${digest}`;const ok=()=>library.setNotice("Certificate link copied. It shows the film's credits, and nothing about how it was made.");if(navigator.clipboard?.writeText)navigator.clipboard.writeText(link).then(ok).catch(()=>window.prompt("Copy the certificate link:",link));else window.prompt("Copy the certificate link:",link);}}><Link2 size={16}/> Copy certificate link</button>}{e.handle&&<a href={`/report?job_id=${encodeURIComponent(e.handle.jobId)}${digest?`&digest=${digest}`:""}`}><Flag size={16}/> Report</a>}<button onClick={()=>void library.remove(e)}><X size={16}/> {e.privacy==="standard"?"Delete":"Remove"}</button></div></article>;})}</div><Inspector key={selectedTake?.id??"none"} entry={selectedTake} film={selectedTake?library.films[selectedTake.id]:undefined} profiles={profilesList} composer={composer} onCancel={e=>void library.cancel(e)} onRemove={e=>void library.remove(e)} onNotice={library.setNotice} onEditComposer={()=>setView("create")}/></div><p className="modal-copy">Film keys live only in this browser. Download the videos you want to keep, and back up the keys before clearing site data. Standard takes are kept in your KunoWorld library for {STANDARD_RETENTION_DAYS} days instead, and have no key.</p></div>}{view==="models"&&<><div className="info-banner">Model profiles come from the KunoWorld protocol. Prices are launch estimates. Actual availability depends on your gateway, region, and worker capacity.</div><div className="info-grid">{profiles.map(p=><article className="info-card" key={p.id}><Layers3 size={26}/><h2>{p.name}</h2><p>{p.tagline}</p><p className="mt-4">{p.limits.min_duration_s}–{p.limits.max_duration_s}s · {Object.keys(p.limits.sizes).join(" / ")}<br/>{p.modes.length} creation modes · Native audio</p>{activeModels&&<p>{activeModels.find(m=>m.id===p.id)?.workers??0} workers reported by gateway</p>}<button className="text-button mt-5 !text-[#a6edda]" onClick={()=>{composer.actions.setProfile(p);setView("create");}} disabled={!p.modes.includes("text_to_video")}>{p.modes.includes("text_to_video")?"Create with this model":"Director modes: SDK access"}<ArrowUpRight size={14}/></button></article>)}</div></>}
    {view==="privacy"&&<><div className="info-banner"><strong>Development preview.</strong> The encrypted protocol works with simulated workers. Real Intel TDX and NVIDIA attestation verification, confidential deployment, and production GPU generation are not ready. This preview does not provide production hardware privacy guarantees.</div><div className="info-grid">{[{icon:LockKeyhole,title:"Encrypted on your device",copy:"The SDK seals your prompt and reference files to a worker's key before they leave your browser. The gateway receives encrypted content and the public settings needed to route the job."},{icon:ShieldCheck,title:"A verifiable destination",copy:"The protocol is designed to bind the worker's identity, keys, model, and hardware evidence. You supply a trusted golden manifest. Current development workers use simulated evidence."},{icon:BadgeCheck,title:"Proof with every result",copy:"The browser checks the signed receipt and file digests before decrypting the finished video. Download the receipt with your video to retain its provenance."}].map(c=><article className="info-card" key={c.title}><c.icon size={27}/><h2>{c.title}</h2><p>{c.copy}</p></article>)}</div><div className="info-banner">Privacy has boundaries: your gateway sees model, duration, resolution, account, and traffic patterns. Device compromise and physical attacks on a worker are outside the intended protection. Prompts, keys, and generated videos are not saved by this website. All of this describes Private takes, the default. A Standard take is your choice to skip it: KunoWorld and the GPU provider can see that video and its prompt, and KunoWorld keeps them for {STANDARD_RETENTION_DAYS} days.</div></>}
    {view==="developers"&&<div className="grid gap-5"><article className="info-card"><Code2 size={26}/><h2>One encrypted workflow. Your creative tools.</h2><p>KunoWorld combines a routing gateway, a JavaScript and Python SDK, GPU workers, and a Bittensor validator network. This fresh studio uses the JavaScript SDK for browser-side encryption and receipt verification.</p></article><div className="info-grid"><article className="info-card"><span className="eyebrow">01 / CONNECT</span><h2>Bring your gateway</h2><p>Choose Connect gateway. Enter your gateway URL and API key, then load the trusted golden manifest supplied by your operator. The gateway must allow this site&apos;s origin through CORS. Your API key stays in memory for this session.</p><button className="text-button mt-5 !text-[#a6edda]" onClick={()=>setConnectOpen(true)}>Connect gateway <ArrowUpRight size={14}/></button></article><article className="info-card"><span className="eyebrow">02 / CREATE</span><h2>Describe your scene</h2><p>Start from text, a starting image, or a first and last frame. Choose a model and output settings. Region rules and available workers may route you to another compatible profile. Director editing and reference modes are available through the SDK.</p></article><article className="info-card"><span className="eyebrow">03 / KEEP</span><h2>Take your work with you</h2><p>Completed videos appear in My creations. Download the MP4 and signed receipt before refreshing or leaving. The studio never sends unencrypted prompts to the gateway or stores your API key.</p></article></div><div className="info-banner">This is a development integration. Your gateway may return a placeholder video from the mock renderer. Accounts, payments, and production hardware verification are not implemented in the source project.</div></div>}
    <footer className="bottom-note"><span><LogoMark size={18}/> KunoWorld · A world of your own.</span><span>Powered by MiniMax H3 & LTX-2.5 <span className="hidden sm:inline">/</span> <button onClick={()=>setView("privacy")}>Privacy & provenance <ArrowUpRight size={12} className="inline"/></button></span></footer>
    </div></main><Dialog open={connectOpen} onOpenChange={setConnectOpen}><DialogContent><DialogHeader><DialogTitle>Connect your KunoWorld gateway</DialogTitle><DialogDescription className="modal-copy">Use your development gateway to create videos. Current project workers use simulated hardware and may return placeholder video.</DialogDescription></DialogHeader>{client?<><p className="modal-copy">Your gateway is connected for this session. The API key is held in memory and cleared when you leave; your takes, and the keys that open them, are saved in this browser until you remove them.</p><button className="generate-button" onClick={()=>{if(busy){setConnectError("Wait for your current generation to finish before disconnecting.");return;}setClient(null);setActiveModels(null);setModels(null);setStatus("");setConnectError("");}}>Disconnect gateway</button></>:<><label className="modal-field"><span>Gateway URL</span><input type="url" value={endpoint} onChange={e=>setEndpoint(e.target.value)} placeholder="https://your-gateway.example" autoComplete="off"/></label><label className="modal-field"><span>API key</span><input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="Your gateway API key" autoComplete="off"/></label><label className="modal-field"><span>Trusted golden manifest</span><input type="file" accept=".json,application/json" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;setManifest(null);setManifestName("");try{const value=JSON.parse(await f.text());if(!value||typeof value!=="object"||!Array.isArray(value.allowed)||!Array.isArray(value.mock_quote_keys)||typeof value.max_evidence_age_s!=="number")throw new Error("Choose a KunoWorld golden manifest JSON file.");setManifest(value);setManifestName(f.name);setConnectError("");}catch(err){setConnectError(err instanceof Error?err.message:"Invalid manifest.");}}}/>{manifestName&&<small className="text-[#a6edda]">Loaded {manifestName}</small>}</label><button className="generate-button" disabled={connecting} onClick={connect}>{connecting?<LoaderCircle size={16} className="spin"/>:<Zap size={16}/>} {connecting?"Connecting…":"Connect gateway"}</button></>}{connectError&&<p role="alert" className="error-message modal-copy">{connectError}</p>}</DialogContent></Dialog></SidebarProvider>;
}