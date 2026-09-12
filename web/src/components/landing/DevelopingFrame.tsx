"use client";

import { useEffect, useRef } from "react";

import styles from "./DevelopingFrame.module.css";

/*
 * The hero: a procedural still that "develops" like a print in a tray.
 * Under the safelight the shadows come up first, then the midtones; the tray
 * settles, the tungsten light comes on, and the keeper lights the lamp.
 * WebGL1, one full-screen triangle, paused offscreen and when the tab is hidden.
 */

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() { v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_expose;
uniform float u_develop;
uniform float u_agitate;
uniform float u_light;
uniform float u_lamp;
uniform float u_push;
varying vec2 v_uv;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}

const float HORIZON = 0.40;

float cliffAt(float x) {
  return HORIZON + 0.25 * smoothstep(0.44, 0.03, x) + 0.018 * fbm(vec2(x * 16.0, 3.1)) - 0.008;
}

vec3 scene(vec2 uv, float t, float aspect) {
  float x = uv.x, y = uv.y;
  vec2 p = vec2(x * aspect, y);
  vec2 sun = vec2(0.70, HORIZON + 0.03);

  // Dusk sky
  float sy = clamp((y - HORIZON) / (1.0 - HORIZON), 0.0, 1.0);
  vec3 col = mix(vec3(0.98, 0.60, 0.28), vec3(0.45, 0.25, 0.20), smoothstep(0.0, 0.32, sy));
  col = mix(col, vec3(0.09, 0.10, 0.14), smoothstep(0.28, 1.0, sy));
  float r = length(vec2((x - sun.x) * aspect, y - sun.y));
  col += vec3(1.0, 0.58, 0.26) * 0.6 * exp(-r * 6.5);
  col += vec3(1.0, 0.86, 0.62) * smoothstep(0.036, 0.029, r) * step(HORIZON, y);

  // Clouds, lit from below
  float c = fbm(vec2(x * aspect * 1.3 + t * 0.006, y * 8.0));
  float band = smoothstep(0.47, 0.8, c) * smoothstep(HORIZON + 0.02, HORIZON + 0.14, y);
  vec3 lit = mix(vec3(0.22, 0.12, 0.12), vec3(1.0, 0.64, 0.38), exp(-abs(x - sun.x) * 2.4) * (1.0 - sy * 0.8));
  col = mix(col, lit, band * 0.8);

  // Sea
  if (y < HORIZON) {
    float sd = (HORIZON - y) / HORIZON;
    float w = fbm(vec2(p.x * 2.2 + t * 0.012, y * 55.0 / (0.25 + sd) * 0.25 - t * 0.06));
    vec3 sea = mix(vec3(0.40, 0.23, 0.17), vec3(0.035, 0.035, 0.045), smoothstep(0.0, 0.75, sd));
    sea *= 0.7 + 0.55 * w;
    float path = exp(-pow((x - sun.x) * aspect / (0.035 + sd * 0.28), 2.0));
    float sparkle = smoothstep(0.64, 0.92, noise(vec2(p.x * 95.0, y * 280.0 + t * 0.7)));
    sea += vec3(1.0, 0.68, 0.36) * path * (0.22 + sparkle * 1.3) * (1.0 - sd * 0.55);
    col = sea;
  }

  // Headland
  float cliff = cliffAt(x);
  float land = smoothstep(cliff + 0.0025, cliff - 0.0025, y);
  vec3 landCol = vec3(0.03, 0.026, 0.026) + vec3(0.30, 0.13, 0.06) * 0.12 * smoothstep(cliff - 0.05, cliff, y);
  col = mix(col, landCol, land);

  // Lighthouse
  float lx = 0.155;
  float base = cliffAt(lx) - 0.01;
  float towerH = 0.25;
  float ty = (y - base) / towerH;
  float halfW = mix(0.024, 0.016, clamp(ty, 0.0, 1.0));
  float tower = step(0.0, ty) * step(ty, 1.0) * step(abs(p.x - lx * aspect), halfW);
  vec3 towerCol = vec3(0.05, 0.045, 0.045) + 0.035 * step(0.5, fract(ty * 4.0)) + vec3(0.25, 0.12, 0.05) * 0.2 * smoothstep(-0.02, 0.02, p.x - lx * aspect);
  col = mix(col, towerCol, tower);
  vec2 lamp = vec2(lx * aspect, base + towerH + 0.02);
  float room = step(abs(p.x - lamp.x), 0.021) * step(abs(y - lamp.y), 0.02);
  col = mix(col, vec3(0.07, 0.06, 0.055), room);
  float capY = y - (lamp.y + 0.02);
  float cap = step(0.0, capY) * step(capY, 0.026) * step(abs(p.x - lamp.x), 0.026 - capY * 0.95);
  col = mix(col, vec3(0.035), cap);

  // The lamp and its beam
  vec2 d = p - lamp;
  float lr = length(d);
  float glow = smoothstep(0.017, 0.004, lr) * 1.6 + exp(-lr * 16.0) * 0.55;
  col += u_lamp * vec3(1.0, 0.8, 0.5) * glow;
  float ang = atan(d.y, d.x);
  float sweep = sin(t * 0.45) * 0.28 - 0.06;
  float beam = exp(-pow((ang - sweep) / 0.07, 2.0)) * smoothstep(0.015, 0.06, lr) * exp(-lr * 0.8);
  col += u_lamp * vec3(1.0, 0.82, 0.55) * beam * 0.42 * (1.0 - land);
  // Halation around bright points, as on film
  col += vec3(0.55, 0.12, 0.05) * (exp(-r * 12.0) * 0.25 + u_lamp * exp(-lr * 10.0) * 0.3);
  return col;
}

