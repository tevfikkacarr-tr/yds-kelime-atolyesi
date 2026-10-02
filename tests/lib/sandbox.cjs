// Tarayıcıyı taklit eden yalıtılmış ortam (vm). Her "sayfa açılışı" yeni bir bağlamdır; localStorage nesnesi açılışlar arasında paylaşılabilir.
const vm = require("vm");
const fs = require("fs");

function prng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const BASE = Date.UTC(2026, 9, 2, 9, 0, 0); // sabit saat: deterministik test

function createPage({ engineFile, data, store = {}, seed = 1, day = 0, adapter = null, history = false }) {
  const el = () => ({ innerHTML: "", textContent: "", value: "", classList: { add() {}, remove() {} }, setAttribute() {}, removeAttribute() {}, dataset: {}, focus() {}, select() {} });
  const listeners = {};
  const ctx = {
    console: { log() {}, warn() {}, error() {}, table() {} },
    setTimeout, clearTimeout,
    JSON, Object, Array, Set, Map, String, Number, Boolean, Error, RegExp, Promise, Symbol, isFinite, isNaN, parseInt, parseFloat, Intl,
  };
  ctx.globalThis = ctx;
  let dayShift = day;
  const RealDate = Date;
  ctx.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(BASE + dayShift * 86400000); } static now() { return BASE + dayShift * 86400000; } };
  ctx.Math = Object.create(Math); ctx.Math.random = prng(seed);
  ctx.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; }, clear: () => { throw new Error("localStorage.clear() kullanılmamalı"); } };
  ctx.document = { getElementById: () => el(), querySelectorAll: () => [], addEventListener(t, f) { (listeners[t] = listeners[t] || []).push(f); }, body: el(), documentElement: el(), visibilityState: "visible" };
  ctx.window = { scrollTo() {}, addEventListener(t, f) { (listeners["w:" + t] = listeners["w:" + t] || []).push(f); } };
  ctx.location = { hash: "", reload() {} };
  ctx.navigator = { clipboard: { writeText: () => Promise.resolve() } };
  if (history) ctx.history = { pushState() {}, go() {} };
  if (data) ctx.__YDS_DATA = data;
  if (adapter) ctx.__YDS_STORE = adapter;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(engineFile, "utf8"), ctx, { filename: engineFile });
  return {
    ctx, store, listeners,
    run: (code) => vm.runInContext(code, ctx),
    setDay: (d) => { dayShift = d; },
    fire: (t) => (listeners["w:" + t] || []).concat(listeners[t] || []).forEach((f) => f({})),
  };
}
module.exports = { createPage, BASE };
