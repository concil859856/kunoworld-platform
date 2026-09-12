"use client";
import { useState } from "react";
import { ArrowDown, ArrowUpRight, Play } from "lucide-react";
import { AmbientVideo } from "./motion";
import { originalFilms } from "@/lib/showcase";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
const heroFilms=[originalFilms[2],originalFilms[0],originalFilms[1]];
export function CinematicHero(){
 const [index,setIndex]=useState(0);const [open,setOpen]=useState(false);const film=heroFilms[index];
 return <section className="ocean-hero cinematic-hero" data-hero="true">
  <AmbientVideo key={film.id} src={film.video} poster={film.poster} className="hero-film"/>
  <div className="hero-scrim"/>
  <div className="hero-content"><div className="hero-kicker"><span/> AN OPEN WORLD OF AI VIDEO</div><h1>Think it.<br/><em>Make it move.</em></h1><p>For the scenes you can’t stop imagining.<br/>Create cinematic video from words, images, and a little wonder.</p><div className="hero-buttons"><a className="ocean-button button-white" href="/studio">Create your first world <ArrowUpRight size={17}/></a><button className="hero-secondary" onClick={()=>setOpen(true)}><Play size={13} fill="currentColor"/> Watch the film <span>00:08</span></button></div></div>
  <div className="film-selector" aria-label="Featured films">{heroFilms.map((f,i)=><button key={f.id} onClick={()=>setIndex(i)} aria-pressed={i===index} aria-label={`Feature ${f.title}`}><span className="film-thumbnail"><img src={f.poster} alt=""/></span><span className="film-selector-copy"><small>0{i+1} / {f.category}</small><strong>{f.title}</strong></span></button>)}</div>
  <div className="hero-bottom"><a href="#possibilities"><ArrowDown size={15}/> Keep exploring</a><span>ORIGINAL CREATIVE STUDIES <span className="film-index">0{index+1} — 03</span></span></div>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className="showreel-dialog"><DialogTitle>{film.title}</DialogTitle><DialogDescription>{film.description}</DialogDescription><video src={film.video} poster={film.poster} controls autoPlay playsInline/><p>Original creative study · Generated with Veo 3.1 through OpenRouter. Not a KunoWorld model benchmark.</p><a href={`/studio?scene=${film.id}`} className="text-link">Try the scene in Studio <ArrowUpRight size={16}/></a></DialogContent></Dialog>
 </section>;
}
