import { useEffect, useRef } from 'react';

/* Procedural sky: domain-warped fractal noise, shaded like real cumulus (lit edge, soft underside), drifting with the wind.
   Rendered at half resolution in one fragment shader, paused off screen, so it costs almost nothing. */

const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }';
const FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes; uniform float uTime; uniform vec3 uShade; uniform vec3 uLit; uniform float uCover; uniform float uAlpha; uniform float uSpeed;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h(i), h(i + vec2(1., 0.)), f.x), mix(h(i + vec2(0., 1.)), h(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++) { v += a * n(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; float asp = uRes.x / uRes.y; vec2 p = vec2(uv.x * asp, uv.y) * vec2(1.7, 3.4);
  float t = uTime * .02 * uSpeed;
  vec2 q = vec2(fbm(p + vec2(t, 0.)), fbm(p + vec2(5.2, 1.3) - t * .6));
  vec2 w = p + 1.05 * q + vec2(t * 1.6, 0.);
  float f = fbm(w), f2 = fbm(w + vec2(.05, .08));
  float c = smoothstep(uCover - .05, uCover + .15, f);
  float shade = clamp((f - f2) * 7. + .52, 0., 1.);
  vec3 col = mix(uShade, uLit, shade);
  float vert = smoothstep(.0, .5, uv.y) * (1. - smoothstep(.86, 1., uv.y)); float side = smoothstep(0., .22, uv.x) * (1. - smoothstep(.78, 1., uv.x));
  float a = c * uAlpha * (.25 + .75 * vert) * side;
  gl_FragColor = vec4(col * a, a);
}`;

type Props = { className?: string; shade?: [number, number, number]; lit?: [number, number, number]; cover?: number; alpha?: number; speed?: number };

export function Clouds({ className, shade = [0.78, 0.8, 0.92], lit = [1, 1, 1], cover = 0.5, alpha = 0.9, speed = 1 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: 'low-power' }); if (!gl) return;
    const mk = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn('Clouds shader:', gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram()!; gl.attachShader(pr, mk(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, mk(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return; gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (k: string) => gl.getUniformLocation(pr, k);
    gl.uniform3f(U('uShade'), ...shade); gl.uniform3f(U('uLit'), ...lit); gl.uniform1f(U('uCover'), cover); gl.uniform1f(U('uAlpha'), alpha); gl.uniform1f(U('uSpeed'), speed);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const size = () => { const r = cv.getBoundingClientRect(); cv.width = Math.max(2, Math.round(r.width * 0.5)); cv.height = Math.max(2, Math.round(r.height * 0.5)); gl.viewport(0, 0, cv.width, cv.height); gl.uniform2f(U('uRes'), cv.width, cv.height); };
    size(); const ro = new ResizeObserver(size); ro.observe(cv);
    let vis = true, raf = 0, last = 0; const t0 = performance.now(); const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; }); io.observe(cv);
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw); if (!vis || document.hidden || now - last < 33) return; last = now;
      gl.uniform1f(U('uTime'), reduce ? 40 : (now - t0) / 1000 + 40); gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [shade, lit, cover, alpha, speed]);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
