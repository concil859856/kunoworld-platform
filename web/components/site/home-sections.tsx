"use client";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { Tabs } from "radix-ui";
import { AmbientVideo } from "./motion";
import { provenanceChip, provenanceOf } from "@/lib/reel";
import type { SampleClip } from "@/lib/showcase";

const focusOf = (clip?: SampleClip) => (clip?.focus ? ({ "--focus": clip.focus } as CSSProperties) : undefined);

export interface ModelCardData {
  id: string;
  family: string;
  name: string;
  strength: string;
  maxDuration: string;
  resolutions: string;
  href: string;
  cta: string;
  sdkOnly: boolean;
  clip?: SampleClip;
}

/** The section heading, as data: JSX handed from a server page through props trips React's key checks. */
export interface CarouselHeading {
  id: string;
  kicker: string;
  title: string;
  accent: string;
  lead: string;
}

/**
 * The model cards: a native horizontal scroller with snap points, so touch, trackpad and keyboard
 * scrolling all work, plus previous/next buttons that step one card at a time.
 */
export function ModelCarousel({ cards, heading }: { cards: ModelCardData[]; heading: CarouselHeading }) {
  const trackId = useId();
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () => {
      const atStart = el.scrollLeft <= 4;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      setEdges((prev) => (prev.atStart === atStart && prev.atEnd === atEnd ? prev : { atStart, atEnd }));
    };
    const resize = new ResizeObserver(update);
    resize.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      resize.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, []);

  const step = (direction: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(".model-card");
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const amount = card ? card.offsetWidth + gap : el.clientWidth * 0.8;
    const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * amount, behavior: smooth ? "smooth" : "auto" });
  };

  return (
    <>
      <div className="home-head">
        <div>
          <span className="section-kicker">{heading.kicker}</span>
          <h2 id={heading.id}>{heading.title}<br /><em>{heading.accent}</em></h2>
          <p>{heading.lead}</p>
        </div>
        <div className="carousel-controls">
          <button type="button" className="carousel-button" onClick={() => step(-1)} disabled={edges.atStart} aria-controls={trackId} aria-label="Previous models">
            <ArrowLeft size={18} />
          </button>
          <button type="button" className="carousel-button" onClick={() => step(1)} disabled={edges.atEnd} aria-controls={trackId} aria-label="Next models">
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
      <div id={trackId} ref={track} className="model-track" role="group" aria-roledescription="carousel" aria-label="Model profiles" tabIndex={0}>
        {cards.map((card, i) => (
          <article key={card.id} className="model-card" role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${cards.length}: ${card.name}`}>
            <div className="model-card-media" style={focusOf(card.clip)}>
              {card.clip && (
                <>
                  <AmbientVideo src={card.clip.src} poster={card.clip.poster} alt={card.clip.alt} label={`Pause the ${card.name} sample`} />
                  <span className="sample-chip" title={provenanceOf(card.clip)}>{provenanceChip(card.clip)}</span>
                </>
              )}
            </div>
            <div className="model-card-body">
              <span className="model-card-family">{card.family}{card.sdkOnly && <span className="model-card-badge">SDK</span>}</span>
              <h3>{card.name}</h3>
              <p>{card.strength}</p>
              <dl className="model-card-specs">
                <div><dt>Max length</dt><dd>{card.maxDuration}</dd></div>
                <div><dt>Resolution</dt><dd>{card.resolutions}</dd></div>
              </dl>
              <a className="model-card-cta" href={card.href} aria-label={`${card.cta}: ${card.name}`}>{card.cta}<ArrowUpRight size={16} /></a>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

export interface ModeTabData {
  id: string;
  label: string;
  title: string;
  copy: string;
  models: string;
  cta: { href: string; label: string };
  secondary?: { href: string; label: string };
  clip: SampleClip;
}

/** Creation-mode tabs. Radix handles the tab pattern: arrow keys, Home and End, and one tab stop. */
export function ModeTabs({ modes }: { modes: ModeTabData[] }) {
  return (
    <Tabs.Root defaultValue={modes[0]?.id} className="mode-tabs">
      <Tabs.List className="mode-tab-list" aria-label="Creation modes">
        {modes.map((m) => (
          <Tabs.Trigger key={m.id} value={m.id} className="mode-tab">{m.label}</Tabs.Trigger>
        ))}
      </Tabs.List>
      {modes.map((m) => (
        <Tabs.Content key={m.id} value={m.id} className="mode-panel">
          <figure className="mode-figure">
            <div className="mode-media" style={focusOf(m.clip)}>
              <AmbientVideo src={m.clip.src} poster={m.clip.poster} alt={m.clip.alt} label={`Pause the ${m.label.toLowerCase()} sample`} />
            </div>
            <figcaption className="mode-provenance">{provenanceOf(m.clip)}.{m.clip.note ? ` ${m.clip.note}.` : ""}</figcaption>
          </figure>
          <div className="mode-copy">
            <span className="mode-models">{m.models}</span>
            <h3>{m.title}</h3>
            <p>{m.copy}</p>
            {m.clip.inputs?.length ? (
              <div className="mode-inputs">
                <span>Rendered from</span>
                {m.clip.inputs.map((input) => (
                  <figure key={input.src}>
                    <img src={input.src} alt={input.alt} loading="lazy" decoding="async" />
                    <figcaption>{input.role}</figcaption>
                  </figure>
                ))}
              </div>
            ) : null}
            <div className="mode-actions">
              <a className="ocean-button button-dark" href={m.cta.href}>{m.cta.label}<ArrowUpRight size={17} /></a>
              {m.secondary && <a className="text-link" href={m.secondary.href}>{m.secondary.label}<ArrowUpRight size={15} /></a>}
            </div>
          </div>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
