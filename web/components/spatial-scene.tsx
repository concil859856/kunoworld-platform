"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { ArrowRight, MoveUpRight, Pause, Play } from "lucide-react";

/** Update transforms on the element, never rerender the form on pointer movement. */
function useDepthMotion<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);
  const frame = useRef<number | null>(null);
  const reduced = useRef(true);
  const reset = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    ref.current?.style.setProperty("--pointer-x", "0");
    ref.current?.style.setProperty("--pointer-y", "0");
  };
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { reduced.current = preference.matches; if (preference.matches) reset(); };
    update();
    preference.addEventListener("change", update);
    return () => { preference.removeEventListener("change", update); reset(); };
  }, []);
  useEffect(() => { if (!active) reset(); }, [active]);
  const move = (event: PointerEvent<T>) => {
    if (!active || reduced.current || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      ref.current?.style.setProperty("--pointer-x", x.toFixed(3));
      ref.current?.style.setProperty("--pointer-y", y.toFixed(3));
      frame.current = null;
    });
  };
  return { ref, onPointerMove: move, onPointerLeave: reset, onBlur: reset };
}

export function SpatialScene({ onUsePrompt }: { onUsePrompt: (sceneId: string) => void }) {
  const [motion, setMotion] = useState(false);
  const [reduced, setReduced] = useState(true);
  const depth = useDepthMotion<HTMLElement>(motion);
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { setReduced(preference.matches); setMotion(!preference.matches); };
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  return (
    <section {...depth} className="spatial-scene" data-motion={motion ? "on" : "off"} aria-label="Featured inspiration in 3D">
      <div className="spatial-heading"><span><i /> IMAGINATION, IN EVERY DIMENSION</span>
        {!reduced && <button type="button" onClick={() => setMotion(v => !v)} aria-label={motion ? "Pause 3D motion" : "Resume 3D motion"} title={motion ? "Pause motion" : "Resume motion"}>{motion ? <Pause size={13} /> : <Play size={13} />}</button>}
      </div>
      <div className="world-viewport" aria-hidden="true">
        <div className="world-orbit" />
        <div className="world-orbit orbit-secondary" />
        <div className="world-stage">
          <div className="film-frame film-frame-back"><img src="/media/prism-bloom.webp" alt="" /><div className="frame-edge"/><span>03 / GLASS IN BLOOM</span></div>
          <div className="film-frame film-frame-side"><img src="/media/ember-stag.webp" alt="" /><div className="frame-edge"/><span>02 / WILD IMAGINATION</span></div>
          <div className="film-frame film-frame-main"><img src="/media/paper-metropolis.webp" alt="" /><div className="frame-edge"/><span>01 / A CITY UNFOLDS</span><MoveUpRight size={17}/></div>
        </div>
        <div className="world-floor" />
      </div>
      <div className="spatial-copy"><h2>Think beyond<br/>the frame.</h2><button onClick={() => onUsePrompt("paper-metropolis")}>Create this paper city <ArrowRight size={15}/></button></div>
      <span className="spatial-coordinate" aria-hidden="true">K / W — 001</span>
    </section>
  );
}

export function DepthCard({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void }) {
  const depth = useDepthMotion<HTMLButtonElement>(true);
  return <button {...depth} className="scene-card depth-card" onClick={onClick} aria-label={label}>{children}<span className="depth-shine" aria-hidden="true" /></button>;
}
