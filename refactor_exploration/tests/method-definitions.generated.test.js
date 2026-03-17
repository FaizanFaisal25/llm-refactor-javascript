"use strict";

const vm = require("vm");
const { functionDefinitions } = require("./method-definitions.generated");

function parseMissingIdentifier(err) {
  if (!err || !err.message) {
    return null;
  }
  const match = /^([A-Za-z_$][\w$]*) is not defined$/.exec(err.message.trim());
  return match ? match[1] : null;
}

function createUniversalStub(name, tracker) {
  const fn = function(...args) {
    tracker.calls.push({ name: name, args: args.length });
    return 0;
  };

  const proxy = new Proxy(fn, {
    get(target, prop) {
      if (prop === Symbol.toPrimitive) {
        return function() {
          return 0;
        };
      }
      if (prop === "valueOf") {
        return function() {
          return 0;
        };
      }
      if (prop === "toString") {
        return function() {
          return "[stub " + name + "]";
        };
      }
      if (prop === "then") {
        return undefined;
      }
      return proxy;
    },
    set() {
      return true;
    },
    apply(target, thisArg, args) {
      tracker.calls.push({ name: name, args: args.length });
      return 0;
    },
    construct() {
      return {};
    },
  });

  return proxy;
}

function compileSource(source, fileLabel) {
  return new vm.Script(source, { filename: fileLabel });
}

function loadFunction(entry) {
  const tracker = { calls: [] };
  const context = vm.createContext({});
  const wrapped =
    entry.source +
    "\n;globalThis.__extracted = typeof " +
    entry.originalName +
    " !== \"undefined\" ? " +
    entry.originalName +
    " : undefined;";

  let attempt = 0;
  const maxAttempts = 40;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const script = new vm.Script(wrapped, { filename: entry.exportName + ".js" });
      script.runInContext(context, { timeout: 250 });
      return { fn: context.__extracted, context: context, tracker: tracker };
    } catch (err) {
      const missing = parseMissingIdentifier(err);
      if (!missing) {
        throw err;
      }
      if (context[missing] === undefined) {
        context[missing] = createUniversalStub(missing, tracker);
      }
    }
  }

  throw new Error("Failed to resolve missing identifiers for " + entry.exportName);
}

function invokeWithAutoStubs(context, tracker, args, label) {
  context.__args = args;

  let attempt = 0;
  const maxAttempts = 40;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const runScript = new vm.Script(
        "globalThis.__result = globalThis.__extracted.apply(null, globalThis.__args);",
        { filename: label + ".invoke.js" }
      );
      runScript.runInContext(context, { timeout: 250 });
      return { ok: true, value: context.__result };
    } catch (err) {
      const missing = parseMissingIdentifier(err);
      if (missing) {
        if (context[missing] === undefined) {
          context[missing] = createUniversalStub(missing, tracker);
        }
        continue;
      }
      return {
        ok: false,
        errorName: err && err.name ? err.name : "Error",
        errorMessage: err && err.message ? err.message : String(err),
      };
    }
  }

  return {
    ok: false,
    errorName: "ResolutionError",
    errorMessage: "Exceeded unresolved identifier retry budget",
  };
}

function normalizeValue(value) {
  if (value === undefined) {
    return "<undefined>";
  }
  if (value === null) {
    return "<null>";
  }
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") {
    return typeof value + ":" + String(value);
  }
  try {
    return "json:" + JSON.stringify(value);
  } catch (err) {
    return "tag:" + Object.prototype.toString.call(value);
  }
}

describe("generated method_definition functions", () => {
  test("has extracted functions", () => {
    expect(Array.isArray(functionDefinitions)).toBe(true);
    expect(functionDefinitions.length).toBeGreaterThan(0);
  });

  functionDefinitions.forEach((entry) => {
    test(`${entry.exportName} compiles, loads, and behaves deterministically`, () => {
      const compiled = compileSource(entry.source, entry.exportName + ".source.js");
      expect(compiled).toBeDefined();

      const loaded = loadFunction(entry);
      const fn = loaded.fn;
      expect(typeof fn).toBe("function");

      expect(Number.isInteger(fn.length)).toBe(true);
      expect(fn.length).toBeGreaterThanOrEqual(0);

      const argCount = Math.min(Math.max(fn.length, 1), 4);
      const args = Array.from({ length: argCount }, function(_, index) {
        return index + 1;
      });

      const first = invokeWithAutoStubs(loaded.context, loaded.tracker, args, entry.exportName + ".first");
      const second = invokeWithAutoStubs(loaded.context, loaded.tracker, args, entry.exportName + ".second");

      expect(second.ok).toBe(first.ok);
      if (first.ok) {
        expect(normalizeValue(second.value)).toBe(normalizeValue(first.value));
      } else {
        expect(second.errorName).toBe(first.errorName);
      }

      expect(Array.isArray(loaded.tracker.calls)).toBe(true);
    });
  });
});
