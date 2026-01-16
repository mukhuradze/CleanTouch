// CleanTouch landing — static, GitHub Pages ready
// Three.js + custom shader (grain + ordered dither) + GSAP motion

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const CONTACT_EMAIL = "hello@cleantouch.example"; // <-- change this to your real email

const canvas = document.getElementById("webgl");
const fallbackEl = document.getElementById("webgl-fallback");

// Mobile menu
const nav = document.querySelector(".nav");
const navToggle = document.getElementById("navToggle");
navToggle?.addEventListener("click", () => {
  const open = nav.classList.toggle("mobile-open");
  navToggle.setAttribute("aria-expanded", String(open));
});

// Form -> mailto (no backend)
const form = document.getElementById("quoteForm");
form?.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(form);

  const company = String(fd.get("company") || "").trim();
  const name = String(fd.get("name") || "").trim();
  const email = String(fd.get("email") || "").trim();
  const details = String(fd.get("details") || "").trim();

  const subject = encodeURIComponent(`CleanTouch wholesale inquiry${company ? " — " + company : ""}`);
  const body = encodeURIComponent(
`Hello CleanTouch,

Company: ${company || "-"}
Contact: ${name || "-"}
Email: ${email || "-"}

Request:
${details || "-"}

Thanks.`
  );

  window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
});

// GSAP entry motion
const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
function runIntroMotion() {
  if (typeof gsap === "undefined" || prefersReducedMotion) return;

  gsap.set(["#heroPill", "#heroTitle", "#heroSub", "#heroCta", "#heroMetrics"], { autoAlpha: 0, y: 14 });

  gsap.timeline({ defaults: { ease: "power2.out" } })
    .to("#heroPill", { autoAlpha: 1, y: 0, duration: 0.7, delay: 0.1 })
    .to("#heroTitle", { autoAlpha: 1, y: 0, duration: 0.9 }, "-=0.35")
    .to("#heroSub", { autoAlpha: 1, y: 0, duration: 0.8 }, "-=0.5")
    .to("#heroCta", { autoAlpha: 1, y: 0, duration: 0.7 }, "-=0.55")
    .to("#heroMetrics", { autoAlpha: 1, y: 0, duration: 0.8 }, "-=0.55");
}
runIntroMotion();

// WebGL detection
function isWebGLAvailable() {
  try {
    const test = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (test.getContext("webgl") || test.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

if (!isWebGLAvailable()) {
  if (fallbackEl) fallbackEl.hidden = false;
  canvas.style.display = "none";
} else {
  initWebGL();
}

function initWebGL() {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uGrain: { value: 1.0 },
    uDither: { value: 1.0 },
  };

  const vert = /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `;

  // Clean medical-industrial background:
  // soft blue/teal flow, visible grain + ordered dither
  const frag = /* glsl */`
    precision highp float;

    uniform float uTime;
    uniform vec2 uRes;
    uniform vec2 uMouse;
    uniform float uGrain;
    uniform float uDither;
    varying vec2 vUv;

    float hash(vec2 p){
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 34.345);
      return fract(p.x * p.y);
    }

    float noise(vec2 p){
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    // Bayer 4x4 ordered dither (0..1)
    float bayer4(vec2 p){
      int x = int(mod(p.x, 4.0));
      int y = int(mod(p.y, 4.0));
      int idx = x + y * 4;
      int m[16];
      m[0]=0;  m[1]=8;  m[2]=2;  m[3]=10;
      m[4]=12; m[5]=4;  m[6]=14; m[7]=6;
      m[8]=3;  m[9]=11; m[10]=1; m[11]=9;
      m[12]=15;m[13]=7; m[14]=13;m[15]=5;
      return float(m[idx]) / 16.0;
    }

    vec3 palette(float t){
      // White -> cool gray -> muted blue/teal accents
      vec3 base = vec3(0.96, 0.97, 0.99);
      vec3 cool = vec3(0.90, 0.93, 0.97);
      vec3 blue = vec3(0.27, 0.55, 1.00);
      vec3 teal = vec3(0.08, 0.72, 0.65);

      vec3 mid = mix(base, cool, smoothstep(0.0, 1.0, t));
      vec3 acc = mix(blue, teal, smoothstep(0.2, 1.0, t));
      return mix(mid, acc, 0.10);
    }

    void main(){
      vec2 uv = vUv;
      vec2 px = uv * uRes;

      float t = uTime * 0.08;

      // Flow field
      vec2 p = uv;
      p.x += 0.06 * sin(uv.y * 6.0 + t * 2.5);
      p.y += 0.05 * cos(uv.x * 5.0 - t * 2.2);

      float n1 = noise(p * 2.1 + t);
      float n2 = noise(p * 5.1 - t * 1.2);
      float field = 0.62*n1 + 0.38*n2;

      // Mouse soft highlight
      float md = distance(uv, uMouse);
      float glow = exp(-md * 7.0) * 0.10;

      // Vignette
      float v = smoothstep(1.2, 0.35, distance(uv, vec2(0.5)));

      vec3 col = palette(field);
      col += glow * vec3(0.20, 0.45, 1.00);
      col = mix(col, vec3(0.96, 0.97, 0.99), 0.20);
      col *= (0.88 + 0.12*v);

      // Grain
      float g = (hash(px + uTime) - 0.5) * 0.09 * uGrain;
      col += g;

      // Ordered dither
      float d = bayer4(px) - 0.5;
      col += d * 0.030 * uDither;

      // Mild curve
      col = pow(max(col, 0.0), vec3(0.98));

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  scene.add(mesh);

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);

    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    uniforms.uRes.value.set(w, h);
  }
  window.addEventListener("resize", resize);
  resize();

  // Mouse / touch (for subtle highlight)
  function setMouse(clientX, clientY) {
    uniforms.uMouse.value.set(clientX / window.innerWidth, 1.0 - clientY / window.innerHeight);
  }
  window.addEventListener("mousemove", (e) => setMouse(e.clientX, e.clientY), { passive: true });
  window.addEventListener("touchmove", (e) => {
    if (!e.touches?.length) return;
    setMouse(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  let raf = 0;
  const clock = new THREE.Clock();

  function animate() {
    raf = requestAnimationFrame(animate);
    uniforms.uTime.value += clock.getDelta();
    renderer.render(scene, camera);
  }
  animate();

  // Pause when tab is hidden (saves battery)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else {
      animate();
    }
  });
}
