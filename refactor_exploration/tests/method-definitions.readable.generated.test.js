"use strict";

const vm = require("vm");
const { functionDefinitions } = require("./method-definitions.generated");
const { readableDefinitions } = require("./method-definitions.readable.generated");

function parseMissingIdentifier(err) {
  if (!err || !err.message) return null;
  const match = /^([A-Za-z_$][\w$]*) is not defined$/.exec(String(err.message).trim());
  return match ? match[1] : null;
}

function createUniversalStub(name) {
  const fn = function() { return 0; };
  const proxy = new Proxy(fn, {
    get(target, prop) {
      if (prop === Symbol.toPrimitive) return function() { return 0; };
      if (prop === "valueOf") return function() { return 0; };
      if (prop === "toString") return function() { return "[stub " + name + "]"; };
      if (prop === "then") return undefined;
      return proxy;
    },
    set() { return true; },
    apply() { return 0; },
    construct() { return {}; },
  });
  return proxy;
}

function makeContext() {
  const ctx = vm.createContext({
    console: { warn: function() {}, log: function() {}, error: function() {} },
    window: null,
    self: null,
    globalThis: null,
    document: {
      createElement: function() { return { setAttribute: function(){}, getAttribute: function(){ return ""; }, parentNode: { removeChild: function(){} } }; },
      getElementsByTagName: function() { return []; },
      head: { appendChild: function() {} },
      body: { appendChild: function() {} },
    },
    navigator: { sendBeacon: function() { return true; } },
    localStorage: { getItem: function() { return null; }, setItem: function() {}, removeItem: function() {} },
    sessionStorage: { getItem: function() { return null; }, setItem: function() {}, removeItem: function() {} },
    dataLayer: { push: function() { return 0; } },
    gtag: function() {},
    fetch: function() { return Promise.resolve({ ok: true, json: function() { return Promise.resolve({}); }, text: function() { return Promise.resolve(""); } }); },
    XMLHttpRequest: function() { this.open = function() {}; this.setRequestHeader = function() {}; this.send = function() {}; },
    setTimeout: function() { return 1; },
    clearTimeout: function() {},
    Promise: Promise,
    Math: Math,
    Date: Date,
    JSON: JSON,
    RegExp: RegExp,
    Object: Object,
    Array: Array,
    Number: Number,
    String: String,
    Boolean: Boolean,
    Error: Error,
    TypeError: TypeError,
  });
  ctx.window = ctx;
  ctx.self = ctx;
  ctx.globalThis = ctx;
  return ctx;
}

function loadFn(source, fnName, label) {
  const context = makeContext();
  const wrapped = source + "\n;globalThis.__fn = typeof " + fnName + " !== \"undefined\" ? " + fnName + " : undefined;";
  let attempts = 0;
  while (attempts < 60) {
    attempts += 1;
    try {
      new vm.Script(wrapped, { filename: label + ".load.js" }).runInContext(context, { timeout: 250 });
      return { context: context, fn: context.__fn };
    } catch (err) {
      const missing = parseMissingIdentifier(err);
      if (!missing) throw err;
      if (context[missing] === undefined) context[missing] = createUniversalStub(missing);
    }
  }
  throw new Error("Could not load function " + label);
}

function runFn(loaded, args, label) {
  loaded.context.__args = args;
  let attempts = 0;
  while (attempts < 60) {
    attempts += 1;
    try {
      new vm.Script("globalThis.__out = globalThis.__fn.apply(null, globalThis.__args);", { filename: label + ".run.js" }).runInContext(loaded.context, { timeout: 250 });
      return { ok: true, value: loaded.context.__out };
    } catch (err) {
      const missing = parseMissingIdentifier(err);
      if (missing) {
        if (loaded.context[missing] === undefined) loaded.context[missing] = createUniversalStub(missing);
        continue;
      }
      return { ok: false, name: err && err.name ? err.name : "Error", message: String(err && err.message ? err.message : err) };
    }
  }
  return { ok: false, name: "ResolutionError", message: "unresolved identifier retry limit" };
}

function normalizeValue(value) {
  if (value === undefined) return "<undefined>";
  if (value === null) return "<null>";
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") return typeof value + ":" + String(value);
  try { return "json:" + JSON.stringify(value); } catch (err) { return "tag:" + Object.prototype.toString.call(value); }
}

describe("readable deobfuscation preserves behavior", () => {
  const readableByExport = new Map(readableDefinitions.map((entry) => [entry.exportName, entry]));

  test("readable definitions cover all originals", () => {
    expect(readableDefinitions.length).toBe(functionDefinitions.length);
  });

  readableDefinitions.forEach((entry) => {
    test(`${entry.exportName} contains readability metadata`, () => {
      expect(typeof entry.readableName).toBe("string");
      expect(entry.readableName.length).toBeGreaterThan(0);
      expect(typeof entry.obfuscatedIdentifierCount).toBe("number");
      expect(typeof entry.hexLiteralConversions).toBe("number");
    });
  });

  functionDefinitions.forEach((originalEntry) => {
    test(`${originalEntry.exportName} behavior matches readable variant`, () => {
      const readable = readableByExport.get(originalEntry.exportName);
      expect(readable).toBeDefined();

      const originalCompiled = new vm.Script(originalEntry.source, { filename: originalEntry.exportName + ".original.source.js" });
      const readableCompiled = new vm.Script(readable.readableSource, { filename: originalEntry.exportName + ".readable.source.js" });
      expect(originalCompiled).toBeDefined();
      expect(readableCompiled).toBeDefined();

      const originalLoaded = loadFn(originalEntry.source, originalEntry.originalName, originalEntry.exportName + ".original");
      const readableLoaded = loadFn(readable.readableSource, readable.readableName, originalEntry.exportName + ".readable");
      expect(typeof originalLoaded.fn).toBe("function");
      expect(typeof readableLoaded.fn).toBe("function");

      const argCount = Math.min(Math.max(originalLoaded.fn.length, 1), 4);
      const args = Array.from({ length: argCount }, function(_, index) { return index + 1; });
      const originalResult = runFn(originalLoaded, args, originalEntry.exportName + ".original");
      const readableResult = runFn(readableLoaded, args, originalEntry.exportName + ".readable");

      expect(readableResult.ok).toBe(originalResult.ok);
      if (originalResult.ok) {
        expect(normalizeValue(readableResult.value)).toBe(normalizeValue(originalResult.value));
      } else {
        expect(readableResult.name).toBe(originalResult.name);
      }
    });
  });
});
