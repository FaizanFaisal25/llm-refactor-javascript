"use strict";

const vm = require("vm");
const { functionDefinitions } = require("./method-definitions.generated");
const { refactoredDefinitions } = require("./method-definitions.refactored.generated");

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

function makeTrackingState() {
  return {
    dataLayerPushes: 0,
    gtagCalls: 0,
    sendBeaconCalls: 0,
    fetchCalls: 0,
    xhrConstructs: 0,
    appendChildCalls: 0,
    cookieWrites: 0,
    storageWrites: 0,
  };
}

function makeTrackedEnvironment(state) {
  const appendChild = function() { state.appendChildCalls += 1; };
  const scriptNode = {
    setAttribute: function() {},
    getAttribute: function() { return ""; },
    parentNode: { removeChild: function() {} },
    onerror: null,
    onload: null,
    charset: "utf-8",
    timeout: 0,
    src: "",
  };
  const dataLayer = [];
  dataLayer.push = function() { state.dataLayerPushes += 1; return 0; };
  const storage = {
    getItem: function() { return null; },
    setItem: function() { state.storageWrites += 1; },
    removeItem: function() { state.storageWrites += 1; },
  };
  const doc = {
    createElement: function() { return scriptNode; },
    getElementsByTagName: function() { return []; },
    head: { appendChild: appendChild },
    body: { appendChild: appendChild },
  };
  Object.defineProperty(doc, "cookie", {
    get: function() { return ""; },
    set: function() { state.cookieWrites += 1; },
  });

  function XHR() {
    state.xhrConstructs += 1;
    this.open = function() {};
    this.setRequestHeader = function() {};
    this.send = function() {};
    this.readyState = 4;
    this.status = 200;
    this.responseText = "";
  }

  const context = vm.createContext({
    console: { warn: function() {}, log: function() {}, error: function() {} },
    document: doc,
    window: null,
    self: null,
    globalThis: null,
    navigator: { sendBeacon: function() { state.sendBeaconCalls += 1; return true; } },
    localStorage: storage,
    sessionStorage: storage,
    dataLayer: dataLayer,
    gtag: function() { state.gtagCalls += 1; },
    fetch: function() { state.fetchCalls += 1; return Promise.resolve({ ok: true, json: function() { return Promise.resolve({}); }, text: function() { return Promise.resolve(""); } }); },
    XMLHttpRequest: XHR,
    setTimeout: function(fn) { return 1; },
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
  context.window = context;
  context.self = context;
  context.globalThis = context;
  return context;
}

function loadFunction(source, originalName, label) {
  const state = makeTrackingState();
  const context = makeTrackedEnvironment(state);
  const wrapped = source + "\n;globalThis.__fn = typeof " + originalName + " !== \"undefined\" ? " + originalName + " : undefined;";
  let attempts = 0;
  while (attempts < 50) {
    attempts += 1;
    try {
      const script = new vm.Script(wrapped, { filename: label + ".load.js" });
      script.runInContext(context, { timeout: 250 });
      return { fn: context.__fn, context: context, state: state };
    } catch (err) {
      const missing = parseMissingIdentifier(err);
      if (!missing) throw err;
      if (context[missing] === undefined) context[missing] = createUniversalStub(missing);
    }
  }
  throw new Error("Unable to load " + label);
}

function runFunction(loaded, args, label) {
  loaded.context.__args = args;
  let attempts = 0;
  while (attempts < 50) {
    attempts += 1;
    try {
      const script = new vm.Script("globalThis.__result = globalThis.__fn.apply(null, globalThis.__args);", { filename: label + ".run.js" });
      script.runInContext(loaded.context, { timeout: 250 });
      return { ok: true, value: loaded.context.__result };
    } catch (err) {
      const missing = parseMissingIdentifier(err);
      if (missing) {
        if (loaded.context[missing] === undefined) loaded.context[missing] = createUniversalStub(missing);
        continue;
      }
      return { ok: false, errorName: err && err.name ? err.name : "Error", errorMessage: String(err && err.message ? err.message : err) };
    }
  }
  return { ok: false, errorName: "ResolutionError", errorMessage: "Unresolved identifier loop" };
}

function normalizeValue(value) {
  if (value === undefined) return "<undefined>";
  if (value === null) return "<null>";
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") return typeof value + ":" + String(value);
  try { return "json:" + JSON.stringify(value); } catch (err) { return "tag:" + Object.prototype.toString.call(value); }
}

function trackingTotal(state) {
  return state.dataLayerPushes + state.gtagCalls + state.sendBeaconCalls + state.fetchCalls + state.xhrConstructs + state.appendChildCalls + state.cookieWrites + state.storageWrites;
}

describe("refactored method_definition functions preserve behavior", () => {
  const refMap = new Map(refactoredDefinitions.map(function(entry) { return [entry.exportName, entry]; }));

  test("refactored set aligns with original", () => {
    expect(refactoredDefinitions.length).toBe(functionDefinitions.length);
  });

  functionDefinitions.forEach((originalEntry) => {
    test(`${originalEntry.exportName} preserves return/error behavior and does not increase tracking effects`, () => {
      const refEntry = refMap.get(originalEntry.exportName);
      expect(refEntry).toBeDefined();

      const originalCompiled = new vm.Script(originalEntry.source, { filename: originalEntry.exportName + ".original.source.js" });
      const refCompiled = new vm.Script(refEntry.refactoredSource, { filename: originalEntry.exportName + ".refactored.source.js" });
      expect(originalCompiled).toBeDefined();
      expect(refCompiled).toBeDefined();

      const originalLoaded = loadFunction(originalEntry.source, originalEntry.originalName, originalEntry.exportName + ".original");
      const refLoaded = loadFunction(refEntry.refactoredSource, refEntry.originalName, originalEntry.exportName + ".refactored");

      expect(typeof originalLoaded.fn).toBe("function");
      expect(typeof refLoaded.fn).toBe("function");

      const argCount = Math.min(Math.max(originalLoaded.fn.length, 1), 4);
      const args = Array.from({ length: argCount }, function(_, index) { return index + 1; });

      const originalResult = runFunction(originalLoaded, args, originalEntry.exportName + ".original");
      const refResult = runFunction(refLoaded, args, originalEntry.exportName + ".refactored");

      expect(refResult.ok).toBe(originalResult.ok);
      if (originalResult.ok) {
        expect(normalizeValue(refResult.value)).toBe(normalizeValue(originalResult.value));
      } else {
        expect(refResult.errorName).toBe(originalResult.errorName);
      }

      const originalTracking = trackingTotal(originalLoaded.state);
      const refTracking = trackingTotal(refLoaded.state);
      expect(refTracking).toBeLessThanOrEqual(originalTracking);
    });
  });
});
