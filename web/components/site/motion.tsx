"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
export function Reveal({children,className=""}:{children:ReactNode;className?:string}) {
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{const el=ref.current;if(!el||matchMedia("(prefers-reduced-motion: reduce)").matches)return;el.dataset.animate="true";const observer=new IntersectionObserver(entries=>{if(entries[0].isIntersecting){el.dataset.visible="true";observer.disconnect();}},{threshold:.12});observer.observe(el);return()=>observer.disconnect();},[]);
 return <div ref={ref} className={`ocean-reveal ${className}`}>{children}</div>;
}
export function AmbientVideo({src,poster,className="",label="Pause background video"}:{src:string;poster:string;className?:string;label?:string}) {
 const ref=useRef<HTMLVideoElement>(null);const [playing,setPlaying]=useState(false);const [ready,setReady]=useState(false);const [failed,setFailed]=useState(false);const [allowed,setAllowed]=useState(false);const manualPause=useRef(false);const [near,setNear]=useState(false);
 useEffect(()=>{const el=ref.current;if(!el)return;const observer=new IntersectionObserver(entries=>{if(entries[0].isIntersecting){setNear(true);observer.disconnect();}},{rootMargin:"350px"});observer.observe(el);return()=>observer.disconnect();},[]);
 useEffect(()=>{const media=matchMedia("(prefers-reduced-motion: reduce)");const update=()=>{setAllowed(!media.matches);if(media.matches){ref.current?.pause();setPlaying(false);}};update();media.addEventListener("change",update);return()=>media.removeEventListener("change",update);},[]);
 useEffect(()=>{const el=ref.current;if(!el||!allowed||!near)return;const observer=new IntersectionObserver(entries=>{if(entries[0].isIntersecting&&!manualPause.current){void el.play().then(()=>setPlaying(true)).catch(()=>setPlaying(false));}else{el.pause();setPlaying(false);}},{threshold:.1});observer.observe(el);return()=>observer.disconnect();},[allowed,src,near]);
 const toggle=()=>{const el=ref.current;if(!el)return;if(!allowed||!near){manualPause.current=false;setNear(true);setAllowed(true);return;}if(playing){manualPause.current=true;el.pause();setPlaying(false);}else{manualPause.current=false;void el.play().then(()=>setPlaying(true)).catch(()=>setPlaying(false));}};
 return <div className={`ambient-video ${className}`}><img src={poster} alt="" className="video-poster"/><video ref={ref} src={allowed&&near?src:undefined} poster={poster} playsInline muted loop preload="metadata" aria-hidden="true" onCanPlay={()=>setReady(true)} onError={()=>setFailed(true)} className={ready&&!failed?"video-ready":""}/>{!failed&&<button className="video-toggle" onClick={toggle} aria-label={playing?label:"Play background video"}>{playing?<Pause size={14}/>:<Play size={14}/>}</button>}</div>;
}
