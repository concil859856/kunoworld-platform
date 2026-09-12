"use client";
import { useState } from "react";
import { ArrowUpRight, Play, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { showcaseFilms, type Film } from "@/lib/showcase";
import { AmbientVideo } from "./motion";
const categories=["All films",...new Set(showcaseFilms.map(f=>f.category))];
export function ShowcaseGallery(){
 const [category,setCategory]=useState("All films");const [selected,setSelected]=useState<Film|null>(null);
 const films=showcaseFilms.filter(f=>category==="All films"||f.category===category);
 return <><div className="showcase-filter-row"><Tabs value={category} onValueChange={setCategory}><TabsList aria-label="Filter films">{categories.map(c=><TabsTrigger key={c} value={c}>{c}</TabsTrigger>)}</TabsList></Tabs><span aria-live="polite">{films.length} {films.length===1?"film":"films"}</span></div><div className="film-gallery" aria-label="Original films">{films.map((film,i)=><article className={`film-gallery-card ${film.aspect==="9:16"?"portrait-film":""}`} key={film.id}><div className="film-gallery-media"><AmbientVideo src={film.video} poster={film.poster}/><span className="film-category">{film.label}</span><button className="film-open" aria-label={`Watch ${film.title}`} onClick={()=>setSelected(film)}><Play size={20} fill="currentColor"/></button><span className="film-length">00:08 / {film.aspect}</span></div><div className="film-gallery-caption"><div><small>STUDY {String(showcaseFilms.indexOf(film)+1).padStart(2,"0")}</small><h2>{film.title}</h2><p>{film.description}</p></div><a href={`/studio?scene=${film.id}${film.aspect==="9:16"?"&aspect=9:16":""}`} aria-label={`Create from ${film.title}`}><ArrowUpRight size={23}/></a></div></article>)}</div><Dialog open={selected!==null} onOpenChange={open=>{if(!open)setSelected(null)}}><DialogContent className="showcase-film-dialog">{selected&&<><DialogTitle>{selected.title}</DialogTitle><DialogDescription>{selected.description}</DialogDescription><video key={selected.id} src={selected.video} poster={selected.poster} controls autoPlay playsInline/><div className="film-prompt"><small>THE STARTING POINT</small><p>{selected.prompt}</p></div><div className="film-dialog-bottom"><span>Veo 3.1 · Creative showcase</span><a className="ocean-button button-dark" href={`/studio?scene=${selected.id}${selected.aspect==="9:16"?"&aspect=9:16":""}`}>Make it your own <ArrowUpRight size={16}/></a></div></>}</DialogContent></Dialog></>;
}