void main() {
  float aspect = u_res.x / u_res.y;
  vec2 uv = (v_uv - 0.5) / (1.0 + 0.04 * u_push) + 0.5;
  uv += u_agitate * 0.006 * vec2(sin(uv.y * 17.0 + u_time * 2.1), cos(uv.x * 13.0 + u_time * 1.6));

  vec3 img = clamp(scene(uv, u_time, aspect), 0.0, 1.0);
  float L = dot(img, vec3(0.299, 0.587, 0.114));
  float D = 1.0 - L;

  // Development: dense (shadow) areas appear first, broken up so it never reads as a threshold.
  float n = fbm(uv * vec2(aspect, 1.0) * 5.0 + 3.0);
  float dev = clamp((u_develop * 1.38 - (1.0 - D) * 0.92 - (n - 0.5) * 0.2) / 0.34, 0.0, 1.0);
  dev = dev * dev * (3.0 - 2.0 * dev);

  vec3 paper = vec3(0.31, 0.085, 0.055);
  vec3 safelit = paper * (1.0 - D * dev * 0.97);
  safelit += paper * u_agitate * 0.08 * noise(uv * vec2(aspect, 1.0) * 9.0 + u_time * 0.4);
  vec3 graded = pow(img, vec3(1.05)) * vec3(1.05, 0.98, 0.88);
  vec3 col = mix(safelit, graded, u_light) * u_expose;

  vec2 q = v_uv - 0.5;
  col *= 1.0 - dot(q * vec2(0.9, 1.5), q * vec2(0.9, 1.5)) * 0.7;
  col += (hash(v_uv * u_res + fract(u_time * 7.13) * 91.0) - 0.5) * 0.055;
  gl_FragColor = vec4(col, 1.0);
}
`;

const FINAL_T = 9.5;

function seg(t: number, a: number, b: number): number {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

function timeline(t: number) {
  return {
    expose: seg(t, 0.1, 1.3),
    develop: seg(t, 0.9, 5.8),
    agitate: seg(t, 0.6, 1.4) * (1 - seg(t, 3.8, 6.2)),
    light: seg(t, 5.9, 7.4),
    lamp: seg(t, 7.3, 8.1),
    push: Math.min(1, t / 50),
  };
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * `background` fills its container edge to edge and drops the film-edge strip: that mode is
 * the hero's stand-in until real footage exists, where a caption and a replay control would
 * collide with the headline.
 */
export function DevelopingFrame({ background = false }: { background?: boolean } = {}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const replayRef = useRef<() => void>(() => {});

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    const vs = gl && compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = gl && compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const program = gl && vs && fs ? gl.createProgram() : null;
    if (!gl || !program || !vs || !fs) {
      wrap.dataset.phase = "fallback";
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      wrap.dataset.phase = "fallback";
      return;
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (name: string) => gl.getUniformLocation(program, name);
    const uni = {
      res: u("u_res"),
      time: u("u_time"),
      expose: u("u_expose"),
      develop: u("u_develop"),
      agitate: u("u_agitate"),
      light: u("u_light"),
      lamp: u("u_lamp"),
      push: u("u_push"),
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let start = performance.now();
    let raf = 0;
    let onscreen = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const draw = (now: number) => {
      resize();
      const t = reduce ? FINAL_T : (now - start) / 1000;
      const k = timeline(t);
      gl.uniform2f(uni.res, canvas.width, canvas.height);
      gl.uniform1f(uni.time, reduce ? 4 : t);
      gl.uniform1f(uni.expose, k.expose);
      gl.uniform1f(uni.develop, k.develop);
      gl.uniform1f(uni.agitate, k.agitate);
      gl.uniform1f(uni.light, k.light);
      gl.uniform1f(uni.lamp, k.lamp);
      gl.uniform1f(uni.push, reduce ? 0 : k.push);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const phase = k.light > 0.5 ? "lit" : k.expose > 0 ? "developing" : "dark";
      if (wrap.dataset.phase !== phase) wrap.dataset.phase = phase;
    };

    const loop = (now: number) => {
      draw(now);
      raf = onscreen && !reduce && document.visibilityState === "visible" ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const onContextLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      raf = 0;
      wrap.dataset.phase = "fallback";
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    const io = new IntersectionObserver(([entry]) => {
      onscreen = entry.isIntersecting;
      if (onscreen) kick();
    });
    io.observe(canvas);
    const ro = new ResizeObserver(() => kick());
    ro.observe(canvas);
    const onVisibility = () => {
      if (document.visibilityState === "visible") kick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    replayRef.current = () => {
      start = performance.now();
      kick();
    };
    kick();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      replayRef.current = () => {};
      // Free this run's GL objects, but keep the context alive: a canvas only ever
      // hands out one context, so losing it would leave a remount (React Strict Mode,
      // fast refresh) with a dead context and no picture.
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, []);

  return (
    <div ref={wrapRef} className={`${styles.frame} ${background ? styles.background : ""}`} data-phase="dark">
      <div className={styles.gate}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        <div className={styles.fallback} aria-hidden="true" />
        <p className="sr-only">
          An illustration: a lighthouse on a headland at dusk slowly develops out of darkness, like a photographic print.
        </p>
      </div>
      {!background && (
        <div className={styles.edge}>
          <span className="mono" aria-hidden="true">
            KW 5219 ▸ 047 · 2.39:1
          </span>
          <span className={styles.caption}>A procedural still, developed live in your browser — not a model output.</span>
          <button type="button" className={styles.replay} onClick={() => replayRef.current()}>
            Develop again
          </button>
        </div>
      )}
    </div>
  );
}
