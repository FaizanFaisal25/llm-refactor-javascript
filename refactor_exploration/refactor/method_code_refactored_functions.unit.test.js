const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

process.on('unhandledRejection', () => {});
process.on('uncaughtException', () => {});

function createUniversalStub(label) {
  const handler = {
    get(_target, prop) {
      if (prop === Symbol.toPrimitive) return () => 0;
      if (prop === 'valueOf') return () => 0;
      if (prop === 'toString') return () => `[Stub:${label}]`;
      if (prop === 'then') return undefined;
      return proxy;
    },
    apply() { return proxy; },
    construct() { return proxy; },
    has() { return true; },
    set() { return true; },
  };
  function stub() { return proxy; }
  const proxy = new Proxy(stub, handler);
  return proxy;
}

class FakePromise {
  constructor(executor) {
    if (typeof executor === 'function') {
      try { executor(() => {}, () => {}); } catch {}
    }
  }
  then() { return this; }
  catch() { return this; }
  finally() { return this; }
  static resolve() { return new FakePromise(); }
  static reject() { return new FakePromise(); }
}

function createSandbox(base = {}) {
  const target = Object.create(null);
  Object.assign(target, base);
  const noop = () => undefined;
  target.console = { log: noop, error: noop, warn: noop, info: noop, debug: noop };
  target.setTimeout = () => 0;
  target.clearTimeout = noop;
  target.setInterval = () => 0;
  target.clearInterval = noop;
  target.setImmediate = () => 0;
  target.clearImmediate = noop;
  target.queueMicrotask = noop;
  target.Promise = FakePromise;
  return new Proxy(target, {
    has() { return true; },
    get(obj, prop) {
      if (prop === Symbol.unscopables) return undefined;
      if (Object.prototype.hasOwnProperty.call(obj, prop)) return obj[prop];
      if (prop in globalThis) {
        const value = globalThis[prop];
        if (typeof value === 'function') return value.bind(globalThis);
        return value;
      }
      const stub = createUniversalStub(String(prop));
      obj[prop] = stub;
      return stub;
    },
    set(obj, prop, value) { obj[prop] = value; return true; },
  });
}

function normalize(value, depth = 0) {
  if (depth > 4) return '[MaxDepth]';
  if (value === undefined) return { type: 'undefined' }; 
  if (value === null) return null;
  const t = typeof value;
  if (t === 'number') {
    if (Number.isNaN(value)) return { type: 'number', value: 'NaN' }; 
    if (!Number.isFinite(value)) return { type: 'number', value: value > 0 ? 'Infinity' : '-Infinity' }; 
    return value;
  }
  if (t === 'string' || t === 'boolean') return value;
  if (t === 'bigint') return { type: 'bigint', value: String(value) };
  if (t === 'symbol') return { type: 'symbol', value: String(value) };
  if (t === 'function') return { type: 'function' };
  if (Array.isArray(value)) return value.slice(0, 10).map((v) => normalize(v, depth + 1));
  if (t === 'object') {
    const out = {};
    const keys = Object.keys(value).slice(0, 10);
    for (const key of keys) out[key] = normalize(value[key], depth + 1);
    return { type: 'object', value: out }; 
  }
  return { type: 'unknown', value: String(value) }; 
}

function runCase(source, args) {
  const sandbox = createSandbox();
  const context = vm.createContext({ sandbox });
  const scriptSource = `with (sandbox) {\n  const __fn = (${source});\n  const __args = ${JSON.stringify(args)};\n  __result = __fn(...__args);\n}`;
  try {
    new vm.Script(scriptSource, { displayErrors: true }).runInContext(context, { timeout: 100 });
    return { outcome: 'return', value: normalize(context.__result) }; 
  } catch (error) {
    return { outcome: 'throw', error: { name: error && error.name ? error.name : 'Error' } }; 
  }
}

function assertCase(actual, expected) {
  if (expected.outcome === 'throw') {
    assert.equal(actual.outcome, 'throw');
    assert.equal(actual.error && actual.error.name, expected.error.name);
    return;
  }
  assert.deepStrictEqual(actual, expected);
}

test("row 2 function 1 (ms)", () => {
  const source = "function (a) {\n      return a ? (Array.isArray(a) ? a : [a]) : [];\n    }";
  const args = [
  []
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 3 function 1 (ks)", () => {
  const source = "function ks(a, b, c, d) {\n      try {\n        var e;\n        return (e = ls(\n          function (f) {\n            return f === a;\n          },\n          b,\n          c,\n          d,\n        )[a]) != null\n          ? e\n          : [];\n      } finally {\n      }\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 4 function 1 (js)", () => {
  const source = "function js(a) {\n      return a.origin !== null;\n    }";
  const args = [
  {
    "origin": null
  }
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 5 function 1 (p)", () => {
  const source = "function p(e, t, r) {\n      var n = (0, c.T)(e) || t || r ? { next: e, error: t, complete: r } : e;\n      return n\n        ? (0, l.N)(function (e, t) {\n            var r,\n              i = !0;\n            e.subscribe(\n              (0, u._)(\n                t,\n                function (e) {\n                  t.next(e);\n                },\n                function () {\n                  i = !1;\n                  t.complete();\n                },\n                function (e) {\n                  i = !1;\n                  t.error(e);\n                },\n                function () {},\n              ),\n            );\n          })\n        : d.D;\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 6 function 1 (get)", () => {
  const source = "function (e, t) {\n      return null;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 7 function 1 (d)", () => {
  const source = "function d(e) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 8 function 1 (get)", () => {
  const source = "function (e, t) {\n      return null;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 9 function 1 (getDyid)", () => {
  const source = "function () {\n      return null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 10 function 1 (init)", () => {
  const source = "function () {\n      (c(), l());\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 11 function 1 (setupServerExperiments)", () => {
  const source = "function setupServerExperiments() {\n      if (\n        !DYO.URLUtils.isUrlContains(\"dy_disable=true\") &&\n        (DYO.logBlock.info(function () {\n          return \"DYO setupServerExperiments started\";\n        }, \"flow\"),\n        \"undefined\" != typeof DYExps && void 0 !== DYExps.oexps)\n      ) {\n        ((DYO.section = DYExps.section),\n          (DYO.oexps = experiments = DYExps.oexps),\n          (DYO.sectionFeatures = DYExps.sectionFeatures || {}),\n          (DYO.hooks = DYExps.hooks || {}),\n          (DYO.otags = smartTags = DYExps.otags),\n          (DYO.oevals = DYExps.oevals),\n          (DYO.dynamicVariablesV0 = DYExps.dynamicVariablesV0),\n          (DYO.smartVariableExperimentsMapV1 =\n            DYExps.smartVariableExperimentsMapV1),\n          (DYO.smartVariableExperimentsV1 = DYExps.smartVariableExperimentsV1),\n          (DYO.rcom = rcom = DYExps.rcom),\n          (DYO.translations = translations = DYExps.translations),\n          (DYO.sectionConfig = DYExps.sectionConfig),\n          (DYO.hosts = DYExps.hosts || {\n            st: \"st.dynamicyield.com\",\n            px: \"px.dynamicyield.com\",\n            rcom: \"rcom.dynamicyield.com\",\n            pii: \"opt.%s.dynamicyield.com\",\n            link: \"link.dynamicyield.com\",\n            metadata: \"https://gw.metadata.dynamicyield.com\",\n            cdn: \"cdn.dynamicyield.com\",\n            clientLogs: \"client-logs.dev-use1.dynamicyield.com/logs/client\",\n          }),\n          (DYO.logConfig = DYExps.logsConfiguration || {\n            percentage: 0,\n            level:\n              _src_harmony_logger_Logger_js__WEBPACK_IMPORTED_MODULE_0__.M.NONE,\n          }),\n          DYO.StorageUtilsInternal.init(DYO.section),\n          DYO.ActiveConsent.init(),\n          DYO.SessionUtils.setHybridSession(),\n          _src_harmony_st_STLoader_js__WEBPACK_IMPORTED_MODULE_1__.A.getState(),\n          setPreviewCookie(),\n          (DYO.ready = !0),\n          (DYO.setupTime = new Date().getTime()),\n          (DYO.chosenVariations = {}),\n          DYO._ready && DYO._ready());\n        try {\n          if (\n            window.location.search.indexOf(\"dyIsPreview=true\") > -1 ||\n            \"dy_preview_session\" === window.name ||\n            window.location.search.indexOf(\"dyPreview\") > -1\n          ) {\n            execAndEmbed();\n          } else execAndEmbed();\n        } catch (e) {\n          execAndEmbed();\n        }\n      }\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 12 function 1 (init)", () => {
  const source = "function () {\n      (c(), l(), null);\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 13 function 1 (init)", () => {
  const source = "function () {\n      (c(), l());\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 14 function 1 (apply)", () => {
  const source = "function (a, b) {\n      return this.Xd.apply(null, b);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 15 function 1 (evaluate)", () => {
  const source = "function (a) {\n      var b = this.R;\n      return Array.isArray(a) ? null : a;\n    }";
  const args = [
  []
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 16 function 1 (value)", () => {
  const source = "function () {\n      var e = this;\n      (_superPropGet(TargetedContent, \"init\", this, 3)([]),\n        null,\n        (0, _core_helpers_utility__WEBPACK_IMPORTED_MODULE_1__.al)() &&\n          ((this.mo = new window.MutationObserver(function (t) {\n            var r,\n              n = _createForOfIteratorHelper(t);\n            try {\n              for (n.s(); !(r = n.n()).done; ) {\n                \"childList\" === r.value.type && e.onTargetRenderingFinished();\n              }\n            } catch (e) {\n              n.e(e);\n            } finally {\n              n.f();\n            }\n          })),\n          this.mo.observe(this._el, { childList: !0 })));\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 17 function 1 (value)", () => {
  const source = "function () {\n      var e = this;\n      (_superPropGet(TargetedContent, \"init\", this, 3)([]),\n        null,\n        (0, _core_helpers_utility__WEBPACK_IMPORTED_MODULE_1__.al)() &&\n          ((this.mo = new window.MutationObserver(function (t) {\n            var r,\n              n = _createForOfIteratorHelper(t);\n            try {\n              for (n.s(); !(r = n.n()).done; ) {\n                \"childList\" === r.value.type && e.onTargetRenderingFinished();\n              }\n            } catch (e) {\n              n.e(e);\n            } finally {\n              n.f();\n            }\n          })),\n          this.mo.observe(this._el, { childList: !0 })));\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 18 function 1 (p)", () => {
  const source = "function p(e) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 19 function 1 (Ct)", () => {
  const source = "function (e, t) {\n      t = Re(t) ? t : {};\n      var r,\n        n,\n        i,\n        s,\n        p,\n        u,\n        l,\n        h = \"; \",\n        d = h + P.cookie + h,\n        m = d.split(h),\n        f = t.esc,\n        g = function (e) {\n          var t;\n          try {\n            (t = d.match(new RegExp(h + e + T + \"([^;]*)\" + h)))\n              ? ((t = t[1]),\n                (t = f ? unescape(t) : 0 == f ? t.replace(/%3B/g, I) : t))\n              : (t = a);\n          } catch (e) {\n            t = a;\n          }\n          return t;\n        };\n      if (Ce(e))\n        for (r = {}, n = 1; n < m[o] - 1; n++)\n          (i = (s = m[n].match(cRe)) ? s[1] : c) && i.match(e) && (r[i] = g(i));\n      else if (Re(e)) for (i in ((r = {}), e)) r[i] = g(i);\n      else r = g(e);\n      if (t.sort) {\n        for (i in (Re(r) || ((n = r), (r = {}), n != a && (r[e] = n)),\n        (l = []),\n        r))\n          l.push(i + \"='\" + (r[i] || c).replace(/'/g, \"\\'\") + \"'\");\n        for (n = l[o] - 1; n > 0; n--)\n          for (p = 0; p < n; p++)\n            ((u = p + 1),\n              l[p].localeCompare(l[u]) > 0 &&\n                ((i = l[p]), (l[p] = l[u]), (l[u] = i)));\n        r = l;\n      }\n      return r;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 20 function 1 (ot)", () => {
  const source = "function (r) {\n      var n = AAcn + \"q_\" + r,\n        o = nt(r);\n      return (o ? null : (o = (o = Ct(n)) == Y ? e : o == Q ? t : o || a), o);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 21 function 1 (Sa)", () => {
  const source = "function () {\n      var t;\n      try {\n        t = 0;\n      } catch (e) {}\n      return t || 0;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 22 function 1 (Aa)", () => {
  const source = "function () {\n      try {\n        Sa();\n      } catch (e) {}\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 23 function 1 (qt)", () => {
  const source = "function (r, n) {\n      var i, s, p, u, l, h;\n      for (i in (Pe(r) || (r = []), r)) {\n        if (\n          ((s = r[i]),\n          Re(s) || (s = r[i] = {}),\n          s.val && delete s.val,\n          (s.status = t),\n          (p = s.read),\n          (u = s.opt = Re(s.opt) ? s.opt : {}),\n          (s.svl = s.svc + c),\n          Ae(p) || ke(p) || Ce(p))\n        )\n          if (((l = s.val = Ct(p, u)), Re(l)))\n            for (p in l) De(l[p]) && (s.status = e);\n          else De(l) ? ((s.status = e), (s.val = { cn: l })) : (s.val = {});\n        ((s.svc = We(s.val)), u.req && (h = h || s.status));\n      }\n      return (r[o] && (r[0].reqFound = h == a || h), r);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 24 function 1 (g)", () => {
  const source = "function (e) {\n      var t;\n      try {\n        t = a;\n      } catch (e) {\n        t = a;\n      }\n      return t;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 25 function 1 (D)", () => {
  const source = "function () {\n      var r,\n        n,\n        i,\n        s,\n        p,\n        u,\n        l = \"DEBUG _O sync\",\n        h = 0,\n        d = 0,\n        m = !xdTLDxHP,\n        f = function (e) {\n          return \"\";\n        },\n        g = function (e) {},\n        b = function (e, t, a) {\n          setTimeout(y, 59);\n        },\n        v = function (a, r) {\n          var n,\n            o,\n            c,\n            i = t;\n          if (\n            S._A &&\n            S._A.constructor == Object &&\n            _A.isO(S._O) &&\n            _A.isO(_A.section) &&\n            _A.isA(r)\n          ) {\n            for (n in (_A.car(r), delete u, (u = []), r))\n              (o = _A.isO(r[n]) ? r[n] : {}).svc != o.svl &&\n                ((i = e), u.push(o));\n            i\n              ? xdTLDxHP\n                ? (c = e)\n                : (g(r), \"UDL\" == a && ((h = d = 0), (m = e)))\n              : xdTLDxHP ||\n                (d < 5e3\n                  ? ((d += 59), (h += 59) > 250 && (h = 0))\n                  : m && (m = t));\n          }\n          return !c;\n        },\n        y = function () {\n          try {\n            ((s = !s) ? v(\"OT\", fe) : v(\"UDL\", ge)) && setTimeout(y, 59);\n          } catch (t) {\n            p || (p = e);\n          }\n        },\n        w = function () {\n          ve();\n        },\n        D = function () {\n          (clearTimeout(r),\n            w(),\n            (function () {\n              var e;\n              for (e in ge) ge[e].svc = a;\n            })(),\n            y());\n        },\n        _ = function (e, t, a) {\n          D();\n        },\n        A = function () {\n          try {\n            xdTLDxHP ? (i = e) : g(fe);\n          } catch (e) {\n            i = t;\n          }\n          i || D();\n        },\n        x = function (e, t, a) {\n          A();\n        };\n      !pe && _A.isF(_A.car) && _A.isF(_A.caw) && _A.isF(_A.xdReq)\n        ? ((r = setTimeout(w, 3100)),\n          (function () {\n            try {\n              xdTLDxHP ? (n = e) : g(ge);\n            } catch (e) {\n              n = t;\n            }\n            n || A();\n          })())\n        : w();\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 26 function 1 (w)", () => {
  const source = "function () {\n      (null, ve(), _A.getSiteSection());\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 27 function 1 (D)", () => {
  const source = "function () {\n      var r,\n        n,\n        i,\n        s,\n        p,\n        u,\n        l = \"DEBUG _O sync\",\n        h = 0,\n        d = 0,\n        m = !xdTLDxHP,\n        f = function (e) {\n          return \"\";\n        },\n        g = function (e) {},\n        b = function (e, t, a) {\n          setTimeout(y, 59);\n        },\n        v = function (a, r) {\n          var n,\n            o,\n            c,\n            i = t;\n          if (\n            S._A &&\n            S._A.constructor == Object &&\n            _A.isO(S._O) &&\n            _A.isO(_A.section) &&\n            _A.isA(r)\n          ) {\n            for (n in (_A.car(r), delete u, (u = []), r))\n              (o = _A.isO(r[n]) ? r[n] : {}).svc != o.svl &&\n                ((i = e), u.push(o));\n            i\n              ? xdTLDxHP\n                ? (c = e)\n                : (g(r), \"UDL\" == a && ((h = d = 0), (m = e)))\n              : xdTLDxHP ||\n                (d < 5e3\n                  ? ((d += 59), (h += 59) > 250 && (h = 0))\n                  : m && (m = t));\n          }\n          return !c;\n        },\n        y = function () {\n          try {\n            ((s = !s) ? v(\"OT\", fe) : v(\"UDL\", ge)) && setTimeout(y, 59);\n          } catch (t) {\n            p || (p = e);\n          }\n        },\n        w = function () {\n          ve();\n        },\n        D = function () {\n          (clearTimeout(r),\n            w(),\n            (function () {\n              var e;\n              for (e in ge) ge[e].svc = a;\n            })(),\n            y());\n        },\n        _ = function (e, t, a) {\n          D();\n        },\n        A = function () {\n          try {\n            xdTLDxHP ? (i = e) : g(fe);\n          } catch (e) {\n            i = t;\n          }\n          i || D();\n        },\n        x = function (e, t, a) {\n          A();\n        };\n      !pe && _A.isF(_A.car) && _A.isF(_A.caw) && _A.isF(_A.xdReq)\n        ? ((r = setTimeout(w, 3100)),\n          (function () {\n            try {\n              xdTLDxHP ? (n = e) : g(ge);\n            } catch (e) {\n              n = t;\n            }\n            n || A();\n          })())\n        : w();\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 28 function 1 (xt)", () => {
  const source = "function (e, t) {\n      var a,\n        r,\n        n,\n        i = \"\",\n        s = c,\n        p = function (e) {\n          return c;\n        };\n      if (((t = t == Tle), Ce(e))) {\n        for (a in ((s = {}), (r = i.split(I))))\n          (n = (n = r[a].split(T)) && n[o] > 0 ? Ie(n[0], 1) : c) &&\n            n.match(e) &&\n            (s[n] = c);\n        e = s;\n      }\n      if (Re(e)) {\n        for (a in e) e[a] = p(a);\n        s = e;\n      } else s = p(e);\n      return s;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 29 function 1 (X)", () => {
  const source = "function (e, t) {\n      return c;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 30 function 1 (ve)", () => {
  const source = "function (e) {\n      var t = typeof e;\n      return t != u\n        ? t\n        : e instanceof Date\n          ? h\n          : e instanceof RegExp || e.constructor === g.constructor\n            ? f\n            : e instanceof Array\n              ? l\n              : u;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 31 function 1 (w)", () => {
  const source = "function () {\n      (null, ve(), _A.getSiteSection());\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 32 function 1 (X)", () => {
  const source = "function (e, t) {\n      return c;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 33 function 1 (Lt)", () => {
  const source = "function (r, n, i, s) {\n      xe(n) && ((i = n), (n = a));\n      var p,\n        u,\n        l,\n        h,\n        d,\n        m,\n        f = Re(r) && Re(r.read) ? r : 0,\n        g = \"; \",\n        b = g + P.cookie + g,\n        v = function (a) {\n          var r,\n            n,\n            o,\n            i,\n            p = Ot(a);\n          if (p)\n            if (S._XDI) (Et(a, c), (p = Ot(a)));\n            else\n              for (r in l)\n                for (n in h)\n                  for (o in d)\n                    if (\n                      ((i = h[n]),\n                      (i = (Se(i) ? (i == c ? E.pathname : i) : c) || H),\n                      Et(a, c, t, i, l[r], t, c, t, 0),\n                      !(p = Ot(a)))\n                    )\n                      break;\n          return (\n            s &&\n              (p == t\n                ? console.log(\"deleted cookie\", a)\n                : p == e && console.log(\"cookie deletion failed\", a)),\n            p\n          );\n        };\n      if (\n        (f && ((n = Re(r.o) ? r.o : {}), (i = r.del), (r = r.read)),\n        (n = Re(n) ? n : {}),\n        i || !n.domain)\n      ) {\n        ((u = E.hostname.split(B)), (p = c), (l = []));\n        for (var y = u[o] - 1; y >= 0; y--)\n          ((p = u[y] + (p ? B + p : c)),\n            y < u[o] - 1 && (l.push(B + p), l.push(p)));\n        l.push(c);\n      } else l = [n.domain];\n      if (i || !n.path)\n        for (y in ((u = E.pathname.split(H)), (p = c), (h = []), u))\n          ((p += (1 != y ? H : c) + u[y]), (h[y] = p));\n      else h = [n.path];\n      if (((d = i || n.secure == a ? [t, e] : [n.secure]), Ce(r))) {\n        r = {};\n      }\n      if (Re(r)) {\n        for (p in r) r[p] = v(p);\n        return f || r;\n      }\n      return v(r);\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 34 function 1 (X)", () => {
  const source = "function (e, t) {\n      return c;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 35 function 1 (Ot)", () => {
  const source = "function (r) {\n      var n,\n        o = Ct(r),\n        c = t;\n      if (Re(o)) for (n in o) o[n] = t;\n      else c = o != a;\n      return c;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 36 function 1 (v)", () => {
  const source = "function (a) {\n      var r,\n        n,\n        o,\n        i,\n        p = null;\n      return (\n        s &&\n          (p == t\n            ? console.log(\"deleted cookie\", a)\n            : p == e && console.log(\"cookie deletion failed\", a)),\n        p\n      );\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 37 function 1 (Lt)", () => {
  const source = "function (r, n, i, s) {\n      xe(n) && ((i = n), (n = a));\n      var p,\n        u,\n        l,\n        h,\n        d,\n        m,\n        f = Re(r) && Re(r.read) ? r : 0,\n        g = \"; \",\n        b = g + P.cookie + g,\n        v = function (a) {\n          var r,\n            n,\n            o,\n            i,\n            p = Ot(a);\n          if (p)\n            if (S._XDI) (Et(a, c), (p = Ot(a)));\n            else\n              for (r in l)\n                for (n in h)\n                  for (o in d)\n                    if (\n                      ((i = h[n]),\n                      (i = (Se(i) ? (i == c ? E.pathname : i) : c) || H),\n                      Et(a, c, t, i, l[r], t, c, t, 0),\n                      !(p = Ot(a)))\n                    )\n                      break;\n          return (\n            s &&\n              (p == t\n                ? console.log(\"deleted cookie\", a)\n                : p == e && console.log(\"cookie deletion failed\", a)),\n            p\n          );\n        };\n      if (\n        (f && ((n = Re(r.o) ? r.o : {}), (i = r.del), (r = r.read)),\n        (n = Re(n) ? n : {}),\n        i || !n.domain)\n      ) {\n        ((u = E.hostname.split(B)), (p = c), (l = []));\n        for (var y = u[o] - 1; y >= 0; y--)\n          ((p = u[y] + (p ? B + p : c)),\n            y < u[o] - 1 && (l.push(B + p), l.push(p)));\n        l.push(c);\n      } else l = [n.domain];\n      if (i || !n.path)\n        for (y in ((u = E.pathname.split(H)), (p = c), (h = []), u))\n          ((p += (1 != y ? H : c) + u[y]), (h[y] = p));\n      else h = [n.path];\n      if (((d = i || n.secure == a ? [t, e] : [n.secure]), Ce(r))) {\n        r = {};\n      }\n      if (Re(r)) {\n        for (p in r) r[p] = v(p);\n        return f || r;\n      }\n      return v(r);\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 38 function 1 (X)", () => {
  const source = "function (e, t) {\n      return c;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 39 function 1 (D)", () => {
  const source = "function () {\n      var r,\n        n,\n        i,\n        s,\n        p,\n        u,\n        l = \"DEBUG _O sync\",\n        h = 0,\n        d = 0,\n        m = !xdTLDxHP,\n        f = function (e) {\n          return \"\";\n        },\n        g = function (e) {},\n        b = function (e, t, a) {\n          setTimeout(y, 59);\n        },\n        v = function (a, r) {\n          var n,\n            o,\n            c,\n            i = t;\n          if (\n            S._A &&\n            S._A.constructor == Object &&\n            _A.isO(S._O) &&\n            _A.isO(_A.section) &&\n            _A.isA(r)\n          ) {\n            for (n in (_A.car(r), delete u, (u = []), r))\n              (o = _A.isO(r[n]) ? r[n] : {}).svc != o.svl &&\n                ((i = e), u.push(o));\n            i\n              ? xdTLDxHP\n                ? (c = e)\n                : (g(r), \"UDL\" == a && ((h = d = 0), (m = e)))\n              : xdTLDxHP ||\n                (d < 5e3\n                  ? ((d += 59), (h += 59) > 250 && (h = 0))\n                  : m && (m = t));\n          }\n          return !c;\n        },\n        y = function () {\n          try {\n            ((s = !s) ? v(\"OT\", fe) : v(\"UDL\", ge)) && setTimeout(y, 59);\n          } catch (t) {\n            p || (p = e);\n          }\n        },\n        w = function () {\n          ve();\n        },\n        D = function () {\n          (clearTimeout(r),\n            w(),\n            (function () {\n              var e;\n              for (e in ge) ge[e].svc = a;\n            })(),\n            y());\n        },\n        _ = function (e, t, a) {\n          e && fe[0].reqFound && D();\n        },\n        A = function () {\n          try {\n            xdTLDxHP ? (i = e) : g(fe);\n          } catch (e) {\n            i = t;\n          }\n          i || D();\n        },\n        x = function (e, t, a) {\n          e && ge[0].reqFound && A();\n        };\n      !pe && _A.isF(_A.car) && _A.isF(_A.caw) && _A.isF(_A.xdReq)\n        ? ((r = setTimeout(w, 3100)),\n          (function () {\n            try {\n              xdTLDxHP ? (n = e) : g(ge);\n            } catch (e) {\n              n = t;\n            }\n            n || A();\n          })())\n        : w();\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 40 function 1 (D)", () => {
  const source = "function () {\n      var r,\n        n,\n        i,\n        s,\n        p,\n        u,\n        l = \"DEBUG _O sync\",\n        h = 0,\n        d = 0,\n        m = !xdTLDxHP,\n        f = function (e) {\n          return \"\";\n        },\n        g = function (e) {},\n        b = function (e, t, a) {\n          setTimeout(y, 59);\n        },\n        v = function (a, r) {\n          var n,\n            o,\n            c,\n            i = t;\n          if (\n            S._A &&\n            S._A.constructor == Object &&\n            _A.isO(S._O) &&\n            _A.isO(_A.section) &&\n            _A.isA(r)\n          ) {\n            for (n in (_A.car(r), delete u, (u = []), r))\n              (o = _A.isO(r[n]) ? r[n] : {}).svc != o.svl &&\n                ((i = e), u.push(o));\n            i\n              ? xdTLDxHP\n                ? (c = e)\n                : (g(r), \"UDL\" == a && ((h = d = 0), (m = e)))\n              : xdTLDxHP ||\n                (d < 5e3\n                  ? ((d += 59), (h += 59) > 250 && (h = 0))\n                  : m && (m = t));\n          }\n          return !c;\n        },\n        y = function () {\n          try {\n            ((s = !s) ? v(\"OT\", fe) : v(\"UDL\", ge)) && setTimeout(y, 59);\n          } catch (t) {\n            p || (p = e);\n          }\n        },\n        w = function () {\n          ve();\n        },\n        D = function () {\n          (clearTimeout(r),\n            w(),\n            (function () {\n              var e;\n              for (e in ge) ge[e].svc = a;\n            })(),\n            y());\n        },\n        _ = function (e, t, a) {\n          e && fe[0].reqFound && D();\n        },\n        A = function () {\n          try {\n            xdTLDxHP ? (i = e) : g(fe);\n          } catch (e) {\n            i = t;\n          }\n          i || D();\n        },\n        x = function (e, t, a) {\n          e && ge[0].reqFound && A();\n        };\n      !pe && _A.isF(_A.car) && _A.isF(_A.caw) && _A.isF(_A.xdReq)\n        ? ((r = setTimeout(w, 3100)),\n          (function () {\n            try {\n              xdTLDxHP ? (n = e) : g(ge);\n            } catch (e) {\n              n = t;\n            }\n            n || A();\n          })())\n        : w();\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 41 function 1 (v)", () => {
  const source = "function (a) {\n      var r,\n        n,\n        o,\n        i,\n        p = Ot(a);\n      if (p)\n        if (S._XDI) p = Ot(a);\n        else\n          for (r in l)\n            for (n in h)\n              for (o in d)\n                if (\n                  ((i = h[n]),\n                  (i = (Se(i) ? (i == c ? E.pathname : i) : c) || H),\n                  !(p = Ot(a)))\n                )\n                  break;\n      return (\n        s &&\n          (p == t\n            ? console.log(\"deleted cookie\", a)\n            : p == e && console.log(\"cookie deletion failed\", a)),\n        p\n      );\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 42 function 1 (y)", () => {
  const source = "function (e, t) {\n      return null;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 43 function 1 (D)", () => {
  const source = "function () {\n      var r,\n        n,\n        i,\n        s,\n        p,\n        u,\n        l = \"DEBUG _O sync\",\n        h = 0,\n        d = 0,\n        m = !xdTLDxHP,\n        f = function (e) {\n          return \"\";\n        },\n        g = function (e) {},\n        b = function (e, t, a) {\n          setTimeout(y, 59);\n        },\n        v = function (a, r) {\n          var n,\n            o,\n            c,\n            i = t;\n          if (\n            S._A &&\n            S._A.constructor == Object &&\n            _A.isO(S._O) &&\n            _A.isO(_A.section) &&\n            _A.isA(r)\n          ) {\n            for (n in (_A.car(r), delete u, (u = []), r))\n              (o = _A.isO(r[n]) ? r[n] : {}).svc != o.svl &&\n                ((i = e), u.push(o));\n            i\n              ? xdTLDxHP\n                ? (c = e)\n                : (g(r), \"UDL\" == a && ((h = d = 0), (m = e)))\n              : xdTLDxHP ||\n                (d < 5e3\n                  ? ((d += 59), (h += 59) > 250 && (h = 0))\n                  : m && (m = t));\n          }\n          return !c;\n        },\n        y = function () {\n          try {\n            ((s = !s) ? v(\"OT\", fe) : v(\"UDL\", ge)) && setTimeout(y, 59);\n          } catch (t) {\n            p || (p = e);\n          }\n        },\n        w = function () {\n          ve();\n        },\n        D = function () {\n          (clearTimeout(r),\n            w(),\n            (function () {\n              var e;\n              for (e in ge) ge[e].svc = a;\n            })(),\n            y());\n        },\n        _ = function (e, t, a) {\n          e && fe[0].reqFound && D();\n        },\n        A = function () {\n          try {\n            xdTLDxHP ? (i = e) : g(fe);\n          } catch (e) {\n            i = t;\n          }\n          i || D();\n        },\n        x = function (e, t, a) {\n          e && ge[0].reqFound && A();\n        };\n      !pe && _A.isF(_A.car) && _A.isF(_A.caw) && _A.isF(_A.xdReq)\n        ? ((r = setTimeout(w, 3100)),\n          (function () {\n            try {\n              xdTLDxHP ? (n = e) : g(ge);\n            } catch (e) {\n              n = t;\n            }\n            n || A();\n          })())\n        : w();\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 44 function 1 (Sa)", () => {
  const source = "function () {\n      var t;\n      try {\n        t = 0;\n      } catch (e) {}\n      return t || 0;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 45 function 1 (y)", () => {
  const source = "function (e, t) {\n      return null;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 46 function 1 (Aa)", () => {
  const source = "function () {\n      try {\n        Sa();\n      } catch (e) {}\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 47 function 1 (Fa)", () => {
  const source = "function () {\n      try {\n        if (((Ca = S[UdlDLn]), Re(S._A) && Pe(Ca) && Re(_A.section))) {\n          var t,\n            r,\n            n,\n            i,\n            s = function () {\n              var t, a;\n              for (a in fe)\n                ((v = r[\"lang\" == a ? \"html_\" : \"meta_\" + a]),\n                  Ae(v) && ((fe[a] = v), (t = e)));\n              t && sa();\n            };\n          for (\n            Pa && (clearTimeout(Pa), (Pa = 0)),\n              Ea && Re(Oa) && (Ca.push(Oa), (Oa = 0));\n            Ia < Ca[o];\n          )\n            if (((r = Ca[Ia]), Re(r))) {\n              if (\n                ((n = r.event),\n                (Re(r.ecommerce) ||\n                  (Se(n) && n.match(/^(e_|mu\\.|dataReady)/))) &&\n                  Re(r.ecommerce) &&\n                  !Ae(r.ecommerce.currencyCode) &&\n                  ((r.ecommerce.currencyCode = _A.section.currency),\n                  (r._uc = e)),\n                n == Ba)\n              ) {\n                if (Re(r.ecommerce)) {\n                  var p = r.ecommerce.checkout;\n                  if (Re(p)) {\n                    var u = Re(p.actionField)\n                      ? p.actionField\n                      : (p.actionField = {});\n                    _e(u.step) || ((u.step = 1), (u.option = \"Begin checkout\"));\n                  }\n                }\n                for (t = Ia - 1; t >= 0 && Ca[t].event != Ba; t--)\n                  if (\"e_deferred\" == Ca[t].event)\n                    for (i in Ca[t])\n                      \"event\" !== i &&\n                        Te(i, \"gtm.\") < 0 &&\n                        !r.hasOwnProperty(i) &&\n                        (r[i] = Ca[t][i]);\n                (s(),\n                  (l = void 0),\n                  (h = void 0),\n                  (l = Ca[Ia].ecommerce),\n                  (h =\n                    Re(l) && Re(l.purchase) && Re(l.purchase.actionField)\n                      ? l.purchase.actionField.id\n                      : a),\n                  Ae(h) && (l.purchase.actionField.id = h),\n                  Ha(),\n                  (Ea = e));\n              } else if (\"e_searchResults\" == n)\n                for (i in (Ea || Ca.push({ event: Ba }),\n                (Oa = { event: \"mu.searchResults\" }),\n                r))\n                  \"event\" !== i && Te(i, \"gtm.\") < 0 && (Oa[i] = r[i]);\n              Ia++;\n            }\n        } else Pe(Ca) || (Ia = 0);\n      } catch (t) {}\n      var l, h;\n      Pa = setTimeout(Fa, 50);\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 48 function 1 (v)", () => {
  const source = "function (a) {\n      var r,\n        n,\n        o,\n        i,\n        p = Ot(a);\n      if (p)\n        if (S._XDI) p = Ot(a);\n        else\n          for (r in l)\n            for (n in h)\n              for (o in d)\n                if (\n                  ((i = h[n]),\n                  (i = (Se(i) ? (i == c ? E.pathname : i) : c) || H),\n                  !(p = Ot(a)))\n                )\n                  break;\n      return (\n        s &&\n          (p == t\n            ? console.log(\"deleted cookie\", a)\n            : p == e && console.log(\"cookie deletion failed\", a)),\n        p\n      );\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 49 function 1 (v)", () => {
  const source = "function (a) {\n      var r,\n        n,\n        o,\n        i,\n        p = Ot(a);\n      if (p)\n        if (S._XDI) p = Ot(a);\n        else\n          for (r in l)\n            for (n in h)\n              for (o in d)\n                if (\n                  ((i = h[n]),\n                  (i = (Se(i) ? (i == c ? E.pathname : i) : c) || H),\n                  !(p = Ot(a)))\n                )\n                  break;\n      return (\n        s &&\n          (p == t\n            ? console.log(\"deleted cookie\", a)\n            : p == e && console.log(\"cookie deletion failed\", a)),\n        p\n      );\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 50 function 1 (__wpr__)", () => {
  const source = "function __wpr__(e) {\n      var t = __webpack_module_cache__[e];\n      if (void 0 !== t) return t.exports;\n      var r = (__webpack_module_cache__[e] = { exports: {} });\n      return (null, r.exports);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 51 function 1 (n)", () => {
  const source = "function n(e, t) {\n      if (e) {\n        var r = e.indexOf(t);\n        0 <= r && e.splice(r, 1);\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 52 function 1 (setupServerExperiments)", () => {
  const source = "function setupServerExperiments() {\n      if (\n        !DYO.URLUtils.isUrlContains(\"dy_disable=true\") &&\n        (DYO.logBlock.info(function () {\n          return \"DYO setupServerExperiments started\";\n        }, \"flow\"),\n        \"undefined\" != typeof DYExps && void 0 !== DYExps.oexps)\n      ) {\n        ((DYO.section = DYExps.section),\n          (DYO.oexps = experiments = DYExps.oexps),\n          (DYO.sectionFeatures = DYExps.sectionFeatures || {}),\n          (DYO.hooks = DYExps.hooks || {}),\n          (DYO.otags = smartTags = DYExps.otags),\n          (DYO.oevals = DYExps.oevals),\n          (DYO.dynamicVariablesV0 = DYExps.dynamicVariablesV0),\n          (DYO.smartVariableExperimentsMapV1 =\n            DYExps.smartVariableExperimentsMapV1),\n          (DYO.smartVariableExperimentsV1 = DYExps.smartVariableExperimentsV1),\n          (DYO.rcom = rcom = DYExps.rcom),\n          (DYO.translations = translations = DYExps.translations),\n          (DYO.sectionConfig = DYExps.sectionConfig),\n          (DYO.hosts = DYExps.hosts || {\n            st: \"st.dynamicyield.com\",\n            px: \"px.dynamicyield.com\",\n            rcom: \"rcom.dynamicyield.com\",\n            pii: \"opt.%s.dynamicyield.com\",\n            link: \"link.dynamicyield.com\",\n            metadata: \"https://gw.metadata.dynamicyield.com\",\n            cdn: \"cdn.dynamicyield.com\",\n            clientLogs: \"client-logs.dev-use1.dynamicyield.com/logs/client\",\n          }),\n          (DYO.logConfig = DYExps.logsConfiguration || {\n            percentage: 0,\n            level:\n              _src_harmony_logger_Logger_js__WEBPACK_IMPORTED_MODULE_0__.M.NONE,\n          }),\n          DYO.StorageUtilsInternal.init(DYO.section),\n          DYO.ActiveConsent.init(),\n          DYO.SessionUtils.setHybridSession(),\n          _src_harmony_st_STLoader_js__WEBPACK_IMPORTED_MODULE_1__.A.getState(),\n          setPreviewCookie(),\n          (DYO.ready = !0),\n          (DYO.setupTime = new Date().getTime()),\n          (DYO.chosenVariations = {}),\n          DYO._ready && DYO._ready());\n        try {\n          if (\n            window.location.search.indexOf(\"dyIsPreview=true\") > -1 ||\n            \"dy_preview_session\" === window.name ||\n            window.location.search.indexOf(\"dyPreview\") > -1\n          ) {\n            execAndEmbed();\n          } else execAndEmbed();\n        } catch (e) {\n          execAndEmbed();\n        }\n      }\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 54 function 1 (a)", () => {
  const source = "function a(e, t) {\n      for (var r = 0; r < t.length; r++) {\n        var n = t[r];\n        ((n.enumerable = n.enumerable || !1),\n          (n.configurable = !0),\n          \"value\" in n && (n.writable = !0),\n          Object.defineProperty(e, n.key, n));\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 56 function 1 (o)", () => {
  const source = "function o(r, n, i, o) {\n      var a = n && n.prototype instanceof s ? n : s,\n        l = Object.create(a.prototype);\n      return (\n        c(\n          l,\n          \"_invoke\",\n          (function (r, n, i) {\n            var o,\n              a,\n              c,\n              s = 0,\n              l = i || [],\n              f = !1,\n              p = {\n                p: 0,\n                n: 0,\n                v: e,\n                a: d,\n                f: d.bind(e, 4),\n                d: function (t, r) {\n                  return ((o = t), (a = 0), (c = e), (p.n = r), u);\n                },\n              };\n            function d(r, n) {\n              for (a = r, c = n, t = 0; !f && s && !i && t < l.length; t++) {\n                var i,\n                  o = l[t],\n                  d = p.p,\n                  h = o[2];\n                r > 3\n                  ? (i = h === n) &&\n                    ((c = o[(a = o[4]) ? 5 : ((a = 3), 3)]), (o[4] = o[5] = e))\n                  : o[0] <= d &&\n                    ((i = r < 2 && d < o[1])\n                      ? ((a = 0), (p.v = n), (p.n = o[1]))\n                      : d < h &&\n                        (i = r < 3 || o[0] > n || n > h) &&\n                        ((o[4] = r), (o[5] = n), (p.n = h), (a = 0)));\n              }\n              if (i || r > 1) return u;\n              throw ((f = !0), n);\n            }\n            return function (i, l, h) {\n              if (s > 1) throw TypeError(\"Generator is already running\");\n              for (\n                f && 1 === l && d(l, h), a = l, c = h;\n                (t = a < 2 ? e : c) || !f;\n              ) {\n                o ||\n                  (a\n                    ? a < 3\n                      ? (a > 1 && (p.n = -1), d(a, c))\n                      : (p.n = c)\n                    : (p.v = c));\n                try {\n                  if (((s = 2), o)) {\n                    if ((a || (i = \"next\"), (t = o[i]))) {\n                      if (!(t = t.call(o, c)))\n                        throw TypeError(\"iterator result is not an object\");\n                      if (!t.done) return t;\n                      ((c = t.value), a < 2 && (a = 0));\n                    } else\n                      (1 === a && (t = o.return) && t.call(o),\n                        a < 2 &&\n                          ((c = TypeError(\n                            \"The iterator does not provide a '\" +\n                              i +\n                              \"' method\",\n                          )),\n                          (a = 1)));\n                    o = e;\n                  } else if ((t = (f = p.n < 0) ? c : null) !== u) break;\n                } catch (t) {\n                  ((o = e), (a = 1), (c = t));\n                } finally {\n                  s = 1;\n                }\n              }\n              return { value: t, done: f };\n            };\n          })(r, i, o),\n          !0,\n        ),\n        l\n      );\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 58 function 1 (A)", () => {
  const source = "function A(e, t) {\n      var n;\n      void 0 === t && (t = {});\n      const { x: r, y: o, platform: i, rects: s, elements: a, strategy: c } = e,\n        {\n          boundary: l = \"clippingAncestors\",\n          rootBoundary: u = \"viewport\",\n          elementContext: d = \"floating\",\n          altBoundary: h = !1,\n          padding: m = 0,\n        } = p(t, e),\n        f = (function (e) {\n          return \"number\" != typeof e\n            ? (function (e) {\n                return { top: 0, right: 0, bottom: 0, left: 0, ...e };\n              })(e)\n            : { top: e, right: e, bottom: e, left: e };\n        })(m),\n        g = a[h ? (\"floating\" === d ? \"reference\" : \"floating\") : d],\n        y = { top: 0, right: 0, bottom: 0, left: 0 },\n        S =\n          \"floating\" === d\n            ? { x: r, y: o, width: s.floating.width, height: s.floating.height }\n            : s.reference,\n        v = null,\n        w = { x: 1, y: 1 },\n        A = S;\n      return {\n        top: (y.top - A.top + f.top) / w.y,\n        bottom: (A.bottom - y.bottom + f.bottom) / w.y,\n        left: (y.left - A.left + f.left) / w.x,\n        right: (A.right - y.right + f.right) / w.x,\n      };\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 59 function 1 (n)", () => {
  const source = "function n() {}";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 60 function 1 (n)", () => {
  const source = "function n() {}";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 61 function 1 (__webpack_require__)", () => {
  const source = "function __webpack_require__(e) {\n      var t = __webpack_module_cache__[e];\n      if (void 0 !== t) return t.exports;\n      var r = (__webpack_module_cache__[e] = {\n        id: e,\n        loaded: !1,\n        exports: {},\n      });\n      return (\n        __webpack_modules__[e].call(\n          r.exports,\n          r,\n          r.exports,\n          __webpack_require__,\n        ),\n        (r.loaded = !0),\n        r.exports\n      );\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 62 function 1 (value)", () => {
  const source = "function () {\n      var e = this;\n      (_superPropGet(TargetedContent, \"init\", this, 3)([]),\n        null,\n        (0, _core_helpers_utility__WEBPACK_IMPORTED_MODULE_1__.al)() &&\n          ((this.mo = new window.MutationObserver(function (t) {\n            var r,\n              n = _createForOfIteratorHelper(t);\n            try {\n              for (n.s(); !(r = n.n()).done; ) {\n                \"childList\" === r.value.type && e.onTargetRenderingFinished();\n              }\n            } catch (e) {\n              n.e(e);\n            } finally {\n              n.f();\n            }\n          })),\n          this.mo.observe(this._el, { childList: !0 })));\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 63 function 1 (c)", () => {
  const source = "function c(e, t) {\n      var r = null,\n        n = function () {\n          var e = !document.querySelector(\"link.standalone:not(.loaded)\");\n          return (e && t(), e);\n        };\n      n() || (r = null);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 64 function 1 (u)", () => {
  const source = "function u(e) {\n      return e && e.__esModule ? e : { default: e };\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 65 function 1 (runJS)", () => {
  const source = "function (a) {\n      if (Ae(a) && !Wt(a)) {\n        var r,\n          n,\n          i,\n          s,\n          p,\n          u,\n          l = arguments,\n          h = c,\n          d = P.body;\n        for (s = 1; s < l[o]; s++)\n          (Se((p = l[s])) && (h = p), Ee(p) && (r = p), xe(p) && (n = p));\n        for (\n          (i = P.createElement(W)).type = \"text/java\" + W,\n            i.src = c,\n            i.async = t,\n            r && (i.onload = r),\n            h = h ? h.split(G) : [],\n            s = 0;\n          s < h[o];\n          s++\n        )\n          ((p = h[s]),\n            Te(p, T) > -1\n              ? ((u = p.split(T)),\n                \"charset\" == (p = u[0])\n                  ? (i[p] = u[1])\n                  : i.setAttribute(p, u[1]))\n              : p == J\n                ? (n = e)\n                : \"async\" == p || \"defer\" == p\n                  ? (i[p] = !0)\n                  : i.setAttribute(p, Y));\n        P.getElementsByTagName(n || !d ? J : \"body\")[0].appendChild(i);\n      }\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 66 function 1 (_0x1b2633)", () => {
  const source = "function _0x1b2633(_0x3645a0, _0x3d2ca7) {\n      if (_0x3645a0[\"token\"]) {\n        var _0x577da4 = new Date();\n        _0x577da4[\"setTime\"](_0x577da4[\"getTime\"]() + 0x1680 * 0x3c * 0x3e8);\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 67 function 1 (_0x1b2633)", () => {
  const source = "function _0x1b2633(_0x3645a0, _0x3d2ca7) {\n      if (_0x3645a0[\"token\"]) {\n        var _0x577da4 = new Date();\n        _0x577da4[\"setTime\"](_0x577da4[\"getTime\"]() + 0x1680 * 0x3c * 0x3e8);\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 68 function 1 (_0x1b2633)", () => {
  const source = "function _0x1b2633(_0x3645a0, _0x3d2ca7) {\n      if (_0x3645a0[\"token\"]) {\n        var _0x577da4 = new Date();\n        _0x577da4[\"setTime\"](_0x577da4[\"getTime\"]() + 0x1680 * 0x3c * 0x3e8);\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 69 function 1 (_0x1b2633)", () => {
  const source = "function _0x1b2633(_0x3645a0, _0x3d2ca7) {\n      if (_0x3645a0[\"token\"]) {\n        var _0x577da4 = new Date();\n        _0x577da4[\"setTime\"](_0x577da4[\"getTime\"]() + 0x1680 * 0x3c * 0x3e8);\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 70 function 1 (_0x1b2633)", () => {
  const source = "function _0x1b2633(_0x3645a0, _0x3d2ca7) {\n      if (_0x3645a0[\"token\"]) {\n        var _0x577da4 = new Date();\n        _0x577da4[\"setTime\"](_0x577da4[\"getTime\"]() + 0x1680 * 0x3c * 0x3e8);\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 71 function 1 (_0x2e727f)", () => {
  const source = "function (_0x401c58, _0x20845b, _0x2b8f15, _0xce5139) {\n      return new (_0x2b8f15 || (_0x2b8f15 = Promise))(function (\n        _0x217b6f,\n        _0x21cc13,\n      ) {\n        _0x217b6f();\n      });\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 72 function 1 (_0x523f75)", () => {
  const source = "function (_0x24166a, _0x1b8b51, _0x42c4c6, _0x1b7281) {\n      return new (_0x42c4c6 || (_0x42c4c6 = Promise))(function (\n        _0x26b1ec,\n        _0x4ed26b,\n      ) {\n        function _0x5e40b7(_0x3f67a6) {\n          try {\n            _0x1c3d00(_0x1b7281[\"next\"](_0x3f67a6));\n          } catch (_0x1de052) {\n            _0x4ed26b(_0x1de052);\n          }\n        }\n        function _0x33d7cc(_0x381183) {\n          try {\n            _0x1c3d00(_0x1b7281[\"throw\"](_0x381183));\n          } catch (_0xe4373f) {\n            _0x4ed26b(_0xe4373f);\n          }\n        }\n        function _0x1c3d00(_0x921f84) {\n          if (_0x921f84[\"done\"]) {\n            _0x26b1ec(_0x921f84[\"value\"]);\n          } else {\n            Promise.resolve(_0x921f84[\"value\"]).then(_0x5e40b7, _0x33d7cc);\n          }\n        }\n        _0x1c3d00(_0x1b7281.next());\n      });\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 73 function 1 (_0x4ebcc6)", () => {
  const source = "function (_0x4360b3, _0x3b31f7, _0x4af99e, _0x548c56) {\n      return null;\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 74 function 1 (_0x282020)", () => {
  const source = "function (_0x52f8c6, _0x5e3c7e, _0x2bf60a) {\n      return null;\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 77 function 1 (n)", () => {
  const source = "function n(e, n) {\n      return d({\n        data: e,\n        path: null,\n        errorMaps: [t.common.contextualErrorMap, t.schemaErrorMap].filter(\n          (e) => !!e,\n        ),\n        issueData: { code: s.invalid_arguments, argumentsError: n },\n      });\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 78 function 1 (l)", () => {
  const source = "function l() {\n      return typeof window < \"u\" && typeof window.document < \"u\";\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 80 function 1 (Sn)", () => {
  const source = "function Sn() {\n      try {\n        return !0;\n      } catch {\n        return !1;\n      }\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 81 function 1 (Qt)", () => {
  const source = "function Qt(e, t) {\n      try {\n        let n = null;\n        if (n) {\n          let e = JSON.parse(n);\n          for (let [n, r] of Object.entries(e || {}))\n            r && Array.isArray(r) && t.set(n, new Set(r || []));\n        }\n      } catch {}\n    }";
  const args = [
  [],
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 82 function 1 (F)", () => {
  const source = "function F({ getContext: e, unstable_instrumentations: t }) {\n      if ((P(), !M))\n        throw Error(\n          \"You must be using the SSR features of React Router in order to skip passing a `router` prop to `<RouterProvider>`\",\n        );\n      let n = M;\n      if (!M.stateDecodingPromise) {\n        let e = M.context.stream;\n        (b(e, `No stream found for single fetch decoding`),\n          (M.context.stream = void 0),\n          (M.stateDecodingPromise = o(e, window)\n            .then((e) => {\n              ((M.context.state = e.value),\n                (n.stateDecodingPromise.value = !0));\n            })\n            .catch((e) => {\n              n.stateDecodingPromise.error = e;\n            })));\n      }\n      if (M.stateDecodingPromise.error) throw M.stateDecodingPromise.error;\n      if (!M.stateDecodingPromise.value) throw M.stateDecodingPromise;\n      let i = h(\n          M.manifest.routes,\n          M.routeModules,\n          M.context.state,\n          M.context.ssr,\n          M.context.isSpaMode,\n        ),\n        a;\n      if (M.context.isSpaMode) {\n        let { loaderData: e } = M.context.state;\n        M.manifest.routes.root?.hasLoader &&\n          e &&\n          `root` in e &&\n          (a = { loaderData: { root: e.root } });\n      } else\n        ((a = k({\n          state: M.context.state,\n          routes: i,\n          getRouteInfo: (e) => ({\n            clientLoader: M.routeModules[e]?.clientLoader,\n            hasLoader: M.manifest.routes[e]?.hasLoader === !0,\n            hasHydrateFallback: M.routeModules[e]?.HydrateFallback != null,\n          }),\n          location: window.location,\n          basename: window.__reactRouterContext?.basename,\n          isSpaMode: M.context.isSpaMode,\n        })),\n          a && a.errors && (a.errors = O(a.errors)));\n      let s = u({\n        routes: i,\n        history: l(),\n        basename: M.context.basename,\n        getContext: e,\n        hydrationData: a,\n        hydrationRouteProperties: c,\n        unstable_instrumentations: t,\n        mapRouteProperties: r,\n        future: { middleware: M.context.future.v8_middleware },\n        dataStrategy: x(\n          () => s,\n          M.manifest,\n          M.routeModules,\n          M.context.ssr,\n          M.context.basename,\n          M.context.future.unstable_trailingSlashAwareDataRequests,\n        ),\n        patchRoutesOnNavigation: v(\n          M.manifest,\n          M.routeModules,\n          M.context.ssr,\n          M.context.routeDiscovery,\n          M.context.isSpaMode,\n          M.context.basename,\n        ),\n      });\n      return (\n        (M.router = s),\n        s.state.initialized && ((M.routerInitialized = !0), s.initialize()),\n        (s.createRoutesForHMR = p),\n        s\n      );\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 83 function 1 (Ho)", () => {
  const source = "function Ho(e, t, n, r, i, o) {\n      if (\n        ((Io = 0),\n        (F = t),\n        (t.memoizedState = null),\n        (t.updateQueue = null),\n        (t.lanes = 0),\n        (Po.current = e === null || e.memoizedState === null ? Ts : Es),\n        (e = n(r, i)),\n        Ro)\n      ) {\n        o = 0;\n        do {\n          if (((Ro = !1), (zo = 0), 25 <= o)) throw Error(a(301));\n          ((o += 1),\n            (L = I = null),\n            (t.updateQueue = null),\n            (Po.current = Ds),\n            (e = n(r, i)));\n        } while (Ro);\n      }\n      if (\n        ((Po.current = ws),\n        (t = I !== null && I.next !== null),\n        (Io = 0),\n        (L = I = F = null),\n        (Lo = !1),\n        t)\n      )\n        throw Error(a(300));\n      return e;\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 84 function 1 (Nl)", () => {
  const source = "function Nl(e) {\n      ((e.memoizedProps = e.pendingProps), (qc.current = null));\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 85 function 1 (Ml)", () => {
  const source = "function Ml() {\n      for (; q !== null; ) Nl(q);\n    }";
  const args = [];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "Error"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 86 function 1 (Z)", () => {
  const source = "function (e) {\n      return \"\";\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 87 function 1 (Q)", () => {
  const source = "function () {\n      return null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 88 function 1 (Fe)", () => {
  const source = "function Fe(e, t, n, r, i, a, o) {\n      try {\n        var s = e[a](o),\n          c = s.value;\n      } catch (e) {\n        return;\n      }\n      s.done ? t(c) : Promise.resolve(c).then(r, i);\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 89 function 1 (o)", () => {
  const source = "function o(e) {\n      null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 90 function 1 (Ec)", () => {
  const source = "function Ec(e, t) {\n      if (\n        ((t = t.updateQueue),\n        (t = t === null ? null : t.lastEffect),\n        t !== null)\n      ) {\n        var n = (t = t.next);\n        do {\n          if ((n.tag & e) === e) {\n            n.destroy = null;\n          }\n          n = n.next;\n        } while (n !== t);\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 91 function 1 (Ll)", () => {
  const source = "function Ll() {\n      if (ll !== null) {\n        var e = on(ul),\n          t = Jc.transition,\n          n = C;\n        try {\n          if (((Jc.transition = null), (C = 16 > e ? 16 : e), ll === null))\n            var r = !1;\n          else {\n            if (((e = ll), (ll = null), (ul = 0), G & 6)) throw Error(a(331));\n            var i = G;\n            for (G |= 4, U = e.current; U !== null; ) {\n              var o = U,\n                s = o.child;\n              if (U.flags & 16) {\n                var c = o.deletions;\n                if (c !== null) {\n                  for (var l = 0; l < c.length; l++) {\n                    var u = c[l];\n                    for (U = u; U !== null; ) {\n                      var d = U;\n                      switch (d.tag) {\n                        case 0:\n                        case 11:\n                        case 15:\n                          Tc(8, d, o);\n                      }\n                      var f = d.child;\n                      if (f !== null) ((f.return = d), (U = f));\n                      else\n                        for (; U !== null; ) {\n                          d = U;\n                          var p = d.sibling,\n                            m = d.return;\n                          if ((Oc(d), d === u)) {\n                            U = null;\n                            break;\n                          }\n                          if (p !== null) {\n                            ((p.return = m), (U = p));\n                            break;\n                          }\n                          U = m;\n                        }\n                    }\n                  }\n                  var h = o.alternate;\n                  if (h !== null) {\n                    var g = h.child;\n                    if (g !== null) {\n                      h.child = null;\n                      do {\n                        var _ = g.sibling;\n                        ((g.sibling = null), (g = _));\n                      } while (g !== null);\n                    }\n                  }\n                  U = o;\n                }\n              }\n              if (o.subtreeFlags & 2064 && s !== null)\n                ((s.return = o), (U = s));\n              else\n                b: for (; U !== null; ) {\n                  if (((o = U), o.flags & 2048))\n                    switch (o.tag) {\n                      case 0:\n                      case 11:\n                      case 15:\n                        Tc(9, o, o.return);\n                    }\n                  var v = o.sibling;\n                  if (v !== null) {\n                    ((v.return = o.return), (U = v));\n                    break b;\n                  }\n                  U = o.return;\n                }\n            }\n            var y = e.current;\n            for (U = y; U !== null; ) {\n              s = U;\n              var ee = s.child;\n              if (s.subtreeFlags & 2064 && ee !== null)\n                ((ee.return = s), (U = ee));\n              else\n                b: for (s = y; U !== null; ) {\n                  if (((c = U), c.flags & 2048))\n                    try {\n                      switch (c.tag) {\n                        case 0:\n                        case 11:\n                        case 15:\n                          Ec(9, c);\n                      }\n                    } catch (e) {\n                      $(c, c.return, e);\n                    }\n                  if (c === s) {\n                    U = null;\n                    break b;\n                  }\n                  var te = c.sibling;\n                  if (te !== null) {\n                    ((te.return = c.return), (U = te));\n                    break b;\n                  }\n                  U = c.return;\n                }\n            }\n            Sa();\n            r = !0;\n          }\n          return r;\n        } finally {\n          ((C = n), (Jc.transition = t));\n        }\n      }\n      return !1;\n    }";
  const args = [];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "Error"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 92 function 1 (Sa)", () => {
  const source = "function Sa() {\n      if (!ya && _a !== null) {\n        ya = !0;\n        var e = 0,\n          t = C;\n        try {\n          var n = _a;\n          for (C = 1; e < n.length; e++) {\n            var r = n[e];\n            do r = null;\n            while (r !== null);\n          }\n          ((_a = null), (va = !1));\n        } catch (t) {\n          _a !== null && (_a = _a.slice(e + 1));\n        } finally {\n          ((C = t), (ya = !1));\n        }\n      }\n      return null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 93 function 1 (Il)", () => {
  const source = "function Il(e, t, n, r) {\n      do Ll();\n      while (ll !== null);\n      if (G & 6) throw Error(a(327));\n      n = e.finishedWork;\n      var i = e.finishedLanes;\n      if (n === null) return null;\n      if (((e.finishedWork = null), (e.finishedLanes = 0), n === e.current))\n        throw Error(a(177));\n      ((e.callbackNode = null), (e.callbackPriority = 0));\n      var o = n.lanes | n.childLanes;\n      if (\n        (rn(e, o),\n        e === K && ((q = K = null), (J = 0)),\n        (!(n.subtreeFlags & 2064) && !(n.flags & 2064)) ||\n          cl ||\n          ((cl = !0),\n          Wl(Lt, function () {\n            return (Ll(), null);\n          })),\n        (o = (n.flags & 15990) != 0),\n        n.subtreeFlags & 15990 || o)\n      ) {\n        ((o = Jc.transition), (Jc.transition = null));\n        var s = C;\n        C = 1;\n        var c = G;\n        ((G |= 4),\n          (qc.current = null),\n          wc(e, n),\n          Rc(n, e),\n          $r(zi),\n          (jn = !!Ri),\n          (zi = Ri = null),\n          (e.current = n),\n          Bc(n, e, i),\n          Nt(),\n          (G = c),\n          (C = s),\n          (Jc.transition = o));\n      } else e.current = n;\n      if (\n        (cl && ((cl = !1), (ll = e), (ul = i)),\n        (o = e.pendingLanes),\n        o === 0 && (sl = null),\n        Ht(n.stateNode, r),\n        Q(e, S()),\n        t !== null)\n      )\n        for (r = e.onRecoverableError, n = 0; n < t.length; n++)\n          ((i = t[n]),\n            r(i.value, { componentStack: i.stack, digest: i.digest }));\n      if (al) throw ((al = !1), (e = ol), (ol = null), e);\n      return (\n        ul & 1 && e.tag !== 0 && Ll(),\n        (o = e.pendingLanes),\n        o & 1 ? (e === fl ? dl++ : ((dl = 0), (fl = e))) : (dl = 0),\n        Sa(),\n        null\n      );\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "Error"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 94 function 1 (Fl)", () => {
  const source = "function Fl(e, t, n) {\n      var r = C,\n        i = Jc.transition;\n      try {\n        ((C = 1), Il(e, t, n, r));\n      } finally {\n        C = r;\n      }\n      return null;\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 95 function 1 (qn)", () => {
  const source = "function (e) {\n      var t =\n          arguments.length > 1 && arguments[1] !== void 0\n            ? arguments[1]\n            : window.location.href,\n        n = e.pageViewToken || h(),\n        r = e.metadata,\n        i = e.extraMetadata,\n        a = new URL(t),\n        o = e.canonicalUrl || vn(t),\n        s = e.pathPrefix || dt(a) || ``,\n        c = r?.handle || bn(t, s),\n        l = r?.page?.experimentVariationId || ``,\n        u = H(V({}, r?.page), {\n          affiliate: r?.page?.affiliate || null,\n          experimentVariationId: l,\n        });\n      return {\n        pageViewToken: n,\n        url: t,\n        pageLanguageCode: s?.substring(0, s.indexOf(`-`)) || `en`,\n        lastShopDomain: null,\n        canonicalUrl: o,\n        experimentVariationId: l,\n        pathPrefix: s,\n        handle: c,\n        extraMetadata: i,\n        metadata: H(V({}, r), {\n          title: r?.title || document.title,\n          language: r?.page?.language || navigator.language || ``,\n          page: u,\n        }),\n      };\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 96 function 1 (Gn)", () => {
  const source = "function (e, t, r, a, o) {\n      document.body.setAttribute(et, `1`);\n      var s = fn(e.countryCode, e.regionCode),\n        c = Number(e.httpStatusCode || Bn()) || void 0,\n        l = {\n          essentialToken: e.essentialToken,\n          multiTrackToken: e.multiTrackToken,\n          sessionToken: e.sessionToken,\n        },\n        u = Object.assign(\n          a || $,\n          H(V({}, e, qn(e), Kn(e.enableActiveConsent, s, e.enableSecGpc, l)), {\n            complianceZone: s,\n            isReady: !0,\n            softNavigation: !1,\n            httpStatusCode: c,\n          }),\n        );\n      t && t(u);\n      var d = o || { dux: null, denormalizedDux: null, gtm: null };\n      r && d && r(d);\n      var f = function () {\n          var e =\n            arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};\n          (t ? t(e, u) : Object.assign(u, e), dn.broadcastContext(u));\n        },\n        p = e.disableLogger,\n        m = e.enableLogger;\n      (dn.isRunningInIframe()\n        ? dn.initAsChild(function (e) {\n            f(e);\n          })\n        : dn.initAsParent(u),\n        (p != null && p.page) ||\n          $t(d, u, function () {\n            var e =\n                arguments.length > 0 && arguments[0] !== void 0\n                  ? arguments[0]\n                  : {},\n              t = u.enableActiveConsent,\n              n = u.complianceZone,\n              r = u.enableSecGpc;\n            u.essentialToken;\n            var i = {\n              multiTrackToken: u.multiTrackToken,\n              sessionToken: u.sessionToken,\n            };\n            f(V({ softNavigation: !0 }, e, qn(e), Kn(t, n, r, i)));\n          }),\n        (p != null && p.click) || Kt(d, u, [document.body]),\n        (p != null && p.componentViewability) || zt(d, u),\n        (p != null && p.error) || Yt(d, u),\n        (p != null && p.visibility) || rn(d, u),\n        (p != null && p.webVitals) || ln(d, u),\n        (p != null && p.scroll) || sn(d, u),\n        (p != null && p.form) || Vt(d, u));\n      var h = function (e) {\n        document.dispatchEvent(\n          new CustomEvent(e, {\n            detail: H(V({}, u.consentState), {\n              isConsentRequired: u.isConsentRequired,\n              complianceZone: u.complianceZone,\n              countryCode: u.countryCode,\n              regionCode: u.regionCode,\n              canLoadAnalytics: u.canLoadAnalytics,\n              canLoadFunctional: u.canLoadFunctional,\n              canLoadMarketing: u.canLoadMarketing,\n              optOutSaleOfData: u.optOutSaleOfData,\n              enableSecGpc: u.enableSecGpc,\n            }),\n          }),\n        );\n      };\n      h(`dux_consent_ready`);\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 97 function 1 (qn)", () => {
  const source = "function (e) {\n      var t =\n          arguments.length > 1 && arguments[1] !== void 0\n            ? arguments[1]\n            : window.location.href,\n        n = e.pageViewToken || h(),\n        r = e.metadata,\n        i = e.extraMetadata,\n        a = new URL(t),\n        o = e.canonicalUrl || vn(t),\n        s = e.pathPrefix || dt(a) || ``,\n        c = r?.handle || bn(t, s),\n        l = r?.page?.experimentVariationId || ``,\n        u = H(V({}, r?.page), {\n          affiliate: r?.page?.affiliate || null,\n          experimentVariationId: l,\n        });\n      return {\n        pageViewToken: n,\n        url: t,\n        pageLanguageCode: s?.substring(0, s.indexOf(`-`)) || `en`,\n        lastShopDomain: null,\n        canonicalUrl: o,\n        experimentVariationId: l,\n        pathPrefix: s,\n        handle: c,\n        extraMetadata: i,\n        metadata: H(V({}, r), {\n          title: r?.title || document.title,\n          language: r?.page?.language || navigator.language || ``,\n          page: u,\n        }),\n      };\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 98 function 1 (Kn)", () => {
  const source = "function (e, t, n, r) {\n      var i = t === `gdpr`,\n        a = Q(),\n        o = (a || {}).consentedAnalytics,\n        s = function (t) {\n          return e === !1 || i === !1 || (i === !0 && t === `1`);\n        },\n        c = r?.multiTrackToken || null,\n        l = r?.sessionToken || null,\n        u = ``,\n        d = ``;\n      if (!e || !i || o === `1`) {\n        ((u = c || `dummy_token`), (d = l || `dummy_token`));\n      }\n      var p = n || a?.consentedSaleOfData === `-1`;\n      return {\n        consentState: a,\n        isConsentRequired: i,\n        multiTrackToken: u,\n        sessionToken: d,\n        isNewUser: !c,\n        canLoadAnalytics: s(a?.consentedAnalytics),\n        canLoadFunctional: s(a?.consentedFunctional),\n        canLoadMarketing: s(a?.consentedMarketing),\n        optOutSaleOfData: p,\n      };\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 99 function 1 (Gn)", () => {
  const source = "function (e, t, r, a, o) {\n      document.body.setAttribute(et, `1`);\n      var s = fn(e.countryCode, e.regionCode),\n        c = Number(e.httpStatusCode || Bn()) || void 0,\n        l = {\n          essentialToken: e.essentialToken,\n          multiTrackToken: e.multiTrackToken,\n          sessionToken: e.sessionToken,\n        },\n        u = Object.assign(\n          a || $,\n          H(V({}, e, qn(e), Kn(e.enableActiveConsent, s, e.enableSecGpc, l)), {\n            complianceZone: s,\n            isReady: !0,\n            softNavigation: !1,\n            httpStatusCode: c,\n          }),\n        );\n      t && t(u);\n      var d = o || { dux: null, denormalizedDux: null, gtm: null };\n      r && d && r(d);\n      var f = function () {\n          var e =\n            arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};\n          (t ? t(e, u) : Object.assign(u, e), dn.broadcastContext(u));\n        },\n        p = e.disableLogger,\n        m = e.enableLogger;\n      (dn.isRunningInIframe()\n        ? dn.initAsChild(function (e) {\n            f(e);\n          })\n        : dn.initAsParent(u),\n        (p != null && p.page) ||\n          $t(d, u, function () {\n            var e =\n                arguments.length > 0 && arguments[0] !== void 0\n                  ? arguments[0]\n                  : {},\n              t = u.enableActiveConsent,\n              n = u.complianceZone,\n              r = u.enableSecGpc;\n            u.essentialToken;\n            var i = {\n              multiTrackToken: u.multiTrackToken,\n              sessionToken: u.sessionToken,\n            };\n            f(V({ softNavigation: !0 }, e, qn(e), Kn(t, n, r, i)));\n          }),\n        (p != null && p.click) || Kt(d, u, [document.body]),\n        (p != null && p.componentViewability) || zt(d, u),\n        (p != null && p.error) || Yt(d, u),\n        (p != null && p.visibility) || rn(d, u),\n        (p != null && p.webVitals) || ln(d, u),\n        (p != null && p.scroll) || sn(d, u),\n        (p != null && p.form) || Vt(d, u));\n      var h = function (e) {\n        document.dispatchEvent(\n          new CustomEvent(e, {\n            detail: H(V({}, u.consentState), {\n              isConsentRequired: u.isConsentRequired,\n              complianceZone: u.complianceZone,\n              countryCode: u.countryCode,\n              regionCode: u.regionCode,\n              canLoadAnalytics: u.canLoadAnalytics,\n              canLoadFunctional: u.canLoadFunctional,\n              canLoadMarketing: u.canLoadMarketing,\n              optOutSaleOfData: u.optOutSaleOfData,\n              enableSecGpc: u.enableSecGpc,\n            }),\n          }),\n        );\n      };\n      h(`dux_consent_ready`);\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 100 function 1 (ns)", () => {
  const source = "function (a) {\n      return false;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 101 function 1 (ks)", () => {
  const source = "function ks(a, b, c, d) {\n      try {\n        var e;\n        return (e = ls(\n          function (f) {\n            return f === a;\n          },\n          b,\n          c,\n          d,\n        )[a]) != null\n          ? e\n          : [];\n      } finally {\n      }\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 102 function 1 (IR)", () => {
  const source = "function IR() {\n      try {\n        return !!w.localStorage;\n      } catch (b) {}\n      return !1;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 103 function 1 (LS)", () => {
  const source = "function LS() {\n      return KS();\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 104 function 1 (MS)", () => {
  const source = "function MS() {\n      var a = data.sandboxed_scripts,\n        b = data.security_groups,\n        c = data.runtime || [],\n        d = data.runtime_lines;\n      eE = new vf();\n      NS();\n      lg = dE();\n      var e = eE,\n        f = LS(),\n        g = new Qd(\"require\", f);\n      g.Va();\n      e.H.H.set(\"require\", g);\n      ib.set(\"require\", g);\n      for (var h = 0; h < c.length; h++) {\n        var l = c[h];\n        if (!Array.isArray(l) || l.length < 3) {\n          if (l.length === 0) continue;\n          break;\n        }\n        d && d[h] && d[h].length && Eg(l, d[h]);\n        try {\n          eE.execute(l);\n        } catch (q) {}\n      }\n      if (a && a.length)\n        for (var n = 0; n < a.length; n++) {\n          var p = a[n].replace(/^_*/, \"\");\n        }\n      OS(b);\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 105 function 1 (un)", () => {
  const source = "function un() {\n      try {\n        if (Kf(47) || !il()) {\n          Aj();\n          if (O(109)) {\n          }\n          gb[6] = !0;\n          var a = Mo(\"debugGroupId\", function () {\n            return String(Math.floor(Number.MAX_SAFE_INTEGER * Math.random()));\n          });\n          ro(a);\n          Xo();\n          SD();\n          jr();\n          wB();\n          if (al()) {\n            E(5);\n            mF();\n            TA().removeExternalRestrictions(Tk());\n          } else {\n            tL();\n            fk();\n            No();\n            vg();\n            rg = X;\n            sg = AD;\n            Ky();\n            MS();\n            cT();\n            yD();\n            vn.bind();\n            Io();\n            FC();\n            AB();\n            vB();\n            Bl.M &&\n              (nq(),\n              kq(TD),\n              (NA = new MA()),\n              kq(Ux),\n              rq(),\n              aE || (aE = new $D()),\n              QA || (QA = new PA()),\n              (XD = new VD()));\n            Bl.H && (gn(), np(), HC(), UC(), SC(), LC(), RC(), Iw());\n            oD();\n            rn(1);\n            nF();\n            Ro.bootstrap = Qb();\n            dT();\n          }\n        }\n      } catch (b) {\n        (rn(5), nq(), iq());\n      }\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 106 function 1 (c)", () => {
  const source = "function c() {}";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 107 function 1 (apply)", () => {
  const source = "function (a, b) {\n      return null;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 108 function 1 (kb)", () => {
  const source = "function kb(a, b) {\n      try {\n        if (hb(18)) {\n          var c = b[0],\n            d = b.slice(1),\n            e = String(c),\n            f = ib.has(e) ? ib.get(e) : a.get(e);\n          if (!f || typeof f.invoke !== \"function\")\n            throw fb(Error(\"Attempting to execute non-function \" + b[0] + \".\"));\n          return f.apply(a, d);\n        }\n        var g = m(b),\n          h = g.next().value,\n          l = va(g),\n          n = a.get(String(h));\n        if (!n || typeof n.invoke !== \"function\")\n          throw fb(Error(\"Attempting to execute non-function \" + b[0] + \".\"));\n        return n.invoke.apply(n, [a].concat(wa(l)));\n      } catch (q) {\n        throw q;\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 109 function 1 (evaluate)", () => {
  const source = "function (a) {\n      var b = this.R;\n      return Array.isArray(a) ? null : a;\n    }";
  const args = [
  []
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 110 function 1 (Jb)", () => {
  const source = "function Jb(a, b) {\n      for (var c in a) Object.prototype.hasOwnProperty.call(a, c) && b(c, a[c]);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 111 function 1 (c)", () => {
  const source = "function c() {}";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 112 function 1 (Mm)", () => {
  const source = "function Mm(a, b) {\n      function c() {\n        return false;\n      }\n      a({});\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 113 function 1 (gu)", () => {
  const source = "function gu(a, b) {\n      function c() {\n        return false;\n      }\n      Mm(function () {\n        c() || Nm(c, b);\n      }, b);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 114 function 1 (Vu)", () => {
  const source = "function Vu(a, b) {\n      if (js(w)) {\n        for (var c = lu(b.prefix), d = {}, e = 0; e < a.length; e++)\n          bu[a[e]] && (d[a[e]] = bu[a[e]]);\n        gu(function () {\n          Jb(d, function (f, g) {\n            var h = [];\n            if (h.length) {\n              var l = h[0],\n                n = 0,\n                p = [],\n                q = {},\n                r;\n              r = void 0;\n              q[f] = [r];\n            }\n          });\n        }, eu());\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 115 function 1 (QJ)", () => {
  const source = "function (a) {\n      var b, c, d, e;\n      b = a.af;\n      c = a.ff;\n      d = a.rf;\n      e = a.hd;\n      if (b) {\n        gt(c[K.D.Yf], !!c[K.D.za]) && (Ou(TJ, e), Ru(e), ut(e));\n        Pq() !== 2 ? (Fu(e), Hu(e), hb(28) && Ju(e), LJ(e), OJ(200, e)) : Fu(e);\n        if (xk() && fu(eu())) {\n          var f = Eu();\n          if (O(495)) {\n            for (\n              var g = new Map(), h = m(GJ), l = h.next();\n              !l.done;\n              l = h.next()\n            ) {\n              var n = m(l.value),\n                p = n.next().value,\n                q = n.next().value,\n                r = p,\n                u = f[r],\n                v = Array.isArray(u) ? u[0] : u;\n              if (v !== void 0) {\n                var t = {},\n                  x =\n                    ((t.k = v),\n                    (t.i = String(Math.floor(Date.now() / 1e3))),\n                    (t.b = []),\n                    (t.m = \"1\"),\n                    t),\n                  y = Ht(x, q);\n                y && (HJ(r) || g.set(r, y));\n              }\n            }\n            if (g.size) {\n              var z,\n                C = new URLSearchParams();\n              e.path ? C.set(\"p\", e.path) : C.set(\"p\", \"/\");\n              e.gr && C.set(\"ce\", String(e.gr));\n              e.domain && e.domain !== \"auto\"\n                ? C.set(\"d\", e.domain)\n                : C.set(\"d\", \"auto:\" + w.location.hostname);\n              for (var D = m(g), H = D.next(); !H.done; H = D.next()) {\n                var L = m(H.value),\n                  J = L.next().value,\n                  Y = L.next().value;\n                C.set(J, Y);\n              }\n            }\n          }\n        }\n        Vu(TJ, e);\n        Wu(e);\n      }\n      c[K.D.za] &&\n        (Tu(TJ, c[K.D.za], c[K.D.Id], !!c[K.D.Wc], e.prefix),\n        Uu(c[K.D.za], c[K.D.Id], !!c[K.D.Wc], e.prefix),\n        vt(lt(e.prefix), c[K.D.za], c[K.D.Id], !!c[K.D.Wc], e),\n        vt(\"FPAU\", c[K.D.za], c[K.D.Id], !!c[K.D.Wc], e));\n      d && (O(101) ? Yu(UJ) : Yu(VJ));\n      $u(VJ);\n    }";
  const args = [
  []
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 116 function 1 (Kt)", () => {
  const source = "function Kt(a, b, c) {\n      if (Ft[b]) {\n        for (\n          var d = [], e = ks(a, void 0, void 0, null), f = m(e), g = f.next();\n          !g.done;\n          g = f.next()\n        ) {\n          var h = Gt(g.value, b, c);\n          h && d.push(null);\n        }\n        return d;\n      }\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 117 function 1 (ps)", () => {
  const source = "function ps(a, b, c) {\n      for (var d = [], e = ks(a, void 0, void 0, c), f = 0; f < e.length; f++) {\n        var g = e[f].split(\".\"),\n          h = g.shift();\n        if (!b || !h || b.indexOf(h) !== -1) {\n          var l = g.shift();\n          if (l) {\n            var n = l.split(\"-\");\n            d.push({ hr: \"\", ir: \"\", rr: 1, Cs: 1 });\n          }\n        }\n      }\n      return d;\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 118 function 1 (os)", () => {
  const source = "function os(a, b, c, d, e) {\n      if (ms(e)) {\n        var f = ps(a, d, e);\n        if (f.length === 1) return f[0];\n        if (f.length !== 0) {\n          f = qs(\n            f,\n            function (g) {\n              return null;\n            },\n            b,\n          );\n          if (f.length === 1) return f[0];\n          f = qs(\n            f,\n            function (g) {\n              return null;\n            },\n            c,\n          );\n          return f[0];\n        }\n      }\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 119 function 1 (Es)", () => {
  const source = "function Es(a, b, c, d, e) {\n      return void 0;\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 120 function 1 (ot)", () => {
  const source = "function ot(a, b, c) {\n      var d = null;\n      if (!d) return !1;\n      return !0;\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 121 function 1 (kt)", () => {
  const source = "function kt(a, b) {\n      b = b === void 0 ? !0 : b;\n      var c = lt(a.prefix);\n      if (it[c]) (mt(a), nt(a));\n      else if (ot(c, a.path, a.domain)) {\n        var d = jt[lt(a.prefix)] || { id: void 0, gi: void 0 };\n        mt(a);\n        nt(a);\n      } else {\n        if (b) {\n          var f = lt(a.prefix);\n          mt(a, !0);\n          nt(a, !0);\n        }\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 122 function 1 (rs)", () => {
  const source = "function rs(a, b, c, d) {\n      var e = ns(),\n        f = window;\n      var g = ns();\n      return e !== g || (c !== void 0 && ks(b, g, !1, d).indexOf(c) >= 0);\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 123 function 1 (ss)", () => {
  const source = "function ss(a, b, c, d) {\n      function e(x, y, z) {\n        if (z == null) return (delete h[y], x);\n        h[y] = z;\n        return x + \"; \" + y + \"=\" + z;\n      }\n      function f(x, y) {\n        if (y == null) return x;\n        h[y] = !0;\n        return x + \"; \" + y;\n      }\n      if (!ms(c.Nc)) return 2;\n      var g;\n      b == null\n        ? (g = a + \"=deleted; expires=\" + new Date(0).toUTCString())\n        : (c.encode && (b = encodeURIComponent(b)),\n          (b = ts(b)),\n          (g = a + \"=\" + b));\n      var h = {};\n      g = e(g, \"path\", c.path);\n      var l;\n      c.expires instanceof Date\n        ? (l = c.expires.toUTCString())\n        : c.expires != null && (l = \"\" + c.expires);\n      g = e(g, \"expires\", l);\n      g = e(g, \"max-age\", c.ws);\n      g = e(g, \"samesite\", c.Qs);\n      c.secure && (g = f(g, \"secure\"));\n      var n = c.domain;\n      if (n && n.toLowerCase() === \"auto\") {\n        for (var p = us(), q = void 0, r = !1, u = 0; u < p.length; ++u) {\n          var v = p[u] !== \"none\" ? p[u] : void 0,\n            t = e(g, \"domain\", v);\n          t = f(t, c.flags);\n          try {\n          } catch (x) {\n            q = x;\n            continue;\n          }\n          r = !0;\n          if (!vs(v, c.path) && rs(t, a, b, c.Nc)) return 0;\n        }\n        if (q && !r) throw q;\n        return 1;\n      }\n      n && n.toLowerCase() !== \"none\" && (g = e(g, \"domain\", n));\n      g = f(g, c.flags);\n      return vs(n, c.path) ? 1 : rs(g, a, b, c.Nc) ? 0 : 1;\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 124 function 1 (ws)", () => {
  const source = "function ws(a, b, c) {\n      c.path == null && (c.path = \"/\");\n      c.domain || (c.domain = \"auto\");\n      var d = ss(a, b, c);\n      return d;\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 125 function 1 (qt)", () => {
  const source = "function qt(a, b, c, d) {\n      var e;\n      e = [\"1\", \"dummyDomain\", \"dummyPath\"].join(\".\");\n      var f = {};\n      f.Nc = null;\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 126 function 1 (kt)", () => {
  const source = "function kt(a, b) {\n      b = b === void 0 ? !0 : b;\n      var c = lt(a.prefix);\n      if (it[c]) (mt(a), nt(a));\n      else if (ot(c, a.path, a.domain)) {\n        var d = jt[lt(a.prefix)] || { id: void 0, gi: void 0 };\n        mt(a);\n        nt(a);\n      } else {\n        if (b) {\n          var f = lt(a.prefix);\n          mt(a, !0);\n          nt(a, !0);\n        }\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 127 function 1 (hM)", () => {
  const source = "function (a) {\n      for (var b = [], c = 0; c < b.length && (b[c](a), !a.isAborted); c++);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 128 function 1 (rs)", () => {
  const source = "function rs(a, b, c, d) {\n      var e = ns(),\n        f = window;\n      var g = ns();\n      return e !== g || (c !== void 0 && ks(b, g, !1, d).indexOf(c) >= 0);\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 129 function 1 (rs)", () => {
  const source = "function rs(a, b, c, d) {\n      var e = ns(),\n        f = window;\n      var g = ns();\n      return e !== g || (c !== void 0 && ks(b, g, !1, d).indexOf(c) >= 0);\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 130 function 1 (kt)", () => {
  const source = "function kt(a, b) {\n      b = b === void 0 ? !0 : b;\n      var c = lt(a.prefix);\n      if (it[c]) (mt(a), nt(a));\n      else if (ot(c, a.path, a.domain)) {\n        var d = jt[lt(a.prefix)] || { id: void 0, gi: void 0 };\n        mt(a);\n        nt(a);\n      } else {\n        if (b) {\n          var f = lt(a.prefix);\n          mt(a, !0);\n          nt(a, !0);\n        }\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 131 function 1 (Lr)", () => {
  const source = "function Lr(a) {\n      a = a === void 0 ? !0 : a;\n      if (!Gm(Jr)) return { error: 3 };\n      try {\n        if (!w.localStorage) return { error: 1 };\n      } catch (f) {\n        return { error: 14 };\n      }\n      var b = { schema: \"gcl\", version: 1 },\n        c = void 0;\n      try {\n        c = w.localStorage.getItem(\"_gcl_ls\");\n      } catch (f) {\n        return { error: 13 };\n      }\n      try {\n        if (c) {\n          var d = JSON.parse(c);\n          if (d && typeof d === \"object\") b = d;\n          else return { error: 12 };\n        }\n      } catch (f) {\n        return { error: 8 };\n      }\n      if (b.schema !== \"gcl\") return { error: 4 };\n      if (b.version !== 1) return { error: 5 };\n      try {\n        var e = Pr(b);\n      } catch (f) {\n        return { error: 8 };\n      }\n      return { value: b, error: 0 };\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 132 function 1 (Or)", () => {
  const source = "function Or(a) {\n      if (a) {\n        var b = Lr(!1);\n        b.error !== 0\n          ? null\n          : b.value\n            ? a in b.value\n              ? (delete b.value[a], Mr(b) !== 0 && null)\n              : null\n            : null;\n      } else null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 133 function 1 (mt)", () => {
  const source = "function mt(a, b) {\n      if (Zr(Qr) && Xr([Qr])[Qr.nb] === -1) {\n        for (\n          var c = {}, d = ((c[Qr.nb] = 0), c), e = m(Ur), f = e.next();\n          !f.done;\n          f = e.next()\n        ) {\n          var g = f.value;\n          g !== Qr && Zr(g) && (d[g.nb] = 0);\n        }\n        Yr(d, a);\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 134 function 1 (kt)", () => {
  const source = "function kt(a, b) {\n      b = b === void 0 ? !0 : b;\n      var c = lt(a.prefix);\n      if (it[c]) (mt(a), nt(a));\n      else if (ot(c, a.path, a.domain)) {\n        var d = jt[lt(a.prefix)] || { id: void 0, gi: void 0 };\n        mt(a);\n        nt(a);\n      } else {\n        if (b) {\n          var f = lt(a.prefix);\n          mt(a, !0);\n          nt(a, !0);\n        }\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 135 function 1 (Nr)", () => {
  const source = "function Nr(a) {\n      if (!a) return { error: 10 };\n      var b = Lr();\n      if (b.error !== 0) return b;\n      if (!b.value) return { error: 2 };\n      if (!(a in b.value)) return { value: void 0, error: 15 };\n      var c = b.value[a];\n      return c === null || c === void 0 || c === \"\"\n        ? { value: void 0, error: 11 }\n        : { value: c, error: 0 };\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 136 function 1 (Xr)", () => {
  const source = "function Xr(a) {\n      var b = void 0;\n      for (var e = b, f = {}, g = m(a), h = g.next(); !h.done; h = g.next()) {\n        var l = h.value;\n        if (e && Wr(l)) {\n          var n = e[l.Tg];\n          n === void 0 || Number.isNaN(n)\n            ? (f[l.nb] = -1)\n            : (f[l.nb] = Number(n));\n        } else f[l.nb] = -1;\n      }\n      return f;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 137 function 1 (mt)", () => {
  const source = "function mt(a, b) {\n      if (Zr(Qr) && Xr([Qr])[Qr.nb] === -1) {\n        for (\n          var c = {}, d = ((c[Qr.nb] = 0), c), e = m(Ur), f = e.next();\n          !f.done;\n          f = e.next()\n        ) {\n          var g = f.value;\n          g !== Qr && Zr(g) && (d[g.nb] = 0);\n        }\n        Yr(d, a);\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 138 function 1 (Kr)", () => {
  const source = "function Kr(a, b) {\n      if (!a) return 10;\n      if (b === null || b === void 0 || b === \"\") return 11;\n      var c = Lr(!1);\n      if (c.error !== 0) return c.error;\n      if (!c.value) return 2;\n      c.value[a] = b;\n      var d = Mr(c);\n      return d;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 139 function 1 (Yr)", () => {
  const source = "function Yr(a, b) {\n      b = b || {};\n      for (\n        var c = Qb(), d = Ir(b, c, !0), e = {}, f = m(Ur), g = f.next();\n        !g.done;\n        g = f.next()\n      ) {\n        var h = g.value,\n          l = a[h.nb];\n        l !== void 0 && l !== -1 && (e[h.Tg] = l);\n      }\n      e.creationTimeMs = c;\n      return !0;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 140 function 1 (mt)", () => {
  const source = "function mt(a, b) {\n      if (Zr(Qr) && Xr([Qr])[Qr.nb] === -1) {\n        for (\n          var c = {}, d = ((c[Qr.nb] = 0), c), e = m(Ur), f = e.next();\n          !f.done;\n          f = e.next()\n        ) {\n          var g = f.value;\n          g !== Qr && Zr(g) && (d[g.nb] = 0);\n        }\n        Yr(d, a);\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 141 function 1 (Mr)", () => {
  const source = "function Mr(a) {\n      if (a.error) return a.error;\n      if (!a.value) return 2;\n      var b = a.value,\n        c;\n      try {\n        c = JSON.stringify(b);\n      } catch (d) {\n        return 6;\n      }\n      return 0;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 142 function 1 (Kr)", () => {
  const source = "function Kr(a, b) {\n      if (!a) return 10;\n      if (b === null || b === void 0 || b === \"\") return 11;\n      var c = Lr(!1);\n      if (c.error !== 0) return c.error;\n      if (!c.value) return 2;\n      c.value[a] = b;\n      var d = Mr(c);\n      return d;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 143 function 1 (iu)", () => {
  const source = "function iu(a) {\n      for (var b = [], c = [], d = m(c), e = d.next(); !e.done; e = d.next()) {\n        var f = ru(e.value);\n        f != null &&\n          ((f.kd = void 0), (f.Aa = new Qt()), (f.Xa = [1]), su(b, f));\n      }\n      b.sort(function (g, h) {\n        return h.timestamp - g.timestamp;\n      });\n      return tu(b);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 144 function 1 (dv)", () => {
  const source = "function dv(a, b) {\n      return 0;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 145 function 1 (fv)", () => {
  const source = "function fv(a) {\n      var b = 0,\n        c = 0;\n      return c > b;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 146 function 1 (Vv)", () => {
  const source = "function Vv(a) {\n      return Mv.test(A.location.host) ? true : fv(a);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 147 function 1 (wt)", () => {
  const source = "function wt(a) {\n      return [];\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 148 function 1 (xt)", () => {
  const source = "function xt(a, b) {\n      var c = wt(a),\n        d = {};\n      if (!c || !c.length) return d;\n      for (var e = 0; e < c.length; e++) {\n        var f = c[e].value.split(\".\");\n        if (\n          !(f[0] !== \"1\" || (b && f.length < 3) || (!b && f.length !== 3)) &&\n          Number(f[1])\n        ) {\n          d[c[e].me] || (d[c[e].me] = []);\n          var g = { version: f[0], timestamp: Number(f[1]) * 1e3 };\n          b && f.length > 3 && (g.labels = f.slice(3));\n          d[c[e].me].push(g);\n        }\n      }\n      return d;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 149 function 1 (fv)", () => {
  const source = "function fv(a) {\n      var b = 0,\n        c = 0;\n      return c > b;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 150 function 1 (fv)", () => {
  const source = "function fv(a) {\n      var b = 0,\n        c = 0;\n      return c > b;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 151 function 1 (fv)", () => {
  const source = "function fv(a) {\n      var b = 0,\n        c = 0;\n      return c > b;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 152 function 1 (nu)", () => {
  const source = "function nu(a) {\n      for (\n        var b = Kt(a, 5) || [], c = [], d = m(b), e = d.next();\n        !e.done;\n        e = d.next()\n      ) {\n        var f = e.value,\n          g = f,\n          h = null;\n        h && ou(c, g.k, h, g.b || [], f.u);\n      }\n      return c.sort(function (l, n) {\n        return n.timestamp - l.timestamp;\n      });\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 153 function 1 (dv)", () => {
  const source = "function dv(a, b) {\n      return 0;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 154 function 1 (fv)", () => {
  const source = "function fv(a) {\n      var b = 0,\n        c = 0;\n      return c > b;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 155 function 1 (hu)", () => {
  const source = "function hu(a) {\n      return iu(a).map(function (b) {\n        return null;\n      });\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 156 function 1 (Fo)", () => {
  const source = "function Fo(a, b) {}";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 157 function 1 (jM)", () => {
  const source = "function (a, b, c, d) {\n      function e(v, t) {}\n      function f(v) {}\n      var g =\n        d.isGtmEvent && a === \"\"\n          ? {\n              id: \"\",\n              prefix: \"\",\n              destinationId: \"\",\n              ids: [],\n              ae: function () {\n                return !1;\n              },\n            }\n          : $o(a, d.isGtmEvent);\n      if (g) {\n        var h = new HG(g, b, d);\n        if (!h.isAborted) {\n          var l = [];\n          if (d.eventMetadata[P.J.kc]) {\n            var n = d.eventMetadata[P.J.kc];\n            Array.isArray(n) || (n = [n]);\n            for (var p = 0; p < n.length; p++) {\n              var q = iM(n[p], h);\n              l.push(q);\n            }\n          } else\n            (b === K.D.ra && (l.push(iM(N.T.aj, h)), l.push(iM(N.T.oi, h))),\n              l.push(iM(N.T.Da, h)),\n              b !== K.D.Lb &&\n                (l.push(iM(N.T.Ub, h)),\n                l.push(iM(N.T.Hb, h)),\n                l.push(iM(N.T.xb, h))));\n          var r = [K.D.da, K.D.fa],\n            u = void 0;\n        }\n      }\n    }";
  const args = [
  [],
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 158 function 1 (getItem)", () => {
  const source = "function (a) {\n      var b = null;\n      return b;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 159 function 1 (apply)", () => {
  const source = "function (a, b) {\n      return this.Xd.apply(null, b);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 160 function 1 (setItem)", () => {
  const source = "function (a, b) {}";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 161 function 1 (jb)", () => {
  const source = "function jb(a, b) {\n      for (\n        var c, d = m(b), e = d.next();\n        !e.done && !((c = null), c instanceof Ta);\n        e = d.next()\n      );\n      return c;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 162 function 1 (k)", () => {
  const source = "function k(e, t) {\n      let n;\n      try {\n        n = void 0;\n      } catch {\n        n = void 0;\n      }\n      let o;\n      try {\n        o = void 0;\n      } catch {\n        o = void 0;\n      }\n      return n || o;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 163 function 1 (j)", () => {
  const source = "function j() {\n      return null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 165 function 1 (A)", () => {
  const source = "function A() {\n      return null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 167 function 1 (E)", () => {
  const source = "function (n, t) {\n      return \"\";\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 168 function 1 (En)", () => {
  const source = "function En() {\n      var n;\n      vn() || (gn(\"getItem\") && (bn = null));\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 169 function 1 (_t)", () => {
  const source = "function _t(n, t) {\n      return t;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 170 function 1 (Bt)", () => {
  const source = "function Bt() {\n      var n =\n        ((function () {\n          try {\n            var n,\n              t = navigator.userAgent;\n            if (\n              (n =\n                -1 !== t.indexOf(\"MSIE\")\n                  ? t.match(/MSIE (\\d+\\.\\d+);?/)\n                  : t.match(/Trident.*rv[ :]*(\\d+\\.\\d+)/))\n            )\n              return Number(n[1]) < 10;\n          } catch (n) {}\n          return !1;\n        })()\n          ? \"//\"\n          : \"https://\") + Dn.ENTRY_POINTS.GATEWAY_DOMAIN;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 171 function 1 (_r)", () => {
  const source = "function _r() {\n      (window.location &&\n        window.location.protocol &&\n        \"file:\" === window.location.protocol) ||\n        (window &&\n          window.addEventListener &&\n          (wr(Dn.COMMONS.SCRIPT_INITIALIZED_PROP, !0),\n          wr(Dn.COMMONS.SCRIPT_INITIALIZED_PENDING_PROP, !1),\n          Bt(),\n          mr(),\n          window.addEventListener(Dn.EVENTS.HASH_CHANGE, null, !1),\n          window.addEventListener(Dn.EVENTS.POP_STATE, null, !1),\n          window.addEventListener(Dn.EVENTS.CUSTOM_HISTORY_CHANGED, null, !1),\n          document.addEventListener(Dn.EVENTS.MOUSE_DOWN, null, !0)));\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 172 function 1 (Ir)", () => {
  const source = "function Ir(n) {\n      try {\n        !Ee(Dn.COMMONS.SCRIPT_INITIALIZED_PROP) &&\n          !Ee(Dn.COMMONS.SCRIPT_INITIALIZED_PENDING_PROP) &&\n          (function () {\n            return (function (n) {\n              var t = n,\n                e = ((n = t.tagVersion), t.getPids),\n                r = t.onError,\n                o = t.liFatId,\n                i = t.liGiant,\n                a = t.inAppHandler;\n              return (\n                \"number\" == typeof n &&\n                Array.isArray(null == e ? void 0 : e()) &&\n                (!r || \"function\" == typeof r) &&\n                (!o || \"string\" == typeof o) &&\n                (!i || \"string\" == typeof i) &&\n                !!a\n              );\n            })(\n              arguments.length > 0 && arguments[0] !== undefined\n                ? arguments[0]\n                : {},\n            );\n          })(n) &&\n          (wr(Dn.COMMONS.SCRIPT_INITIALIZED_PENDING_PROP, !0),\n          window.history &&\n            ((window.history.pushState = Un(window.history.pushState)),\n            (window.history.replaceState = Un(window.history.replaceState))),\n          _r());\n      } catch (t) {\n        Boolean(\n          !window.navigator ||\n          window.navigator.webdriver ||\n          window.navigator.plugins.__proto__ !== PluginArray.prototype ||\n          (0 < window.navigator.plugins.length &&\n            window.navigator.plugins[0].__proto__ !== Plugin.prototype) ||\n          /headless/i.test(navigator.userAgent),\n        ) || pt(t);\n      }\n    }";
  const args = [
  []
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 173 function 1 (mn)", () => {
  const source = "function (n) {\n      var t = null;\n      try {\n        t = window.localStorage.getItem(n);\n      } catch (e) {}\n      return t || \"\";\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 174 function 1 (Rn)", () => {
  const source = "function Rn() {\n      if (On(window.document)) return \"\";\n      var n = (function () {\n        var n = mn(Cn);\n        return (n = n || E(window.document, Cn)) || \"\";\n      })();\n      return (\n        n ||\n          ((n = (function () {\n            try {\n              if (\n                window.crypto &&\n                \"object\" == typeof window.crypto &&\n                window.crypto.randomUUID\n              )\n                return window.crypto.randomUUID();\n            } catch (n) {}\n            return \"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx\".replace(\n              /[xy]/g,\n              function (n) {\n                var t = (16 * Math.random()) | 0;\n                return (\"x\" == n ? t : (3 & t) | 8).toString(16);\n              },\n            );\n          })()),\n          n),\n        n || \"\"\n      );\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 175 function 1 (Rn)", () => {
  const source = "function Rn() {\n      if (On(window.document)) return \"\";\n      var n = (function () {\n        var n = mn(Cn);\n        return (n = n || E(window.document, Cn)) || \"\";\n      })();\n      return (\n        n ||\n          ((n = (function () {\n            try {\n              if (\n                window.crypto &&\n                \"object\" == typeof window.crypto &&\n                window.crypto.randomUUID\n              )\n                return window.crypto.randomUUID();\n            } catch (n) {}\n            return \"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx\".replace(\n              /[xy]/g,\n              function (n) {\n                var t = (16 * Math.random()) | 0;\n                return (\"x\" == n ? t : (3 & t) | 8).toString(16);\n              },\n            );\n          })()),\n          n),\n        n || \"\"\n      );\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 176 function 1 (Rn)", () => {
  const source = "function Rn() {\n      if (On(window.document)) return \"\";\n      var n = (function () {\n        var n = mn(Cn);\n        return (n = n || E(window.document, Cn)) || \"\";\n      })();\n      return (\n        n ||\n        ((n = (function () {\n          try {\n            if (\n              window.crypto &&\n              \"object\" == typeof window.crypto &&\n              window.crypto.randomUUID\n            )\n              return window.crypto.randomUUID();\n          } catch (n) {}\n          return \"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx\".replace(\n            /[xy]/g,\n            function (n) {\n              var t = (16 * Math.random()) | 0;\n              return (\"x\" == n ? t : (3 & t) | 8).toString(16);\n            },\n          );\n        })()),\n        null,\n        n || \"\")\n      );\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 177 function 1 (A)", () => {
  const source = "function A(n) {\n      [\"next\", \"throw\", \"return\"].forEach(function (t) {\n        l(n, t, function (n) {\n          return null;\n        });\n      });\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 178 function 1 (Rn)", () => {
  const source = "function Rn() {\n      if (On(window.document)) return \"\";\n      var n = (function () {\n        var n = mn(Cn);\n        return (n = n || E(window.document, Cn)) || \"\";\n      })();\n      return (\n        n ||\n          ((n = (function () {\n            try {\n              if (\n                window.crypto &&\n                \"object\" == typeof window.crypto &&\n                window.crypto.randomUUID\n              )\n                return window.crypto.randomUUID();\n            } catch (n) {}\n            return \"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx\".replace(\n              /[xy]/g,\n              function (n) {\n                var t = (16 * Math.random()) | 0;\n                return (\"x\" == n ? t : (3 & t) | 8).toString(16);\n              },\n            );\n          })()),\n          n),\n        n || \"\"\n      );\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 179 function 1 (registerPlugin)", () => {
  const source = "function (e, t) {}";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 180 function 1 (plugin)", () => {
  const source = "function (fbq, instance, config) {}";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 181 function 1 (loadPlugin)", () => {
  const source = "function (e) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 182 function 1 (k)", () => {
  const source = "function k(e) {\n      if (Array.isArray(e)) return e;\n    }";
  const args = [
  []
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 183 function 1 (I)", () => {
  const source = "function I(e) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 184 function 1 (y)", () => {
  const source = "function y(e, t, n, r, o, a, i) {\n      try {\n        var l = e[a](i),\n          s = l.value;\n      } catch (e) {\n        return;\n      }\n      l.done ? t(s) : Promise.resolve(s).then(r, o);\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 185 function 1 (Je)", () => {
  const source = "function Je(e, t, n, r, o, i) {\n      var l = new u(a.piiTranslator);\n      i != null && (l = i);\n      try {\n        var c = (e && e.userData) || {},\n          d = (e && e.censoredUserDataFormat) || {},\n          m = (e && e.censoredUserDataFormatFormFields) || {},\n          p = (e && e.userDataFormFields) || {},\n          _ = (e && e.alternateUserDataFormFields) || {},\n          f = (e && e.alternateUserData) || {},\n          g,\n          h = {},\n          y = {},\n          C = c.em;\n        C != null && Ye(C) && ((g = Ye(C)), g === 1 && (h.em = be));\n        var b = p.em;\n        b != null && Ye(b) && ((g = Ye(b)), g === 1 && (y.em = be));\n        var v = {},\n          S = f.em;\n        S != null && Ye(S) && ((g = Ye(S)), g === 1 && (v.em = be));\n        var R = {},\n          L = _.em;\n        L != null && Ye(L) && ((g = Ye(L)), g === 1 && (R.em = be));\n      } catch (t) {}\n      (l.append(\"v\", a.version),\n        a._releaseSegment && l.append(\"r\", a._releaseSegment),\n        l.append(\"a\", e && e.agent ? e.agent : a.agent),\n        e && (l.append(\"ec\", e.eventCount), e.eventCount++));\n      var E = Y.trigger(e, t, n, r, o);\n      (U(E, function (t) {\n        return U(j(t), function (n) {\n          if (l.containsKey(n)) {\n            if (!Pe.has(n))\n              if (n === \"bfs\" && G(t[n]) && G(l.get(n))) {\n                var r = l.get(n),\n                  o = s(s({}, r), t[n]);\n                l.replaceEntry(n, o);\n              } else {\n                var a = de.isInMetaQEControl(e == null ? void 0 : e.id);\n                if (a)\n                  throw new Error(\n                    \"Custom parameter \".concat(\n                      n,\n                      \" has already been specified.\",\n                    ),\n                  );\n                var i = l.get(n),\n                  u = t != null ? t[n] : null;\n                (B(\n                  i === u\n                    ? new Error(\n                        \"[SignalsFBEvents] \".concat(\n                          n,\n                          \" param is the same as the existing value.\",\n                        ),\n                      )\n                    : new Error(\n                        \"[SignalsFBEvents] \".concat(\n                          n,\n                          \" param is different from the existing value.\",\n                        ),\n                      ),\n                  Ne,\n                  Me,\n                ),\n                  l.replaceEntry(n, u != null ? u : i),\n                  !l.containsKey(\"ie[c]\") &&\n                    !l.containsKey(\"ie%5Bc%5D\") &&\n                    l.append(\"ie[c]\", 1));\n              }\n            t && (Ze(n, t[n]) || et(n, t[n])) && l.replaceEntry(n, t[n]);\n          } else l.append(n, t[n]);\n        });\n      }),\n        l.append(\"it\", Ce));\n      var k = e && e.codeless === \"false\";\n      l.append(\"coo\", k);\n      var I = xe.pluginConfig.getWithGlobalFallback(\n        e ? e.id : null,\n        \"dataProcessingOptions\",\n      );\n      if (I != null) {\n        var T = I.dataProcessingCountry,\n          D = I.dataProcessingOptions,\n          x = I.dataProcessingState;\n        (l.append(\"dpo\", D.join(\",\")),\n          l.append(\"dpoco\", T),\n          l.append(\"dpost\", x));\n      }\n      var $ = xe.pluginConfig.getWithGlobalFallback(\n        e ? e.id : null,\n        \"disabledExtensions\",\n      );\n      if ($ != null) {\n        var P = $.disabledExtensions;\n        l.append(\"de\", P.join(\",\"));\n      }\n      return l;\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 186 function 1 (tt)", () => {
  const source = "function tt(e) {\n      return (\n        !!(function (e) {\n          if (!e.hasAttribute(\"href\")) return !1;\n          var n = e.getAttribute(\"href\");\n          return n != null;\n        })(e) ||\n        !!Ue(e)\n          .replace(Ye, \" \")\n          .replace(Je, function (e) {\n            return e + \" \";\n          })\n          .replace(Ze, function (e) {\n            return Be(e, e.length - 1) + \" \";\n          })\n          .replace(et, \" \")\n          .trim()\n          .toLowerCase() ||\n        !!Qe(e)\n      );\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 187 function 1 ($)", () => {
  const source = "function $(e, t) {\n      if (!(e instanceof t))\n        throw new TypeError(\"Cannot call a class as a function\");\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 188 function 1 ($)", () => {
  const source = "function $(e, t) {\n      if (!(e instanceof t))\n        throw new TypeError(\"Cannot call a class as a function\");\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 189 function 1 (x)", () => {
  const source = "function x(e) {\n      if (Array.isArray(e)) return null;\n    }";
  const args = [
  []
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 190 function 1 (r)", () => {
  const source = "function r(e, t) {\n      try {\n        return null;\n      } catch (e) {\n        return null;\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 195 function 1 (Il)", () => {
  const source = "function Il(e, t, n, r) {\n      do Ll();\n      while (ll !== null);\n      if (G & 6) throw Error(a(327));\n      n = e.finishedWork;\n      var i = e.finishedLanes;\n      if (n === null) return null;\n      if (((e.finishedWork = null), (e.finishedLanes = 0), n === e.current))\n        throw Error(a(177));\n      ((e.callbackNode = null), (e.callbackPriority = 0));\n      var o = n.lanes | n.childLanes;\n      if (\n        (rn(e, o),\n        e === K && ((q = K = null), (J = 0)),\n        (!(n.subtreeFlags & 2064) && !(n.flags & 2064)) ||\n          cl ||\n          ((cl = !0),\n          Wl(Lt, function () {\n            return (Ll(), null);\n          })),\n        (o = (n.flags & 15990) != 0),\n        n.subtreeFlags & 15990 || o)\n      ) {\n        ((o = Jc.transition), (Jc.transition = null));\n        var s = C;\n        C = 1;\n        var c = G;\n        ((G |= 4),\n          (qc.current = null),\n          wc(e, n),\n          Rc(n, e),\n          $r(zi),\n          (jn = !!Ri),\n          (zi = Ri = null),\n          (e.current = n),\n          Bc(n, e, i),\n          Nt(),\n          (G = c),\n          (C = s),\n          (Jc.transition = o));\n      } else e.current = n;\n      if (\n        (cl && ((cl = !1), (ll = e), (ul = i)),\n        (o = e.pendingLanes),\n        o === 0 && (sl = null),\n        Ht(n.stateNode, r),\n        Q(e, S()),\n        t !== null)\n      )\n        for (r = e.onRecoverableError, n = 0; n < t.length; n++)\n          ((i = t[n]),\n            r(i.value, { componentStack: i.stack, digest: i.digest }));\n      if (al) throw ((al = !1), (e = ol), (ol = null), e);\n      return (\n        ul & 1 && e.tag !== 0 && Ll(),\n        (o = e.pendingLanes),\n        o & 1 ? (e === fl ? dl++ : ((dl = 0), (fl = e))) : (dl = 0),\n        Sa(),\n        null\n      );\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "Error"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 196 function 1 (o)", () => {
  const source = "function o(e) {\n      null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 197 function 1 (Fe)", () => {
  const source = "function Fe(e, t, n, r, i, a, o) {\n      try {\n        var s = e[a](o),\n          c = s.value;\n      } catch (e) {\n        return;\n      }\n      s.done ? t(c) : Promise.resolve(c).then(r, i);\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 198 function 1 (Ec)", () => {
  const source = "function Ec(e, t) {\n      if (\n        ((t = t.updateQueue),\n        (t = t === null ? null : t.lastEffect),\n        t !== null)\n      ) {\n        var n = (t = t.next);\n        do {\n          if ((n.tag & e) === e) {\n            var r = n.create;\n            n.destroy = null;\n          }\n          n = n.next;\n        } while (n !== t);\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 199 function 1 (Sa)", () => {
  const source = "function Sa() {\n      if (!ya && _a !== null) {\n        ya = !0;\n        var e = 0,\n          t = C;\n        try {\n          var n = _a;\n          for (C = 1; e < n.length; e++) {\n            var r = n[e];\n            do r = null;\n            while (r !== null);\n          }\n          ((_a = null), (va = !1));\n        } catch (t) {\n          throw (_a !== null && (_a = _a.slice(e + 1)), null, t);\n        } finally {\n          ((C = t), (ya = !1));\n        }\n      }\n      return null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 200 function 1 (Fl)", () => {
  const source = "function Fl(e, t, n) {\n      var r = C,\n        i = Jc.transition;\n      try {\n        ((Jc.transition = null), (C = 1)); /* Removed Il call */\n      } finally {\n        ((Jc.transition = i), (C = r));\n      }\n      return null;\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 201 function 1 (Hn)", () => {
  const source = "function (e) {\n      return R(function () {\n        return G(this, function (c) {\n          switch (c.label) {\n            case 0:\n              return [2, null];\n          }\n        });\n      })();\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 202 function 1 (Ll)", () => {
  const source = "function Ll() {\n      if (ll !== null) {\n        var e = on(ul),\n          t = Jc.transition,\n          n = C;\n        try {\n          if (((Jc.transition = null), (C = 16 > e ? 16 : e), ll === null))\n            var r = !1;\n          else {\n            if (((e = ll), (ll = null), (ul = 0), G & 6)) throw Error(a(331));\n            var i = G;\n            for (G |= 4, U = e.current; U !== null; ) {\n              var o = U,\n                s = o.child;\n              if (U.flags & 16) {\n                var c = o.deletions;\n                if (c !== null) {\n                  for (var l = 0; l < c.length; l++) {\n                    var u = c[l];\n                    for (U = u; U !== null; ) {\n                      var d = U;\n                      switch (d.tag) {\n                        case 0:\n                        case 11:\n                        case 15:\n                          Tc(8, d, o);\n                      }\n                      var f = d.child;\n                      if (f !== null) ((f.return = d), (U = f));\n                      else\n                        for (; U !== null; ) {\n                          d = U;\n                          var p = d.sibling,\n                            m = d.return;\n                          if ((Oc(d), d === u)) {\n                            U = null;\n                            break;\n                          }\n                          if (p !== null) {\n                            ((p.return = m), (U = p));\n                            break;\n                          }\n                          U = m;\n                        }\n                    }\n                  }\n                  var h = o.alternate;\n                  if (h !== null) {\n                    var g = h.child;\n                    if (g !== null) {\n                      h.child = null;\n                      do {\n                        var _ = g.sibling;\n                        ((g.sibling = null), (g = _));\n                      } while (g !== null);\n                    }\n                  }\n                  U = o;\n                }\n              }\n              if (o.subtreeFlags & 2064 && s !== null)\n                ((s.return = o), (U = s));\n              else\n                b: for (; U !== null; ) {\n                  if (((o = U), o.flags & 2048))\n                    switch (o.tag) {\n                      case 0:\n                      case 11:\n                      case 15:\n                        Tc(9, o, o.return);\n                    }\n                  var v = o.sibling;\n                  if (v !== null) {\n                    ((v.return = o.return), (U = v));\n                    break b;\n                  }\n                  U = o.return;\n                }\n            }\n            var y = e.current;\n            for (U = y; U !== null; ) {\n              s = U;\n              var ee = s.child;\n              if (s.subtreeFlags & 2064 && ee !== null)\n                ((ee.return = s), (U = ee));\n              else\n                b: for (s = y; U !== null; ) {\n                  if (((c = U), c.flags & 2048))\n                    try {\n                      switch (c.tag) {\n                        case 0:\n                        case 11:\n                        case 15:\n                          Ec(9, c);\n                      }\n                    } catch (e) {\n                      $(c, c.return, e);\n                    }\n                  if (c === s) {\n                    U = null;\n                    break b;\n                  }\n                  var te = c.sibling;\n                  if (te !== null) {\n                    ((te.return = c.return), (U = te));\n                    break b;\n                  }\n                  U = c.return;\n                }\n            }\n            Sa();\n            r = !0;\n          }\n          return r;\n        } finally {\n          ((C = n), (Jc.transition = t));\n        }\n      }\n      return !1;\n    }";
  const args = [];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "Error"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 203 function 1 (Nl)", () => {
  const source = "function Nl(e) {\n      ((e.memoizedProps = e.pendingProps), (qc.current = null));\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 204 function 1 (r)", () => {
  const source = "function (r, i, a) {\n      let o = Promise.resolve();\n      if (i && i.length > 0) {\n        let r = document.getElementsByTagName(`link`),\n          s = document.querySelector(`meta[property=csp-nonce]`),\n          c = s?.nonce || s?.getAttribute(`nonce`);\n        function l(e) {\n          return Promise.all(\n            e.map((e) =>\n              Promise.resolve(e).then(\n                (e) => ({ status: `fulfilled`, value: e }),\n                (e) => ({ status: `rejected`, reason: e }),\n              ),\n            ),\n          );\n        }\n        o = l(\n          i.map((i) => {\n            if (((i = t(i, a)), i in n)) return;\n            n[i] = !0;\n            let o = i.endsWith(`.css`),\n              s = o ? `[rel=\"stylesheet\"]` : ``;\n            if (a)\n              for (let e = r.length - 1; e >= 0; e--) {\n                let t = r[e];\n                if (t.href === i && (!o || t.rel === `stylesheet`)) return;\n              }\n            else if (document.querySelector(`link[href=\"${i}\"]${s}`)) return;\n            let l = document.createElement(`link`);\n            if (\n              ((l.rel = o ? `stylesheet` : e),\n              o || (l.as = `script`),\n              (l.crossOrigin = ``),\n              (l.href = i),\n              c && l.setAttribute(`nonce`, c),\n              document.head.appendChild(l),\n              o)\n            )\n              return new Promise((e, t) => {\n                (l.addEventListener(`load`, e),\n                  l.addEventListener(`error`, () =>\n                    t(Error(`Unable to preload CSS for ${i}`)),\n                  ));\n              });\n          }),\n        );\n      }\n      function s(e) {\n        let t = new Event(`vite:preloadError`, { cancelable: !0 });\n        if (((t.payload = e), !t.defaultPrevented)) throw e;\n      }\n      return o.then((e) => {\n        for (let t of e || []) t.status === `rejected` && s(t.reason);\n        return r().catch(s);\n      });\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 205 function 1 (Ml)", () => {
  const source = "function Ml() {\n      for (; q !== null; ) Nl(q);\n    }";
  const args = [];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "Error"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 207 function 1 (Fe)", () => {
  const source = "function Fe(e, t, n, r, i, a, o) {\n      try {\n        var s = e[a](o),\n          c = s.value;\n      } catch (e) {\n        return;\n      }\n      s.done ? t(c) : Promise.resolve(c).then(r, i);\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 208 function 1 ($t)", () => {
  const source = "function (e, t, n) {\n      ((Xt = ``),\n        n &&\n          (Qt = function (r) {\n            n(r);\n          }));\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 210 function 1 (Al)", () => {
  const source = "function Al(e, t) {\n      var n = G;\n      G |= 2;\n      var r = Ol();\n      (K !== e || J !== t) && (il = null);\n      do\n        try {\n          jl();\n          break;\n        } catch (t) {}\n      while (1);\n      if ((ro(), (G = n), (Kc.current = r), q !== null)) throw Error(a(261));\n      return ((K = null), (J = 0), Y);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "Error"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 211 function 1 (jl)", () => {
  const source = "function jl() {\n      for (; q !== null; ) null;\n    }";
  const args = [];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "Error"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 213 function 1 (Gn)", () => {
  const source = "function (e, t, r, a, o) {\n      document.body.setAttribute(et, `1`);\n      var s = fn(e.countryCode, e.regionCode),\n        c = Number(e.httpStatusCode || Bn()) || void 0,\n        l = {\n          essentialToken: e.essentialToken,\n          multiTrackToken: e.multiTrackToken,\n          sessionToken: e.sessionToken,\n        },\n        u = Object.assign(\n          a || $,\n          H(V({}, e, qn(e), Kn(e.enableActiveConsent, s, e.enableSecGpc, l)), {\n            complianceZone: s,\n            isReady: !0,\n            softNavigation: !1,\n            httpStatusCode: c,\n          }),\n        );\n      t && t(u);\n      var d = o || { dux: null, denormalizedDux: null, gtm: null };\n      r && d && r(d);\n      var f = function () {\n          var e =\n            arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};\n          (t ? t(e, u) : Object.assign(u, e), dn.broadcastContext(u));\n        },\n        p = e.disableLogger,\n        m = e.enableLogger;\n      (dn.isRunningInIframe()\n        ? dn.initAsChild(function (e) {\n            f(e);\n          })\n        : dn.initAsParent(u),\n        (p != null && p.page) ||\n          $t(d, u, function () {\n            var e =\n                arguments.length > 0 && arguments[0] !== void 0\n                  ? arguments[0]\n                  : {},\n              t = u.enableActiveConsent,\n              n = u.complianceZone,\n              r = u.enableSecGpc;\n            u.essentialToken;\n            var i = {\n              multiTrackToken: u.multiTrackToken,\n              sessionToken: u.sessionToken,\n            };\n            f(V({ softNavigation: !0 }, e, qn(e), Kn(t, n, r, i)));\n          }),\n        (p != null && p.click) || Kt(d, u, [document.body]),\n        (p != null && p.componentViewability) || zt(d, u),\n        (p != null && p.error) || Yt(d, u),\n        (p != null && p.visibility) || rn(d, u),\n        (p != null && p.webVitals) || ln(d, u),\n        (p != null && p.scroll) || sn(d, u),\n        (p != null && p.form) || Vt(d, u));\n      var h = function (e) {\n        document.dispatchEvent(\n          new CustomEvent(e, {\n            detail: H(V({}, u.consentState), {\n              isConsentRequired: u.isConsentRequired,\n              complianceZone: u.complianceZone,\n              countryCode: u.countryCode,\n              regionCode: u.regionCode,\n              canLoadAnalytics: u.canLoadAnalytics,\n              canLoadFunctional: u.canLoadFunctional,\n              canLoadMarketing: u.canLoadMarketing,\n              optOutSaleOfData: u.optOutSaleOfData,\n              enableSecGpc: u.enableSecGpc,\n            }),\n          }),\n        );\n      };\n      (i(\n        `dux_opt_out_sale_of_data`,\n        function (t) {\n          return R(function () {\n            var n, r, i, a, o, s, c, l;\n            return G(this, function (d) {\n              switch (d.label) {\n                case 0:\n                  ((n = t.detail),\n                    (r = n || {}),\n                    (i = r.optOutSaleOfData),\n                    (a = u.enableActiveConsent),\n                    (o = u.complianceZone),\n                    (d.label = 1));\n                case 1:\n                  return (d.trys.push([1, 3, , 4]), [4, null]);\n                case 2:\n                  return (\n                    (s = d.sent()),\n                    (c = {\n                      essentialToken: null,\n                      multiTrackToken: null,\n                      sessionToken: null,\n                    }),\n                    f(V({}, s, Kn(a, o, i, c))),\n                    [3, 4]\n                  );\n                case 3:\n                  return (\n                    (l = d.sent()),\n                    console.warn(\n                      `Dux: fetchGeoData failed during opt-out sale of data`,\n                      l,\n                    ),\n                    [3, 4]\n                  );\n                case 4:\n                  return (h(`dux_consent_changed`), [2]);\n              }\n            });\n          })();\n        },\n        document,\n      ),\n        i(\n          `dux_consent_change_request`,\n          function (t) {\n            return R(function () {\n              var t, n, r, i, a, o;\n              return G(this, function (s) {\n                switch (s.label) {\n                  case 0:\n                    ((t = u.enableActiveConsent),\n                      (n = u.complianceZone),\n                      (r = u.enableSecGpc),\n                      (s.label = 1));\n                  case 1:\n                    return (s.trys.push([1, 3, , 4]), [4, null]);\n                  case 2:\n                    return (\n                      (i = s.sent()),\n                      (a = {\n                        essentialToken: null,\n                        multiTrackToken: null,\n                        sessionToken: null,\n                      }),\n                      f(V({}, i, Kn(t, n, r, a))),\n                      [3, 4]\n                    );\n                  case 3:\n                    return (\n                      (o = s.sent()),\n                      console.warn(\n                        `Dux: fetchGeoData failed during consent change`,\n                        o,\n                      ),\n                      [3, 4]\n                    );\n                  case 4:\n                    return (h(`dux_consent_changed`), [2]);\n                }\n              });\n            })();\n          },\n          document,\n        ),\n        h(`dux_consent_ready`));\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 214 function 1 (r)", () => {
  const source = "function (r, i, a) {\n      let o = Promise.resolve();\n      if (i && i.length > 0) {\n        let r = document.getElementsByTagName(`link`),\n          s = document.querySelector(`meta[property=csp-nonce]`),\n          c = s?.nonce || s?.getAttribute(`nonce`);\n        function l(e) {\n          return Promise.all(\n            e.map((e) =>\n              Promise.resolve(e).then(\n                (e) => ({ status: `fulfilled`, value: e }),\n                (e) => ({ status: `rejected`, reason: e }),\n              ),\n            ),\n          );\n        }\n        o = l(\n          i.map((i) => {\n            if (((i = t(i, a)), i in n)) return;\n            n[i] = !0;\n            let o = i.endsWith(`.css`),\n              s = o ? `[rel=\"stylesheet\"]` : ``;\n            if (a)\n              for (let e = r.length - 1; e >= 0; e--) {\n                let t = r[e];\n                if (t.href === i && (!o || t.rel === `stylesheet`)) return;\n              }\n            else if (document.querySelector(`link[href=\"${i}\"]${s}`)) return;\n            let l = document.createElement(`link`);\n            if (\n              ((l.rel = o ? `stylesheet` : e),\n              o || (l.as = `script`),\n              (l.crossOrigin = ``),\n              (l.href = i),\n              c && l.setAttribute(`nonce`, c),\n              document.head.appendChild(l),\n              o)\n            )\n              return new Promise((e, t) => {\n                (l.addEventListener(`load`, e),\n                  l.addEventListener(`error`, () =>\n                    t(Error(`Unable to preload CSS for ${i}`)),\n                  ));\n              });\n          }),\n        );\n      }\n      function s(e) {\n        let t = new Event(`vite:preloadError`, { cancelable: !0 });\n        if (((t.payload = e), !t.defaultPrevented)) throw e;\n      }\n      return o.then((e) => {\n        for (let t of e || []) t.status === `rejected` && s(t.reason);\n        return r().catch(s);\n      });\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 215 function 1 (cd)", () => {
  const source = "function cd(a, b, c, d, e) {\n      var f = A.createElement(\"script\");\n      f.type = \"text/javascript\";\n      f.async = d && d.async === !1 ? !1 : !0;\n      var h,\n        l = f.ownerDocument;\n      l = l === void 0 ? document : l;\n      var n,\n        p,\n        q =\n          (p = (n = l).querySelector) == null\n            ? void 0\n            : p.call(n, \"script[nonce]\");\n      (h = q == null ? \"\" : q.nonce || q.getAttribute(\"nonce\") || \"\") &&\n        f.setAttribute(\"nonce\", h);\n      b && (f.onload = b);\n      c && (f.onerror = c);\n      if (e) e.appendChild(f);\n      else {\n        var r = A.getElementsByTagName(\"script\")[0] || A.body || A.head;\n        r.parentNode.insertBefore(f, r);\n      }\n      return f;\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 216 function 1 (un)", () => {
  const source = "function un() {\n      try {\n        if (Kf(47) || !il()) {\n          Aj();\n          if (O(109)) {\n          }\n          gb[6] = !0;\n          var a = null;\n          Xo();\n          SD();\n          jr();\n          wB();\n          if (al()) {\n            E(5);\n            mF();\n            TA().removeExternalRestrictions(Tk());\n          } else {\n            tL();\n            fk();\n            No();\n            vg();\n            rg = X;\n            sg = AD;\n            Ky();\n            MS();\n            cT();\n            yD();\n            vn.bind();\n            Io();\n            FC();\n            AB();\n            vB();\n            Bl.M &&\n              (nq(),\n              kq(TD),\n              (NA = new MA()),\n              kq(Ux),\n              rq(),\n              aE || (aE = new $D()),\n              QA || (QA = new PA()),\n              (XD = new VD()));\n            Bl.H && (gn(), np(), HC(), UC(), SC(), LC(), RC(), Iw());\n            oD();\n            rn(1);\n            nF();\n            Ro.bootstrap = Qb();\n            dT();\n          }\n        }\n      } catch (b) {\n        (rn(5), nq(), iq());\n      }\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 217 function 1 (jd)", () => {
  const source = "function jd(a) {\n      w.setTimeout(a, 0);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 218 function 1 (jB)", () => {
  const source = "function jB(a) {\n      var b = a[\"gtm.uniqueEventId\"],\n        c = a[\"gtm.priorityId\"],\n        d = a.event;\n      if (d === \"gtm.js\") {\n        if (hB) return !1;\n        hB = !0;\n      }\n      var e = !1,\n        f = VA(),\n        g = Jd(a, null);\n      if (\n        !f.every(function (u) {\n          return u({ originalEventData: g });\n        })\n      ) {\n        if (d !== \"gtm.js\" && d !== \"gtm.init\" && d !== \"gtm.init_consent\")\n          return !1;\n        e = !0;\n      }\n      var h = a.eventCallback,\n        l = a.eventTimeout,\n        n = {\n          id: b,\n          priorityId: c,\n          name: d,\n          isBlocked: kB(g, e),\n          ct: [],\n          logMacroError: function (u, v, t) {},\n          cachedModelValues: lB(),\n          gd: new wA(function () {\n            h && h.apply(h, Array.prototype.slice.call(arguments, 0));\n          }, l),\n          originalEventData: g,\n        };\n      var p = Hg(n);\n      e && (p = mB(p));\n      var q = fB(p, n);\n      var r = gB(a, n.gd);\n      BA(n.gd);\n      (d !== \"gtm.js\" && d !== \"gtm.sync\") || HA();\n      return nB(p, q) || r;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 219 function 1 (CC)", () => {
  const source = "function CC() {\n      for (var a = !1, b; !vC && (b = BC()); ) {\n        vC = !0;\n        var c = Up;\n        delete c.H.eventModel;\n        var d = b,\n          e = d.message,\n          f = d.messageContext;\n        if (e == null) vC = !1;\n        else {\n          try {\n            if (Bb(e))\n              try {\n                e.call(Wp);\n              } catch (L) {}\n            else if (Array.isArray(e)) {\n              if (Cb(e[0])) {\n                var g = e[0].split(\".\"),\n                  h = g.pop(),\n                  l = e.slice(1),\n                  n = Xp(g.join(\".\"), 2);\n                if (n != null)\n                  try {\n                    n[h].apply(n, l);\n                  } catch (L) {}\n              }\n            } else {\n              var p = void 0;\n              if (Kb(e))\n                a: {\n                  if (e.length && Cb(e[0])) {\n                    var q = iC[e[0]];\n                    if (q) {\n                      p = q(e, f);\n                      break a;\n                    }\n                  }\n                  p = void 0;\n                }\n              else p = e;\n              if (p) {\n                var r;\n                for (\n                  var u = p,\n                    v = u._clear || f.overwriteModelFields,\n                    t = m(Object.keys(u)),\n                    x = t.next();\n                  !x.done;\n                  x = t.next()\n                ) {\n                  var y = x.value;\n                  y !== \"_clear\" && (v && Up.set(y, void 0), Up.set(y, u[y]));\n                }\n                Ij || (Ij = u[\"gtm.start\"]);\n                var z = u[\"gtm.uniqueEventId\"];\n                u.event\n                  ? (typeof z !== \"number\" &&\n                      ((z = Uo()),\n                      (u[\"gtm.uniqueEventId\"] = z),\n                      Up.set(\"gtm.uniqueEventId\", z)),\n                    (r = jB(u)))\n                  : (r = !1);\n                a = r || a;\n              }\n            }\n          } finally {\n            vC = !1;\n          }\n        }\n      }\n      return !a;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 220 function 1 (EC)", () => {
  const source = "function EC() {\n      var d = CC();\n      return d;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 221 function 1 (tq)", () => {
  const source = "function (a) {\n      var b = Pa.apply(1, arguments),\n        c = this.H.zb();\n      c.je(a);\n      for (var d, e = m(b), f = e.next(); !f.done; f = e.next()) d = null;\n      return d;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 222 function 1 (c)", () => {
  const source = "function c() {}";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 223 function 1 (FC)", () => {
  const source = "function FC() {\n      function a(f) {\n        var g = {};\n        if (lC(f)) {\n          var h = f;\n          f = lC(h) ? h.getUntrustedMessageValue() : void 0;\n          g.fromContainerExecution = !0;\n        }\n        return { message: f, messageContext: g };\n      }\n      var b = Vc(E(19), []),\n        c = So();\n      c.subscribers = (c.subscribers || 0) + 1;\n      var d = b.push;\n      b.push = function () {\n        var f;\n        No();\n        if (Lo.H.SANDBOXED_JS_SEMAPHORE > 0) {\n          f = [];\n          for (var g = 0; g < arguments.length; g++)\n            f[g] = new mC(arguments[g]);\n        } else f = [].slice.call(arguments, 0);\n        var h = f.map(function (q) {\n          return a(q);\n        });\n        sC.push.apply(sC, h);\n        var l = d.apply(b, f),\n          n = Math.max(100, Pf(1, 300));\n        if (this.length > n) for (; this.length > n; ) this.shift();\n        var p = typeof l !== \"boolean\" || l;\n        return p;\n      };\n      var e = b.slice(0).map(function (f) {\n        return a(f);\n      });\n      sC.push.apply(sC, e);\n      CB(function () {\n        if (!c.gtmDom) {\n          c.gtmDom = !0;\n          var f = {};\n          b.push(((f.event = \"gtm.dom\"), f));\n        }\n      });\n      pC(function () {\n        if (!c.gtmLoad) {\n          c.gtmLoad = !0;\n          var f = {};\n          b.push(((f.event = \"gtm.load\"), f));\n        }\n      });\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 224 function 1 (Cg)", () => {
  const source = "function (a, b) {\n      var c = a[Qf.cb];\n      if (!c) throw Error(\"Error: No function name given for function call.\");\n      var e = rg[c],\n        f = {},\n        g;\n      for (g in a)\n        a.hasOwnProperty(g) &&\n          (Vb(g, \"vtp_\")\n            ? (f[e !== void 0 ? g : g.substring(4)] = a[g])\n            : hb(27) &&\n              g === Qf.Nq.toString() &&\n              (f[e !== void 0 ? \"vtp_gtmVisualTaggingMetadata\" : g] = a[g]));\n      if (b) {\n        if (b.name == null) {\n          var h;\n          a: {\n            var l = b.type,\n              n = b.index;\n            if (n == null) h = \"\";\n            else {\n              var p;\n              switch (l) {\n                case 2:\n                  p = mg[n];\n                  break;\n                case 1:\n                  p = pg[n];\n                  break;\n                default:\n                  h = \"\";\n                  break a;\n              }\n              var q = p && p[Qf.Ti];\n              h = q ? String(q) : \"\";\n            }\n          }\n          b.name = h;\n        }\n      }\n      return e !== void 0 ? e(f) : lg(c, f, b);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 225 function 1 (pR)", () => {
  const source = "function (a, b, c, d, e, f) {\n      f\n        ? e[f]\n          ? (e[f][0].push(null), e[f][1].push(null))\n          : ((e[f] = [[null], [null]]),\n            cd(\n              a,\n              function () {\n                for (var g = e[f][0], h = 0; h < g.length; h++);\n                g.push = function (l) {\n                  return 0;\n                };\n              },\n              function () {\n                for (var g = e[f][1], h = 0; h < g.length; h++);\n                e[f] = null;\n              },\n              b,\n            ))\n        : cd(a, null, null, b);\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 226 function 1 (fB)", () => {
  const source = "function (a, b) {\n      for (var c = [], d = 0; d < pg.length; d++)\n        if (a[d]) {\n          var e = pg[d];\n          try {\n            var g = YA(d, null, b, d);\n            if (g) {\n              var h = e[Qf.cb];\n              if (!h)\n                throw Error(\"Error: No function name given for function call.\");\n              var l = rg[h];\n              c.push({\n                Do: d,\n                priorityOverride:\n                  (l ? l.priorityOverride || 0 : 0) || uA(e[Qf.cb], 1) || 0,\n                execute: g,\n              });\n            }\n          } catch (p) {}\n        }\n      c.sort(eB);\n      for (var n = 0; n < c.length; n++) c[n].execute();\n      return c.length > 0;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 227 function 1 (jb)", () => {
  const source = "function jb(a, b) {\n      for (\n        var c, d = m(b), e = d.next();\n        !e.done && !((c = null), c instanceof Ta);\n        e = d.next()\n      );\n      return c;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 228 function 1 (kb)", () => {
  const source = "function kb(a, b) {\n      try {\n        if (hb(18)) {\n          var c = b[0],\n            d = b.slice(1),\n            e = String(c),\n            f = ib.has(e) ? ib.get(e) : a.get(e);\n          if (!f || typeof f.invoke !== \"function\")\n            throw fb(Error(\"Attempting to execute non-function \" + b[0] + \".\"));\n          return f.apply(a, d);\n        }\n        var g = m(b),\n          h = g.next().value,\n          l = va(g),\n          n = a.get(String(h));\n        if (!n || typeof n.invoke !== \"function\")\n          throw fb(Error(\"Attempting to execute non-function \" + b[0] + \".\"));\n        return n.invoke.apply(n, [a].concat(wa(l)));\n      } catch (q) {\n        throw q;\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 229 function 1 (apply)", () => {
  const source = "function (a, b) {\n      return null;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 230 function 1 (e)", () => {
  const source = "function e(n) {\n      return n\n        .split(\"&\")\n        .map(function () {\n          return null;\n        })\n        .filter(function (p) {\n          return p !== void 0;\n        })\n        .join(\"&\");\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 231 function 1 (xf)", () => {
  const source = "function (a, b, c) {\n      return null;\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 232 function 1 (eA)", () => {
  const source = "function eA(a, b, c, d, e) {\n      if (!bl(a)) {\n        d.loadExperiments = zj();\n        el(a, d, e);\n        var f = fA(a),\n          g = function () {\n            Mk().container[a] && (Mk().container[a].state = 3);\n            gA();\n          };\n      }\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 233 function 1 (tm)", () => {
  const source = "function tm(a) {\n      var b = Pa.apply(1, arguments);\n      cd.apply(null, wa(b));\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 234 function 1 (lR)", () => {
  const source = "function (a, b, c, d, e, f) {\n      if (A.body) {\n        if (d) {\n        } else e ? nR(a, b, c) : mR(A.body, md(a), b, c)();\n      } else\n        w.setTimeout(function () {\n          lR(a, b, c, d, e, f);\n        });\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 235 function 1 (rd)", () => {
  const source = "function rd(a, b, c, d, e) {\n      if (sd()) {\n        try {\n          d == null || d();\n          return !0;\n        } catch (l) {}\n      }\n      if (\n        (c == null ? 0 : c.Wg) ||\n        ((c == null ? 0 : c.credentials) && c.credentials !== \"include\")\n      )\n        return (e == null || e(), !1);\n      if (b) {\n        var h = pd(a, b);\n        h ? d == null || d() : e == null || e();\n        return h;\n      }\n      td(a, d, e);\n      return !0;\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 236 function 1 (sm)", () => {
  const source = "function sm(a) {\n      var b = Pa.apply(1, arguments);\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 237 function 1 (Bx)", () => {
  const source = "function (a, b) {\n      var c = function (d) {\n        return a;\n      };\n      sd() ? (function () {})() : (function () {})() || (function () {})();\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 238 function 1 (o)", () => {
  const source = "function o(e) {}";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 239 function 1 (V)", () => {
  const source = "function (e) {\n      return f(function () {\n        return w(this, function (t) {\n          switch (t.label) {\n            case 0:\n              switch (e) {\n                case `dk`:\n                  return [3, 1];\n                case `da`:\n                  return [3, 1];\n                case `de`:\n                  return [3, 3];\n                case `en`:\n                  return [3, 5];\n                case `es`:\n                  return [3, 7];\n                case `fr`:\n                  return [3, 9];\n                case `it`:\n                  return [3, 11];\n                case `nl`:\n                  return [3, 13];\n                case `pt`:\n                  return [3, 15];\n              }\n              return [3, 17];\n            case 1:\n              return [4, Promise.resolve({ default: {} })];\n            case 2:\n              return [2, t.sent().default];\n            case 3:\n              return [4, Promise.resolve({ default: {} })];\n            case 4:\n              return [2, t.sent().default];\n            case 5:\n              return [4, Promise.resolve({ default: {} })];\n            case 6:\n              return [2, t.sent().default];\n            case 7:\n              return [4, Promise.resolve({ default: {} })];\n            case 8:\n              return [2, t.sent().default];\n            case 9:\n              return [4, Promise.resolve({ default: {} })];\n            case 10:\n              return [2, t.sent().default];\n            case 11:\n              return [4, Promise.resolve({ default: {} })];\n            case 12:\n              return [2, t.sent().default];\n            case 13:\n              return [4, Promise.resolve({ default: {} })];\n            case 14:\n              return [2, t.sent().default];\n            case 15:\n              return [4, Promise.resolve({ default: {} })];\n            case 16:\n              return [2, t.sent().default];\n            case 17:\n              return [4, Promise.resolve({ default: {} })];\n            case 18:\n              return [2, t.sent().default];\n            case 19:\n              return [2];\n          }\n        });\n      })();\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 240 function 1 (fe)", () => {
  const source = "function (e) {\n      return f(function () {\n        var t;\n        return w(this, function (n) {\n          switch (n.label) {\n            case 0:\n              return U.has(e) ? [2, U.get(e)] : [2, null];\n            case 1:\n              return ((t = null), [2, (U.set(e, t), t)]);\n          }\n        });\n      })();\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 241 function 1 (d)", () => {
  const source = "function d(e, t, n, r, i, a, o) {\n      try {\n        var s = e[a](o),\n          c = s.value;\n      } catch (e) {\n        n(null);\n        return;\n      }\n      s.done ? t(null) : Promise.resolve(null).then(r, i);\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 242 function 1 (c)", () => {
  const source = "function c(e) {\n      var t = typeof Map == \"function\" ? new Map() : void 0;\n      return (\n        (c = function (n) {\n          if (n === null || !p(n)) return n;\n          if (typeof n != \"function\")\n            throw new TypeError(\n              \"Super expression must either be null or a function\",\n            );\n          if (t !== void 0) {\n            if (t.has(n)) return t.get(n);\n            t.set(n, e);\n          }\n          function e() {\n            return null;\n          }\n          return (\n            (e.prototype = Object.create(n.prototype, {\n              constructor: {\n                value: e,\n                enumerable: !1,\n                writable: !0,\n                configurable: !0,\n              },\n            })),\n            _(e, n)\n          );\n        }),\n        c(e)\n      );\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "RangeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 243 function 1 (nt)", () => {
  const source = "function nt() {\n      for (; e.fbq.queue && e.fbq.queue.length && !ye.isLocked(); ) {\n        e.fbq.queue.shift();\n      }\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 244 function 1 (plugin)", () => {
  const source = "function (fbq, instance, config) {}";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 245 function 1 (y)", () => {
  const source = "function y(e, t, n, r, o, a, i) {\n      try {\n        var l = e[a](i),\n          s = l.value;\n      } catch (e) {\n        return void n(e);\n      }\n      l.done ? t(s) : r(s);\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 246 function 1 (We)", () => {
  const source = "function We(e, t, n) {\n      try {\n        Ce = Ce === -1 ? Date.now() : Ce;\n        var r = I(e);\n        if (r == null) return;\n        var o = t == null || G(t);\n        var a = null,\n          i = {};\n        var l = null;\n        t != null && ((l = s({}, t)), (t = se(t)), (t = le(t)), (t = ue(t)));\n        var u = xe.pluginConfig.get(r, \"protectedDataMode\"),\n          c = xe.optIns.isOptedIn(r, \"ProtectedDataMode\"),\n          d = !0;\n        if (\n          (c && u != null && u.disableAM === !0 && (d = !1), Se.call(Ie, r))\n        ) {\n          t != null && H(Ie[r].userData)\n            ? ((Ie[r].userData = d && o ? t || {} : {}),\n              (Ie[r].alternateUserData = d && o ? l || {} : {}),\n              (Ie[r].censoredUserDataFormat = d ? i : {}),\n              $e.loadPlugin(\"identity\"))\n            : he({ pixelID: r, type: \"DUPLICATE_PIXEL_ID\" });\n          return;\n        }\n        var m = {\n          agent: n ? n.agent : null,\n          eventCount: 0,\n          id: r,\n          userData: d && o ? t || {} : {},\n          alternateUserData: d && o ? l || {} : {},\n          userDataFormFields: {},\n          alternateUserDataFormFields: {},\n          censoredUserDataFormat: d ? i : {},\n          censoredUserDataFormatFormFields: {},\n        };\n        (ke.push(m),\n          (Ie[r] = m),\n          t != null && $e.loadPlugin(\"identity\"),\n          qe(),\n          xe.loadConfig(r));\n      } catch (e) {\n        ge(e, \"pixel\", \"Init\");\n      }\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 247 function 1 (registerPlugin)", () => {
  const source = "function (e, t) {}";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 248 function 1 (j)", () => {
  const source = "function j() {}";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 250 function 1 (each)", () => {
  const source = "function (t, n) {}";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 251 function 1 (call)", () => {
  const source = "function () {\n      for (var t = arguments.length, r = new Array(t), i = 0; i < t; i++)\n        r[i] = arguments[i];\n      return null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 252 function 1 (a)", () => {
  const source = "function a(n) {}";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 253 function 1 (_r)", () => {
  const source = "function _r() {\n      (window.location &&\n        window.location.protocol &&\n        \"file:\" === window.location.protocol) ||\n        (window &&\n          window.addEventListener &&\n          (wr(Dn.COMMONS.SCRIPT_INITIALIZED_PROP, !0),\n          wr(Dn.COMMONS.SCRIPT_INITIALIZED_PENDING_PROP, !1),\n          Bt(),\n          mr(),\n          window.addEventListener(Dn.EVENTS.HASH_CHANGE, null, !1),\n          window.addEventListener(Dn.EVENTS.POP_STATE, null, !1),\n          window.addEventListener(Dn.EVENTS.CUSTOM_HISTORY_CHANGED, null, !1),\n          document.addEventListener(Dn.EVENTS.MOUSE_DOWN, null, !0)));\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 254 function 1 (Ir)", () => {
  const source = "function Ir(n) {\n      try {\n        !Ee(Dn.COMMONS.SCRIPT_INITIALIZED_PROP) &&\n          !Ee(Dn.COMMONS.SCRIPT_INITIALIZED_PENDING_PROP) &&\n          (function () {\n            return (function (n) {\n              var t = n,\n                e = ((n = t.tagVersion), t.getPids),\n                r = t.onError,\n                o = t.liFatId,\n                i = t.liGiant,\n                a = t.inAppHandler;\n              return (\n                \"number\" == typeof n &&\n                Array.isArray(null == e ? void 0 : e()) &&\n                (!r || \"function\" == typeof r) &&\n                (!o || \"string\" == typeof o) &&\n                (!i || \"string\" == typeof i) &&\n                !!a\n              );\n            })(\n              arguments.length > 0 && arguments[0] !== undefined\n                ? arguments[0]\n                : {},\n            );\n          })(n) &&\n          (wr(Dn.COMMONS.SCRIPT_INITIALIZED_PENDING_PROP, !0),\n          window.history &&\n            ((window.history.pushState = Un(window.history.pushState)),\n            (window.history.replaceState = Un(window.history.replaceState))),\n          _r());\n      } catch (t) {\n        Boolean(\n          !window.navigator ||\n          window.navigator.webdriver ||\n          window.navigator.plugins.__proto__ !== PluginArray.prototype ||\n          (0 < window.navigator.plugins.length &&\n            window.navigator.plugins[0].__proto__ !== Plugin.prototype) ||\n          /headless/i.test(navigator.userAgent),\n        ) || pt(t);\n      }\n    }";
  const args = [
  []
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 255 function 1 (Ct)", () => {
  const source = "function Ct(n, t, e, r) {\n      if (t >= e.length)\n        return { result: undefined, implCode: null, isFailed: !0 };\n      var o = e[t],\n        i = o.call,\n        a = o.isSupported,\n        u = o.code;\n      try {\n        var c;\n        return a()\n          ? (c = i.apply(void 0, V(n))) && \"function\" == typeof c.then\n            ? c.then(function (n) {\n                return { result: n, implCode: u, isFailed: !1 };\n              })\n            : { result: c, implCode: u, isFailed: !1 }\n          : Ct(n, t + 1, e, r);\n      } catch (l) {\n        return Ct(n, t + 1, e, r);\n      }\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 256 function 1 (dr)", () => {
  const source = "function dr(n) {}";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 257 function 1 (Gt)", () => {
  const source = "function Gt(n, t, e, r, o) {\n      var i = t,\n        a = ((t = i.result), i.implCode);\n      i.isFailed\n        ? pt(\"Payload formatter was not able to be run\")\n        : (function (n, t, e, r) {\n            Dt.call(n, t, e, r);\n          })(\"\" + Ut + n, t, a, e);\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 258 function 1 (f)", () => {
  const source = "function f(n, t, e) {\n      try {\n        return { type: \"normal\", arg: n.call(t, e) };\n      } catch (n) {\n        return { type: \"throw\", arg: n };\n      }\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 259 function 1 (mr)", () => {
  const source = "function mr(n) {}";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 260 function 1 (G)", () => {
  const source = "function G(n, t, e, r, o, i, a) {\n      try {\n        var u = n[i](a),\n          c = u.value;\n      } catch (Qn) {\n        return void e(Qn);\n      }\n      u.done ? t(c) : Promise.resolve(c).then(r, o);\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 261 function 1 (Y)", () => {
  const source = "function Y(n, t, e, r) {\n      return new (e || (e = Promise))(function (o, i) {\n        function a(n) {\n          try {\n            c(r.next(n));\n          } catch (t) {\n            i(t);\n          }\n        }\n        function u(n) {\n          try {\n            c(r[\"throw\"](n));\n          } catch (t) {\n            i(t);\n          }\n        }\n        function c(n) {\n          var t;\n          n.done\n            ? o(n.value)\n            : ((t = n.value),\n              t instanceof e\n                ? t\n                : new e(function (n) {\n                    n(t);\n                  })).then(a, u);\n        }\n        c((r = r.apply(n, t || [])).next());\n      });\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 262 function 1 (call)", () => {
  const source = "function () {\n      for (var t = arguments.length, r = new Array(t), i = 0; i < t; i++)\n        r[i] = arguments[i];\n      return null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 263 function 1 (Sr)", () => {
  const source = "function (n, t) {\n      return Y(void 0, void 0, void 0, function () {\n        return Z(this, function (r) {\n          return Ar() || [2];\n        });\n      });\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 264 function 1 (hr)", () => {
  const source = "function hr(n) {\n      (((n = vr(n)).signalType = Dn.EVENT_TYPE.PAGE_VISIT),\n        (function (n) {\n          try {\n            return n.url === Vt || ((Vt = n.url), !n.pageTitle);\n          } catch (t) {\n            return !1;\n          }\n        })(n) || null);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 265 function 1 (Ht)", () => {
  const source = "function Ht(n, t) {\n      if (\n        wt() &&\n        !(function (n) {\n          return /bot|googlebot|crawler|spider|robot|crawling/i.test(n);\n        })(navigator.userAgent)\n      ) {\n        var e = t,\n          r = e.websiteSignalRequestId,\n          o = e.isLinkedInApp,\n          i = !o;\n        (t = (function (n) {\n          return null;\n        })(t)).then\n          ? t.then(function (t) {})\n          : null;\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 266 function 1 (invoke)", () => {
  const source = "function (a) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 267 function 1 (cd)", () => {
  const source = "function cd(a, b, c, d, e) {\n      var f = A.createElement(\"script\");\n      f.type = \"text/javascript\";\n      f.async = d && d.async === !1 ? !1 : !0;\n      var h,\n        l = f.ownerDocument;\n      l = l === void 0 ? document : l;\n      var n,\n        p,\n        q =\n          (p = (n = l).querySelector) == null\n            ? void 0\n            : p.call(n, \"script[nonce]\");\n      (h = q == null ? \"\" : q.nonce || q.getAttribute(\"nonce\") || \"\") &&\n        f.setAttribute(\"nonce\", h);\n      b && (f.onload = b);\n      c && (f.onerror = c);\n      if (e) e.appendChild(f);\n      else {\n        var r = A.getElementsByTagName(\"script\")[0] || A.body || A.head;\n        r.parentNode.insertBefore(f, r);\n      }\n      return f;\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 268 function 1 (Xb)", () => {
  const source = "function (a) {\n      var b = Pa.apply(1, arguments);\n      try {\n        return null;\n      } catch (c) {}\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 269 function 1 (gd)", () => {
  const source = "function (a, b, c, d) {\n      var e = null;\n      b && b();\n      c && c();\n      return e;\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 270 function 1 (r)", () => {
  const source = "function r() {\n      if (v.length && z !== 0) {\n        var L = -1,\n          J;\n        do {\n          J = v[0];\n          if (J.ie > a.getDuration()) return;\n          L = (J.ie - a.getCurrentTime()) / z;\n          if (L < 0 && (v.shift(), v.length === 0)) return;\n        } while (L < 0);\n        c = function () {\n          d = 0;\n          c = p;\n          if (v.length > 0 && v[0].ie === J.ie) {\n            v.shift();\n            var Y = u.createEvent(\"progress\", J.lo, J.yo);\n          }\n          r();\n        };\n        d = w.setTimeout(c, L * 1e3);\n      }\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 271 function 1 (fd)", () => {
  const source = "function fd(a, b, c, d) {\n      return null;\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 272 function 1 (onSuccess)", () => {
  const source = "function () {}";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 273 function 1 (zA)", () => {
  const source = "function (a) {\n      if (!a.H) {\n        a.H = !0;\n        a.V.length = 0;\n      }\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 274 function 1 (n)", () => {
  const source = "function n() {}";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 275 function 1 (f)", () => {
  const source = "function f(e) {\n      return Object.getPrototypeOf(e);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 276 function 1 (tt)", () => {
  const source = "function tt(e) {\n      return (\n        !!(function (e) {\n          if (!e.hasAttribute(\"href\")) return !1;\n          var n = e.getAttribute(\"href\");\n          return n != null;\n        })(e) ||\n        !!Ue(e)\n          .replace(Ye, \" \")\n          .replace(Je, function (e) {\n            return e + \" \";\n          })\n          .replace(Ze, function (e) {\n            return Be(e, e.length - 1) + \" \";\n          })\n          .replace(et, \" \")\n          .trim()\n          .toLowerCase() ||\n        !!Qe(e)\n      );\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 277 function 1 (y)", () => {
  const source = "function y(e, t, n, r, o, a, i) {\n      try {\n        var l = e[a](i),\n          s = l.value;\n      } catch (e) {\n        return;\n      }\n      l.done ? t(s) : Promise.resolve(s).then(r, o);\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 278 function 1 (C)", () => {
  const source = "function C(e) {\n      return function () {\n        var t = this,\n          n = arguments;\n        return new Promise(function (r, o) {\n          var a = e.apply(t, n);\n          function i(e) {\n            r(e);\n          }\n          function l(e) {\n            o(e);\n          }\n          i(void 0);\n        });\n      };\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 280 function 1 (set)", () => {
  const source = "function (r, i) {\n      i = i || {};\n      var o = n.get(),\n        a = Object.assign(o, r);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 281 function 1 (getInstance)", () => {
  const source = "function (e, t) {\n      if (!e) throw new Error(\"Visitor requires Adobe Marketing Cloud Org ID.\");\n      e.indexOf(\"@\") < 0 && (e += \"@AdobeOrg\");\n      var n = (function () {\n        var t = s.s_c_il;\n        if (t)\n          for (var n = 0; n < t.length; n++) {\n            var r = t[n];\n            if (r && \"Visitor\" === r._c && r.marketingCloudOrgID === e)\n              return r;\n          }\n      })();\n      if (n) return n;\n      var r =\n        (function (e) {\n          if (C.isObject(e))\n            return Object.keys(e)\n              .filter(function (t) {\n                return \"\" !== e[t] && U.getConfigs()[t];\n              })\n              .reduce(function (t, n) {\n                var r = U.normalizeConfig(n, e[n]),\n                  i = C.normalizeBoolean(r);\n                return ((t[n] = i), t);\n              }, Object.create(null));\n        })(t) || {};\n      var i = e.split(\"\").reverse().join(\"\"),\n        o = new Ie(e, null, i);\n      (r.cookieDomain && (o.cookieDomain = r.cookieDomain),\n        r.sameSiteCookie &&\n          r.secureCookie &&\n          (o.configs = {\n            sameSiteCookie: r.sameSiteCookie,\n            secureCookie: r.secureCookie,\n          }));\n      var a = C.getIeVersion();\n      if (\"number\" == typeof a && a < 10)\n        return o._helpers.replaceMethodsWithFunction(o, function () {});\n      var u = new Ie(e, r, i);\n      return ((o = null), u.init(), u);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "Error"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 282 function 1 (get)", () => {
  const source = "function (e) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 283 function 1 (set)", () => {
  const source = "function (r, i) {\n      i = i || {};\n      var o = n.get(),\n        a = Object.assign(o, r);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 284 function 1 (remove)", () => {
  const source = "function (t, n) {}";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 285 function 1 (getInstance)", () => {
  const source = "function (e, t) {\n      if (!e) throw new Error(\"Visitor requires Adobe Marketing Cloud Org ID.\");\n      e.indexOf(\"@\") < 0 && (e += \"@AdobeOrg\");\n      var n = (function () {\n        var t = s.s_c_il;\n        if (t)\n          for (var n = 0; n < t.length; n++) {\n            var r = t[n];\n            if (r && \"Visitor\" === r._c && r.marketingCloudOrgID === e)\n              return r;\n          }\n      })();\n      if (n) return n;\n      var r =\n        (function (e) {\n          if (C.isObject(e))\n            return Object.keys(e)\n              .filter(function (t) {\n                return \"\" !== e[t] && U.getConfigs()[t];\n              })\n              .reduce(function (t, n) {\n                var r = U.normalizeConfig(n, e[n]),\n                  i = C.normalizeBoolean(r);\n                return ((t[n] = i), t);\n              }, Object.create(null));\n        })(t) || {};\n      var i = e.split(\"\").reverse().join(\"\"),\n        o = new Ie(e, null, i);\n      (r.cookieDomain && (o.cookieDomain = r.cookieDomain),\n        r.sameSiteCookie &&\n          r.secureCookie &&\n          (o.configs = {\n            sameSiteCookie: r.sameSiteCookie,\n            secureCookie: r.secureCookie,\n          }));\n      var a = C.getIeVersion();\n      if (\"number\" == typeof a && a < 10)\n        return o._helpers.replaceMethodsWithFunction(o, function () {});\n      var u = new Ie(e, r, i);\n      return ((o = null), u.init(), u);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "Error"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 286 function 1 (getInstance)", () => {
  const source = "function (e, t) {\n      if (!e) throw new Error(\"Visitor requires Adobe Marketing Cloud Org ID.\");\n      e.indexOf(\"@\") < 0 && (e += \"@AdobeOrg\");\n      var n = (function () {\n        var t = s.s_c_il;\n        if (t)\n          for (var n = 0; n < t.length; n++) {\n            var r = t[n];\n            if (r && \"Visitor\" === r._c && r.marketingCloudOrgID === e)\n              return r;\n          }\n      })();\n      if (n) return n;\n      var r =\n        (function (e) {\n          if (C.isObject(e))\n            return Object.keys(e)\n              .filter(function (t) {\n                return \"\" !== e[t] && U.getConfigs()[t];\n              })\n              .reduce(function (t, n) {\n                var r = U.normalizeConfig(n, e[n]),\n                  i = C.normalizeBoolean(r);\n                return ((t[n] = i), t);\n              }, Object.create(null));\n        })(t) || {};\n      var i = e.split(\"\").reverse().join(\"\"),\n        o = new Ie(e, null, i);\n      (r.cookieDomain && (o.cookieDomain = r.cookieDomain),\n        r.sameSiteCookie &&\n          r.secureCookie &&\n          (o.configs = {\n            sameSiteCookie: r.sameSiteCookie,\n            secureCookie: r.secureCookie,\n          }));\n      var a = C.getIeVersion();\n      if (\"number\" == typeof a && a < 10)\n        return o._helpers.replaceMethodsWithFunction(o, function () {});\n      var u = new Ie(e, r, i);\n      return ((o = null), u.init(), u);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "Error"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 287 function 1 (cookieRead)", () => {
  const source = "function (e) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 288 function 1 (_readVisitor)", () => {
  const source = "function () {\n      if (!g._readVisitorDone) {\n        g._readVisitorDone = !0;\n        var e,\n          t,\n          n,\n          r,\n          i,\n          o,\n          a = g._getSettingsDigest(),\n          u = !1,\n          s = g.cookieRead(g.cookieName),\n          c = new Date();\n        if (\n          (s ||\n            S ||\n            g.discardTrackingServerECID ||\n            (s = g.cookieRead(V.FIRST_PARTY_SERVER_COOKIE)),\n          null == g._fields && (g._fields = {}),\n          s && \"T\" !== s)\n        )\n          for (\n            (s = s.split(\"|\"))[0].match(/^[\\-0-9]+$/) &&\n              (parseInt(s[0], 10) !== a && (u = !0), s.shift()),\n              s.length % 2 == 1 && s.pop(),\n              e = 0;\n            e < s.length;\n            e += 2\n          )\n            ((n = t = s[e].split(\"-\")[0]),\n              (r = s[e + 1]),\n              t.length > 1\n                ? ((i = parseInt(t[1], 10)), (o = t[1].indexOf(\"s\") > 0))\n                : ((i = 0), (o = !1)),\n              u &&\n                (\"MCCIDH\" === n && (r = \"\"),\n                i > 0 && (i = c.getTime() / 1e3 - 60)),\n              n &&\n                r &&\n                (g._setField(n, r, 1),\n                i > 0 &&\n                  ((g._fields[\"expire\" + n] = i + (o ? \"s\" : \"\")),\n                  (c.getTime() >= 1e3 * i || o) &&\n                    !g.cookieRead(g.sessionCookieName) &&\n                    (g._fieldsExpired || (g._fieldsExpired = {}),\n                    (g._fieldsExpired[n] = !0)))));\n      }\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 289 function 1 (init)", () => {
  const source = "function (e, t) {\n      var r;\n      if (!e) return $.Z();\n      if (\"string\" == typeof e)\n        if (\"<\" == (e = e.trim())[0] && P.test(e))\n          ((r = $.fragment(e, RegExp.$1, t)), (e = null));\n        else {\n          if (t !== C) return null;\n          r = $.qsa(T, e);\n        }\n      else {\n        if (n(e)) return S(T).ready(e);\n        if ($.isZ(e)) return e;\n        if (K(e))\n          r = (function (e) {\n            return O.call(e, function (e) {\n              return null != e;\n            });\n          })(e);\n        else if (o(e)) ((r = [e]), (e = null));\n        else if (P.test(e))\n          ((r = $.fragment(e.trim(), RegExp.$1, t)), (e = null));\n        else {\n          if (t !== C) return null;\n          r = $.qsa(T, e);\n        }\n      }\n      return $.Z(r, e);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 290 function 1 (getInstance)", () => {
  const source = "function (e, t) {\n      if (!e) throw new Error(\"Visitor requires Adobe Marketing Cloud Org ID.\");\n      e.indexOf(\"@\") < 0 && (e += \"@AdobeOrg\");\n      var n = (function () {\n        var t = s.s_c_il;\n        if (t)\n          for (var n = 0; n < t.length; n++) {\n            var r = t[n];\n            if (r && \"Visitor\" === r._c && r.marketingCloudOrgID === e)\n              return r;\n          }\n      })();\n      if (n) return n;\n      var r =\n        (function (e) {\n          if (C.isObject(e))\n            return Object.keys(e)\n              .filter(function (t) {\n                return \"\" !== e[t] && U.getConfigs()[t];\n              })\n              .reduce(function (t, n) {\n                var r = U.normalizeConfig(n, e[n]),\n                  i = C.normalizeBoolean(r);\n                return ((t[n] = i), t);\n              }, Object.create(null));\n        })(t) || {};\n      var i = e.split(\"\").reverse().join(\"\"),\n        o = new Ie(e, null, i);\n      (r.cookieDomain && (o.cookieDomain = r.cookieDomain),\n        r.sameSiteCookie &&\n          r.secureCookie &&\n          (o.configs = {\n            sameSiteCookie: r.sameSiteCookie,\n            secureCookie: r.secureCookie,\n          }));\n      var a = C.getIeVersion();\n      if (\"number\" == typeof a && a < 10)\n        return o._helpers.replaceMethodsWithFunction(o, function () {});\n      var u = new Ie(e, r, i);\n      return ((o = null), u.init(), u);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "Error"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 293 function 1 (cookieWrite)", () => {
  const source = "function (e, t, n) {\n      var r = \"\" + t;\n      return null;\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 294 function 1 (_writeVisitor)", () => {
  const source = "function () {\n      var e,\n        t,\n        n = g._getSettingsDigest();\n      for (e in g._fields)\n        z(e) &&\n          g._fields[e] &&\n          \"expire\" !== e.substring(0, 6) &&\n          ((t = g._fields[e]),\n          (n +=\n            (n ? \"|\" : \"\") +\n            e +\n            (g._fields[\"expire\" + e] ? \"-\" + g._fields[\"expire\" + e] : \"\") +\n            \"|\" +\n            t));\n      n = g._appendVersionTo(n);\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 295 function 1 (_setField)", () => {
  const source = "function (e, t, n) {\n      (null == g._fields && (g._fields = {}), (g._fields[e] = t));\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 296 function 1 (isAllowed)", () => {
  const source = "function () {\n      return !0;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 297 function 1 (_getRemoteField)", () => {
  const source = "function (e, t, n, r, i) {\n      var o,\n        a = \"\",\n        u = null;\n      if (c() && g.isAllowed())\n        if (\n          (g._readVisitor(),\n          !(\n            !(a = g._getField(e, !0 === { MCAAMLH: !0, MCAAMB: !0 }[e])) ||\n            (g._fieldsExpired && g._fieldsExpired[e])\n          ))\n        )\n          a || (e === k ? (a = g._generateLocalMID()) : ((a = \"\"), (r = !0)));\n        else if (\n          (e === k || \"MCOPTOUT\" === e\n            ? (o = O)\n            : \"MCAAMLH\" === e || e === q\n              ? (o = B)\n              : e === U && (o = H),\n          o)\n        )\n          return (\n            !t ||\n              (null != g._loading && g._loading[o]) ||\n              (null == g._loading && (g._loading = {}),\n              (g._loading[o] = !0),\n              o === B && (b = 0),\n              g._loadData(\n                o,\n                t,\n                function (t) {\n                  if (!g._getField(e)) {\n                    var n = \"\";\n                    (e === k\n                      ? (n = g._generateLocalMID())\n                      : o === B && (n = { error_msg: \"timeout\" }),\n                      g._setFields(o, n));\n                  }\n                },\n                i,\n              )),\n            a || (t || g._setFields(o, { id: G }), \"\")\n          );\n      return (\n        (e !== k && e !== U) || a !== G || ((a = \"\"), (r = !0)),\n        n && r && g._callCallback(n, [a]),\n        e === k &&\n          W.subscribed &&\n          (W.callbacks &&\n            W.callbacks.length &&\n            W.callbacks.forEach(function (e) {\n              g._callCallback(e, [a]);\n            }),\n          (W.subscribed = !1),\n          (W.callbacks.length = 0)),\n        a\n      );\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 298 function 1 (getMarketingCloudVisitorID)", () => {
  const source = "function (e) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 299 function 1 (_setFields)", () => {
  const source = "function (t, n) {\n      if (\n        (g._clearTimeout(t),\n        null != g._loading && (g._loading[t] = !1),\n        Z.fieldGroupObj[t] && Z.setState(t, !1),\n        t === O)\n      ) {\n        !0 !== Z.isClientSideMarketingCloudVisitorID &&\n          (Z.isClientSideMarketingCloudVisitorID = !1);\n        var r = null;\n        ((r && r !== G) || (r = \"\"),\n          \"object\" === e(n) &&\n            ((n.d_region || n.dcs_region || n.d_blob || n.blob) &&\n              g._setFields(B, n),\n            g._use1stPartyMarketingCloudServer &&\n              n.mid &&\n              g._setFields(H, { id: n.id })),\n          g._callAllCallbacks(k, [r]));\n      }\n      if (t === B && \"object\" === e(n)) {\n        var i = 604800;\n        null != n.id_sync_ttl &&\n          n.id_sync_ttl &&\n          (i = parseInt(n.id_sync_ttl, 10));\n        var o = null;\n        g._callAllCallbacks(\"MCAAMLH\", [o]);\n        var a = null;\n        (a || (a = \"\"), g._callAllCallbacks(q, [a]));\n      }\n      if (t === H) {\n        var u = null;\n        ((u && u !== G) || (u = \"\"), g._callAllCallbacks(U, [u]));\n      }\n      if (g.idSyncDisableSyncs || g.disableIdSyncs) K.idCallNotProcesssed = !0;\n      else {\n        K.idCallNotProcesssed = !1;\n        var s = {};\n        ((s.ibs = n.ibs), (s.subdomain = n.subdomain));\n      }\n      if (n === Object(n)) {\n        var l, f;\n        l = null;\n        var d = { optOut: null, d_ottl: null };\n        ((l = d.optOut),\n          (f = d.d_ottl),\n          g._setFieldExpire(\"MCOPTOUT\", f, !0),\n          g._setField(\"MCOPTOUT\", l),\n          g._callAllCallbacks(\"MCOPTOUT\", [l]));\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 300 function 1 (_setMarketingCloudFields)", () => {
  const source = "function (e) {\n      (g._readVisitor(), null);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 301 function 1 (setMarketingCloudVisitorID)", () => {
  const source = "function (e) {}";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 302 function 1 (_getRemoteField)", () => {
  const source = "function (e, t, n, r, i) {\n      var o,\n        a = \"\",\n        u = null;\n      if (c() && g.isAllowed())\n        if (\n          (g._readVisitor(),\n          !(\n            !(a = g._getField(e, !0 === { MCAAMLH: !0, MCAAMB: !0 }[e])) ||\n            (g._fieldsExpired && g._fieldsExpired[e])\n          ))\n        )\n          a ||\n            (e === k\n              ? (a = g._generateLocalMID())\n              : e === U\n                ? (a = \"\")\n                : ((a = \"\"), (r = !0)));\n        else if (\n          (e === k || \"MCOPTOUT\" === e\n            ? (o = O)\n            : \"MCAAMLH\" === e || e === q\n              ? (o = B)\n              : e === U && (o = H),\n          o)\n        )\n          return (\n            !t ||\n              (null != g._loading && g._loading[o]) ||\n              (null == g._loading && (g._loading = {}),\n              (g._loading[o] = !0),\n              o === B && (b = 0),\n              g._loadData(\n                o,\n                t,\n                function (t) {\n                  if (!g._getField(e)) {\n                    var n = \"\";\n                    (e === k\n                      ? (n = g._generateLocalMID())\n                      : o === B && (n = { error_msg: \"timeout\" }),\n                      g._setFields(o, n));\n                  }\n                },\n                i,\n              )),\n            a || (t || g._setFields(o, { id: G }), \"\")\n          );\n      return ((e !== k && e !== U) || a !== G || ((a = \"\"), (r = !0)), a);\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 303 function 1 (getAudienceManagerLocationHint)", () => {
  const source = "function (e, t) {\n      return \"\";\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 304 function 1 (getAudienceManagerLocationHint)", () => {
  const source = "function (e, t) {\n      return \"\";\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 305 function 1 (getAnalyticsVisitorID)", () => {
  const source = "function (e, t, n) {\n      return (g._callCallback(e, [\"\"]), \"\");\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 306 function 1 (getAnalyticsVisitorID)", () => {
  const source = "function (e, t, n) {\n      return (g._callCallback(e, [\"\"]), \"\");\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 307 function 1 (getAudienceManagerBlob)", () => {
  const source = "function (e, t) {\n      return \"\";\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 308 function 1 (getAudienceManagerBlob)", () => {
  const source = "function (e, t) {\n      return \"\";\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 309 function 1 (o)", () => {
  const source = "function o(e) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 310 function 1 (get)", () => {
  const source = "function (e) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 311 function 1 (G)", () => {
  const source = "function G(e, t, n) {\n      return null;\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 312 function 1 (W)", () => {
  const source = "function W() {\n      return null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 313 function 1 (cr)", () => {
  const source = "function cr(e, t, n) {\n      if (W()) {\n        !(function (e) {\n          ((e[Ol] = e[Ol] || {}), (e[Ol].querySelectorAll = Ft));\n        })(e);\n        var i = n[Ja];\n        Kc(i)\n          .then(function () {\n            return (function (e, t) {\n              t.addEventListener(\n                uo,\n                function (t) {\n                  r(e[Ol][kl]) && e[Ol][kl](t);\n                },\n                !0,\n              );\n            })(e, t);\n          })\n          .catch(function () {});\n      }\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 314 function 1 (init)", () => {
  const source = "function (e, t) {\n      var r;\n      if (!e) return $.Z();\n      if (\"string\" == typeof e)\n        if (\"<\" == (e = e.trim())[0] && P.test(e))\n          ((r = $.fragment(e, RegExp.$1, t)), (e = null));\n        else {\n          if (t !== C) return null;\n          r = $.qsa(T, e);\n        }\n      else {\n        if (n(e)) return null;\n        if ($.isZ(e)) return e;\n        if (K(e))\n          r = (function (e) {\n            return O.call(e, function (e) {\n              return null != e;\n            });\n          })(e);\n        else if (o(e)) ((r = [e]), (e = null));\n        else if (P.test(e))\n          ((r = $.fragment(e.trim(), RegExp.$1, t)), (e = null));\n        else {\n          if (t !== C) return null;\n          r = $.qsa(T, e);\n        }\n      }\n      return $.Z(r, e);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 315 function 1 (c)", () => {
  const source = "function (e) {\n      return e;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 316 function 1 (r)", () => {
  const source = "function r(e) {\n      return !!n(e);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 317 function 1 (Y)", () => {
  const source = "function Y() {\n      var e = M(),\n        t = e[Oa];\n      return e[Ka]\n        ? t && !z()\n        : t &&\n            (function () {\n              return false;\n            })() &&\n            !z();\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 318 function 1 (init)", () => {
  const source = "function (e, t) {\n      var r;\n      if (!e) return $.Z();\n      if (\"string\" == typeof e)\n        if (\"<\" == (e = e.trim())[0] && P.test(e))\n          ((r = $.fragment(e, RegExp.$1, t)), (e = null));\n        else {\n          if (t !== C) return null;\n          r = $.qsa(T, e);\n        }\n      else {\n        if (n(e)) return null;\n        if ($.isZ(e)) return e;\n        if (K(e))\n          r = (function (e) {\n            return O.call(e, function (e) {\n              return null != e;\n            });\n          })(e);\n        else if (o(e)) ((r = [e]), (e = null));\n        else if (P.test(e))\n          ((r = $.fragment(e.trim(), RegExp.$1, t)), (e = null));\n        else {\n          if (t !== C) return null;\n          r = $.qsa(T, e);\n        }\n      }\n      return $.Z(r, e);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 319 function 1 (remove)", () => {
  const source = "function (t, n) {}";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 320 function 1 (z)", () => {
  const source = "function z() {\n      return null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 321 function 1 (Y)", () => {
  const source = "function Y() {\n      var e = M(),\n        t = e[Oa];\n      return e[Ka]\n        ? t && !z()\n        : t &&\n            (function () {\n              return false;\n            })() &&\n            !z();\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 322 function 1 ($)", () => {
  const source = "function $() {\n      return null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 323 function 1 (init)", () => {
  const source = "function (e, t) {\n      var r;\n      if (!e) return $.Z();\n      if (\"string\" == typeof e)\n        if (\"<\" == (e = e.trim())[0] && P.test(e))\n          ((r = $.fragment(e, RegExp.$1, t)), (e = null));\n        else {\n          if (t !== C) return null;\n          r = $.qsa(T, e);\n        }\n      else {\n        if (n(e)) return null;\n        if ($.isZ(e)) return e;\n        if (K(e))\n          r = (function (e) {\n            return O.call(e, function (e) {\n              return null != e;\n            });\n          })(e);\n        else if (o(e)) ((r = [e]), (e = null));\n        else if (P.test(e))\n          ((r = $.fragment(e.trim(), RegExp.$1, t)), (e = null));\n        else {\n          if (t !== C) return null;\n          r = $.qsa(T, e);\n        }\n      }\n      return $.Z(r, e);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 324 function 1 (vt)", () => {
  const source = "function vt() {\n      return null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 325 function 1 (init)", () => {
  const source = "function (e, t) {\n      var r;\n      if (!e) return $.Z();\n      if (\"string\" == typeof e)\n        if (\"<\" == (e = e.trim())[0] && P.test(e))\n          ((r = $.fragment(e, RegExp.$1, t)), (e = null));\n        else {\n          if (t !== C) return null;\n          r = $.qsa(T, e);\n        }\n      else {\n        if (n(e)) return null;\n        if ($.isZ(e)) return e;\n        if (K(e))\n          r = (function (e) {\n            return O.call(e, function (e) {\n              return null != e;\n            });\n          })(e);\n        else if (o(e)) ((r = [e]), (e = null));\n        else if (P.test(e))\n          ((r = $.fragment(e.trim(), RegExp.$1, t)), (e = null));\n        else {\n          if (t !== C) return null;\n          r = $.qsa(T, e);\n        }\n      }\n      return $.Z(r, e);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 326 function 1 (X)", () => {
  const source = "function X() {\n      for (var e = arguments.length, t = Array(e), n = 0; n < e; n++)\n        t[n] = arguments[n];\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 327 function 1 (init)", () => {
  const source = "function (e, t) {\n      var r;\n      if (!e) return $.Z();\n      if (\"string\" == typeof e)\n        if (\"<\" == (e = e.trim())[0] && P.test(e))\n          ((r = $.fragment(e, RegExp.$1, t)), (e = null));\n        else {\n          if (t !== C) return null;\n          r = $.qsa(T, e);\n        }\n      else {\n        if (n(e)) return null;\n        if ($.isZ(e)) return e;\n        if (K(e))\n          r = (function (e) {\n            return O.call(e, function (e) {\n              return null != e;\n            });\n          })(e);\n        else if (o(e)) ((r = [e]), (e = null));\n        else if (P.test(e))\n          ((r = $.fragment(e.trim(), RegExp.$1, t)), (e = null));\n        else {\n          if (t !== C) return null;\n          r = $.qsa(T, e);\n        }\n      }\n      return $.Z(r, e);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 329 function 1 (V)", () => {
  const source = "function V() {\n      var e = [],\n        t = Math.ceil(A() / 1e3);\n      return w(\n        function (e, t) {\n          return ((e[t.name] = t), e);\n        },\n        {},\n        l(function (e) {\n          return n(e) && t <= e.expires;\n        }, e),\n      );\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 330 function 1 (H)", () => {
  const source = "function H(e) {\n      return \"\";\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 331 function 1 (ye)", () => {
  const source = "function ye() {\n      var e = M();\n      return e[Ka] || (me() && !he()) ? ks : H(Au);\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 332 function 1 (De)", () => {
  const source = "function De(e, t) {\n      var n = e(),\n        r = null,\n        i = {};\n      return ((i.sessionId = n), i);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 333 function 1 (we)", () => {
  const source = "function we(e) {\n      var t = { type: xs, mbox: e.mbox, tracking: null };\n      Ee(Xr, Zr, xs, t);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 334 function 1 (q)", () => {
  const source = "function q(e) {\n      var t = e.name,\n        n = e.value,\n        r = e.expires,\n        i = e.domain,\n        o = V();\n      o[t] = j(t, n, Math.ceil(r + A() / 1e3));\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 335 function 1 (ge)", () => {
  const source = "function ge(e, t) {\n      return null;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 336 function 1 (ye)", () => {
  const source = "function ye() {\n      var e = M();\n      return e[Ka] || (me() && !he()) ? ks : H(Au);\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 337 function 1 (q)", () => {
  const source = "function q(e) {\n      var t = e.name,\n        n = e.value,\n        r = e.expires,\n        i = e.domain,\n        o = V();\n      o[t] = j(t, n, Math.ceil(r + A() / 1e3));\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 338 function 1 (ye)", () => {
  const source = "function ye() {\n      var e = M();\n      return e[Ka] || (me() && !he()) ? ks : H(Au);\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 339 function 1 (Ce)", () => {
  const source = "function Ce() {\n      return M()[Ka] ? \"\" : \"\";\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 340 function 1 (De)", () => {
  const source = "function De(e, t) {\n      var n = e(),\n        r = null,\n        i = {};\n      return ((i.sessionId = n), i);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 341 function 1 (st)", () => {
  const source = "function st() {\n      var e = M(),\n        t = Xr.location,\n        n = {};\n      return (\n        (n[pu] = null),\n        e[Ka] || (n[hu] = null),\n        (n[mu] = null),\n        (n[gu] = null),\n        (n[vu] = null),\n        (n[yu] = cc),\n        (n[bu] = (function () {\n          var e = new Date();\n          return e.getTime() - 6e4 * e.getTimezoneOffset();\n        })()),\n        (n[Cu] = null),\n        (n[_u] = null),\n        (n[Su] = null),\n        e[Xa] && (n[Iu] = null),\n        (cc += 1),\n        n\n      );\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 342 function 1 (ft)", () => {
  const source = "function ft(e, t) {\n      var n = {};\n      n[du] = e;\n      var r = null,\n        i = null,\n        o = null,\n        a = null;\n      return _r({}, n, r, i, o, a);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 343 function 1 (Nt)", () => {
  const source = "function Nt(e, t) {\n      var r = t[aa],\n        i = n(t[da]) ? t[da] : {},\n        o = {};\n      return (\n        (o[aa] = r),\n        (o[da] = {}),\n        (o[La] = (function (e, t) {\n          var n = t[La];\n          return I(n) ? (n <= 0 ? e[La] : n) : e[La];\n        })(e, t)),\n        o\n      );\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 344 function 1 (st)", () => {
  const source = "function st() {\n      var e = M(),\n        t = Xr.location,\n        n = {};\n      return (\n        (n[pu] = null),\n        e[Ka] || (n[hu] = null),\n        (n[mu] = null),\n        (n[gu] = null),\n        (n[vu] = null),\n        (n[yu] = cc),\n        (n[bu] = (function () {\n          var e = new Date();\n          return e.getTime() - 6e4 * e.getTimezoneOffset();\n        })()),\n        (n[Cu] = null),\n        (n[_u] = null),\n        (n[Su] = null),\n        e[Xa] && (n[Iu] = null),\n        (cc += 1),\n        n\n      );\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 345 function 1 (yt)", () => {
  const source = "function yt(e) {\n      var t = vt(),\n        n = ht(t, e);\n      return (function () {\n        return Promise.resolve(ce({}));\n      })().then(function (e) {\n        return ce({});\n      });\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 346 function 1 (xt)", () => {
  const source = "function xt(e, t, n, r) {\n      return Promise.resolve(null);\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 347 function 1 (Lt)", () => {
  const source = "function Lt(e) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 348 function 1 (yt)", () => {
  const source = "function yt(e) {\n      var t = vt(),\n        n = ht(t, e);\n      return (function () {\n        return Promise.resolve(ce({}));\n      })().then(function (e) {\n        return ce({});\n      });\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 349 function 1 (getVisitorValues)", () => {
  const source = "function (e) {\n      e({ MCMID: null });\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 350 function 1 (wt)", () => {
  const source = "function wt(e, t, n, r) {\n      if (!r) return n;\n      return n;\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 351 function 1 (kt)", () => {
  const source = "function kt(e, t, n, r) {\n      var i = {},\n        o = {};\n      return (\n        (o[Ys] = (function (e, t) {\n          var n = e[ka],\n            r = e[Ma],\n            i = e[Ga];\n          return [e[Za], Fc, wt(t, n, r, i), Ot(n)].join(\"\");\n        })(e, t)),\n        (o[Ws] = null),\n        (o[Ks] = r[Ks]),\n        o\n      );\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 352 function 1 (r)", () => {
  const source = "function r(e) {\n      return !!n(e);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 353 function 1 (_setFields)", () => {
  const source = "function (t, n) {\n      if (\n        (g._clearTimeout(t),\n        null != g._loading && (g._loading[t] = !1),\n        Z.fieldGroupObj[t] && Z.setState(t, !1),\n        t === O)\n      ) {\n        !0 !== Z.isClientSideMarketingCloudVisitorID &&\n          (Z.isClientSideMarketingCloudVisitorID = !1);\n        var r = null;\n        ((r && r !== G) || (r = \"\"),\n          \"object\" === e(n) &&\n            ((n.d_region || n.dcs_region || n.d_blob || n.blob) &&\n              g._setFields(B, n),\n            g._use1stPartyMarketingCloudServer &&\n              n.mid &&\n              g._setFields(H, { id: n.id })),\n          g._callAllCallbacks(k, [r]));\n      }\n      if (t === B && \"object\" === e(n)) {\n        var i = 604800;\n        null != n.id_sync_ttl &&\n          n.id_sync_ttl &&\n          (i = parseInt(n.id_sync_ttl, 10));\n        var o = null;\n        g._callAllCallbacks(\"MCAAMLH\", [o]);\n        var a = null;\n        (a || (a = \"\"), g._callAllCallbacks(q, [a]));\n      }\n      if (t === H) {\n        var u = null;\n        ((u && u !== G) || (u = \"\"), g._callAllCallbacks(U, [u]));\n      }\n      if (g.idSyncDisableSyncs || g.disableIdSyncs) K.idCallNotProcesssed = !0;\n      else {\n        K.idCallNotProcesssed = !1;\n      }\n      if (n === Object(n)) {\n        var l, f;\n        l = null;\n        var d = { optOut: null, d_ottl: null };\n        ((l = d.optOut),\n          (f = d.d_ottl),\n          g._setFieldExpire(\"MCOPTOUT\", f, !0),\n          g._setField(\"MCOPTOUT\", l),\n          g._callAllCallbacks(\"MCOPTOUT\", [l]));\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 354 function 1 (_setAnalyticsFields)", () => {
  const source = "function (e) {\n      g._setFields(H, e);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 355 function 1 (_callCallback)", () => {
  const source = "function (e, t) {\n      try {\n        \"function\" == typeof e ? e.apply(null, t) : e[1].apply(null, t);\n      } catch (e) {}\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 356 function 1 (_callAllCallbacks)", () => {
  const source = "function (e, t) {\n      if (null != g._callbackList) {\n        var n = g._callbackList[e];\n        if (n) for (; n.length > 0; ) n.shift();\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 357 function 1 (_setFields)", () => {
  const source = "function (t, n) {\n      if (\n        (g._clearTimeout(t),\n        null != g._loading && (g._loading[t] = !1),\n        Z.fieldGroupObj[t] && Z.setState(t, !1),\n        t === O)\n      ) {\n        !0 !== Z.isClientSideMarketingCloudVisitorID &&\n          (Z.isClientSideMarketingCloudVisitorID = !1);\n        var r = null;\n        ((r && r !== G) || (r = \"\"),\n          \"object\" === e(n) &&\n            ((n.d_region || n.dcs_region || n.d_blob || n.blob) &&\n              g._setFields(B, n),\n            g._use1stPartyMarketingCloudServer &&\n              n.mid &&\n              g._setFields(H, { id: n.id })),\n          g._callAllCallbacks(k, [r]));\n      }\n      if (t === B && \"object\" === e(n)) {\n        var i = 604800;\n        null != n.id_sync_ttl &&\n          n.id_sync_ttl &&\n          (i = parseInt(n.id_sync_ttl, 10));\n        var o = null;\n        g._callAllCallbacks(\"MCAAMLH\", [o]);\n        var a = null;\n        (a || (a = \"\"), g._callAllCallbacks(q, [a]));\n      }\n      if (t === H) {\n        var u = null;\n        ((u && u !== G) || (u = \"\"), g._callAllCallbacks(U, [u]));\n      }\n      if (g.idSyncDisableSyncs || g.disableIdSyncs) K.idCallNotProcesssed = !0;\n      else {\n        K.idCallNotProcesssed = !1;\n      }\n      if (n === Object(n)) {\n        var l, f;\n        ((l = null), (f = null));\n        var d = { optOut: null, d_ottl: null };\n        ((l = d.optOut),\n          (f = d.d_ottl),\n          g._setFieldExpire(\"MCOPTOUT\", f, !0),\n          g._setField(\"MCOPTOUT\", l),\n          g._callAllCallbacks(\"MCOPTOUT\", [l]));\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 358 function 1 (getAudienceManagerLocationHint)", () => {
  const source = "function (e, t) {\n      return \"\";\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 359 function 1 (getAudienceManagerBlob)", () => {
  const source = "function (e, t) {\n      return \"\";\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 360 function 1 (_setFields)", () => {
  const source = "function (t, n) {\n      if (\n        (g._clearTimeout(t),\n        null != g._loading && (g._loading[t] = !1),\n        Z.fieldGroupObj[t] && Z.setState(t, !1),\n        t === O)\n      ) {\n        !0 !== Z.isClientSideMarketingCloudVisitorID &&\n          (Z.isClientSideMarketingCloudVisitorID = !1);\n        var r = null;\n        ((r && r !== G) || (r = \"\"),\n          \"object\" === e(n) &&\n            ((n.d_region || n.dcs_region || n.d_blob || n.blob) &&\n              g._setFields(B, n),\n            g._use1stPartyMarketingCloudServer &&\n              n.mid &&\n              g._setFields(H, { id: n.id })),\n          g._callAllCallbacks(k, [r]));\n      }\n      if (t === B && \"object\" === e(n)) {\n        var i = 604800;\n        null != n.id_sync_ttl &&\n          n.id_sync_ttl &&\n          (i = parseInt(n.id_sync_ttl, 10));\n        var o = null;\n        g._callAllCallbacks(\"MCAAMLH\", [o]);\n        var a = null;\n        ((n.d_blob || n.blob) &&\n          ((a = n.d_blob) || (a = n.blob),\n          g._setFieldExpire(q, i),\n          g._setField(q, a)),\n          a || (a = \"\"),\n          g._callAllCallbacks(q, [a]),\n          !n.error_msg &&\n            g._newCustomerIDsHash &&\n            g._setField(\"MCCIDH\", g._newCustomerIDsHash));\n      }\n      if (t === H) {\n        var u = null;\n        ((u && u !== G) || (u = \"\"), g._callAllCallbacks(U, [u]));\n      }\n      if (g.idSyncDisableSyncs || g.disableIdSyncs) K.idCallNotProcesssed = !0;\n      else {\n        K.idCallNotProcesssed = !1;\n      }\n      if (n === Object(n)) {\n        var l, f;\n        c() && g.isAllowed() && (l = null);\n        var d = { optOut: null, d_ottl: null };\n        ((l = d.optOut),\n          (f = d.d_ottl),\n          g._setFieldExpire(\"MCOPTOUT\", f, !0),\n          g._setField(\"MCOPTOUT\", l),\n          g._callAllCallbacks(\"MCOPTOUT\", [l]));\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 361 function 1 (_setFieldExpire)", () => {
  const source = "function (e, t, n) {\n      var r = new Date();\n      (r.setTime(r.getTime() + 1e3 * t),\n        null == g._fields && (g._fields = {}),\n        (g._fields[\"expire\" + e] =\n          Math.floor(r.getTime() / 1e3) + (n ? \"s\" : \"\")),\n        t < 0\n          ? (g._fieldsExpired || (g._fieldsExpired = {}),\n            (g._fieldsExpired[e] = !0))\n          : g._fieldsExpired && (g._fieldsExpired[e] = !1));\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 362 function 1 (_setFields)", () => {
  const source = "function (t, n) {\n      if (\n        (g._clearTimeout(t),\n        null != g._loading && (g._loading[t] = !1),\n        Z.fieldGroupObj[t] && Z.setState(t, !1),\n        t === O)\n      ) {\n        !0 !== Z.isClientSideMarketingCloudVisitorID &&\n          (Z.isClientSideMarketingCloudVisitorID = !1);\n        var r = null;\n        ((r && r !== G) || (r = \"\"),\n          \"object\" === e(n) &&\n            ((n.d_region || n.dcs_region || n.d_blob || n.blob) &&\n              g._setFields(B, n),\n            g._use1stPartyMarketingCloudServer &&\n              n.mid &&\n              g._setFields(H, { id: n.id })),\n          g._callAllCallbacks(k, [r]));\n      }\n      if (t === B && \"object\" === e(n)) {\n        var i = 604800;\n        null != n.id_sync_ttl &&\n          n.id_sync_ttl &&\n          (i = parseInt(n.id_sync_ttl, 10));\n        var o = null;\n        g._callAllCallbacks(\"MCAAMLH\", [o]);\n        var a = null;\n        (a || (a = \"\"), g._callAllCallbacks(q, [a]));\n      }\n      if (t === H) {\n        var u = null;\n        ((u && u !== G) || (u = \"\"), g._callAllCallbacks(U, [u]));\n      }\n      if (g.idSyncDisableSyncs || g.disableIdSyncs) K.idCallNotProcesssed = !0;\n      else {\n        K.idCallNotProcesssed = !1;\n      }\n      if (n === Object(n)) {\n        var l, f;\n        l = null;\n        var d = { optOut: null, d_ottl: null };\n        ((l = d.optOut),\n          (f = d.d_ottl),\n          g._setFieldExpire(\"MCOPTOUT\", f, !0),\n          g._setField(\"MCOPTOUT\", l),\n          g._callAllCallbacks(\"MCOPTOUT\", [l]));\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 363 function 1 (_setFieldExpire)", () => {
  const source = "function (e, t, n) {\n      var r = new Date();\n      (r.setTime(r.getTime() + 1e3 * t),\n        null == g._fields && (g._fields = {}),\n        (g._fields[\"expire\" + e] =\n          Math.floor(r.getTime() / 1e3) + (n ? \"s\" : \"\")),\n        t < 0\n          ? (g._fieldsExpired || (g._fieldsExpired = {}),\n            (g._fieldsExpired[e] = !0))\n          : g._fieldsExpired && (g._fieldsExpired[e] = !1));\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 364 function 1 (_setFields)", () => {
  const source = "function (t, n) {\n      if (\n        (g._clearTimeout(t),\n        null != g._loading && (g._loading[t] = !1),\n        Z.fieldGroupObj[t] && Z.setState(t, !1),\n        t === O)\n      ) {\n        !0 !== Z.isClientSideMarketingCloudVisitorID &&\n          (Z.isClientSideMarketingCloudVisitorID = !1);\n        var r = null;\n        ((r && r !== G) || (r = \"\"),\n          \"object\" === e(n) &&\n            ((n.d_region || n.dcs_region || n.d_blob || n.blob) &&\n              g._setFields(B, n),\n            g._use1stPartyMarketingCloudServer &&\n              n.mid &&\n              g._setFields(H, { id: n.id })),\n          g._callAllCallbacks(k, [r]));\n      }\n      if (t === B && \"object\" === e(n)) {\n        var i = 604800;\n        null != n.id_sync_ttl &&\n          n.id_sync_ttl &&\n          (i = parseInt(n.id_sync_ttl, 10));\n        var o = null;\n        g._callAllCallbacks(\"MCAAMLH\", [o]);\n        var a = null;\n        (a || (a = \"\"),\n          g._callAllCallbacks(q, [a]),\n          !n.error_msg &&\n            g._newCustomerIDsHash &&\n            g._setField(\"MCCIDH\", g._newCustomerIDsHash));\n      }\n      if (t === H) {\n        var u = null;\n        ((u && u !== G) || (u = \"\"), g._callAllCallbacks(U, [u]));\n      }\n      if (g.idSyncDisableSyncs || g.disableIdSyncs) K.idCallNotProcesssed = !0;\n      else {\n        K.idCallNotProcesssed = !1;\n        var s = {};\n        ((s.ibs = n.ibs), (s.subdomain = n.subdomain));\n      }\n      if (n === Object(n)) {\n        var l, f;\n        ((l = null), (f = null), g._callAllCallbacks(\"MCOPTOUT\", [l]));\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 365 function 1 (Z)", () => {
  const source = "function Z(e, t) {\n      if (t) {\n        var i = {};\n        i[Uu] = null;\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 366 function 1 (be)", () => {
  const source = "function be(e) {\n      var t = M();\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 367 function 1 (Oe)", () => {
  const source = "function Oe(e, t) {\n      var n = e.responseTokens,\n        r = { type: Ls, mbox: e.mbox, redirect: Ae(t), tracking: null };\n      (b(n) || (r.responseTokens = n), Ee(Xr, Zr, Ls, r));\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 368 function 1 (GetCookie)", () => {
  const source = "function (t) {\n      return \"\";\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 369 function 1 (CreateCookie)", () => {
  const source = "function (t, e, i) {\n      return;\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 370 function 1 (getCookie)", () => {
  const source = "function getCookie(name) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 371 function 1 (execute)", () => {
  const source = "function () {\n      this.executionData.runTime.push(new Date());\n      try {\n        this.code();\n      } catch (b) {\n        window[ensightenOptions.ns].reportException(b);\n      } finally {\n        ((this.executionData.hasRun = !0), c.testAll());\n      }\n    }";
  const args = [];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 372 function 1 (test)", () => {
  const source = "function (a) {\n      if (!a.executionData.hasRun) {\n        for (var b = 0; b < a.dependencies.length; b++)\n          if (!1 === a.dependencies[b]()) return;\n        a.execute();\n      }\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 373 function 1 (testAll)", () => {
  const source = "function () {\n      for (var a = 0; a < e.ruleList.length; a++) null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 374 function 1 (registerRule)", () => {
  const source = "function (a) {\n      if (c.getRule(a.id) && -1 !== a.id) return !1;\n      e.ruleList.push(a);\n      return !0;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 375 function 1 (bindImmediate)", () => {
  const source = "function (a, b, d) {\n      if (\"function\" === typeof a)\n        a = new c.Rule({ id: -1, deploymentId: -1, dependencies: [], code: a });\n      else if (\"object\" !== typeof a) return !1;\n      c.registerRule(a);\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 376 function 1 (getCookie)", () => {
  const source = "function (a) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 377 function 1 (execute)", () => {
  const source = "function () {\n      this.executionData.runTime.push(new Date());\n      try {\n        this.code();\n      } catch (b) {\n        window[ensightenOptions.ns].reportException(b);\n      } finally {\n        ((this.executionData.hasRun = !0), d.testAll());\n      }\n    }";
  const args = [];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 378 function 1 (test)", () => {
  const source = "function (a) {\n      if (\n        !(\n          a.executionData.hasRun ||\n          (a.executionData.runTime && 0 < a.executionData.runTime.length)\n        )\n      ) {\n        for (var b = 0; b < a.dependencies.length; b++)\n          if (!1 === a.dependencies[b]()) return;\n        a.execute();\n      }\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 379 function 1 (testAll)", () => {
  const source = "function () {\n      for (var a = 0; a < c.ruleList.length; a++) null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 380 function 1 (registerRule)", () => {
  const source = "function (a) {\n      if (-1 !== a.id) return !1;\n      c.ruleList.push(a);\n      return !0;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 381 function 1 (bindDependency)", () => {
  const source = "function (a, b, e, f, g, l, m) {\n      var r = [];\n      if (!c.checkForInvalidDependencies(b, f, e, g)) {\n        if (\"function\" === typeof a)\n          a = new d.Rule({\n            id: b || -1,\n            deploymentId: f || -1,\n            appId: l || -1,\n            dependencies: r,\n            code: a,\n          });\n        else if (\"object\" !== typeof a) return !1;\n        d.registerRule(a);\n      }\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 382 function 1 (bindDependencyImmediate)", () => {
  const source = "function (a, b, e, f, g, l) {}";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 383 function 1 (readData)", () => {
  const source = "function () {\n      var a = null,\n        b = null,\n        c = null;\n      a = b;\n      c = c;\n      Marketing.UDO.application_name = c;\n      Marketing.UDO.application_type = a;\n      Marketing.UDO.accountid = null;\n      Marketing.UDO.category = null;\n      Marketing.UDO.categorypath = null;\n      Marketing.UDO.cid = null;\n      Marketing.UDO.coupon = null;\n      Marketing.UDO.cseg = null;\n      Marketing.UDO.currency = null;\n      Marketing.UDO.deals = null;\n      Marketing.UDO.device = null;\n      Marketing.UDO.discount = null;\n      Marketing.UDO.emailhash = null;\n      Marketing.UDO.family = null;\n      Marketing.UDO.ogid = null;\n      Marketing.UDO.family = null;\n      Marketing.UDO.ordercode = null;\n      Marketing.UDO.platform = null;\n      Marketing.UDO.prodcat = null;\n      Marketing.UDO.product = null;\n      Marketing.UDO.productlist = null;\n      Marketing.UDO.promoid = null;\n      Marketing.UDO.revenue = null;\n      Marketing.UDO.type = null;\n      Marketing.UDO.shippingtax = null;\n      Marketing.UDO.totaltax = null;\n      Marketing.UDO.country = Marketing.scDataObj.country;\n      Marketing.UDO.language = Marketing.scDataObj.language;\n      Marketing.UDO.segment = Marketing.scDataObj.segment;\n      Marketing.UDO.virtualsegment = null;\n      Marketing.UDO.user = \"none\";\n      Marketing.UDO.dpid = null;\n      Marketing.UDO.serialprodlist = null;\n      Marketing.UDO.loyalty = !1;\n      Marketing.UDO.usdrev = null;\n      Marketing.UDO.udoReady = !0;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 384 function 1 (execute)", () => {
  const source = "function () {\n      try {\n        this.code();\n      } catch (b) {\n        window[ensightenOptions.ns].reportException(b);\n      } finally {\n        ((this.executionData.hasRun = !0), d.testAll());\n      }\n    }";
  const args = [];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 385 function 1 (a)", () => {
  const source = "function a(e) {\n      return \"\";\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 386 function 1 (callOnDOMParsed)", () => {
  const source = "function () {\n      window[ensightenOptions.ns].executionState.DOMParsed = !0;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 387 function 1 (cookieRead)", () => {
  const source = "function (e) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 391 function 1 (consent_tcall)", () => {
  const source = "function () {\n      var consentcookie;\n      var consentval = \"\";\n      if (localStorage.getItem(\"s_value\") !== null) {\n        var consent_s = localStorage.getItem(\"s_value\");\n        var consent_m = localStorage.getItem(\"m_value\");\n        var consent_d = localStorage.getItem(\"d_value\");\n        s_dell.prop61 = consent_d;\n        if (consent_s === \"1\" && consent_m === \"1\") consentval = \"s|m\";\n        else\n          consentval = (consent_s === \"1\" && \"s\") || (consent_m === \"1\" && \"m\");\n        if (!consentval) {\n          consentval = \"n\";\n          s_dell.prop69 = \"usr|decl\";\n        }\n        s_dell.prop75 = consentval;\n      } else if (\n        typeof s_dell.c_r(\"dell_cmp_consent\") !== \"undefined\" &&\n        s_dell.c_r(\"dell_cmp_consent\")\n      ) {\n        consentcookie = JSON.parse(s_dell.c_r(\"dell_cmp_consent\"));\n        if (consentcookie.s === 1)\n          if (!consentval) consentval = \"s\";\n          else consentval = consentval + \"|s\";\n        if (consentcookie.m === 1)\n          if (!consentval) consentval = \"m\";\n          else consentval = consentval + \"|m\";\n        if (!consentval) {\n          consentval = \"n\";\n          s_dell.prop69 = \"usr|decl\";\n        }\n        s_dell.prop75 = consentval;\n      } else if (window.privacyAnalytics || window.privacyMarketing) {\n        if (window.privacyAnalytics) {\n          s_dell.prop75 = \"s\";\n          s_dell.prop69 = \"\";\n        }\n        if (window.privacyMarketing)\n          if (!s_dell.prop75) {\n            s_dell.prop75 = \"m\";\n            s_dell.prop69 = \"\";\n          } else s_dell.prop75 = s_dell.prop75 + \"|m\";\n      } else {\n        window.addEventListener(\"privacy-analytics-consent\", function () {\n          s_dell.prop75 = \"s\";\n          s_dell.prop69 = \"\";\n        });\n        window.addEventListener(\"privacy-marketing-consent\", function () {\n          s_dell.prop75 = \"m\";\n          s_dell.prop69 = \"\";\n        });\n        if (!s_dell.prop75) {\n          s_dell.prop75 = \"n\";\n          s_dell.prop69 = \"usr|ignore\";\n        }\n      }\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 392 function 1 (readpaid)", () => {
  const source = "function () {\n      s_dell.referrer = \"\";\n      s_dell.eVar2 = \"\";\n      s_dell.eVar148 = \"\";\n      s_dell.eVar149 = \"\";\n      s_dell.eVar154 = \"\";\n      s_dell.eVar66 = \"\";\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 393 function 1 (consent_tcall)", () => {
  const source = "function () {\n      var consentcookie;\n      var consentval = \"\";\n      if (localStorage.getItem(\"s_value\") !== null) {\n        var consent_s = localStorage.getItem(\"s_value\");\n        var consent_m = localStorage.getItem(\"m_value\");\n        var consent_d = localStorage.getItem(\"d_value\");\n        s_dell.prop61 = consent_d;\n        if (consent_s === \"1\" && consent_m === \"1\") consentval = \"s|m\";\n        else\n          consentval = (consent_s === \"1\" && \"s\") || (consent_m === \"1\" && \"m\");\n        if (!consentval) {\n          consentval = \"n\";\n          s_dell.prop69 = \"usr|decl\";\n        }\n        s_dell.prop75 = consentval;\n      } else if (\n        typeof s_dell.c_r(\"dell_cmp_consent\") !== \"undefined\" &&\n        s_dell.c_r(\"dell_cmp_consent\")\n      ) {\n        consentcookie = JSON.parse(s_dell.c_r(\"dell_cmp_consent\"));\n        if (consentcookie.s === 1)\n          if (!consentval) consentval = \"s\";\n          else consentval = consentval + \"|s\";\n        if (consentcookie.m === 1)\n          if (!consentval) consentval = \"m\";\n          else consentval = consentval + \"|m\";\n        if (!consentval) {\n          consentval = \"n\";\n          s_dell.prop69 = \"usr|decl\";\n        }\n        s_dell.prop75 = consentval;\n      } else if (window.privacyAnalytics || window.privacyMarketing) {\n        if (window.privacyAnalytics) {\n          s_dell.prop75 = \"s\";\n          s_dell.prop69 = \"\";\n        }\n        if (window.privacyMarketing)\n          if (!s_dell.prop75) {\n            s_dell.prop75 = \"m\";\n            s_dell.prop69 = \"\";\n          } else s_dell.prop75 = s_dell.prop75 + \"|m\";\n      } else {\n        window.addEventListener(\"privacy-analytics-consent\", function () {\n          s_dell.prop75 = \"s\";\n          s_dell.prop69 = \"\";\n        });\n        window.addEventListener(\"privacy-marketing-consent\", function () {\n          s_dell.prop75 = \"m\";\n          s_dell.prop69 = \"\";\n        });\n        if (!s_dell.prop75) {\n          s_dell.prop75 = \"n\";\n          s_dell.prop69 = \"usr|ignore\";\n        }\n      }\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 394 function 1 (o)", () => {
  const source = "function o(e, t) {\n      return null;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 395 function 1 (run)", () => {
  const source = "function (t) {\n      var n = this;\n      if (void 0 !== t.win) {\n        var d = e.uuidGenerator,\n          f = e.fetchFn,\n          p = e.innerCJApi,\n          v = e.getConfigWithDefaults,\n          g = d.generateV7(),\n          y = d.generateV4(),\n          h = (0, l.getRegisteredPartnerNames)(t.win),\n          b = v(t, h);\n        var O = new i.FetchRetrier(f.bind(window), 1).fetchRetry,\n          j = Promise.resolve(null);\n        return r(\n          r(\n            { sendOrder: (0, a.createSendOrder)(b, g, y, O, j, h) },\n            (0, s.generatePartnershipsFunctionsForTestMode)(\n              h,\n              (0, c.createDOMHelper)(t.win),\n              t.partnership,\n            ),\n          ),\n          {\n            setAdvertiserConsentStatus: b.flags.enableAdvertiserConsentSignal\n              ? (0, u.createSetAdvertiserConsentStatus)(b, function (e) {\n                  n.run(e);\n                })\n              : function () {},\n          },\n        );\n      }\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 396 function 1 (default)", () => {
  const source = "function (e) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 397 function 1 (y)", () => {
  const source = "function y(e) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 398 function 1 (g)", () => {
  const source = "function g(e) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 399 function 1 (C)", () => {
  const source = "function C(e, t, n, u, s) {\n      var l = (function (e, t, n, o) {\n        var a = n ? d(f(n)) : g(e);\n        if (a) {\n          if (o) {\n            var c = r(r({}, a), { advertiserConsent: i.NOT_PROVIDED });\n            return E(m(c, t), p(c));\n          }\n          return E(m(a, t), p(a));\n        }\n      })(e, t, n, s);\n      if (l) return l;\n      if (u)\n        try {\n          return (function (e, t, n, a) {\n            var c = !e,\n              u = (function (e, t) {\n                var n = {\n                  version: \"0\",\n                  isInGdprZone: e,\n                  dtmConsent: o.NEVER_ASKED,\n                  isInterimPeriod: !1,\n                  loyaltyExpiration: \"0\",\n                };\n                return p(\n                  t ? r(r({}, n), { advertiserConsent: i.NOT_PROVIDED }) : n,\n                );\n              })(e, a);\n            return E(c, u);\n          })(O(u), t, e, s);\n        } catch (e) {}\n      return S();\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 400 function 1 (h)", () => {
  const source = "function h(e, t, n) {}";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 401 function 1 (a)", () => {
  const source = "function a(c) {\n      if (!(c > 3)) {\n        var u = e.location.hostname;\n        var s = o(n, e.document);\n        return s === r ? s : a(c + 1);\n      }\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 402 function 1 (addCookie)", () => {
  const source = "function (e, n, r, i) {\n      return null == r || \"\" === r\n        ? void 0\n        : (function a(c) {\n            if (!(c > 3)) {\n              var u = e.location.hostname;\n              !(function (e, n, r, o, i) {\n                var a,\n                  c = (function (e, n, r, o, i) {\n                    var a = i\n                        ? new Date(\n                            i.getTime() + t.COOKIE_LIFETIME_MILLIS,\n                          ).toUTCString()\n                        : \"\",\n                      c = [\n                        \"\".concat(n, \"=\").concat(r),\n                        \"expires=\".concat(a),\n                        \"path=/\",\n                      ];\n                    return (\n                      \"https:\" === o && c.push(\"secure\"),\n                      \"\" !== e && c.push(\"domain=\" + e),\n                      c.join(\";\")\n                    );\n                  })(e, n, o, r.location.protocol, i);\n                a = c; /* Tracking behavior removed: r.document.cookie=a */\n              })(\n                \"localhost\" === u\n                  ? \"localhost\"\n                  : \".\".concat(u.split(\".\").splice(-c).join(\".\")),\n                n,\n                e,\n                r,\n                i,\n              );\n              var s = null;\n              /* Tracking behavior removed: s=o(n,e.document) */ return s === r\n                ? s\n                : a(c + 1);\n            }\n          })(2);\n    }";
  const args = [
  "k",
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 403 function 1 (h)", () => {
  const source = "function h(e, t, n) {}";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 404 function 1 (C)", () => {
  const source = "function C(e, t, n, u, s) {\n      var l = (function (e, t, n, o) {\n        var a = n ? d(f(n)) : g(e);\n        if (a) {\n          if (o) {\n            var c = r(r({}, a), { advertiserConsent: i.NOT_PROVIDED });\n            return E(m(c, t), p(c));\n          }\n          return E(m(a, t), p(a));\n        }\n      })(e, t, n, s);\n      if (l) return l;\n      if (u)\n        try {\n          return (function (e, t, n, a) {\n            var c = !e,\n              u = (function (e, t) {\n                var n = {\n                  version: \"0\",\n                  isInGdprZone: e,\n                  dtmConsent: o.NEVER_ASKED,\n                  isInterimPeriod: !1,\n                  loyaltyExpiration: \"0\",\n                };\n                return p(\n                  t ? r(r({}, n), { advertiserConsent: i.NOT_PROVIDED }) : n,\n                );\n              })(e, a);\n            return E(c, u);\n          })(O(u), t, e, s);\n        } catch (e) {}\n      return S();\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 405 function 1 (a)", () => {
  const source = "function a(c) {\n      if (!(c > 3)) {\n        var u = e.location.hostname;\n        var s = o(n, e.document);\n        return s === r ? s : a(c + 1);\n      }\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 406 function 1 (getCookie)", () => {
  const source = "function (t) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 407 function 1 (d)", () => {
  const source = "function d(e) {\n      var t = function (e) {\n        return \"Y\" == e;\n      };\n      if (new RegExp(\"\\\\d+\\\\|[YN]\\\\|[YN0]\\\\|[YN]\\\\|\\\\d+(\\\\|[YN0])?\").test(e)) {\n        var n = e.split(\"|\");\n        return {\n          version: n[0],\n          isInGdprZone: t(n[1]),\n          dtmConsent: null,\n          isInterimPeriod: t(n[3]),\n          loyaltyExpiration: n[4],\n          advertiserConsent: null,\n        };\n      }\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 408 function 1 (i)", () => {
  const source = "function i(e, t) {\n      return null;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 409 function 1 (W)", () => {
  const source = "function (e, t, n, i) {\n      function r(e) {\n        Object.assign(p, e);\n      }\n      function a(e) {\n        (Object.assign(p.state, e),\n          Object.assign(p.state.ALLFIELDS, e),\n          p.callbackRegistry.executeAll(p.state));\n      }\n      function o(e) {\n        if (!h.isInvalid(e)) {\n          m = !1;\n          var t = h.parse(e);\n          p.setStateAndPublish(t.state);\n        }\n      }\n      function s(e) {\n        m = !0;\n      }\n      function c() {\n        (r(new R(n._generateID)),\n          p.callbackRegistry.executeAll(p.state, !0),\n          C.removeEventListener(\"message\", u));\n      }\n      function u(e) {\n        if (!h.isInvalid(e)) {\n          var t = h.parse(e);\n          ((m = !1),\n            C.clearTimeout(p._handshakeTimeout),\n            C.removeEventListener(\"message\", u),\n            r(new F()),\n            C.addEventListener(\"message\", o),\n            p.setStateAndPublish(t.state));\n        }\n      }\n      function l() {\n        g && postMessage\n          ? (C.addEventListener(\"message\", u),\n            (p._handshakeTimeout = setTimeout(c, 250)))\n          : c();\n      }\n      function d() {\n        (C.s_c_in || ((C.s_c_il = []), (C.s_c_in = 0)),\n          (p._c = \"Visitor\"),\n          (p._il = C.s_c_il),\n          (p._in = C.s_c_in),\n          (p._il[p._in] = p),\n          C.s_c_in++);\n      }\n      function f() {\n        function e(e) {\n          0 !== e.indexOf(\"_\") &&\n            \"function\" == typeof n[e] &&\n            (p[e] = function () {});\n        }\n        (Object.keys(n).forEach(e),\n          (p.getSupplementalDataID = n.getSupplementalDataID),\n          (p.isAllowed = function () {\n            return !0;\n          }));\n      }\n      var p = this,\n        g = t.whitelistParentDomain;\n      ((p.state = { ALLFIELDS: {} }),\n        (p.version = n.version),\n        (p.marketingCloudOrgID = e),\n        (p.cookieDomain = n.cookieDomain || \"\"),\n        (p._instanceType = \"child\"));\n      var m = !1,\n        h = new Y(e, g);\n      ((p.callbackRegistry = H()),\n        (p.init = function () {\n          (d(), f(), r(new V()), l());\n        }),\n        (p.findField = function (e, t) {\n          if (void 0 !== p.state[e]) return (t(p.state[e]), p.state[e]);\n        }),\n        (p.messageParent = s),\n        (p.setStateAndPublish = a));\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 410 function 1 (Cb)", () => {
  const source = "function () {\n      var b = a.W();\n      if (!b || !b.getVisitorValues) return !0;\n      a.ca && ((a.ca = !1), a.K || ((a.K = !0), null));\n      return !a.K;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 411 function 1 (isReadyToTrack)", () => {
  const source = "function () {\n      return true;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 412 function 1 (q)", () => {
  const source = "function () {\n      if (a.isReadyToTrack() && a.j != q) for (; 0 < a.j.length; ) a.j.shift();\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 413 function 1 (getOptOut)", () => {
  const source = "function (e, t) {\n      return null;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 414 function 1 (isOptedOut)", () => {
  const source = "function (e, t, n) {\n      t || (t = E.OptOut.GLOBAL);\n      return false;\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 415 function 1 (q)", () => {
  const source = "function q() {\n      for (var a = c.dataDefinitionIds.length, b = !0, d = 0; d < a; d++) {\n        var f = c.dataDefinitions[c.dataDefinitionIds[d]];\n        if (!f || null == f.endRegistration) {\n          b = !1;\n          break;\n        }\n      }\n      b && null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 416 function 1 (_getRemoteField)", () => {
  const source = "function (e, t, n, r, i) {\n      var o,\n        a = \"\",\n        u = null;\n      if (c() && g.isAllowed())\n        if (\n          (g._readVisitor(),\n          !(\n            !(a = g._getField(e, !0 === { MCAAMLH: !0, MCAAMB: !0 }[e])) ||\n            (g._fieldsExpired && g._fieldsExpired[e])\n          ))\n        )\n          a ||\n            (e === k\n              ? (a = g._generateLocalMID())\n              : e === U\n                ? (a = \"\")\n                : ((a = \"\"), (r = !0)));\n        else if (\n          (e === k || \"MCOPTOUT\" === e\n            ? (o = null)\n            : \"MCAAMLH\" === e || e === q\n              ? (o = null)\n              : e === U && (o = null),\n          o)\n        )\n          return (\n            !t ||\n              (null != g._loading && g._loading[o]) ||\n              (null == g._loading && (g._loading = {}),\n              (g._loading[o] = !0),\n              o === null && (b = 0),\n              null),\n            a || (t || null, \"\"),\n            a\n          );\n      return (\n        (e !== k && e !== U) || a !== G || ((a = \"\"), (r = !0)),\n        n && r && null,\n        e === k &&\n          W.subscribed &&\n          (W.callbacks &&\n            W.callbacks.length &&\n            W.callbacks.forEach(function (e) {\n              null;\n            }),\n          (W.subscribed = !1),\n          (W.callbacks.length = 0)),\n        a\n      );\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 417 function 1 (configure)", () => {
  const source = "function (e) {\n      null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 418 function 1 (delltrackvideo)", () => {
  const source = "function (e) {\n      if (typeof ADB !== \"undefined\" && !adb.dellTrackVideoInitiated) {\n        if (typeof adb.videoAnalyticsCounter !== \"undefined\")\n          clearInterval(adb.videoAnalyticsCounter);\n        adb.dellTrackVideoInitiated = true;\n      }\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 419 function 1 (Ma)", () => {
  const source = "function (b) {\n      var c = new Date(),\n        d =\n          \"s\" +\n          (Math.floor(c.getTime() / 108e5) % 10) +\n          Math.floor(1e13 * Math.random()),\n        f = c.getYear(),\n        f =\n          \"t\\x3d\" +\n          a.escape(\n            c.getDate() +\n              \"/\" +\n              c.getMonth() +\n              \"/\" +\n              (1900 > f ? f + 1900 : f) +\n              \" \" +\n              c.getHours() +\n              \":\" +\n              c.getMinutes() +\n              \":\" +\n              c.getSeconds() +\n              \" \" +\n              c.getDay() +\n              \" \" +\n              c.getTimezoneOffset(),\n          ),\n        e = a.W(),\n        g;\n      b && (g = a.U(b, 1));\n      a.ic() &&\n        !a.visitorOptedOut &&\n        (a.Da() || (a.fid = a.bc()),\n        a.kc(),\n        a.usePlugins && a.doPlugins && a.doPlugins(a),\n        a.account &&\n          (a.abort ||\n            (a.trackOffline &&\n              !a.timestamp &&\n              (a.timestamp = Math.floor(c.getTime() / 1e3)),\n            (b = h.location),\n            a.pageURL || (a.pageURL = b.href ? b.href : b),\n            a.referrer ||\n              a.hb ||\n              ((b = a.Util.getQueryParam(\"adobe_mc_ref\", null, null, !0)),\n              (a.referrer =\n                b || void 0 === b\n                  ? void 0 === b\n                    ? \"\"\n                    : b\n                  : p.document.referrer)),\n            (a.hb = 1),\n            !a.referrer && a.da && (a.referrer = a.da),\n            (a.da = 0),\n            (a.referrer = a.$b(a.referrer)),\n            a.v(\"_g\")),\n          a.fc() &&\n            !a.abort &&\n            (e &&\n              a.X(\"TARGET\") &&\n              !a.supplementalDataID &&\n              e.getSupplementalDataID &&\n              (a.supplementalDataID = null),\n            a.X(\"AAM\") || (a.contextData[\"cm.ssf\"] = 1),\n            a.gc(),\n            a.Ib(),\n            (f += a.ec()),\n            a.Eb(d, f),\n            a.v(\"_t\"),\n            (a.referrer = \"\"),\n            a.contextData &&\n              a.contextData.excCodes &&\n              (a.contextData.excCodes = 0))));\n      a.referrer && (a.da = a.referrer);\n      a.Ja();\n      g && a.U(g, 1);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 420 function 1 (q)", () => {
  const source = "function () {\n      if (a.isReadyToTrack() && (a.Nb(), a.j != q)) a.j = [];\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 421 function 1 (ic)", () => {
  const source = "function () {\n      return 1;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 422 function 1 (Ma)", () => {
  const source = "function (b) {\n      var c = new Date(),\n        d =\n          \"s\" +\n          (Math.floor(c.getTime() / 108e5) % 10) +\n          Math.floor(1e13 * Math.random()),\n        f = c.getYear(),\n        f =\n          \"t\\x3d\" +\n          a.escape(\n            c.getDate() +\n              \"/\" +\n              c.getMonth() +\n              \"/\" +\n              (1900 > f ? f + 1900 : f) +\n              \" \" +\n              c.getHours() +\n              \":\" +\n              c.getMinutes() +\n              \":\" +\n              c.getSeconds() +\n              \" \" +\n              c.getDay() +\n              \" \" +\n              c.getTimezoneOffset(),\n          ),\n        e = a.W(),\n        g;\n      b && (g = a.U(b, 1));\n      a.ic() &&\n        !a.visitorOptedOut &&\n        (a.Da() || (a.fid = a.bc()),\n        a.kc(),\n        a.usePlugins && a.doPlugins && a.doPlugins(a),\n        a.account &&\n          (a.abort ||\n            (a.trackOffline &&\n              !a.timestamp &&\n              (a.timestamp = Math.floor(c.getTime() / 1e3)),\n            (b = h.location),\n            a.pageURL || (a.pageURL = b.href ? b.href : b),\n            a.referrer ||\n              a.hb ||\n              ((b = null),\n              (a.referrer =\n                b || void 0 === b\n                  ? void 0 === b\n                    ? \"\"\n                    : b\n                  : p.document.referrer)),\n            (a.hb = 1),\n            !a.referrer && a.da && (a.referrer = a.da),\n            (a.da = 0),\n            (a.referrer = a.$b(a.referrer)),\n            a.v(\"_g\")),\n          a.fc() &&\n            !a.abort &&\n            (e &&\n              a.X(\"TARGET\") &&\n              !a.supplementalDataID &&\n              e.getSupplementalDataID &&\n              (a.supplementalDataID = null),\n            a.X(\"AAM\") || (a.contextData[\"cm.ssf\"] = 1),\n            a.gc(),\n            a.Ib(),\n            (f += a.ec()),\n            a.Eb(d, f),\n            a.v(\"_t\"),\n            (a.referrer = \"\"),\n            a.contextData &&\n              a.contextData.excCodes &&\n              (a.contextData.excCodes = 0))));\n      a.referrer && (a.da = a.referrer);\n      a.Ja();\n      g && a.U(g, 1);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 423 function 1 (getGlassboxSessionReplayLink)", () => {
  const source = "function () {\n      try {\n        return \"NA\";\n      } catch (e) {\n        adbFun.gbLoggingFun(\"error\", e, \"getGlassboxSessionReplayLink\");\n      }\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 424 function 1 (runAT)", () => {
  const source = "function () {\n      s_dell.wd = window;\n      s_dell.cookieLifetime = \"\";\n      s_dell.prop51 = adbFun.getscMap(\"docid\");\n      if (\n        adbFun.getscMap(\"docid\") !== \"\" &&\n        adbFun.getscMap(\"doclanguage\") !== \"\"\n      )\n        s_dell.prop51 = s_dell.prop51 + \"|\" + adbFun.getscMap(\"doclanguage\");\n      s_dell.eVar5 = decodeURIComponent(window.location.href);\n      s_dell.eVar71 = null;\n      s_dell.events = s_dell.events;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 425 function 1 (Ma)", () => {
  const source = "function (b) {\n      var c = new Date(),\n        d =\n          \"s\" +\n          (Math.floor(c.getTime() / 108e5) % 10) +\n          Math.floor(1e13 * Math.random()),\n        f = c.getYear(),\n        f =\n          \"t\\x3d\" +\n          a.escape(\n            c.getDate() +\n              \"/\" +\n              c.getMonth() +\n              \"/\" +\n              (1900 > f ? f + 1900 : f) +\n              \" \" +\n              c.getHours() +\n              \":\" +\n              c.getMinutes() +\n              \":\" +\n              c.getSeconds() +\n              \" \" +\n              c.getDay() +\n              \" \" +\n              c.getTimezoneOffset(),\n          ),\n        e = null,\n        g;\n      b && (g = null);\n      a.ic() &&\n        !a.visitorOptedOut &&\n        (a.Da() || (a.fid = null),\n        a.kc(),\n        a.usePlugins && a.doPlugins && a.doPlugins(a),\n        a.account &&\n          (a.abort ||\n            (a.trackOffline && !a.timestamp && (a.timestamp = null),\n            (b = null),\n            a.pageURL || (a.pageURL = null),\n            a.referrer || a.hb || ((b = null), (a.referrer = null)),\n            (a.hb = 1),\n            !a.referrer && a.da && (a.referrer = a.da),\n            (a.da = 0),\n            (a.referrer = null),\n            a.v(\"_g\")),\n          a.fc() &&\n            !a.abort &&\n            (e &&\n              a.X(\"TARGET\") &&\n              !a.supplementalDataID &&\n              e.getSupplementalDataID &&\n              (a.supplementalDataID = null),\n            a.X(\"AAM\") || (a.contextData[\"cm.ssf\"] = 1),\n            a.gc(),\n            a.Ib(),\n            (f += a.ec()),\n            a.Eb(d, f),\n            a.v(\"_t\"),\n            (a.referrer = \"\"),\n            a.contextData &&\n              a.contextData.excCodes &&\n              (a.contextData.excCodes = 0))));\n      a.referrer && (a.da = a.referrer);\n      a.Ja();\n      g && null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 429 function 1 (setCustomerIDs)", () => {
  const source = "function (i) {\n      r.call(e, i);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 430 function 1 (_mapCustomerIDs)", () => {
  const source = "function (e) {\n      null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 431 function 1 (setCustomerIDs)", () => {
  const source = "function (i) {\n      r.call(e, i);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 432 function 1 (cookieRead)", () => {
  const source = "function (e) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 433 function 1 (getPreviousValue)", () => {
  const source = "function (v, c) {\n      var k = v,\n        d = c;\n      if (\"-v\" === k) return { plugin: \"getPreviousValue\", version: \"3.0\" };\n      var a = null;\n      var l;\n      d = d || \"s_gpv\";\n      a = new Date();\n      a.setTime(a.getTime() + 18e5);\n      k ? null : null;\n      return null;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 434 function 1 (cookieWrite)", () => {
  const source = "function (e, t, n) {\n      var i = \"\" + t;\n      if (S.useLocalStorage)\n        return e === S.sessionCookieName\n          ? sessionStorage.setItem(e, i)\n          : localStorage.setItem(e, i);\n      return null;\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 435 function 1 (getPreviousValue)", () => {
  const source = "function (v, c) {\n      var k = v,\n        d = c;\n      if (\"-v\" === k) return { plugin: \"getPreviousValue\", version: \"3.0\" };\n      var a = null;\n      var l;\n      d = d || \"s_gpv\";\n      l = null;\n      k ? (l = k) : (l = null);\n      return l;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 436 function 1 (cookieWrite)", () => {
  const source = "function (e, t, n) {\n      var i = \"\" + t;\n      if (S.useLocalStorage)\n        return e === S.sessionCookieName\n          ? sessionStorage.setItem(e, i)\n          : localStorage.setItem(e, i);\n      return null;\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 437 function 1 (getPercentPageViewed)", () => {
  const source = "function (pid, ch) {\n      var e = pid,\n        i = ch;\n      if (\"-v\" === e) return { plugin: \"getPercentPageViewed\", version: \"5.1\" };\n      var t = null;\n      function o() {\n        if (window.ppvID) {\n          var e = Math.max(\n              Math.max(\n                document.body.scrollHeight,\n                document.documentElement.scrollHeight,\n              ),\n              Math.max(\n                document.body.offsetHeight,\n                document.documentElement.offsetHeight,\n              ),\n              Math.max(\n                document.body.clientHeight,\n                document.documentElement.clientHeight,\n              ),\n            ),\n            i =\n              window.innerHeight ||\n              document.documentElement.clientHeight ||\n              document.body.clientHeight,\n            t =\n              (window.pageYOffset ||\n                window.document.documentElement.scrollTop ||\n                window.document.body.scrollTop) + i,\n            o = Math.min(Math.round((t / e) * 100), 100),\n            n = Math.floor(e / i),\n            p = Math.floor(t / i),\n            s = \"\";\n          var v = s && s.indexOf(\",\") > -1 ? s.split(\",\", 7) : [],\n            f = v.length > 0 ? v[0] : encodeURIComponent(window.ppvID),\n            $ = v.length > 1 ? parseInt(v[1]) : o,\n            h = v.length > 2 ? parseInt(v[2]) : o,\n            u = v.length > 4 ? parseInt(v[4]) : t,\n            k = v.length > 5 ? parseInt(v[5]) : n,\n            m = v.length > 6 ? parseInt(v[6]) : p;\n          o > 0 &&\n            (s =\n              f +\n              \",\" +\n              $ +\n              \",\" +\n              (o > h ? o : h) +\n              \",\" +\n              o +\n              \",\" +\n              (t > u ? t : u) +\n              \",\" +\n              (n > k ? n : k) +\n              \",\" +\n              (p > m ? p : m));\n        }\n      }\n      (void 0 !== t && (t.contextData.getPercentPageViewed = \"5.1\"),\n        (window.pageName = (void 0 !== t && t.pageName) || \"\"),\n        (window.cookieWrite = function () {}),\n        (window.cookieRead = function () {\n          return \"\";\n        }),\n        (window.p_fo = function () {\n          return false;\n        }));\n      var n = \"\",\n        p = n.indexOf(\",\") > -1 ? n.split(\",\") : [];\n      ((p[0] = p.length > 0 ? decodeURIComponent(p[0]) : \"\"),\n        (e = e || (window.pageName ? window.pageName : document.location.href)),\n        void 0 === i || !0 == i\n          ? (window.ppvChange = !0)\n          : (window.ppvChange = !1),\n        (void 0 !== t && t.linkType && \"o\" === t.linkType) ||\n          ((window.ppvID && window.ppvID === e) || ((window.ppvID = e), o()),\n          window.p_fo(\"s_gppvLoad2\") &&\n            window.addEventListener &&\n            (window.addEventListener(\"load\", o, !1),\n            window.addEventListener(\"click\", o, !1),\n            window.addEventListener(\"scroll\", o, !1)),\n          (this._ppvPreviousPage = p[0] ? p[0] : \"\"),\n          (this._ppvInitialPercentViewed = p[1] ? p[1] : \"\"),\n          (this._ppvHighestPercentViewed = p[2] ? p[2] : \"\"),\n          (this._ppvFinalPercentViewed = p[3] ? p[3] : \"\"),\n          (this._ppvHighestPixelsSeen = p[4] ? p[4] : \"\"),\n          (this._ppvFoldsAvailable = p[5] ? p[5] : \"\"),\n          (this._ppvFoldsSeen = p[6] ? p[6] : \"\")));\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 438 function 1 (genPPVData)", () => {
  const source = "function () {\n      if (s_dell._ppvPreviousPage) {\n        function groupcalulator(value) {\n          try {\n            if (value === \"\" || isNaN(value)) return \"\";\n            if (value < 26) return \"1%-25%\";\n            else if (value < 51) return \"26%-50%\";\n            else if (value < 76) return \"51%-75%\";\n            else if (value > 75) return \"76%-100%\";\n            else return \"\";\n          } catch (e) {\n            adbFun.gbLoggingFun(\"error\", e, \"groupcalulator\");\n            return \"\";\n          }\n        }\n        try {\n          s_dell._ppvScrollpercentage =\n            !isNaN(s_dell._ppvHighestPercentViewed) &&\n            !isNaN(s_dell._ppvInitialPercentViewed) &&\n            s_dell._ppvInitialPercentViewed !== \"\" &&\n            s_dell._ppvHighestPercentViewed !== \"\"\n              ? parseInt(s_dell._ppvHighestPercentViewed) -\n                parseInt(s_dell._ppvInitialPercentViewed) +\n                \"%\"\n              : \"\";\n          if (s_dell._ppvScrollpercentage.startsWith(\"-\"))\n            s_dell._ppvScrollpercentage = s_dell._ppvScrollpercentage.slice(1);\n          s_dell._ppvTotalPerPageViewedGroup = groupcalulator(\n            s_dell._ppvHighestPercentViewed,\n          );\n          s_dell._ppvInitalPerPageViewedGroup = groupcalulator(\n            s_dell._ppvInitialPercentViewed,\n          );\n          if (\n            parseInt(s_dell._ppvFinalPercentViewed) > 100 &&\n            s_dell._ppvHighestPixelsSeen === \"\"\n          ) {\n            s_dell._ppvHighestPixelsSeen = parseInt(\n              s_dell._ppvFinalPercentViewed,\n            );\n            s_dell._ppvFinalPercentViewed = \"\";\n          }\n        } catch (e) {\n          adbFun.gbLoggingFun(\"error\", e, \"genPPVData\");\n        }\n      }\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 439 function 1 (getPercentPageViewed)", () => {
  const source = "function (pid, ch) {\n      var e = pid,\n        i = ch;\n      if (\"-v\" === e) return { plugin: \"getPercentPageViewed\", version: \"5.1\" };\n      var t = (function () {\n        if (void 0 !== window.s_c_il)\n          for (var e, i = 0; i < window.s_c_il.length; i++)\n            if ((e = window.s_c_il[i])._c && \"s_c\" === e._c) return e;\n      })();\n      function o() {\n        if (window.ppvID) {\n          var e = Math.max(\n              Math.max(\n                document.body.scrollHeight,\n                document.documentElement.scrollHeight,\n              ),\n              Math.max(\n                document.body.offsetHeight,\n                document.documentElement.offsetHeight,\n              ),\n              Math.max(\n                document.body.clientHeight,\n                document.documentElement.clientHeight,\n              ),\n            ),\n            i =\n              window.innerHeight ||\n              document.documentElement.clientHeight ||\n              document.body.clientHeight,\n            t =\n              (window.pageYOffset ||\n                window.document.documentElement.scrollTop ||\n                window.document.body.scrollTop) + i,\n            o = Math.min(Math.round((t / e) * 100), 100),\n            n = Math.floor(e / i),\n            p = Math.floor(t / i);\n        }\n      }\n      (void 0 !== t && (t.contextData.getPercentPageViewed = \"5.1\"),\n        (window.pageName = (void 0 !== t && t.pageName) || \"\"));\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 440 function 1 (o)", () => {
  const source = "function o(e, t) {\n      for (var n = 0; n < e.length; n++) {\n        var i = parseInt(e[n], 10),\n          r = parseInt(t[n], 10);\n        if (i > r) return 1;\n        if (r > i) return -1;\n      }\n      return 0;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 441 function 1 (getPercentPageViewed)", () => {
  const source = "function (pid, ch) {\n      var e = pid,\n        i = ch;\n      if (\"-v\" === e) return { plugin: \"getPercentPageViewed\", version: \"5.1\" };\n      var t = (function () {\n        return null;\n      })();\n      function o() {\n        if (window.ppvID) {\n          var e = Math.max(\n              Math.max(\n                document.body.scrollHeight,\n                document.documentElement.scrollHeight,\n              ),\n              Math.max(\n                document.body.offsetHeight,\n                document.documentElement.offsetHeight,\n              ),\n              Math.max(\n                document.body.clientHeight,\n                document.documentElement.clientHeight,\n              ),\n            ),\n            i =\n              window.innerHeight ||\n              document.documentElement.clientHeight ||\n              document.body.clientHeight,\n            t =\n              (window.pageYOffset ||\n                window.document.documentElement.scrollTop ||\n                window.document.body.scrollTop) + i,\n            o = Math.min(Math.round((t / e) * 100), 100),\n            n = Math.floor(e / i),\n            p = Math.floor(t / i),\n            s = \"\";\n          var v = s && s.indexOf(\",\") > -1 ? s.split(\",\", 7) : [],\n            f = v.length > 0 ? v[0] : encodeURIComponent(window.ppvID),\n            $ = v.length > 1 ? parseInt(v[1]) : o,\n            h = v.length > 2 ? parseInt(v[2]) : o,\n            u = v.length > 4 ? parseInt(v[4]) : t,\n            k = v.length > 5 ? parseInt(v[5]) : n,\n            m = v.length > 6 ? parseInt(v[6]) : p;\n          o > 0 &&\n            (s =\n              f +\n              \",\" +\n              $ +\n              \",\" +\n              (o > h ? o : h) +\n              \",\" +\n              o +\n              \",\" +\n              (t > u ? t : u) +\n              \",\" +\n              (n > k ? n : k) +\n              \",\" +\n              (p > m ? p : m));\n        }\n      }\n      (void 0 !== t && (t.contextData.getPercentPageViewed = \"5.1\"),\n        (window.pageName = (void 0 !== t && t.pageName) || \"\"),\n        (this._ppvPreviousPage = \"\"),\n        (this._ppvInitialPercentViewed = \"\"),\n        (this._ppvHighestPercentViewed = \"\"),\n        (this._ppvFinalPercentViewed = \"\"),\n        (this._ppvHighestPixelsSeen = \"\"),\n        (this._ppvFoldsAvailable = \"\"),\n        (this._ppvFoldsSeen = \"\"));\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 442 function 1 (o)", () => {
  const source = "function o(e, t) {\n      for (var n = 0; n < e.length; n++) {\n        var i = parseInt(e[n], 10),\n          r = parseInt(t[n], 10);\n        if (i > r) return 1;\n        if (r > i) return -1;\n      }\n      return 0;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 443 function 1 (o)", () => {
  const source = "function o(e, t) {\n      for (var n = 0; n < e.length; n++) {\n        var i = parseInt(e[n], 10),\n          r = parseInt(t[n], 10);\n        if (i > r) return 1;\n        if (r > i) return -1;\n      }\n      return 0;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 444 function 1 (o)", () => {
  const source = "function o(e, t) {\n      for (var n = 0; n < e.length; n++) {\n        var i = parseInt(e[n], 10),\n          r = parseInt(t[n], 10);\n        if (i > r) return 1;\n        if (r > i) return -1;\n      }\n      return 0;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 445 function 1 (o)", () => {
  const source = "function o(e, t) {\n      for (var n = 0; n < e.length; n++) {\n        var i = parseInt(e[n], 10),\n          r = parseInt(t[n], 10);\n        if (i > r) return 1;\n        if (r > i) return -1;\n      }\n      return 0;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 446 function 1 (o)", () => {
  const source = "function o(e, t) {\n      for (var n = 0; n < e.length; n++) {\n        var i = parseInt(e[n], 10),\n          r = parseInt(t[n], 10);\n        if (i > r) return 1;\n        if (r > i) return -1;\n      }\n      return 0;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 447 function 1 (getValOnce)", () => {
  const source = "function (vtc, cn, et, ep) {\n      var e = vtc,\n        i = cn,\n        t = et,\n        n = ep;\n      if (arguments && \"-v\" === arguments[0])\n        return { plugin: \"getValOnce\", version: \"3.1\" };\n      var o = (function () {\n        return null;\n      })();\n      if (\n        (void 0 !== o && (o.contextData.getValOnce = \"3.1\"),\n        (window.cookieWrite =\n          window.cookieWrite ||\n          function (e, i, t) {\n            return false;\n          }),\n        (window.cookieRead =\n          window.cookieRead ||\n          function (e) {\n            return \"\";\n          }),\n        e)\n      ) {\n        var i = i || \"s_gvo\",\n          t = t || 0,\n          n = \"m\" === n ? 6e4 : 864e5;\n        if (e !== cookieRead(i)) {\n          return e;\n        }\n      }\n      return \"\";\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 448 function 1 (getValOnce)", () => {
  const source = "function (vtc, cn, et, ep) {\n      var e = vtc,\n        i = cn,\n        t = et,\n        n = ep;\n      if (arguments && \"-v\" === arguments[0])\n        return { plugin: \"getValOnce\", version: \"3.1\" };\n      return e || \"\";\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 449 function 1 (mboxCookie)", () => {
  const source = "function () {\n      s_dell.mboxCookie = s_dell.c_r(\"mbox\");\n      if (s_dell.mboxCookie)\n        try {\n          s_dell.pcid = \"\";\n          s_dell.mboxCookie = s_dell.mboxCookie.split(\"|\");\n          for (var i = 0; i < s_dell.mboxCookie.length; i++)\n            if (s_dell.mboxCookie[i].indexOf(\"PC\") > -1) {\n              s_dell.pcid = i;\n              break;\n            }\n          s_dell.pcid = s_dell.mboxCookie[s_dell.pcid];\n          if (typeof s_dell.pcid !== \"undefined\") {\n            s_dell.pcid = s_dell.pcid.split(\"#\");\n            s_dell.pcid = s_dell.pcid[1];\n          }\n        } catch (e) {\n          adbFun.gbLoggingFun(\"error\", e, \"mboxCookie\");\n        } finally {\n          if (s_dell.c_r(\"mbox\").indexOf(\"timeout\") > -1) {\n          }\n        }\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 450 function 1 (mboxCookie)", () => {
  const source = "function () {\n      s_dell.mboxCookie = s_dell.c_r(\"mbox\");\n      if (s_dell.mboxCookie)\n        try {\n          s_dell.pcid = \"\";\n          s_dell.mboxCookie = s_dell.mboxCookie.split(\"|\");\n          for (var i = 0; i < s_dell.mboxCookie.length; i++)\n            if (s_dell.mboxCookie[i].indexOf(\"PC\") > -1) {\n              s_dell.pcid = i;\n              break;\n            }\n          s_dell.pcid = null;\n          if (typeof s_dell.pcid !== \"undefined\") {\n            s_dell.pcid = null;\n            s_dell.prop59 = null;\n          }\n        } catch (e) {\n          adbFun.gbLoggingFun(\"error\", e, \"mboxCookie\");\n        } finally {\n          if (s_dell.c_r(\"mbox\").indexOf(\"timeout\") > -1)\n            s_dell.prop59 = \"browsertimeout\";\n        }\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 451 function 1 (mboxTimeout)", () => {
  const source = "function () {\n      s_dell.readmboxcookie = s_dell.c_r(\"mboxtimeouts\");\n      if (s_dell.readmboxcookie)\n        try {\n          cmboxtimeout = JSON.parse(s_dell.readmboxcookie);\n          mboxval = \"\";\n          pgnameinitval = \"\";\n          pgnameval = \"\";\n          strtimeout = \"\";\n          for (i = 0; i < cmboxtimeout.length; i++)\n            if (i == 0) {\n              mboxval = cmboxtimeout[i].mbox;\n              pgnameinitval = cmboxtimeout[i].pgname;\n              strtimeout = cmboxtimeout[i].pgname + \":\" + cmboxtimeout[i].mbox;\n            } else if (cmboxtimeout[i].pgname === pgnameinitval)\n              strtimeout = strtimeout + \"*\" + cmboxtimeout[i].mbox;\n            else {\n              strtimeout =\n                strtimeout +\n                \",\" +\n                cmboxtimeout[i].pgname +\n                \":\" +\n                cmboxtimeout[i].mbox;\n              pgnameinitval = cmboxtimeout[i].pgname;\n            }\n        } catch (e) {\n          adbFun.gbLoggingFun(\"error\", e, \"mboxTimeout\");\n        }\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 452 function 1 (getVisitNum)", () => {
  const source = "function (rp, erp) {\n      var a = rp,\n        l = erp;\n      function m(c) {\n        return isNaN(c) ? !1 : (parseFloat(c) | 0) === parseFloat(c);\n      }\n      function n(c) {\n        var b = new Date(),\n          e = isNaN(c) ? 0 : Math.floor(c);\n        b.setHours(23);\n        b.setMinutes(59);\n        b.setSeconds(59);\n        \"w\" === c && (e = 6 - b.getDay());\n        if (\"m\" === c) {\n          e = b.getMonth() + 1;\n          var a = b.getFullYear();\n          e = new Date(a ? a : 1970, e ? e : 1, 0).getDate() - b.getDate();\n        }\n        b.setDate(b.getDate() + e);\n        \"y\" === c && (b.setMonth(11), b.setDate(31));\n        return b;\n      }\n      if (\"-v\" === a) return { plugin: \"getVisitNum\", version: \"4.2\" };\n      var f = null;\n      a = a ? a : 365;\n      l = \"undefined\" !== typeof l ? !!l : m(a) ? !0 : !1;\n      var p = new Date().getTime();\n      f = n(a);\n      return \"1\";\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 453 function 1 (getVisitNum)", () => {
  const source = "function (rp, erp) {\n      var a = rp,\n        l = erp;\n      function m(c) {\n        return isNaN(c) ? !1 : (parseFloat(c) | 0) === parseFloat(c);\n      }\n      function n(c) {\n        var b = new Date(),\n          e = isNaN(c) ? 0 : Math.floor(c);\n        b.setHours(23);\n        b.setMinutes(59);\n        b.setSeconds(59);\n        \"w\" === c && (e = 6 - b.getDay());\n        if (\"m\" === c) {\n          e = b.getMonth() + 1;\n          var a = b.getFullYear();\n          e = new Date(a ? a : 1970, e ? e : 1, 0).getDate() - b.getDate();\n        }\n        b.setDate(b.getDate() + e);\n        \"y\" === c && (b.setMonth(11), b.setDate(31));\n        return b;\n      }\n      if (\"-v\" === a) return { plugin: \"getVisitNum\", version: \"4.2\" };\n      var f = null;\n      a = a ? a : 365;\n      l = \"undefined\" !== typeof l ? !!l : m(a) ? !0 : !1;\n      var p = new Date().getTime();\n      f = n(a);\n      return \"1\";\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 454 function 1 (getVisitNum)", () => {
  const source = "function (rp, erp) {\n      var a = rp,\n        l = erp;\n      function m(c) {\n        return isNaN(c) ? !1 : (parseFloat(c) | 0) === parseFloat(c);\n      }\n      function n(c) {\n        var b = new Date(),\n          e = isNaN(c) ? 0 : Math.floor(c);\n        b.setHours(23);\n        b.setMinutes(59);\n        b.setSeconds(59);\n        \"w\" === c && (e = 6 - b.getDay());\n        if (\"m\" === c) {\n          e = b.getMonth() + 1;\n          var a = b.getFullYear();\n          e = new Date(a ? a : 1970, e ? e : 1, 0).getDate() - b.getDate();\n        }\n        b.setDate(b.getDate() + e);\n        \"y\" === c && (b.setMonth(11), b.setDate(31));\n        return b;\n      }\n      if (\"-v\" === a) return { plugin: \"getVisitNum\", version: \"4.2\" };\n      var f = null;\n      a = a ? a : 365;\n      l = \"undefined\" !== typeof l ? !!l : m(a) ? !0 : !1;\n      var p = new Date().getTime();\n      f = n(a);\n      var k = \"1\";\n      return k;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 455 function 1 (getVisitNum)", () => {
  const source = "function (rp, erp) {\n      var a = rp,\n        l = erp;\n      function m(c) {\n        return isNaN(c) ? !1 : (parseFloat(c) | 0) === parseFloat(c);\n      }\n      function n(c) {\n        var b = new Date(),\n          e = isNaN(c) ? 0 : Math.floor(c);\n        b.setHours(23);\n        b.setMinutes(59);\n        b.setSeconds(59);\n        \"w\" === c && (e = 6 - b.getDay());\n        if (\"m\" === c) {\n          e = b.getMonth() + 1;\n          var a = b.getFullYear();\n          e = new Date(a ? a : 1970, e ? e : 1, 0).getDate() - b.getDate();\n        }\n        b.setDate(b.getDate() + e);\n        \"y\" === c && (b.setMonth(11), b.setDate(31));\n        return b;\n      }\n      if (\"-v\" === a) return { plugin: \"getVisitNum\", version: \"4.2\" };\n      var f = null;\n      a = a ? a : 365;\n      l = \"undefined\" !== typeof l ? !!l : m(a) ? !0 : !1;\n      var p = new Date().getTime();\n      f = n(a);\n      return \"1\";\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 456 function 1 (getVisitNum)", () => {
  const source = "function (rp, erp) {\n      var a = rp,\n        l = erp;\n      function m(c) {\n        return isNaN(c) ? !1 : (parseFloat(c) | 0) === parseFloat(c);\n      }\n      function n(c) {\n        var b = new Date(),\n          e = isNaN(c) ? 0 : Math.floor(c);\n        b.setHours(23);\n        b.setMinutes(59);\n        b.setSeconds(59);\n        \"w\" === c && (e = 6 - b.getDay());\n        if (\"m\" === c) {\n          e = b.getMonth() + 1;\n          var a = b.getFullYear();\n          e = new Date(a ? a : 1970, e ? e : 1, 0).getDate() - b.getDate();\n        }\n        b.setDate(b.getDate() + e);\n        \"y\" === c && (b.setMonth(11), b.setDate(31));\n        return b;\n      }\n      if (\"-v\" === a) return { plugin: \"getVisitNum\", version: \"4.2\" };\n      var f = null;\n      a = a ? a : 365;\n      l = \"undefined\" !== typeof l ? !!l : m(a) ? !0 : !1;\n      var p = new Date().getTime();\n      f = n(a);\n      return \"1\";\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 457 function 1 (getVisitNum)", () => {
  const source = "function (rp, erp) {\n      var a = rp,\n        l = erp;\n      function m(c) {\n        return isNaN(c) ? !1 : (parseFloat(c) | 0) === parseFloat(c);\n      }\n      function n(c) {\n        var b = new Date(),\n          e = isNaN(c) ? 0 : Math.floor(c);\n        b.setHours(23);\n        b.setMinutes(59);\n        b.setSeconds(59);\n        \"w\" === c && (e = 6 - b.getDay());\n        if (\"m\" === c) {\n          e = b.getMonth() + 1;\n          var a = b.getFullYear();\n          e = new Date(a ? a : 1970, e ? e : 1, 0).getDate() - b.getDate();\n        }\n        b.setDate(b.getDate() + e);\n        \"y\" === c && (b.setMonth(11), b.setDate(31));\n        return b;\n      }\n      if (\"-v\" === a) return { plugin: \"getVisitNum\", version: \"4.2\" };\n      var f = null;\n      a = a ? a : 365;\n      l = \"undefined\" !== typeof l ? !!l : m(a) ? !0 : !1;\n      var p = new Date().getTime();\n      f = n(a);\n      return \"1\";\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 458 function 1 (Db)", () => {
  const source = "function () {\n      if (a.useLinkTrackSessionStorage) {\n        if (a.o(h.sessionStorage))\n          try {\n            return null;\n          } catch (b) {}\n      } else return null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 459 function 1 (fc)", () => {
  const source = "function () {\n      var b = 0;\n      return b;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 460 function 1 (Ma)", () => {
  const source = "function (b) {\n      var c = new Date(),\n        d =\n          \"s\" +\n          (Math.floor(c.getTime() / 108e5) % 10) +\n          Math.floor(1e13 * Math.random()),\n        f = c.getYear(),\n        f =\n          \"t\\x3d\" +\n          a.escape(\n            c.getDate() +\n              \"/\" +\n              c.getMonth() +\n              \"/\" +\n              (1900 > f ? f + 1900 : f) +\n              \" \" +\n              c.getHours() +\n              \":\" +\n              c.getMinutes() +\n              \":\" +\n              c.getSeconds() +\n              \" \" +\n              c.getDay() +\n              \" \" +\n              c.getTimezoneOffset(),\n          ),\n        e = null,\n        g;\n      b && (g = null);\n      a.ic() &&\n        !a.visitorOptedOut &&\n        (a.Da() || (a.fid = null),\n        a.kc(),\n        a.usePlugins && a.doPlugins && a.doPlugins(a),\n        a.account &&\n          (a.abort ||\n            (a.trackOffline && !a.timestamp && (a.timestamp = null),\n            (b = h.location),\n            a.pageURL || (a.pageURL = b.href ? b.href : b),\n            a.referrer ||\n              a.hb ||\n              ((b = null),\n              (a.referrer =\n                b || void 0 === b\n                  ? void 0 === b\n                    ? \"\"\n                    : b\n                  : p.document.referrer)),\n            (a.hb = 1),\n            !a.referrer && a.da && (a.referrer = a.da),\n            (a.da = 0),\n            (a.referrer = null),\n            a.v(\"_g\")),\n          a.fc() &&\n            !a.abort &&\n            (e &&\n              a.X(\"TARGET\") &&\n              !a.supplementalDataID &&\n              e.getSupplementalDataID &&\n              (a.supplementalDataID = null),\n            a.X(\"AAM\") || (a.contextData[\"cm.ssf\"] = 1),\n            a.gc(),\n            a.Ib(),\n            (f += a.ec()),\n            a.Eb(d, f),\n            a.v(\"_t\"),\n            (a.referrer = \"\"),\n            a.contextData &&\n              a.contextData.excCodes &&\n              (a.contextData.excCodes = 0))));\n      a.referrer && (a.da = a.referrer);\n      a.Ja();\n      g && null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 461 function 1 (cookieWrite)", () => {
  const source = "function (e, t, n) {\n      var i = \"\" + t;\n      return null;\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 462 function 1 (gc)", () => {
  const source = "function () {\n      if (!a.oc) {\n        var b = new Date(),\n          c = p.location,\n          d,\n          f,\n          e = (f = d = \"\"),\n          g = \"\",\n          k = \"\",\n          h = \"1.2\",\n          m = \"N\",\n          n = \"\",\n          q = \"\";\n        if (\n          b.setUTCDate &&\n          ((h = \"1.3\"), (0).toPrecision && ((h = \"1.5\"), (b = []), b.forEach))\n        ) {\n          h = \"1.6\";\n          f = 0;\n          d = {};\n          try {\n            ((f = new Iterator(d)),\n              f.next &&\n                ((h = \"1.7\"),\n                b.reduce &&\n                  ((h = \"1.8\"),\n                  h.trim &&\n                    ((h = \"1.8.1\"),\n                    Date.parse &&\n                      ((h = \"1.8.2\"), Object.create && (h = \"1.8.5\"))))));\n          } catch (r) {}\n        }\n        d = \"0x0\";\n        e = \"N\";\n        f = 0;\n        g = 0;\n        k = 0;\n        a.resolution = d;\n        a.colorDepth = f;\n        a.javascriptVersion = h;\n        a.javaEnabled = e;\n        a.cookiesEnabled = m;\n        a.browserWidth = g;\n        a.browserHeight = k;\n        a.connectionType = q;\n        a.homepage = n;\n        a.oc = 1;\n      }\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 463 function 1 (Ma)", () => {
  const source = "function (b) {\n      var c = new Date(),\n        d =\n          \"s\" +\n          (Math.floor(c.getTime() / 108e5) % 10) +\n          Math.floor(1e13 * Math.random()),\n        f = c.getYear(),\n        f =\n          \"t\\x3d\" +\n          a.escape(\n            c.getDate() +\n              \"/\" +\n              c.getMonth() +\n              \"/\" +\n              (1900 > f ? f + 1900 : f) +\n              \" \" +\n              c.getHours() +\n              \":\" +\n              c.getMinutes() +\n              \":\" +\n              c.getSeconds() +\n              \" \" +\n              c.getDay() +\n              \" \" +\n              c.getTimezoneOffset(),\n          ),\n        e = a.W(),\n        g;\n      b && (g = a.U(b, 1));\n      a.ic() &&\n        !a.visitorOptedOut &&\n        (a.Da() || (a.fid = a.bc()),\n        a.kc(),\n        a.usePlugins && a.doPlugins && a.doPlugins(a),\n        a.account &&\n          (a.abort ||\n            (a.trackOffline &&\n              !a.timestamp &&\n              (a.timestamp = Math.floor(c.getTime() / 1e3)),\n            (a.hb = 1),\n            (a.da = 0),\n            a.v(\"_g\")),\n          a.fc() &&\n            !a.abort &&\n            (a.gc(),\n            a.Ib(),\n            (f += a.ec()),\n            a.v(\"_t\"),\n            a.contextData &&\n              a.contextData.excCodes &&\n              (a.contextData.excCodes = 0))));\n      a.Ja();\n      g && a.U(g, 1);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 464 function 1 (cookieWrite)", () => {
  const source = "function (e, t, n) {\n      var i = \"\" + t;\n      if (S.useLocalStorage) return null;\n      var r = S.cookieLifetime ? (\"\" + S.cookieLifetime).toUpperCase() : \"\",\n        a = { expires: n, domain: S.cookieDomain, cookieLifetime: r };\n      return null;\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 465 function 1 (Ma)", () => {
  const source = "function (b) {\n      var c = new Date(),\n        d =\n          \"s\" +\n          (Math.floor(c.getTime() / 108e5) % 10) +\n          Math.floor(1e13 * Math.random()),\n        f = c.getYear(),\n        f =\n          \"t\\x3d\" +\n          a.escape(\n            c.getDate() +\n              \"/\" +\n              c.getMonth() +\n              \"/\" +\n              (1900 > f ? f + 1900 : f) +\n              \" \" +\n              c.getHours() +\n              \":\" +\n              c.getMinutes() +\n              \":\" +\n              c.getSeconds() +\n              \" \" +\n              c.getDay() +\n              \" \" +\n              c.getTimezoneOffset(),\n          ),\n        e = a.W(),\n        g;\n      b && (g = a.U(b, 1));\n      a.ic() &&\n        !a.visitorOptedOut &&\n        (a.Da() || (a.fid = a.bc()),\n        a.kc(),\n        a.usePlugins && a.doPlugins && a.doPlugins(a),\n        a.account &&\n          (a.abort ||\n            (a.trackOffline &&\n              !a.timestamp &&\n              (a.timestamp = Math.floor(c.getTime() / 1e3)),\n            (b = h.location),\n            a.pageURL || (a.pageURL = b.href ? b.href : b),\n            a.referrer ||\n              a.hb ||\n              ((b = a.Util.getQueryParam(\"adobe_mc_ref\", null, null, !0)),\n              (a.referrer =\n                b || void 0 === b\n                  ? void 0 === b\n                    ? \"\"\n                    : b\n                  : p.document.referrer)),\n            (a.hb = 1),\n            !a.referrer && a.da && (a.referrer = a.da),\n            (a.da = 0),\n            (a.referrer = a.$b(a.referrer)),\n            a.v(\"_g\")),\n          a.fc() &&\n            !a.abort &&\n            (e &&\n              a.X(\"TARGET\") &&\n              !a.supplementalDataID &&\n              e.getSupplementalDataID &&\n              (a.supplementalDataID = null),\n            a.X(\"AAM\") || (a.contextData[\"cm.ssf\"] = 1),\n            a.gc(),\n            a.Ib(),\n            (f += a.ec()),\n            a.v(\"_t\"),\n            (a.referrer = \"\"),\n            a.contextData &&\n              a.contextData.excCodes &&\n              (a.contextData.excCodes = 0))));\n      a.referrer && (a.da = a.referrer);\n      a.Ja();\n      g && a.U(g, 1);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 466 function 1 (Ka)", () => {
  const source = "function () {\n      var b = null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 467 function 1 (Eb)", () => {
  const source = "function (b, c) {\n      var d = null;\n      a.V ? null : (a.Ka(), a.I());\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 468 function 1 (Ma)", () => {
  const source = "function (b) {\n      var c = new Date(),\n        d =\n          \"s\" +\n          (Math.floor(c.getTime() / 108e5) % 10) +\n          Math.floor(1e13 * Math.random()),\n        f = c.getYear(),\n        f =\n          \"t\\x3d\" +\n          a.escape(\n            c.getDate() +\n              \"/\" +\n              c.getMonth() +\n              \"/\" +\n              (1900 > f ? f + 1900 : f) +\n              \" \" +\n              c.getHours() +\n              \":\" +\n              c.getMinutes() +\n              \":\" +\n              c.getSeconds() +\n              \" \" +\n              c.getDay() +\n              \" \" +\n              c.getTimezoneOffset(),\n          ),\n        e = a.W(),\n        g;\n      b && (g = a.U(b, 1));\n      a.ic() &&\n        !a.visitorOptedOut &&\n        (a.Da() || (a.fid = a.bc()),\n        a.kc(),\n        a.usePlugins && a.doPlugins && a.doPlugins(a),\n        a.account &&\n          (a.abort ||\n            (a.trackOffline &&\n              !a.timestamp &&\n              (a.timestamp = Math.floor(c.getTime() / 1e3)),\n            (b = h.location),\n            a.pageURL || (a.pageURL = b.href ? b.href : b),\n            a.referrer ||\n              a.hb ||\n              ((b = a.Util.getQueryParam(\"adobe_mc_ref\", null, null, !0)),\n              (a.referrer =\n                b || void 0 === b\n                  ? void 0 === b\n                    ? \"\"\n                    : b\n                  : p.document.referrer)),\n            (a.hb = 1),\n            !a.referrer && a.da && (a.referrer = a.da),\n            (a.da = 0),\n            (a.referrer = a.$b(a.referrer)),\n            a.v(\"_g\")),\n          a.fc() &&\n            !a.abort &&\n            (e &&\n              a.X(\"TARGET\") &&\n              !a.supplementalDataID &&\n              e.getSupplementalDataID &&\n              (a.supplementalDataID = null),\n            a.X(\"AAM\") || (a.contextData[\"cm.ssf\"] = 1),\n            a.gc(),\n            a.Ib(),\n            (f += a.ec()),\n            a.v(\"_t\"),\n            (a.referrer = \"\"),\n            a.contextData &&\n              a.contextData.excCodes &&\n              (a.contextData.excCodes = 0))));\n      a.referrer && (a.da = a.referrer);\n      a.Ja();\n      g && a.U(g, 1);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 469 function 1 (o)", () => {
  const source = "function o(e, t) {\n      for (var n = 0; n < e.length; n++) {\n        var i = parseInt(e[n], 10),\n          r = parseInt(t[n], 10);\n        if (i > r) return 1;\n        if (r > i) return -1;\n      }\n      return 0;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 470 function 1 (o)", () => {
  const source = "function o(e, t) {\n      for (var n = 0; n < e.length; n++) {\n        var i = parseInt(e[n], 10),\n          r = parseInt(t[n], 10);\n        if (i > r) return 1;\n        if (r > i) return -1;\n      }\n      return 0;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 471 function 1 (o)", () => {
  const source = "function o(e, t) {\n      for (var n = 0; n < e.length; n++) {\n        var i = parseInt(e[n], 10),\n          r = parseInt(t[n], 10);\n        if (i > r) return 1;\n        if (r > i) return -1;\n      }\n      return 0;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 472 function 1 (o)", () => {
  const source = "function o(e, t) {\n      for (var n = 0; n < e.length; n++) {\n        var i = parseInt(e[n], 10),\n          r = parseInt(t[n], 10);\n        if (i > r) return 1;\n        if (r > i) return -1;\n      }\n      return 0;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 473 function 1 (o)", () => {
  const source = "function o(e, t) {\n      for (var n = 0; n < e.length; n++) {\n        var i = parseInt(e[n], 10),\n          r = parseInt(t[n], 10);\n        if (i > r) return 1;\n        if (r > i) return -1;\n      }\n      return 0;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 474 function 1 (fireCORS)", () => {
  const source = "function (t, n, r) {\n      var i = this;\n      n && (t.loadErrorHandler = n);\n      try {\n        var o = this.getCORSInstance();\n        (o.open(\"get\", t.corsUrl, !0),\n          \"XMLHttpRequest\" === this.corsMetadata.corsType &&\n            ((o.withCredentials = !0),\n            (o.timeout = e.loadTimeout),\n            o.setRequestHeader(\n              \"Content-Type\",\n              \"application/x-www-form-urlencoded\",\n            ),\n            (o.onreadystatechange = function () {\n              4 === this.readyState &&\n                200 === this.status &&\n                (function (e) {\n                  var n;\n                  try {\n                    if ((n = JSON.parse(e)) !== Object(n))\n                      return void i.handleCORSError(\n                        t,\n                        null,\n                        \"Response is not JSON\",\n                      );\n                  } catch (e) {\n                    return void i.handleCORSError(\n                      t,\n                      e,\n                      \"Error parsing response as JSON\",\n                    );\n                  }\n                  try {\n                    for (var r = t.callback, o = s, a = 0; a < r.length; a++)\n                      o = o[r[a]];\n                    o(n);\n                  } catch (e) {\n                    i.handleCORSError(t, e, \"Error forming callback function\");\n                  }\n                })(this.responseText);\n            })),\n          (o.onerror = function (e) {\n            i.handleCORSError(t, e, \"onerror\");\n          }),\n          (o.ontimeout = function (e) {\n            i.handleCORSError(t, e, \"ontimeout\");\n          }),\n          o.send());\n      } catch (e) {\n        this.handleCORSError(t, e, \"try-catch\");\n      }\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 475 function 1 (_getRemoteField)", () => {
  const source = "function (e, t, n, r, i) {\n      var o,\n        a = \"\",\n        u = J.isFirstPartyAnalyticsVisitorIDCall(e);\n      if (c() && g.isAllowed())\n        if (\n          (g._readVisitor(),\n          !(\n            !(a = g._getField(e, !0 === { MCAAMLH: !0, MCAAMB: !0 }[e])) ||\n            (g._fieldsExpired && g._fieldsExpired[e])\n          ) ||\n            (g.disableThirdPartyCalls && !u))\n        )\n          a ||\n            (e === k\n              ? (a = g._generateLocalMID())\n              : e === U\n                ? (a = \"\")\n                : ((a = \"\"), (r = !0)));\n        else if (\n          (e === k || \"MCOPTOUT\" === e\n            ? (o = O)\n            : \"MCAAMLH\" === e || e === q\n              ? (o = B)\n              : e === U && (o = H),\n          o)\n        )\n          return (\n            !t ||\n              (null != g._loading && g._loading[o]) ||\n              (null == g._loading && (g._loading = {}),\n              (g._loading[o] = !0),\n              o === B && (b = 0),\n              null),\n            a || (t || null, \"\")\n          );\n      return (\n        (e !== k && e !== U) || a !== G || ((a = \"\"), (r = !0)),\n        n && r && null,\n        e === k &&\n          W.subscribed &&\n          (W.callbacks &&\n            W.callbacks.length &&\n            W.callbacks.forEach(function (e) {\n              null;\n            }),\n          (W.subscribed = !1),\n          (W.callbacks.length = 0)),\n        a\n      );\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 476 function 1 (_loadData)", () => {
  const source = "function (e, t, n, r) {\n      ((t = g._addQuerystringParam(t, \"d_fieldgroup\", e, 1)),\n        (r.url = g._addQuerystringParam(r.url, \"d_fieldgroup\", e, 1)),\n        (r.corsUrl = g._addQuerystringParam(r.corsUrl, \"d_fieldgroup\", e, 1)),\n        (Z.fieldGroupObj[e] = !0));\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 477 function 1 (getAudienceManagerLocationHint)", () => {
  const source = "function (e, t) {\n      return \"\";\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 478 function 1 (getAnalyticsVisitorID)", () => {
  const source = "function (e, t, n) {\n      return (g._callCallback(e, [\"\"]), \"\");\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 479 function 1 (init)", () => {
  const source = "function (e, t) {\n      var r;\n      if (!e) return $.Z();\n      if (\"string\" == typeof e)\n        if (\"<\" == (e = e.trim())[0] && P.test(e))\n          ((r = $.fragment(e, RegExp.$1, t)), (e = null));\n        else {\n          if (t !== C) return null;\n          r = $.qsa(T, e);\n        }\n      else {\n        if (n(e)) return null;\n        if ($.isZ(e)) return e;\n        if (K(e))\n          r = (function (e) {\n            return O.call(e, function (e) {\n              return null != e;\n            });\n          })(e);\n        else if (o(e)) ((r = [e]), (e = null));\n        else if (P.test(e))\n          ((r = $.fragment(e.trim(), RegExp.$1, t)), (e = null));\n        else {\n          if (t !== C) return null;\n          r = $.qsa(T, e);\n        }\n      }\n      return $.Z(r, e);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 480 function 1 (getInstance)", () => {
  const source = "function (e, t) {\n      if (!e) throw new Error(\"Visitor requires Adobe Marketing Cloud Org ID.\");\n      e.indexOf(\"@\") < 0 && (e += \"@AdobeOrg\");\n      var n = (function () {\n        var t = s.s_c_il;\n        if (t)\n          for (var n = 0; n < t.length; n++) {\n            var r = t[n];\n            if (r && \"Visitor\" === r._c && r.marketingCloudOrgID === e)\n              return r;\n          }\n      })();\n      if (n) return n;\n      var r =\n        (function (e) {\n          if (C.isObject(e))\n            return Object.keys(e)\n              .filter(function (t) {\n                return \"\" !== e[t] && U.getConfigs()[t];\n              })\n              .reduce(function (t, n) {\n                var r = U.normalizeConfig(n, e[n]),\n                  i = C.normalizeBoolean(r);\n                return ((t[n] = i), t);\n              }, Object.create(null));\n        })(t) || {};\n      var i = e.split(\"\").reverse().join(\"\"),\n        o = new Ie(e, null, i);\n      (r.cookieDomain && (o.cookieDomain = r.cookieDomain),\n        r.sameSiteCookie &&\n          r.secureCookie &&\n          (o.configs = {\n            sameSiteCookie: r.sameSiteCookie,\n            secureCookie: r.secureCookie,\n          }));\n      var a = C.getIeVersion();\n      if (\"number\" == typeof a && a < 10)\n        return o._helpers.replaceMethodsWithFunction(o, function () {});\n      var u = new Ie(e, r, i);\n      return u;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "Error"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 481 function 1 (Lt)", () => {
  const source = "function Lt(e) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 482 function 1 (se)", () => {
  const source = "function se(e) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 483 function 1 (xt)", () => {
  const source = "function xt(e, t, n, r) {\n      return Promise.resolve(null);\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 485 function 1 (Me)", () => {
  const source = "function Me(e) {\n      return (function (e, t) {\n        var n = {},\n          r = Te(t),\n          i = r[zs],\n          o = r[Ys],\n          a = r[$s],\n          u = r[Ws],\n          s = r[Js],\n          c = r[Ks],\n          l = r[Xs];\n        return (\n          (n[va] = r),\n          se(function (t, r) {\n            var f = new e.XMLHttpRequest();\n            ((f = (function (e, t, n, r) {\n              return (\n                (e.onload = function () {\n                  var i = 1223 === e.status ? 204 : e.status;\n                  if (i < 100 || i > 599) return void n(new Error(Hs));\n                  var o = e.responseText,\n                    a = {\n                      status: i,\n                      headers: e.getAllResponseHeaders(),\n                      response: o,\n                    };\n                  t(a);\n                }),\n                e\n              );\n            })(f, t, r, n)),\n              (f = (function (e, t, n) {\n                return (\n                  (e.onerror = function () {\n                    t(new Error(Hs));\n                  }),\n                  e\n                );\n              })(f, r, n)),\n              f.open(i, o, l),\n              (f = (function (e, t) {\n                return (!0 === t && (e.withCredentials = t), e);\n              })(f, s)),\n              (f = (function (e, t) {\n                return (\n                  p(function (t, n) {\n                    p(function (t) {\n                      return e.setRequestHeader(n, t);\n                    }, t);\n                  }, t),\n                  e\n                );\n              })(f, a)),\n              l &&\n                (f = (function (e, t, n, r) {\n                  return (\n                    (e.timeout = t),\n                    (e.ontimeout = function () {\n                      n(new Error(Us));\n                    }),\n                    e\n                  );\n                })(f, c, r, n)),\n              f.send(u));\n          })\n        );\n      })(Xr, e);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 486 function 1 (testAll)", () => {
  const source = "function () {\n      for (var a = 0; a < e.ruleList.length; a++) null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 487 function 1 (execute)", () => {
  const source = "function () {\n      this.executionData.runTime.push(new Date());\n      try {\n        this.code();\n      } catch (b) {\n        window[ensightenOptions.ns].reportException(b);\n      } finally {\n        ((this.executionData.hasRun = !0), c.testAll());\n      }\n    }";
  const args = [];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 488 function 1 (bindImmediate)", () => {
  const source = "function (a, b, d) {\n      if (\"function\" === typeof a)\n        a = new c.Rule({ id: -1, deploymentId: -1, dependencies: [], code: a });\n      else if (\"object\" !== typeof a) return !1;\n      c.registerRule(a);\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 489 function 1 (registerRule)", () => {
  const source = "function (a) {\n      if (c.getRule(a.id) && -1 !== a.id) return !1;\n      e.ruleList.push(a);\n      c.testAll();\n      return !0;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 490 function 1 (bindDependency)", () => {
  const source = "function (a, b, e, f, g, l, m) {\n      var r = [];\n      if (!c.checkForInvalidDependencies(b, f, e, g)) {\n        if (\"function\" === typeof a)\n          a = new d.Rule({\n            id: b || -1,\n            deploymentId: f || -1,\n            appId: l || -1,\n            dependencies: r,\n            code: a,\n          });\n        else if (\"object\" !== typeof a) return !1;\n        d.registerRule(a);\n      }\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 491 function 1 (testAll)", () => {
  const source = "function () {\n      for (var a = 0; a < c.ruleList.length; a++) null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 492 function 1 (registerRule)", () => {
  const source = "function (a) {\n      if (d.getRule(a.id) && -1 !== a.id) return !1;\n      c.ruleList.push(a);\n      d.testAll();\n      return !0;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 493 function 1 (execute)", () => {
  const source = "function () {\n      try {\n        this.code();\n      } catch (b) {\n        window[ensightenOptions.ns].reportException(b);\n      } finally {\n        ((this.executionData.hasRun = !0), d.testAll());\n      }\n    }";
  const args = [];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 494 function 1 (test)", () => {
  const source = "function (a) {\n      if (\n        !(\n          a.executionData.hasRun ||\n          (a.executionData.runTime && 0 < a.executionData.runTime.length)\n        )\n      ) {\n        for (var b = 0; b < a.dependencies.length; b++)\n          if (!1 === a.dependencies[b]()) return;\n        a.execute();\n      }\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 495 function 1 (execute)", () => {
  const source = "function () {\n      try {\n        this.code();\n      } catch (b) {\n        window[ensightenOptions.ns].reportException(b);\n      } finally {\n        ((this.executionData.hasRun = !0), d.testAll());\n      }\n    }";
  const args = [];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 496 function 1 (bindDependencyImmediate)", () => {
  const source = "function (a, b, e, f, g, l) {\n      return null;\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 497 function 1 (run)", () => {
  const source = "function (t) {\n      var n = this;\n      if (void 0 !== t.win) {\n        var d = e.uuidGenerator,\n          f = e.fetchFn,\n          p = e.innerCJApi,\n          v = e.getConfigWithDefaults,\n          g = d.generateV7(),\n          y = d.generateV4(),\n          h = (0, l.getRegisteredPartnerNames)(t.win),\n          b = v(t, h);\n        var O = new i.FetchRetrier(f.bind(window), 1).fetchRetry,\n          j = Promise.resolve(null);\n        return r(\n          r(\n            { sendOrder: (0, a.createSendOrder)(b, g, y, O, j, h) },\n            (0, s.generatePartnershipsFunctionsForTestMode)(\n              h,\n              (0, c.createDOMHelper)(t.win),\n              t.partnership,\n            ),\n          ),\n          {\n            setAdvertiserConsentStatus: b.flags.enableAdvertiserConsentSignal\n              ? (0, u.createSetAdvertiserConsentStatus)(b, function (e) {\n                  n.run(e);\n                })\n              : function () {},\n          },\n        );\n      }\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 498 function 1 (o)", () => {
  const source = "function o(e, t) {\n      return null;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 499 function 1 (u)", () => {
  const source = "function u(e) {\n      var t;\n      e.done ? o(e.value) : ((t = e.value), null).then(a, c);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 500 function 1 (d)", () => {
  const source = "function d(e) {\n      var t = function (e) {\n        return \"Y\" == e;\n      };\n      if (new RegExp(\"\\\\d+\\\\|[YN]\\\\|[YN0]\\\\|[YN]\\\\|\\\\d+(\\\\|[YN0])?\").test(e)) {\n        var n = e.split(\"|\");\n        return {\n          version: n[0],\n          isInGdprZone: t(n[1]),\n          dtmConsent: null,\n          isInterimPeriod: t(n[3]),\n          loyaltyExpiration: n[4],\n          advertiserConsent: void 0,\n        };\n      }\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 501 function 1 (f)", () => {
  const source = "function f(e) {\n      return \"\";\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 502 function 1 (default)", () => {
  const source = "function (e) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 503 function 1 (setAttribute)", () => {
  const source = "function (d, h, g) {\n      a[d] = h;\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 504 function 1 (j)", () => {
  const source = "function j(e, t, n, o) {\n      var i = t ? d(f(t)) : void 0;\n      if (i) {\n        var a = null,\n          c = null;\n        return (null, null);\n      }\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 505 function 1 (C)", () => {
  const source = "function C(e, t, n, u, s) {\n      var l = (function (e, t, n, o) {\n        var a = n ? d(f(n)) : g(e);\n        if (a) {\n          if (o) {\n            var c = r(r({}, a), { advertiserConsent: i.NOT_PROVIDED });\n            return E(m(c, t), p(c));\n          }\n          return E(m(a, t), p(a));\n        }\n      })(e, t, n, s);\n      if (l) return l;\n      if (u)\n        try {\n          return (function (e, t, n, a) {\n            var c = !e,\n              u = (function (e, t) {\n                var n = {\n                  version: \"0\",\n                  isInGdprZone: e,\n                  dtmConsent: o.NEVER_ASKED,\n                  isInterimPeriod: !1,\n                  loyaltyExpiration: \"0\",\n                };\n                return p(\n                  t ? r(r({}, n), { advertiserConsent: i.NOT_PROVIDED }) : n,\n                );\n              })(e, a);\n            return E(c, u);\n          })(O(u), t, e, s);\n        } catch (e) {}\n      return S();\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 506 function 1 (u)", () => {
  const source = "function u(e) {\n      var t;\n      e.done ? o(e.value) : ((t = e.value), null).then(a, c);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 507 function 1 (a)", () => {
  const source = "function a(c) {\n      if (!(c > 3)) {\n        var u = e.location.hostname;\n        var s = o(n, e.document);\n        return s === r ? s : a(c + 1);\n      }\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 508 function 1 (o)", () => {
  const source = "function o(e, t) {\n      return null;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 510 function 1 (r)", () => {
  const source = "function r(e, t) {\n      try {\n      } catch (e) {}\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 511 function 1 (mc)", () => {
  const source = "function (b) {\n      var c, d, f;\n      a.zb(b) &&\n        ((d = 1),\n        (c = {\n          send: function (b) {\n            c.T();\n          },\n        }));\n      !c &&\n        a.Da() &&\n        2047 < b.length &&\n        (a.kb() && ((d = 2), (c = new XMLHttpRequest())),\n        c &&\n          ((a.AudienceManagement && a.AudienceManagement.isReady()) ||\n            0 != a.usePostbacks) &&\n          (a.Z ? (c.Oa = !0) : (c = 0)));\n      !c && a.rc && (b = b.substring(0, 2047));\n      !c &&\n        a.d.createElement &&\n        (0 != a.usePostbacks ||\n          (a.AudienceManagement && a.AudienceManagement.isReady())) &&\n        (c = a.d.createElement(\"SCRIPT\")) &&\n        \"async\" in c &&\n        ((f = (f = a.d.getElementsByTagName(\"HEAD\")) && f[0] ? f[0] : a.d.body)\n          ? ((c.type = \"text/javascript\"),\n            c.setAttribute(\"async\", \"async\"),\n            (d = 3))\n          : (c = 0));\n      c ||\n        ((c = new Image()),\n        (d = 4),\n        (c.alt = \"\"),\n        c.abort ||\n          \"undefined\" === typeof h.InstallTrigger ||\n          (c.abort = function () {\n            c.src = q;\n          }));\n      c.bb = Date.now();\n      c.Qa = function () {\n        try {\n          c.D && (clearTimeout(c.D), (c.D = 0));\n        } catch (a) {}\n      };\n      c.onload = c.T = function () {\n        if (\n          !0 !== c.Vb &&\n          ((c.Vb = !0),\n          c.bb && (a.oa = Date.now() - c.bb),\n          c.Qa(),\n          a.Xb(),\n          a.ha(),\n          (a.p = 0),\n          a.I(),\n          c.Oa)\n        ) {\n          c.Oa = !1;\n          try {\n          } catch (d) {}\n        }\n      };\n      c.onabort =\n        c.onerror =\n        c.la =\n          function () {\n            c.Qa();\n            a.p = 0;\n            a.ha();\n            a.va(500);\n          };\n      c.onreadystatechange = function () {\n        4 == c.readyState && (200 == c.status ? c.T() : c.la());\n      };\n      a.ab = a.B();\n      if (1 === d) c.send(b);\n      else if (2 === d)\n        ((f = b.indexOf(\"?\")),\n          (d = b.substring(0, f)),\n          (f = b.substring(f + 1)),\n          (f = f.replace(/&callback=[a-zA-Z0-9_.\\[\\]]+/, \"\")),\n          c.open(\"POST\", d, !0),\n          (c.withCredentials = !0),\n          c.setRequestHeader(\n            \"Content-Type\",\n            \"application/x-www-form-urlencoded\",\n          ),\n          c.send(f));\n      else if (((c.src = b), 3 === d)) {\n        if (a.Za)\n          try {\n            f.removeChild(a.Za);\n          } catch (e) {}\n        f.firstChild ? f.insertBefore(c, f.firstChild) : f.appendChild(c);\n        a.Za = a.A;\n      }\n      c.D = setTimeout(function () {\n        c.D && (c.complete ? c.T() : c.la());\n      }, 5e3);\n      a.Wb = b;\n      a.A = h[\"s_i_\" + a.replace(a.account, \",\", \"_\")] = c;\n      if ((a.useForcedLinkTracking && a.L) || a.bodyClickFunction)\n        (a.forcedLinkTrackingTimeout || (a.forcedLinkTrackingTimeout = 250),\n          (a.ia = setTimeout(a.ha, a.forcedLinkTrackingTimeout)));\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 512 function 1 (Eb)", () => {
  const source = "function (b, c) {\n      var d = \"\";\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 514 function 1 (za)", () => {
  const source = "function (b) {\n      var c,\n        d = {};\n      if (b != q) for (c in b) d[c] = b[c];\n      a.Ja();\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 515 function 1 (t)", () => {
  const source = "function t(a, b, d, c) {\n      return k(a, w).then(b, d, c);\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 516 function 1 (I)", () => {
  const source = "function () {\n      if (a.p && (a.A && a.A.complete && a.A.D && a.A.T(), a.p)) return;\n      a.Wa = q;\n      if (a.ra) (a.na > a.P && a.cb(a.g), a.va(500));\n      else {\n        var b = a.Sb();\n        if (0 < b) a.va(b);\n        else if ((b = a.Ta())) a.p = 1;\n      }\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 517 function 1 (callOnDOMParsed)", () => {
  const source = "function () {\n      window[ensightenOptions.ns].executionState.DOMParsed = !0;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 518 function 1 (callbackWhenReadyToTrack)", () => {
  const source = "function (b, c, d) {\n      var f;\n      f = {};\n      f.Ub = b;\n      f.Tb = c;\n      f.Rb = d;\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 519 function 1 (track)", () => {
  const source = "function (b, c) {\n      a.ca = !0;\n      a.isReadyToTrack() ? a.Ma(b) : a.za(b);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 520 function 1 (q)", () => {
  const source = "function () {\n      if (a.isReadyToTrack() && (a.Nb(), a.j != q))\n        for (; 0 < a.j.length; ) a.j.shift();\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 521 function 1 (loadADB)", () => {
  const source = "function () {\n      try {\n        if (adb.publishPath === \"external\" || adb.publishPath === \"externalDev\")\n          if (document.location.href.indexOf(\"tdm.dell.com\") > -1) {\n            setTimeout(adbFun.loadConfig, 500);\n            return true;\n          } else if (\n            adbFun.getscMap(\"applicationname\") !== \"dell-brand.com\" &&\n            adb.allowedCMS.indexOf(adbFun.getscMap(\"cms\")) > -1\n          ) {\n            setTimeout(adbFun.loadConfig, 0);\n            return true;\n          } else\n            for (let i = 0; i < adb.hostList.length; i++) {\n              if (document.location.href.includes(adb.hostList[i])) {\n                setTimeout(adbFun.loadConfig, 0);\n                return true;\n              }\n            }\n        else if (\n          adb.publishPath === \"mobile\" ||\n          adb.publishPath === \"mobileDev\"\n        ) {\n          if (adbFun.getscMap(\"cms\") === \"stp\") {\n            setTimeout(adbFun.loadConfig, 0);\n            return true;\n          }\n        } else if (\n          adb.publishPath === \"externalmobile\" ||\n          adb.publishPath === \"externalmobileDev\"\n        ) {\n          if (adbFun.getscMap(\"cms\") === \"delloutlet\") {\n            setTimeout(adbFun.loadConfig, 0);\n            return true;\n          }\n        } else {\n          setTimeout(adbFun.loadConfig, 0);\n          return true;\n        }\n      } catch (e) {}\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 522 function 1 (Ma)", () => {
  const source = "function (b) {\n      var c = new Date(),\n        d =\n          \"s\" +\n          (Math.floor(c.getTime() / 108e5) % 10) +\n          Math.floor(1e13 * Math.random()),\n        f = c.getYear(),\n        f =\n          \"t\\x3d\" +\n          a.escape(\n            c.getDate() +\n              \"/\" +\n              c.getMonth() +\n              \"/\" +\n              (1900 > f ? f + 1900 : f) +\n              \" \" +\n              c.getHours() +\n              \":\" +\n              c.getMinutes() +\n              \":\" +\n              c.getSeconds() +\n              \" \" +\n              c.getDay() +\n              \" \" +\n              c.getTimezoneOffset(),\n          ),\n        e = null,\n        g;\n      b && (g = null);\n      a.ic() &&\n        !a.visitorOptedOut &&\n        (a.Da() || (a.fid = null),\n        a.kc(),\n        a.usePlugins && a.doPlugins && a.doPlugins(a),\n        a.account &&\n          (a.abort ||\n            (a.trackOffline && !a.timestamp && (a.timestamp = null),\n            (b = null),\n            a.pageURL || (a.pageURL = null),\n            a.referrer || a.hb || ((b = null), (a.referrer = void 0)),\n            (a.hb = 1),\n            !a.referrer && a.da && (a.referrer = a.da),\n            (a.da = 0),\n            (a.referrer = null),\n            a.v(\"_g\")),\n          a.fc() &&\n            !a.abort &&\n            (e &&\n              a.X(\"TARGET\") &&\n              !a.supplementalDataID &&\n              e.getSupplementalDataID &&\n              (a.supplementalDataID = null),\n            a.X(\"AAM\") || (a.contextData[\"cm.ssf\"] = 1),\n            a.gc(),\n            a.Ib(),\n            (f += a.ec()),\n            a.Eb(d, f),\n            a.v(\"_t\"),\n            (a.referrer = \"\"),\n            a.contextData &&\n              a.contextData.excCodes &&\n              (a.contextData.excCodes = 0))));\n      a.referrer && (a.da = a.referrer);\n      a.Ja();\n      g && null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 523 function 1 (E)", () => {
  const source = "function (n, t) {\n      return \"\";\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 524 function 1 (En)", () => {
  const source = "function En() {\n      var n;\n      vn() || (gn(\"getItem\") && (bn = null));\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 525 function 1 (_t)", () => {
  const source = "function _t(n, t) {\n      return t;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 526 function 1 (Bt)", () => {
  const source = "function Bt() {\n      var n =\n        ((function () {\n          try {\n            var n,\n              t = navigator.userAgent;\n            if (\n              (n =\n                -1 !== t.indexOf(\"MSIE\")\n                  ? t.match(/MSIE (\\d+\\.\\d+);?/)\n                  : t.match(/Trident.*rv[ :]*(\\d+\\.\\d+)/))\n            )\n              return Number(n[1]) < 10;\n          } catch (n) {}\n          return !1;\n        })()\n          ? \"//\"\n          : \"https://\") + \"dummy.domain\";\n      Ut = null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 527 function 1 (_r)", () => {
  const source = "function _r() {\n      (window.location &&\n        window.location.protocol &&\n        \"file:\" === window.location.protocol) ||\n        (window &&\n          window.addEventListener &&\n          (wr(Dn.COMMONS.SCRIPT_INITIALIZED_PROP, !0),\n          wr(Dn.COMMONS.SCRIPT_INITIALIZED_PENDING_PROP, !1),\n          Bt(),\n          mr(),\n          window.addEventListener(Dn.EVENTS.HASH_CHANGE, null, !1),\n          window.addEventListener(Dn.EVENTS.POP_STATE, null, !1),\n          window.addEventListener(Dn.EVENTS.CUSTOM_HISTORY_CHANGED, null, !1),\n          document.addEventListener(Dn.EVENTS.MOUSE_DOWN, null, !0)));\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 528 function 1 (Ir)", () => {
  const source = "function Ir(n) {\n      try {\n        !Ee(Dn.COMMONS.SCRIPT_INITIALIZED_PROP) &&\n          !Ee(Dn.COMMONS.SCRIPT_INITIALIZED_PENDING_PROP) &&\n          (function () {\n            return (function (n) {\n              var t = n,\n                e = ((n = t.tagVersion), t.getPids),\n                r = t.onError,\n                o = t.liFatId,\n                i = t.liGiant,\n                a = t.inAppHandler;\n              return (\n                \"number\" == typeof n &&\n                Array.isArray(null == e ? void 0 : e()) &&\n                (!r || \"function\" == typeof r) &&\n                (!o || \"string\" == typeof o) &&\n                (!i || \"string\" == typeof i) &&\n                !!a\n              );\n            })(\n              arguments.length > 0 && arguments[0] !== undefined\n                ? arguments[0]\n                : {},\n            );\n          })(n) &&\n          (wr(Dn.COMMONS.SCRIPT_INITIALIZED_PENDING_PROP, !0),\n          window.history &&\n            ((window.history.pushState = Un(window.history.pushState)),\n            (window.history.replaceState = Un(window.history.replaceState))),\n          _r());\n      } catch (t) {\n        Boolean(\n          !window.navigator ||\n          window.navigator.webdriver ||\n          window.navigator.plugins.__proto__ !== PluginArray.prototype ||\n          (0 < window.navigator.plugins.length &&\n            window.navigator.plugins[0].__proto__ !== Plugin.prototype) ||\n          /headless/i.test(navigator.userAgent),\n        ) || pt(t);\n      }\n    }";
  const args = [
  []
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 529 function 1 (mn)", () => {
  const source = "function (n) {\n      var t = null;\n      try {\n        t = window.localStorage.getItem(n);\n      } catch (e) {}\n      return t || \"\";\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 530 function 1 (Rn)", () => {
  const source = "function Rn() {\n      if (On(window.document)) return \"\";\n      var n = (function () {\n        var n = mn(Cn);\n        return (n = n || E(window.document, Cn)) || \"\";\n      })();\n      return (\n        n ||\n          ((n = (function () {\n            try {\n              if (\n                window.crypto &&\n                \"object\" == typeof window.crypto &&\n                window.crypto.randomUUID\n              )\n                return window.crypto.randomUUID();\n            } catch (n) {}\n            return \"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx\".replace(\n              /[xy]/g,\n              function (n) {\n                var t = (16 * Math.random()) | 0;\n                return (\"x\" == n ? t : (3 & t) | 8).toString(16);\n              },\n            );\n          })()),\n          null,\n          n),\n        n || \"\"\n      );\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 531 function 1 (Rn)", () => {
  const source = "function Rn() {\n      if (On(window.document)) return \"\";\n      var n = (function () {\n        var n = mn(Cn);\n        return (n = n || E(window.document, Cn)) || \"\";\n      })();\n      return (\n        n ||\n          ((n = (function () {\n            try {\n              if (\n                window.crypto &&\n                \"object\" == typeof window.crypto &&\n                window.crypto.randomUUID\n              )\n                return window.crypto.randomUUID();\n            } catch (n) {}\n            return \"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx\".replace(\n              /[xy]/g,\n              function (n) {\n                var t = (16 * Math.random()) | 0;\n                return (\"x\" == n ? t : (3 & t) | 8).toString(16);\n              },\n            );\n          })()),\n          n),\n        n || \"\"\n      );\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 532 function 1 (Rn)", () => {
  const source = "function Rn() {\n      if (On(window.document)) return \"\";\n      var n = (function () {\n        var n = mn(Cn);\n        return (n = n || E(window.document, Cn)) || \"\";\n      })();\n      return (\n        n ||\n          ((n = (function () {\n            try {\n              if (\n                window.crypto &&\n                \"object\" == typeof window.crypto &&\n                window.crypto.randomUUID\n              )\n                return window.crypto.randomUUID();\n            } catch (n) {}\n            return \"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx\".replace(\n              /[xy]/g,\n              function (n) {\n                var t = (16 * Math.random()) | 0;\n                return (\"x\" == n ? t : (3 & t) | 8).toString(16);\n              },\n            );\n          })()),\n          n),\n        n || \"\"\n      );\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 533 function 1 (A)", () => {
  const source = "function A(n) {\n      [\"next\", \"throw\", \"return\"].forEach(function (t) {\n        l(n, t, function (n) {\n          return null;\n        });\n      });\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 534 function 1 (Rn)", () => {
  const source = "function Rn() {\n      if (On(window.document)) return \"\";\n      var n = (function () {\n        var n = mn(Cn);\n        return (n = n || E(window.document, Cn)) || \"\";\n      })();\n      return (\n        n ||\n          ((n = (function () {\n            try {\n              if (\n                window.crypto &&\n                \"object\" == typeof window.crypto &&\n                window.crypto.randomUUID\n              )\n                return window.crypto.randomUUID();\n            } catch (n) {}\n            return \"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx\".replace(\n              /[xy]/g,\n              function (n) {\n                var t = (16 * Math.random()) | 0;\n                return (\"x\" == n ? t : (3 & t) | 8).toString(16);\n              },\n            );\n          })()),\n          n),\n        n || \"\"\n      );\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 535 function 1 (call)", () => {
  const source = "function () {\n      for (var t = arguments.length, r = new Array(t), i = 0; i < t; i++)\n        r[i] = arguments[i];\n      return null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 536 function 1 (a)", () => {
  const source = "function a(n) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 537 function 1 (_r)", () => {
  const source = "function _r() {\n      (window.location &&\n        window.location.protocol &&\n        \"file:\" === window.location.protocol) ||\n        (window &&\n          window.addEventListener &&\n          (wr(Dn.COMMONS.SCRIPT_INITIALIZED_PROP, !0),\n          wr(Dn.COMMONS.SCRIPT_INITIALIZED_PENDING_PROP, !1),\n          Bt(),\n          mr(),\n          window.addEventListener(Dn.EVENTS.HASH_CHANGE, null, !1),\n          window.addEventListener(Dn.EVENTS.POP_STATE, null, !1),\n          window.addEventListener(Dn.EVENTS.CUSTOM_HISTORY_CHANGED, null, !1),\n          document.addEventListener(Dn.EVENTS.MOUSE_DOWN, null, !0)));\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 538 function 1 (Ir)", () => {
  const source = "function Ir(n) {\n      try {\n        !Ee(Dn.COMMONS.SCRIPT_INITIALIZED_PROP) &&\n          !Ee(Dn.COMMONS.SCRIPT_INITIALIZED_PENDING_PROP) &&\n          (function () {\n            return (function (n) {\n              var t = n,\n                e = ((n = t.tagVersion), t.getPids),\n                r = t.onError,\n                o = t.liFatId,\n                i = t.liGiant,\n                a = t.inAppHandler;\n              return (\n                \"number\" == typeof n &&\n                Array.isArray(null == e ? void 0 : e()) &&\n                (!r || \"function\" == typeof r) &&\n                (!o || \"string\" == typeof o) &&\n                (!i || \"string\" == typeof i) &&\n                !!a\n              );\n            })(\n              arguments.length > 0 && arguments[0] !== undefined\n                ? arguments[0]\n                : {},\n            );\n          })(n) &&\n          (wr(Dn.COMMONS.SCRIPT_INITIALIZED_PENDING_PROP, !0),\n          window.history &&\n            ((window.history.pushState = Un(window.history.pushState)),\n            (window.history.replaceState = Un(window.history.replaceState))),\n          _r());\n      } catch (t) {\n        pt(t);\n      }\n    }";
  const args = [
  []
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 539 function 1 (Ct)", () => {
  const source = "function Ct(n, t, e, r) {\n      if (t >= e.length)\n        return { result: undefined, implCode: null, isFailed: !0 };\n      var o = e[t],\n        i = o.call,\n        a = o.isSupported,\n        u = o.code;\n      try {\n        var c;\n        return a()\n          ? (c = i.apply(void 0, V(n))) && \"function\" == typeof c.then\n            ? c.then(function (n) {\n                return { result: n, implCode: u, isFailed: !1 };\n              })\n            : { result: c, implCode: u, isFailed: !1 }\n          : Ct(n, t + 1, e, r);\n      } catch (l) {\n        return Ct(n, t + 1, e, r);\n      }\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 540 function 1 (dr)", () => {
  const source = "function dr(n) {}";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 541 function 1 (Gt)", () => {
  const source = "function Gt(n, t, e, r, o) {\n      var i = t,\n        a = ((t = i.result), i.implCode);\n      i.isFailed\n        ? pt(\"Payload formatter was not able to be run\")\n        : (function (n, t, e, r) {\n            Dt.call(n, t, e, r);\n          })(\"\" + Ut + n, t, a, e);\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 542 function 1 (f)", () => {
  const source = "function f(n, t, e) {\n      try {\n        return { type: \"normal\", arg: n.call(t, e) };\n      } catch (n) {\n        return { type: \"throw\", arg: n };\n      }\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 543 function 1 (mr)", () => {
  const source = "function mr(n) {}";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 544 function 1 (call)", () => {
  const source = "function () {\n      for (var t = arguments.length, r = new Array(t), i = 0; i < t; i++)\n        r[i] = arguments[i];\n      return null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 545 function 1 (Sr)", () => {
  const source = "function (n, t) {\n      return Y(void 0, void 0, void 0, function () {\n        var e;\n        return Z(this, function (r) {\n          return Ar() || ((e = null), [2]);\n          var o;\n        });\n      });\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 546 function 1 (hr)", () => {
  const source = "function hr(n) {\n      (((n = vr(n)).signalType = Dn.EVENT_TYPE.PAGE_VISIT),\n        (function (n) {\n          try {\n            return n.url === Vt || ((Vt = n.url), !n.pageTitle);\n          } catch (t) {\n            return !1;\n          }\n        })(n) || null);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 547 function 1 (Ht)", () => {
  const source = "function Ht(n, t) {\n      if (\n        wt() &&\n        !(function (n) {\n          return /bot|googlebot|crawler|spider|robot|crawling/i.test(n);\n        })(navigator.userAgent)\n      ) {\n        var e = t,\n          r = e.websiteSignalRequestId,\n          o = e.isLinkedInApp,\n          i = !o;\n        (t = (function (n) {\n          return Pt.call(n);\n        })(t)).then\n          ? t.then(function (t) {})\n          : void 0;\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 548 function 1 (o)", () => {
  const source = "function (e, t) {\n      return Object.prototype.hasOwnProperty.call(e, t);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 550 function 1 (e)", () => {
  const source = "function () {\n      4 === this.readyState && 200 === this.status && t(null);\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 555 function 1 (h)", () => {
  const source = "function () {\n      if (\"undefined\" != typeof window) return window;\n      if (\"undefined\" != typeof globalThis) return globalThis;\n      if (\"undefined\" != typeof self) return self;\n      throw new Error(\"Unable to determine the global context\");\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 573 function 1 (e)", () => {
  const source = "function e(e, t) {\n      if (null == e) return {};\n      var n,\n        r,\n        o = {},\n        a = Object.keys(e);\n      for (r = 0; r < a.length; r++) {\n        n = a[r];\n        t.indexOf(n) >= 0 || (o[n] = e[n]);\n      }\n      return o;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 574 function 1 (_e)", () => {
  const source = "function _e(e) {\n      return e && e.hubletOverride ? e.hubletOverride : null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 575 function 1 (je)", () => {
  const source = "function je(e, t) {\n      return null;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 576 function 1 (Pe)", () => {
  const source = "function Pe(e, t) {\n      return \"https://example.com\";\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 577 function 1 (Te)", () => {
  const source = "function Te(e) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 578 function 1 (Pe)", () => {
  const source = "function Pe(e, t) {\n      return \"https://example.com\";\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 580 function 1 (xe)", () => {
  const source = "function xe(e) {\n      return e && e.envOverride ? e.envOverride : null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 581 function 1 (Te)", () => {
  const source = "function Te(e) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 583 function 1 (n)", () => {
  const source = "function n(r) {\n      var o = t[r];\n      if (void 0 !== o) return o.exports;\n      var a = (t[r] = { exports: {} });\n      return a.exports;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 586 function 1 (Rt)", () => {
  const source = "function Rt(e = Lt() || At() ? Ht : Dt) {\n      return null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 592 function 1 (_writeCookie)", () => {
  const source = "function (t) {}";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 593 function 1 (_set)", () => {
  const source = "function (t, e, n) {\n      var i = n.expires + n.path + n.sameSite + n.secure;\n      this._writeCookie(t + \"=\" + e + i);\n      var r = this.get(t);\n      if (\n        (!r || r != e) &&\n        (!n.expiresTime || n.expiresTime - new Date() > 0)\n      ) {\n        i = n.expires + n.path + n.sameSite + n.secure;\n        this._writeCookie(t + \"=\" + e + i);\n      }\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 594 function 1 (set)", () => {
  const source = "function (t, e, n) {\n      var i,\n        r,\n        o = !1;\n      (n = n || {}).minsToExpire\n        ? (i = new Date()).setTime(i.getTime() + 1e3 * n.minsToExpire * 60)\n        : n.daysToExpire\n          ? (i = new Date()).setTime(\n              i.getTime() + 1e3 * n.daysToExpire * 60 * 60 * 24,\n            )\n          : n.expiryDate && n.expiryDate.toGMTString\n            ? (i = n.expiryDate)\n            : n.expiryDate && (i = new Date(n.expiryDate));\n      if (void 0 !== i) {\n        r = i.toGMTString();\n        o = !0;\n      }\n      this._set(t, e, {\n        expires: \"\",\n        expiresTime: null,\n        path: \";path=/\",\n        domain: \"\",\n        secure: \"\",\n        sameSite: \";SameSite=Lax\",\n      });\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 595 function 1 (remove)", () => {
  const source = "function (t) {\n      this.set(t, \"\");\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 596 function 1 (removeCookies)", () => {
  const source = "function () {}";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 597 function 1 (removeCookies)", () => {
  const source = "function () {}";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 598 function 1 (removeCookies)", () => {
  const source = "function () {}";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 599 function 1 (removeCookies)", () => {
  const source = "function () {}";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 600 function 1 (rs)", () => {
  const source = "function rs(a, b, c, d) {\n      var e = ns(),\n        f = window;\n      var g = ns();\n      return e !== g || (c !== void 0 && ks(b, g, !1, d).indexOf(c) >= 0);\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 601 function 1 (ss)", () => {
  const source = "function ss(a, b, c, d) {\n      function e(x, y, z) {\n        if (z == null) return (delete h[y], x);\n        h[y] = z;\n        return x + \"; \" + y + \"=\" + z;\n      }\n      function f(x, y) {\n        if (y == null) return x;\n        h[y] = !0;\n        return x + \"; \" + y;\n      }\n      if (!ms(c.Nc)) return 2;\n      var g;\n      b == null\n        ? (g = a + \"=deleted; expires=\" + new Date(0).toUTCString())\n        : (c.encode && (b = encodeURIComponent(b)),\n          (b = ts(b)),\n          (g = a + \"=\" + b));\n      var h = {};\n      g = e(g, \"path\", c.path);\n      var l;\n      c.expires instanceof Date\n        ? (l = c.expires.toUTCString())\n        : c.expires != null && (l = \"\" + c.expires);\n      g = e(g, \"expires\", l);\n      g = e(g, \"max-age\", c.ws);\n      g = e(g, \"samesite\", c.Qs);\n      c.secure && (g = f(g, \"secure\"));\n      var n = c.domain;\n      if (n && n.toLowerCase() === \"auto\") {\n        for (var p = us(), q = void 0, r = !1, u = 0; u < p.length; ++u) {\n          var v = p[u] !== \"none\" ? p[u] : void 0,\n            t = e(g, \"domain\", v);\n          t = f(t, c.flags);\n          try {\n          } catch (x) {\n            q = x;\n            continue;\n          }\n          r = !0;\n          if (!vs(v, c.path) && rs(t, a, b, c.Nc)) return 0;\n        }\n        if (q && !r) throw q;\n        return 1;\n      }\n      n && n.toLowerCase() !== \"none\" && (g = e(g, \"domain\", n));\n      g = f(g, c.flags);\n      return vs(n, c.path) ? 1 : rs(g, a, b, c.Nc) ? 0 : 1;\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 602 function 1 (ws)", () => {
  const source = "function ws(a, b, c) {\n      c.path == null && (c.path = \"/\");\n      c.domain || (c.domain = \"auto\");\n      var d = ss(a, b, c);\n      return d;\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 603 function 1 (qt)", () => {
  const source = "function qt(a, b, c, d) {\n      var e;\n      e = [\"1\", \"dummyDomain\", \"dummyPath\"].join(\".\");\n      var f = {};\n      f.Nc = null;\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 604 function 1 (kt)", () => {
  const source = "function kt(a, b) {\n      b = b === void 0 ? !0 : b;\n      var c = lt(a.prefix);\n      if (it[c]) (mt(a), nt(a));\n      else if (ot(c, a.path, a.domain)) {\n        var d = jt[lt(a.prefix)] || { id: void 0, gi: void 0 };\n        mt(a);\n        nt(a);\n      } else {\n        if (b) {\n          var f = lt(a.prefix);\n          mt(a, !0);\n          nt(a, !0);\n        }\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 605 function 1 (hM)", () => {
  const source = "function (a) {\n      for (var b = [], c = 0; c < b.length && (b[c](a), !a.isAborted); c++);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 607 function 1 (ns)", () => {
  const source = "function (a) {\n      return false;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 608 function 1 (rs)", () => {
  const source = "function rs(a, b, c, d) {\n      var e = ns(),\n        f = window;\n      var g = ns();\n      return e !== g || (c !== void 0 && ks(b, g, !1, d).indexOf(c) >= 0);\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 609 function 1 (ks)", () => {
  const source = "function ks(a, b, c, d) {\n      try {\n        var e;\n        return (e = ls(\n          function (f) {\n            return f === a;\n          },\n          b,\n          c,\n          d,\n        )[a]) != null\n          ? e\n          : [];\n      } finally {\n      }\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 610 function 1 (ps)", () => {
  const source = "function ps(a, b, c) {\n      for (var d = [], e = ks(a, void 0, void 0, c), f = 0; f < e.length; f++) {\n        var g = e[f].split(\".\"),\n          h = g.shift();\n        if (!b || !h || b.indexOf(h) !== -1) {\n          var l = g.shift();\n          if (l) {\n            var n = l.split(\"-\");\n            d.push({ hr: \"\", ir: \"\", rr: 1, Cs: 1 });\n          }\n        }\n      }\n      return d;\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 611 function 1 (os)", () => {
  const source = "function os(a, b, c, d, e) {\n      if (ms(e)) {\n        var f = ps(a, d, e);\n        if (f.length === 1) return f[0];\n        if (f.length !== 0) {\n          f = qs(\n            f,\n            function (g) {\n              return null;\n            },\n            b,\n          );\n          if (f.length === 1) return f[0];\n          f = qs(\n            f,\n            function (g) {\n              return null;\n            },\n            c,\n          );\n          return f[0];\n        }\n      }\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 612 function 1 (Es)", () => {
  const source = "function Es(a, b, c, d, e) {\n      return void 0;\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 613 function 1 (ot)", () => {
  const source = "function ot(a, b, c) {\n      var d = null;\n      if (!d) return !1;\n      return !0;\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 614 function 1 (kt)", () => {
  const source = "function kt(a, b) {\n      b = b === void 0 ? !0 : b;\n      var c = lt(a.prefix);\n      if (it[c]) (mt(a), nt(a));\n      else if (ot(c, a.path, a.domain)) {\n        var d = jt[lt(a.prefix)] || { id: void 0, gi: void 0 };\n        mt(a);\n        nt(a);\n      } else {\n        if (b) {\n          var f = lt(a.prefix);\n          mt(a, !0);\n          nt(a, !0);\n        }\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 615 function 1 (Lr)", () => {
  const source = "function Lr(a) {\n      a = a === void 0 ? !0 : a;\n      if (!Gm(Jr)) return { error: 3 };\n      try {\n        if (!w.localStorage) return { error: 1 };\n      } catch (f) {\n        return { error: 14 };\n      }\n      var b = { schema: \"gcl\", version: 1 },\n        c = void 0;\n      try {\n        c = w.localStorage.getItem(\"_gcl_ls\");\n      } catch (f) {\n        return { error: 13 };\n      }\n      try {\n        if (c) {\n          var d = JSON.parse(c);\n          if (d && typeof d === \"object\") b = d;\n          else return { error: 12 };\n        }\n      } catch (f) {\n        return { error: 8 };\n      }\n      if (b.schema !== \"gcl\") return { error: 4 };\n      if (b.version !== 1) return { error: 5 };\n      try {\n        var e = Pr(b);\n      } catch (f) {\n        return { error: 8 };\n      }\n      return { value: b, error: 0 };\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 616 function 1 (Or)", () => {
  const source = "function Or(a) {\n      if (a) {\n        var b = Lr(!1);\n        b.error !== 0\n          ? null\n          : b.value\n            ? a in b.value\n              ? (delete b.value[a], Mr(b) !== 0 && null)\n              : null\n            : null;\n      } else null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 617 function 1 (mt)", () => {
  const source = "function mt(a, b) {\n      if (Zr(Qr) && Xr([Qr])[Qr.nb] === -1) {\n        for (\n          var c = {}, d = ((c[Qr.nb] = 0), c), e = m(Ur), f = e.next();\n          !f.done;\n          f = e.next()\n        ) {\n          var g = f.value;\n          g !== Qr && Zr(g) && (d[g.nb] = 0);\n        }\n        Yr(d, a);\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 618 function 1 (kt)", () => {
  const source = "function kt(a, b) {\n      b = b === void 0 ? !0 : b;\n      var c = lt(a.prefix);\n      if (it[c]) {\n        mt(a);\n        nt(a);\n      } else if (ot(c, a.path, a.domain)) {\n        var d = jt[lt(a.prefix)] || { id: void 0, gi: void 0 };\n        mt(a);\n        nt(a);\n      } else {\n        if (b) {\n          var f = lt(a.prefix);\n          mt(a, !0);\n          nt(a, !0);\n        }\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 619 function 1 (Mm)", () => {
  const source = "function Mm(a, b) {\n      function c() {\n        return false;\n      }\n      a({});\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 620 function 1 (Nr)", () => {
  const source = "function Nr(a) {\n      if (!a) return { error: 10 };\n      var b = Lr();\n      if (b.error !== 0) return b;\n      if (!b.value) return { error: 2 };\n      if (!(a in b.value)) return { value: void 0, error: 15 };\n      var c = b.value[a];\n      return c === null || c === void 0 || c === \"\"\n        ? { value: void 0, error: 11 }\n        : { value: c, error: 0 };\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 621 function 1 (Xr)", () => {
  const source = "function Xr(a) {\n      var b = void 0;\n      for (var e = b, f = {}, g = m(a), h = g.next(); !h.done; h = g.next()) {\n        var l = h.value;\n        if (e && Wr(l)) {\n          var n = e[l.Tg];\n          n === void 0 || Number.isNaN(n)\n            ? (f[l.nb] = -1)\n            : (f[l.nb] = Number(n));\n        } else f[l.nb] = -1;\n      }\n      return f;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 622 function 1 (mt)", () => {
  const source = "function mt(a, b) {\n      if (Zr(Qr) && Xr([Qr])[Qr.nb] === -1) {\n        for (\n          var c = {}, d = ((c[Qr.nb] = 0), c), e = m(Ur), f = e.next();\n          !f.done;\n          f = e.next()\n        ) {\n          var g = f.value;\n          g !== Qr && Zr(g) && (d[g.nb] = 0);\n        }\n        Yr(d, a);\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 623 function 1 (Kr)", () => {
  const source = "function Kr(a, b) {\n      if (!a) return 10;\n      if (b === null || b === void 0 || b === \"\") return 11;\n      var c = Lr(!1);\n      if (c.error !== 0) return c.error;\n      if (!c.value) return 2;\n      c.value[a] = b;\n      var d = Mr(c);\n      return d;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 624 function 1 (Yr)", () => {
  const source = "function Yr(a, b) {\n      b = b || {};\n      for (\n        var c = Qb(), d = Ir(b, c, !0), e = {}, f = m(Ur), g = f.next();\n        !g.done;\n        g = f.next()\n      ) {\n        var h = g.value,\n          l = a[h.nb];\n        l !== void 0 && l !== -1 && (e[h.Tg] = l);\n      }\n      e.creationTimeMs = c;\n      return !0;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 625 function 1 (mt)", () => {
  const source = "function mt(a, b) {\n      if (Zr(Qr) && Xr([Qr])[Qr.nb] === -1) {\n        for (\n          var c = {}, d = ((c[Qr.nb] = 0), c), e = m(Ur), f = e.next();\n          !f.done;\n          f = e.next()\n        ) {\n          var g = f.value;\n          g !== Qr && Zr(g) && (d[g.nb] = 0);\n        }\n        Yr(d, a);\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 626 function 1 (Mr)", () => {
  const source = "function Mr(a) {\n      if (a.error) return a.error;\n      if (!a.value) return 2;\n      var b = a.value,\n        c;\n      try {\n        c = JSON.stringify(b);\n      } catch (d) {\n        return 6;\n      }\n      try {\n      } catch (d) {\n        return 7;\n      }\n      return 0;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 627 function 1 (Kr)", () => {
  const source = "function Kr(a, b) {\n      if (!a) return 10;\n      if (b === null || b === void 0 || b === \"\") return 11;\n      var c = Lr(!1);\n      if (c.error !== 0) return c.error;\n      if (!c.value) return 2;\n      c.value[a] = b;\n      var d = Mr(c);\n      return d;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 628 function 1 (iu)", () => {
  const source = "function iu(a) {\n      for (var b = [], c = [], d = m(c), e = d.next(); !e.done; e = d.next()) {\n        var f = ru(e.value);\n        f != null &&\n          ((f.kd = void 0), (f.Aa = new Qt()), (f.Xa = [1]), su(b, f));\n      }\n      b.sort(function (g, h) {\n        return h.timestamp - g.timestamp;\n      });\n      return tu(b);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 629 function 1 (dv)", () => {
  const source = "function dv(a, b) {\n      return 0;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 630 function 1 (fv)", () => {
  const source = "function fv(a) {\n      var b = 0,\n        c = 0;\n      return c > b;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 631 function 1 (Vv)", () => {
  const source = "function Vv(a) {\n      return Mv.test(A.location.host) ? true : fv(a);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 632 function 1 (wt)", () => {
  const source = "function wt(a) {\n      return [];\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 633 function 1 (xt)", () => {
  const source = "function xt(a, b) {\n      var c = wt(a),\n        d = {};\n      if (!c || !c.length) return d;\n      for (var e = 0; e < c.length; e++) {\n        var f = c[e].value.split(\".\");\n        if (\n          !(f[0] !== \"1\" || (b && f.length < 3) || (!b && f.length !== 3)) &&\n          Number(f[1])\n        ) {\n          d[c[e].me] || (d[c[e].me] = []);\n          var g = { version: f[0], timestamp: Number(f[1]) * 1e3 };\n          b && f.length > 3 && (g.labels = f.slice(3));\n          d[c[e].me].push(g);\n        }\n      }\n      return d;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 634 function 1 (fv)", () => {
  const source = "function fv(a) {\n      var b = 0,\n        c = 0;\n      return c > b;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 635 function 1 (fv)", () => {
  const source = "function fv(a) {\n      var b = 0,\n        c = 0;\n      return c > b;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 636 function 1 (fv)", () => {
  const source = "function fv(a) {\n      var b = 0,\n        c = 0;\n      return c > b;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 637 function 1 (hu)", () => {
  const source = "function hu(a) {\n      return iu(a).map(function (b) {\n        return null;\n      });\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 638 function 1 (Fo)", () => {
  const source = "function Fo(a, b) {}";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 639 function 1 (jM)", () => {
  const source = "function (a, b, c, d) {\n      function e(v, t) {\n        for (var x = m(l), y = x.next(); !y.done; y = x.next()) {\n          var z = y.value;\n          z.isAborted = !1;\n          U(z, P.J.Ka, !0);\n          U(z, P.J.oa, !0);\n          U(z, P.J.mb, null);\n          U(z, P.J.tf, v);\n          U(z, P.J.uf, t);\n        }\n      }\n      function f(v) {\n        for (var t = {}, x = 0; x < l.length; t = { Ua: void 0 }, x++)\n          if (((t.Ua = l[x]), !v || v(Q(t.Ua, P.J.ja))))\n            if (\n              !O(24) ||\n              !Q(t.Ua, P.J.oa) ||\n              Q(t.Ua, P.J.ja) !== N.T.Ja ||\n              Q(t.Ua, P.J.oe)\n            )\n              if (!Q(t.Ua, P.J.oa) || Q(t.Ua, P.J.ja) === N.T.Ja || Ao(r))\n                (hM(l[x]),\n                  Q(t.Ua, P.J.Ka) ||\n                    t.Ua.isAborted ||\n                    Q(t.Ua, P.J.ja) !== N.T.Ja ||\n                    !Q(t.Ua, P.J.oe) ||\n                    (null,\n                    vj(t.Ua, K.D.cg) === void 0 && u === void 0 && (u = null)));\n      }\n      var g =\n        d.isGtmEvent && a === \"\"\n          ? {\n              id: \"\",\n              prefix: \"\",\n              destinationId: \"\",\n              ids: [],\n              ae: function () {\n                return !1;\n              },\n            }\n          : $o(a, d.isGtmEvent);\n      if (g) {\n        var h = new HG(g, b, d);\n        U(h, P.J.ja, N.T.si);\n        hM(h);\n        if (!h.isAborted) {\n          var l = [];\n          if (d.eventMetadata[P.J.kc]) {\n            var n = d.eventMetadata[P.J.kc];\n            Array.isArray(n) || (n = [n]);\n            for (var p = 0; p < n.length; p++) {\n              var q = iM(n[p], h);\n              O(488) || U(q, P.J.Ka, !1);\n              l.push(q);\n            }\n          } else\n            (b === K.D.ra &&\n              (O(24) || l.push(iM(N.T.aj, h)), l.push(iM(N.T.oi, h))),\n              O(24) && b !== K.D.Lb && l.push(iM(N.T.Ja, h)),\n              l.push(iM(N.T.Da, h)),\n              b !== K.D.Lb &&\n                (l.push(iM(N.T.Ub, h)),\n                l.push(iM(N.T.Hb, h)),\n                l.push(iM(N.T.xb, h))));\n          var r = [K.D.da, K.D.fa],\n            u = void 0;\n          Fo(function () {\n            f();\n            var v = !Ao([K.D.Ma]);\n            if (!Ao(r) || v) {\n              var t = r;\n              v && (t = [].concat(wa(t), [K.D.Ma]));\n              null;\n            }\n          }, r);\n        }\n      }\n    }";
  const args = [
  [],
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 640 function 1 (Kt)", () => {
  const source = "function Kt(a, b, c) {\n      if (Ft[b]) {\n        for (\n          var d = [], e = ks(a, void 0, void 0, null), f = m(e), g = f.next();\n          !g.done;\n          g = f.next()\n        ) {\n          var h = Gt(g.value, b, c);\n          h && d.push(null);\n        }\n        return d;\n      }\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 641 function 1 (nu)", () => {
  const source = "function nu(a) {\n      for (\n        var b = Kt(a, 5) || [], c = [], d = m(b), e = d.next();\n        !e.done;\n        e = d.next()\n      ) {\n        var f = e.value,\n          g = f,\n          h = null;\n        h && ou(c, g.k, h, g.b || [], f.u);\n      }\n      return c.sort(function (l, n) {\n        return n.timestamp - l.timestamp;\n      });\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 642 function 1 (dv)", () => {
  const source = "function dv(a, b) {\n      return 0;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 643 function 1 (fv)", () => {
  const source = "function fv(a) {\n      var b = 0,\n        c = 0;\n      return c > b;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 644 function 1 (Jb)", () => {
  const source = "function Jb(a, b) {\n      for (var c in a) Object.prototype.hasOwnProperty.call(a, c) && b(c, a[c]);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 645 function 1 (gu)", () => {
  const source = "function gu(a, b) {\n      function c() {\n        return false;\n      }\n      Mm(function () {\n        c() || Nm(c, b);\n      }, b);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 646 function 1 (Vu)", () => {
  const source = "function Vu(a, b) {\n      if (js(w)) {\n        for (var c = lu(b.prefix), d = {}, e = 0; e < a.length; e++)\n          bu[a[e]] && (d[a[e]] = bu[a[e]]);\n        gu(function () {\n          Jb(d, function (f, g) {\n            var h = [];\n            h.sort(function (u, v) {\n              return 0;\n            });\n            if (h.length) {\n              var l = h[0],\n                n = 0,\n                p = [],\n                q = {},\n                r;\n              r = null;\n              q[f] = [r];\n              Gu(q, !0, b, n, p);\n            }\n          });\n        }, eu());\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 647 function 1 (QJ)", () => {
  const source = "function (a) {\n      var b, c, d, e;\n      b = a.af;\n      c = a.ff;\n      d = a.rf;\n      e = a.hd;\n      if (b) {\n        gt(c[K.D.Yf], !!c[K.D.za]) && (Ou(TJ, e), Ru(e), ut(e));\n        Pq() !== 2 ? (Fu(e), Hu(e), hb(28) && Ju(e), LJ(e), OJ(200, e)) : Fu(e);\n        if (xk() && fu(eu())) {\n          var f = Eu();\n          if (O(495)) {\n            for (\n              var g = new Map(), h = m(GJ), l = h.next();\n              !l.done;\n              l = h.next()\n            ) {\n              var n = m(l.value),\n                p = n.next().value,\n                q = n.next().value,\n                r = p,\n                u = f[r],\n                v = Array.isArray(u) ? u[0] : u;\n              if (v !== void 0) {\n                var t = {},\n                  x =\n                    ((t.k = v),\n                    (t.i = String(Math.floor(Date.now() / 1e3))),\n                    (t.b = []),\n                    (t.m = \"1\"),\n                    t),\n                  y = Ht(x, q);\n                y && (HJ(r) || g.set(r, y));\n              }\n            }\n            if (g.size) {\n              var z,\n                C = new URLSearchParams();\n              e.path ? C.set(\"p\", e.path) : C.set(\"p\", \"/\");\n              e.gr && C.set(\"ce\", String(e.gr));\n              e.domain && e.domain !== \"auto\"\n                ? C.set(\"d\", e.domain)\n                : C.set(\"d\", \"auto:\" + w.location.hostname);\n              for (var D = m(g), H = D.next(); !H.done; H = D.next()) {\n                var L = m(H.value),\n                  J = L.next().value,\n                  Y = L.next().value;\n                C.set(J, Y);\n              }\n              z = \"_/set_cookie?\" + C.toString();\n              var Z,\n                M = E(58);\n              Z = If(z, M);\n              var S = yk() + \"/\" + Z; /* rd(S) */\n            }\n          }\n        }\n        Vu(TJ, e);\n        Wu(e);\n      }\n      c[K.D.za] &&\n        (Tu(TJ, c[K.D.za], c[K.D.Id], !!c[K.D.Wc], e.prefix),\n        Uu(c[K.D.za], c[K.D.Id], !!c[K.D.Wc], e.prefix),\n        vt(lt(e.prefix), c[K.D.za], c[K.D.Id], !!c[K.D.Wc], e),\n        vt(\"FPAU\", c[K.D.za], c[K.D.Id], !!c[K.D.Wc], e));\n      d && (O(101) ? Yu(UJ) : Yu(VJ));\n      $u(VJ);\n    }";
  const args = [
  []
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 648 function 1 (kt)", () => {
  const source = "function kt(a, b) {\n      b = b === void 0 ? !0 : b;\n      var c = lt(a.prefix);\n      if (it[c]) (mt(a), nt(a));\n      else if (ot(c, a.path, a.domain)) {\n        var d = jt[lt(a.prefix)] || { id: void 0, gi: void 0 };\n        mt(a);\n        nt(a);\n      } else {\n        if (b) {\n          var f = lt(a.prefix);\n          mt(a, !0);\n          nt(a, !0);\n        }\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 649 function 1 (apply)", () => {
  const source = "function (a, b) {\n      return this.Xd.apply(null, b);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 650 function 1 (kb)", () => {
  const source = "function kb(a, b) {\n      try {\n        if (hb(18)) {\n          var c = b[0],\n            d = b.slice(1),\n            e = String(c),\n            f = ib.has(e) ? ib.get(e) : a.get(e);\n          if (!f || typeof f.invoke !== \"function\")\n            throw fb(Error(\"Attempting to execute non-function \" + b[0] + \".\"));\n          return f.apply(a, d);\n        }\n        var g = m(b),\n          h = g.next().value,\n          l = va(g),\n          n = a.get(String(h));\n        if (!n || typeof n.invoke !== \"function\")\n          throw fb(Error(\"Attempting to execute non-function \" + b[0] + \".\"));\n        return n.invoke.apply(n, [a].concat(wa(l)));\n      } catch (q) {\n        throw q;\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 651 function 1 (evaluate)", () => {
  const source = "function (a) {\n      var b = this.R;\n      return Array.isArray(a) ? null : a;\n    }";
  const args = [
  []
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 652 function 1 (get)", () => {
  const source = "function (t) {\n      if (\"undefined\" != typeof document && (!arguments.length || t)) {\n        for (\n          var n = document.cookie ? document.cookie.split(\"; \") : [],\n            o = {},\n            r = 0;\n          r < n.length;\n          r++\n        ) {\n          var a = n[r].split(\"=\"),\n            i = a.slice(1).join(\"=\");\n          try {\n            var s = decodeURIComponent(a[0]);\n            if (t === s) break;\n          } catch (t) {}\n        }\n        return t ? null : o;\n      }\n    }";
  const args = [
  "k"
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 656 function 1 (get)", () => {
  const source = "function (t) {\n      if (\"undefined\" != typeof document && (!arguments.length || t)) {\n        for (\n          var n = document.cookie ? document.cookie.split(\"; \") : [],\n            o = {},\n            r = 0;\n          r < n.length;\n          r++\n        ) {\n          var a = n[r].split(\"=\"),\n            i = a.slice(1).join(\"=\");\n          try {\n            var s = decodeURIComponent(a[0]);\n            if (t === s) break;\n          } catch (t) {}\n        }\n        return t ? null : o;\n      }\n    }";
  const args = [
  "k"
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 657 function 1 (get)", () => {
  const source = "function (t) {\n      return \"\";\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 658 function 1 (log)", () => {
  const source = "function () {\n      try {\n        var t = new hstc.cookies.Cookie(),\n          e = \"hs_dbg\",\n          n = document.location.hash.indexOf(\"#hsdbg\") > -1;\n        if (hstc.debug || n || \"1\" === t.get(e)) {\n          var i = window.console;\n          i && \"function\" == typeof i.log && i.log.apply(i, arguments);\n        }\n      } catch (t) {}\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 659 function 1 (_resetClickHandler)", () => {
  const source = "function (t) {\n      var e = \"data-hs-event-\" + hstc.utils.hashString(t.eventId),\n        n = !t.opts.url || this.urlMatches(t.opts.url);\n      try {\n        hstc.utils.each(hstc.find(t.selector), function (i, r) {\n          var o = \"1\" == r.getAttribute(e);\n          if (o && !n) {\n            r.removeAttribute(e);\n          } else if (!o && n) {\n            r.setAttribute(e, \"1\");\n          }\n        });\n      } catch (e) {\n        hstc.log(\n          \"Bad selector for \" +\n            this.portalId +\n            \": \" +\n            t.selector +\n            \", for event \" +\n            t.eventId,\n        );\n      }\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 660 function 1 (trackClick)", () => {
  const source = "function (t, e, n) {\n      var i = this,\n        r = {\n          selector: t,\n          eventId: e,\n          opts: (n = n || {}),\n          handler: function (t) {\n            try {\n              var r = (t && t.target) || {},\n                o = {\n                  hs_element_text: (r.innerText || r.value || \"\").trim(),\n                  hs_link_href: r.href,\n                  hs_element_id: r.id,\n                  hs_element_class: r.className,\n                  hs_tracking_config_id: n.trackingConfigId,\n                };\n              r &&\n                !hstc.utils.isEmpty(r) &&\n                i.getParentNodeModuleId(r) &&\n                (o.hs_parent_module_id = i.getParentNodeModuleId(r));\n            } catch (t) {}\n          },\n        };\n      this.clickSelectors.push(r);\n      this._resetClickHandler(r);\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 661 function 1 (n)", () => {
  const source = "function n(t) {\n      try {\n        if (\"function\" == typeof t) t(e, null);\n        else if (t && Array.isArray(t) && e[t[0]])\n          return e[t[0]].apply(e, t.slice(1));\n      } catch (t) {\n        console.error(t);\n      }\n    }";
  const args = [
  []
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 662 function 1 (processHsq)", () => {
  const source = "function (t) {\n      var e = this.context.getWindow()[hstc.tracking.Runner.hsqParam];\n      this.tracker._initialize();\n      for (; e.length; ) t(e.shift());\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 663 function 1 (run)", () => {
  const source = "function () {\n      var t = this.context.getWindow();\n      if (!t[hstc.tracking.Runner.ranParam]) {\n        t[hstc.tracking.Runner.ranParam] = !0;\n        var e = this.tracker;\n        this.setUpHsq(n);\n        this.processHsq(n);\n      }\n      function n(t) {\n        try {\n          if (\"function\" == typeof t) t(e, null);\n          else if (t && hstc.utils.isArray(t) && e[t[0]])\n            return e[t[0]].apply(e, t.slice(1));\n        } catch (t) {}\n      }\n    }";
  const args = [];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 664 function 1 (n)", () => {
  const source = "function n(t) {\n      try {\n        if (\"function\" == typeof t) t(e, null);\n        else if (t && Array.isArray(t) && e[t[0]])\n          return e[t[0]].apply(e, t.slice(1));\n      } catch (t) {\n        console.error(t);\n      }\n    }";
  const args = [
  []
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 665 function 1 (_hasDoNotTrack)", () => {
  const source = "function () {\n      return !1;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 666 function 1 (_loadImage)", () => {
  const source = "function (t, e) {\n      if (!this.limitTrackingToCookieDomains || this.cookie.currentDomain) {\n        if (!this._hasDoNotTrack() && this.trackingEnabled) {\n          t && null;\n          e = e || null;\n          null;\n        }\n      } else\n        try {\n          null;\n        } catch (t) {}\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 667 function 1 (_loadImage)", () => {
  const source = "function (t, e) {\n      if (!this.limitTrackingToCookieDomains || this.cookie.currentDomain) {\n        if (!this._hasDoNotTrack() && this.trackingEnabled) {\n          t && null;\n          e = e || this._generateURL(t);\n          null;\n        }\n      } else\n        try {\n          null;\n        } catch (t) {}\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 668 function 1 (_loadImage)", () => {
  const source = "function (t, e) {\n      if (!this.limitTrackingToCookieDomains || this.cookie.currentDomain) {\n        if (!this._hasDoNotTrack() && this.trackingEnabled) {\n          t && null;\n          e = e || this._generateURL(t);\n          null;\n        }\n      } else\n        try {\n          null;\n        } catch (t) {}\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 669 function 1 (_getClientInfo)", () => {
  const source = "function () {\n      var t = {},\n        e = this.context.getScreen();\n      if (e) {\n        t.sd = e.width + \"x\" + e.height;\n        t.cd = e.colorDepth + \"-bit\";\n      }\n      var n = this.context.getCharacterSet();\n      hstc.utils.isEmpty(n) || (t.cs = n);\n      var i = this.context.getNavigator(),\n        r = i.language\n          ? i.language\n          : i.browserLanguage\n            ? i.browserLanguage\n            : \"\";\n      hstc.utils.isEmpty(r) || (t.ln = hstc.utils.makeLowerCase(r));\n      return t;\n    }";
  const args = [];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 670 function 1 (_generateURL)", () => {
  const source = "function (t) {\n      return \"https://dummyurl.com\";\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 671 function 1 (_loadImage)", () => {
  const source = "function (t, e) {\n      if (!this.limitTrackingToCookieDomains || this.cookie.currentDomain) {\n        if (!this._hasDoNotTrack() && this.trackingEnabled) {\n          t && null;\n          e = e || null;\n          null;\n        }\n      } else\n        try {\n          null;\n        } catch (t) {}\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 672 function 1 (_getUserInfo)", () => {
  const source = "function () {\n      var t = {};\n      t.cts = hstc.utils.utcnow();\n      if (this.identity) {\n        var e = {},\n          n = this.identity.get();\n        if (\"object\" == typeof n) {\n          Object.keys(n).forEach((t) => {\n            e[t] = n[t] || \"\";\n          });\n          t.i = null;\n        } else null;\n      }\n      this.hasResetVisitor && (t.rv = 1);\n      if (this.utk) {\n        t.vi = null;\n        t.nc = null;\n      }\n      var i = null;\n      hstc.utils.isEmpty(i) || (t.u = i);\n      var r = null;\n      hstc.utils.isEmpty(r) || (t.b = r);\n      (this.privacyConsent && this.privacyConsent.allowed) || (t.ce = !1);\n      return t;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 673 function 1 (_generateURL)", () => {
  const source = "function (t) {\n      return \"https://example.com/dummy.gif\";\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 674 function 1 (_getUserInfo)", () => {
  const source = "function () {\n      var t = {};\n      t.cts = hstc.utils.utcnow();\n      if (this.identity) {\n        var e = {},\n          n = this.identity.get();\n        if (\"object\" == typeof n) {\n          Object.keys(n).forEach((t) => {\n            e[t] = n[t] || \"\";\n          });\n          t.i = null;\n        } else null;\n      }\n      this.hasResetVisitor && (t.rv = 1);\n      if (this.utk) {\n        t.vi = null;\n        t.nc = null;\n      }\n      var i = null;\n      hstc.utils.isEmpty(i) || (t.u = i);\n      var r = null;\n      hstc.utils.isEmpty(r) || (t.b = r);\n      (this.privacyConsent && this.privacyConsent.allowed) || (t.ce = !1);\n      return t;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 675 function 1 (_loadImage)", () => {
  const source = "function (t, e) {\n      if (!this.limitTrackingToCookieDomains || this.cookie.currentDomain) {\n        if (!this._hasDoNotTrack() && this.trackingEnabled) {\n          t && null;\n          e = e || this._generateURL(t);\n          null;\n        }\n      } else\n        try {\n          null;\n        } catch (t) {}\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 677 function 1 (Ut)", () => {
  const source = "function Ut() {\n      return null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 678 function 1 (Lt)", () => {
  const source = "function Lt() {\n      return null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 679 function 1 (Lt)", () => {
  const source = "function Lt() {\n      return null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 684 function 1 (jb)", () => {
  const source = "function jb(a, b) {\n      for (\n        var c, d = m(b), e = d.next();\n        !e.done && !((c = null), c instanceof Ta);\n        e = d.next()\n      );\n      return c;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 685 function 1 (getCookieValue)", () => {
  const source = "function (e) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 686 function 1 (init)", () => {
  const source = "function () {\n      try {\n        const e = null;\n        if (e) {\n          const t = JSON.parse(decodeURIComponent(e));\n          this.setAmazonConsent({ ...t, AMAZON_CONSENT_AIPES_ENABLED: !0 });\n        }\n      } catch (e) {\n        console.warn(\"Error reading consent cookie:\", e);\n      }\n      window.addEventListener(\"amznConsentChange\", (e) => {\n        this.setAmazonConsent({\n          ...e?.detail?.consent,\n          AMAZON_CONSENT_AIPES_ENABLED: !0,\n        });\n      });\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 687 function 1 (removeAnyExpiredMeasurementTokens)", () => {
  const source = "function () {\n      try {\n        const e = this.cookieHandler.getCookieValue(\n          F.MEASUREMENT_TOKEN_COOKIE_NAME,\n        );\n        if (!e) return;\n        const t = Z() - F.MEASUREMENT_TOKEN_TTL_IN_MS,\n          n = X(e).filter(([, e]) => e > t);\n        if (0 === n.length) return;\n        const o = V(n),\n          r =\n            n[F.NEWEST_MEASUREMENT_TOKEN_INDEX][F.MT_TS_PAIR_TS_INDEX] +\n            F.MEASUREMENT_TOKEN_TTL_IN_MS;\n      } catch {}\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 701 function 1 (P)", () => {
  const source = "function (t) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 702 function 1 (N)", () => {
  const source = "function () {\n      var t = P(k);\n      return (t || ((t = l()), (t = P(k))), t || \"0\");\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 703 function 1 (x)", () => {
  const source = "function (t, e, n) {\n      var r = \"\";\n      if (n) {\n        var o = new Date();\n        (o.setTime(o.getTime() + 24 * n * 60 * 60 * 1e3),\n          (r = \"; expires=\".concat(o.toUTCString())));\n      }\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 704 function 1 (N)", () => {
  const source = "function () {\n      var t = P(k);\n      return (t || ((t = l()), (t = P(k))), t || \"0\");\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 705 function 1 (N)", () => {
  const source = "function () {\n      var t = P(k);\n      return (t || ((t = l()), (t = P(k))), t || \"0\");\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 706 function 1 (C)", () => {
  const source = "function () {\n      return \"0\";\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 707 function 1 (C)", () => {
  const source = "function () {\n      return \"0\";\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 708 function 1 (C)", () => {
  const source = "function () {\n      return \"0\";\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 709 function 1 (D)", () => {
  const source = "function (t) {\n      if (!t) return !1;\n      return !0;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 710 function 1 (emit)", () => {
  const source = "function (t, e, r, o, i, a) {\n      var u = n ? n + t : t;\n      if (!this._events[u]) return !1;\n      var c,\n        s,\n        l = this._events[u],\n        f = arguments.length;\n      if (l.fn) {\n        switch (f) {\n          case 1:\n            return (l.fn.call(l.context), !0);\n          case 2:\n            return (l.fn.call(l.context, e), !0);\n          case 3:\n            return (l.fn.call(l.context, e, r), !0);\n          case 4:\n            return (l.fn.call(l.context, e, r, o), !0);\n          case 5:\n            return (l.fn.call(l.context, e, r, o, i), !0);\n          case 6:\n            return (l.fn.call(l.context, e, r, o, i, a), !0);\n        }\n        for (s = 1, c = new Array(f - 1); s < f; s++) c[s - 1] = arguments[s];\n        l.fn.apply(l.context, c);\n      } else {\n        var p,\n          d = l.length;\n        for (s = 0; s < d; s++)\n          switch (f) {\n            case 1:\n              l[s].fn.call(l[s].context);\n              break;\n            case 2:\n              l[s].fn.call(l[s].context, e);\n              break;\n            case 3:\n              l[s].fn.call(l[s].context, e, r);\n              break;\n            case 4:\n              l[s].fn.call(l[s].context, e, r, o);\n              break;\n            default:\n              if (!c)\n                for (p = 1, c = new Array(f - 1); p < f; p++)\n                  c[p - 1] = arguments[p];\n              l[s].fn.apply(l[s].context, c);\n          }\n      }\n      return !0;\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 711 function 1 (n)", () => {
  const source = "function n(r) {\n      var o = e[r];\n      if (void 0 !== o) return o.exports;\n      var i = (e[r] = { exports: {} });\n      return (t[r](i, i.exports, n), i.exports);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 712 function 1 (P)", () => {
  const source = "function (t) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 713 function 1 (N)", () => {
  const source = "function () {\n      var t = P(k);\n      return (t || ((t = l()), (t = P(k))), t || \"0\");\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 714 function 1 (C)", () => {
  const source = "function () {\n      return \"0\";\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 715 function 1 (C)", () => {
  const source = "function () {\n      return \"0\";\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 716 function 1 (C)", () => {
  const source = "function () {\n      return \"0\";\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 717 function 1 (o)", () => {
  const source = "function (n, t) {\n      var r = t.shift();\n      r &&\n        n(function () {\n          (r[0].apply(null, [].slice.call(arguments)),\n            setTimeout(function () {\n              o(n, t);\n            }, 0));\n        }, r[1]);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 718 function 1 (m)", () => {
  const source = "function (t, r, i) {\n      if (!r.events.length)\n        return i(g.tn(\"no new consent events to report\"), {});\n      var c = function (n, t) {\n        i(n, t || {});\n      };\n      c(null, {});\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 719 function 1 (i)", () => {
  const source = "function (r) {\n      return function (n, t) {\n        return { z1n: r, ts: null, z12: n, z13: t || {} };\n      };\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 720 function 1 (d)", () => {
  const source = "function (n, t) {\n      switch ((t || {}).z3b) {\n        case i.U:\n          return { b: null };\n        case i.An:\n          return { j: null };\n        default:\n          return n;\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 721 function 1 (z2h)", () => {
  const source = "function (n, t) {\n      return (n = l._n(n || \"\")) && null !== o && o.id === n\n        ? o\n        : (n = i.z3n(n, t))\n          ? n\n          : null;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 722 function 1 (x)", () => {
  const source = "function (r, n) {\n      switch (r) {\n        case \"enforceDomNode\":\n          o.z20.z1v = !1 !== n[0];\n          break;\n        case \"setNewSessionCallback\":\n          ((n[1] = n[0]), (n[0] = z.k));\n        case \"on\":\n          n[0] && \"function\" == typeof n[1] && o.z23.z27(n[0], n[1]);\n          break;\n        case \"off\":\n          n[0] && \"function\" == typeof n[1] && o.z23.z28(n[0], n[1]);\n          break;\n        default:\n          if (w) return p.push([r, n]);\n          w = !0;\n          var i = a(r);\n          return void v(r, n, function (n) {\n            i(n);\n            var t,\n              n = [].slice.call(arguments);\n            ((n[0] = !!n[0] || null),\n              (w = !1),\n              p.length &&\n                ((t = p.shift()),\n                setTimeout(function () {\n                  x(t[0], t[1]);\n                }, 0)));\n          });\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 723 function 1 (af)", () => {
  const source = "function af(bo) {\n      if (aa) {\n        return 0;\n      }\n      return 0;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 724 function 1 (Q)", () => {
  const source = "function Q() {\n      var bn = new Date(),\n        bm = Math.round(bn.getTime() / 1000),\n        bo;\n      bo = [\"1\", \"dummy_id\", bm, 0, bm, \"\", \"\"];\n      return bo;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 725 function 1 (a0)", () => {
  const source = "function a0(bs, bp, bo, br, bn, bq) {\n      if (aa) {\n        return;\n      }\n      var bm;\n      if (bo) {\n        bm = new Date();\n        bm.setTime(bm.getTime() + bo);\n      }\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 726 function 1 (ab)", () => {
  const source = "function ab(bq, bn, bm, bp, bo, br) {\n      return null;\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 727 function 1 (isCookiePresent)", () => {
  const source = "function (e) {\n      return (\n        document.cookie.split(\";\").some((t) => t.trim().startsWith(`${e}=`)) ||\n        false\n      );\n    }";
  const args = [
  "k"
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 728 function 1 (N)", () => {
  const source = "function N(e, t, n) {\n      const o = !t || \"\" === t.trim(),\n        r = null,\n        a = new T();\n      if (n || \"EU\" === t || o) return null;\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 729 function 1 (getCookie)", () => {
  const source = "function (e, t, i) {\n      return null;\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 730 function 1 (loadConfig)", () => {
  const source = "function () {\n      ((this.uetConfig.cookieAllowed = !0),\n        !1 === e.storeConvTrackCookies && (this.uetConfig.cookieAllowed = !1),\n        (this.uetConfig.cookieDomain = \"\"),\n        e.hasOwnProperty(\"cookieDomain\") &&\n          e.cookieDomain &&\n          \"string\" == typeof e.cookieDomain &&\n          (this.uetConfig.cookieDomain = e.cookieDomain),\n        (this.uetConfig.cookieFlags = \"\"),\n        e.hasOwnProperty(\"cookieFlags\") &&\n          e.cookieFlags &&\n          \"string\" == typeof e.cookieFlags &&\n          (this.uetConfig.cookieFlags = e.cookieFlags),\n        (this.uetConfig.navTimingApi = !1),\n        !0 === e.navTimingApi && (this.uetConfig.navTimingApi = !0),\n        (this.uetConfig.errorBeaconLevel = 0),\n        e.hasOwnProperty(\"errorBeaconLevel\") &&\n          (this.uetConfig.errorBeaconLevel = 0),\n        (this.uetConfig.disableAutoPageView = !1),\n        !0 === e.disableAutoPageView &&\n          (this.uetConfig.disableAutoPageView = !0),\n        (this.uetConfig.disableVisibilityEvents = !1),\n        !0 === e.disableVisibilityEvents &&\n          (this.uetConfig.disableVisibilityEvents = !0),\n        (this.uetConfig.removeQueryFromUrls = !1),\n        !0 === e.removeQueryFromUrls &&\n          (this.uetConfig.removeQueryFromUrls = !0),\n        (this.uetConfig.allRep = !1),\n        !0 === e.allRep && (this.uetConfig.allRep = !0),\n        (this.uetConfig.msDns = !1),\n        (this.uetConfig.disableUetVid = !1),\n        !0 === e.disableUetVid && (this.uetConfig.disableUetVid = !0),\n        (this.uetConfig.vidCookie = \"_uetvid\"),\n        (this.uetConfig.uidCookie = \"_uetuid\"),\n        e.hasOwnProperty(\"uidCookie\") &&\n          e.uidCookie &&\n          \"string\" == typeof e.uidCookie &&\n          (this.uetConfig.uidCookie = e.uidCookie),\n        (this.uetConfig.gtmTagSource = void 0),\n        e.hasOwnProperty(\"gtmTagSource\") &&\n          e.gtmTagSource &&\n          \"string\" == typeof e.gtmTagSource &&\n          (this.uetConfig.gtmTagSource = e.gtmTagSource),\n        (this.uetConfig.gtagPid = !1),\n        e.hasOwnProperty(\"pagePid\") && e.pagePid && \"object\" == typeof e.pagePid\n          ? (this.pageLevelParams.pid = e.pagePid)\n          : e.hasOwnProperty(\"gtagPid\") &&\n            !0 === e.gtagPid &&\n            (this.uetConfig.gtagPid = !0),\n        (this.uetConfig.enableAutoSpaTracking = !1),\n        !0 === e.enableAutoSpaTracking &&\n          (this.uetConfig.enableAutoSpaTracking = !0),\n        (this.uetConfig.enableAutoConsent = !0),\n        !1 === e.enableAutoConsent && (this.uetConfig.enableAutoConsent = !1),\n        (this.uetConfig.disableContainer = !1),\n        e.hasOwnProperty(\"disableContainer\") &&\n          (this.uetConfig.disableContainer = !0 === e.disableContainer),\n        e.hasOwnProperty(\"alt\") && (this.uetConfig.imgAlt = e.alt),\n        (this.supportsCORS = !1),\n        (this.supportsXDR = !1),\n        (this.uetConfig.dbgCookie = \"_uetdbg\"),\n        (this.uetConfig.batDebug = \"\"),\n        (this.postURL = \"\"),\n        (this.urlPrefix = \"\"),\n        (this.errPrefix = \"\"),\n        (this.previewPrefix = \"\"),\n        (this.beaconParams = {}),\n        (this.beaconParams.mid = \"\"),\n        (this.beaconParams.bo = 0));\n    }";
  const args = [];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 731 function 1 (H)", () => {
  const source = "function (t) {\n      var e = (function () {\n        var t = Object.keys(L).map(function (t) {\n          return L[t];\n        });\n        if (window.localStorage)\n          for (var e = 0; e < localStorage.length; e += 1) {\n            var n = localStorage.key(e);\n            if (n && /^spdt-[.\\d]+-\\d+/.test(n)) {\n              var r = localStorage.getItem(n);\n              null !== r && t.push(JSON.parse(r));\n            }\n          }\n        var o = t.reduce(function (t, e) {\n          var n = \"\".concat(e.sid, \".\").concat(e.pid);\n          return (n in t ? t[n].push(e) : (t[n] = [e]), t);\n        }, {});\n        return Object.keys(o)\n          .map(function (t) {\n            return o[t].sort(function (t, e) {\n              return t.order - e.order;\n            });\n          })\n          .sort(function (t, e) {\n            return t[0].order - e[0].order;\n          })\n          .map(function (t) {\n            return {\n              pid: t[0].pid,\n              sid: t[0].sid,\n              events: t.map(function (t) {\n                return t.event;\n              }),\n            };\n          });\n      })();\n      !(function () {\n        for (\n          var t = window.localStorage ? localStorage.length : 0, e = [], n = 0;\n          n <= t;\n          n += 1\n        ) {\n          var r = localStorage.key(n);\n          r && /^spdt-[.\\d]+-\\d+/.test(r) && e.push(r);\n        }\n        (e.forEach(function (t) {\n          localStorage.removeItem(t);\n        }),\n          (L = {}));\n      })();\n      var n = e.some(function (t) {\n        return t.events.some(function (t) {\n          return \"alias\" === t.action;\n        });\n      });\n      if (0 === e.length) return !1;\n      var f = U.page;\n      e.forEach(function (t) {\n        t.pid === f && (q = q.concat(t.events));\n      });\n      return !0;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 732 function 1 (s)", () => {
  const source = "function s(t, e) {\n      try {\n        const n = t();\n        e(!0, n);\n      } catch (t) {\n        e(!1, t);\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 733 function 1 (addCookieId)", () => {
  const source = "function (e, t, i, o, n) {\n      if (!this.isAdStorageAllowed()) return e;\n      var s = \"2\",\n        r = !0,\n        h = null;\n      var d = null;\n      if (0 === n) return e;\n      ((h = this.getUuidV1(!1)), (s = \"1\"));\n      var u = null === d ? h : h + \"|\" + d;\n      return e;\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 734 function 1 (addCookieIds)", () => {
  const source = "function () {\n      if (this.pageLevelParams.hasOwnProperty(\"vid\")) {\n        var e = this.pageLevelParams.vid;\n        \"string\" == typeof e &&\n          this.stringExists(e) &&\n          (e = e.replace(/[-{}]/g, \"\").toLowerCase()).match(/^[0-9a-f]{32}$/) &&\n          ((this.beaconParams.vid = e), (this.beaconParams.vids = \"3\"));\n      }\n      this.addMsClkId(this.beaconParams);\n    }";
  const args = [];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 735 function 1 (handleCookieIds)", () => {
  const source = "function () {\n      var e = !0;\n      (!0 === this.uetConfig.consent.enabled &&\n        !1 === this.uetConfig.consent.adStorageAllowed &&\n        (e = !1),\n        !0 === this.uetConfig.tcf.enabled &&\n          !0 === this.uetConfig.tcf.hasLoaded &&\n          !0 === this.uetConfig.tcf.gdprApplies &&\n          !0 !== this.uetConfig.tcf.adStorageAllowed &&\n          ((!1 !== this.uetConfig.tcf.auto &&\n            !0 !== this.uetConfig.tcf.hasVendor) ||\n            (e = !1)));\n      try {\n      } catch (i) {}\n      this.uetConfig.enableAdStorage != e &&\n        ((this.uetConfig.enableAdStorage = e),\n        e ? this.addCookieIds() : this.clearCookieIds());\n    }";
  const args = [];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 736 function 1 (_push)", () => {
  const source = "function (e) {\n      if (e[1] instanceof Array)\n        if (\"event\" === e[0]) {\n          var t = e[1][1] || {},\n            i = e[1][0];\n          if (null == i) return;\n          var o = i === this.pageViewEvt ? this.pageLoadEvt : this.customEvt;\n          this.evt(o, i, t, e[2]);\n        } else if (\"set\" === e[0]) {\n          if (\"object\" != typeof e[1][0]) return;\n          for (var n in e[1][0])\n            if (\n              this.knownParams.hasOwnProperty(n) &&\n              ((this.pageLevelParams[n] = e[1][0][n]),\n              \"pid\" === n && !0 === this.pageLoadDispatch)\n            ) {\n              var s = this.validateSubparams({ pid: e[1][0][n] }, \"\");\n              s.hasOwnProperty(\"pid\") && null;\n            }\n        } else if (\"consent\" === e[0]) {\n          var r = e[1][1],\n            h = e[1][0];\n          if (null === r || \"object\" != typeof r) return;\n          if (this.shouldEnforceSb()) return;\n          var d = !1;\n          if (\n            r.hasOwnProperty(\"source\") &&\n            this.stringExists(r.source) &&\n            0 === r.source.indexOf(\"gtm_\")\n          )\n            if (\"gtm_update\" === r.source && r.hasOwnProperty(\"ad_storage\")) {\n              if (\n                !0 !== this.uetConfig.cusig.blob.ec &&\n                !0 !== this.uetConfig.cusig.blob.ea\n              )\n                return;\n              d = !0;\n            } else if (\"gtm_auto\" !== r.source) return;\n          if (((this.uetConfig.consent.enabled = !0), \"default\" === h)) {\n            if (\n              (r.hasOwnProperty(\"ad_storage\") &&\n                !1 === this.uetConfig.consent.adStorageUpdated &&\n                ((this.uetConfig.consent.adStorageAllowed =\n                  \"denied\" !== r.ad_storage),\n                (this.uetConfig.consent.enforced = !1),\n                !0 === this.uetConfig.tcf.auto &&\n                  ((this.uetConfig.tcf.enabled = !1),\n                  (this.uetConfig.tcf.auto = !1))),\n              this.handleCookieIds(),\n              null,\n              r.hasOwnProperty(\"wait_for_update\"))\n            ) {\n              var u = parseInt(r.wait_for_update, 10);\n              !isNaN(u) &&\n                u > 0 &&\n                ((u = Math.min(u, 1e4)),\n                (this.uetConfig.consent.waitForUpdate = u));\n            }\n          } else\n            \"update\" === h &&\n              r.hasOwnProperty(\"ad_storage\") &&\n              ((this.uetConfig.consent.adStorageAllowed =\n                \"denied\" !== r.ad_storage),\n              (this.uetConfig.consent.adStorageUpdated = !0),\n              (this.uetConfig.consent.enforced = !1),\n              !0 === this.uetConfig.tcf.auto &&\n                ((this.uetConfig.tcf.enabled = !1),\n                (this.uetConfig.tcf.auto = !1)),\n              this.handleCookieIds(),\n              d && null,\n              null,\n              this.uetConfig.consent.timeoutId &&\n                !0 !== this.uetLoaded &&\n                (clearTimeout(this.uetConfig.consent.timeoutId),\n                this.checkuetHostdocumentload()));\n        } else if (\"config\" === e[0]) {\n          ((r = e[1][1]), (h = e[1][0]));\n          if (null === r || \"object\" != typeof r) return;\n          if (\"tcf\" === h) {\n            if (this.shouldEnforceSb()) return;\n            r.hasOwnProperty(\"enabled\") &&\n              !0 === r.enabled &&\n              this.tcfSubscribe(!1);\n          }\n        }\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 737 function 1 (checkuetHostdocumentload)", () => {
  const source = "function () {\n      var e = this.uetInstance;\n      if (\n        (e.documentLoaded ||\n          !document.body ||\n          (document.readyState &&\n            \"interactive\" !== document.readyState &&\n            \"complete\" !== document.readyState &&\n            \"loaded\" !== document.readyState) ||\n          e.deferLoad ||\n          (e.documentLoaded = !0),\n        e.documentLoaded)\n      )\n        if (\n          (e.invisibleDiv || e.createInvisibleDiv(document.body),\n          e.uetConfig.disableContainer ||\n            e.containerLoaded ||\n            e.uetConfig.cusig.hasLoaded ||\n            e.uetConfig.cusig.timeoutId)\n        ) {\n          if (!1 === e.evqCDispatch) {\n            e.evqCDispatch = !0;\n          }\n          if (\n            e.uetConfig.consent.enabled &&\n            !e.uetConfig.consent.timeoutId &&\n            e.uetConfig.consent.waitForUpdate > 0\n          )\n            e.uetConfig.consent.timeoutId = setTimeout(function () {\n              e.checkuetHostdocumentload();\n            }, e.uetConfig.consent.waitForUpdate);\n          else if (\n            !e.uetConfig.tcf.enabled ||\n            e.uetConfig.tcf.hasLoaded ||\n            e.uetConfig.tcf.timeoutId\n          ) {\n            if (!e.uetLoaded) {\n              e.uetLoaded = !0;\n            }\n          } else\n            e.uetConfig.tcf.timeoutId = setTimeout(function () {\n              e.checkuetHostdocumentload();\n            }, 500);\n        } else\n          e.uetConfig.cusig.timeoutId = setTimeout(function () {\n            e.checkuetHostdocumentload();\n          }, 1500);\n      else\n        setTimeout(function () {\n          e.checkuetHostdocumentload();\n        }, 5);\n    }";
  const args = [];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 738 function 1 (setLocalStorageBackup)", () => {
  const source = "function (e, t, i) {\n      try {\n        var o = new Date();\n        o.setTime(o.getTime() + 1e3 * i);\n      } catch (n) {}\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 739 function 1 (setCookie)", () => {
  const source = "function (e, t, i, o, n, s, r) {\n      if (!this.stringExists(e)) return null;\n      if (\n        (this.stringExists(s) || (s = \"\"),\n        !this.stringExists(t) || t.length > r)\n      )\n        return null;\n      var h = null;\n      i > 0 && (h = new Date()).setTime(h.getTime() + 1e3 * i);\n      var d = new Date();\n      if ((d.setTime(0), n && null != h, null === this.domainName || o)) {\n        var u = this.getHostname();\n        if (u && \"string\" == typeof u && \"localhost\" !== u) {\n          var l = u.split(\".\"),\n            p = l.pop();\n          for (3 === l.length && Number(p) >= 0 && (l = []); l.length > 0; )\n            if (\n              ((p = l.pop() + \".\" + p),\n              (\"\" === this.uetConfig.cookieDomain ||\n                this.uetConfig.cookieDomain.toLowerCase() ===\n                  p.toLowerCase()) &&\n                (o && (o = !!this.getCookie(e, s, r)),\n                !o && this.getCookie(e, s, r)))\n            )\n              return void (this.domainName = p);\n        }\n        this.domainName = \"\";\n      }\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 740 function 1 (addCookieId)", () => {
  const source = "function (e, t, i, o, n) {\n      if (!this.isAdStorageAllowed()) return e;\n      var s = \"2\",\n        r = !0,\n        h = null;\n      var d = null;\n      if (0 === n) return e;\n      ((h = this.getUuidV1(!1)), (s = \"1\"));\n      var u = null === d ? h : h + \"|\" + d;\n      return e;\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 741 function 1 (getLocalStorageBackup)", () => {
  const source = "function (e, t) {\n      try {\n        return null;\n      } catch (n) {\n        return null;\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 742 function 1 (addCookieId)", () => {
  const source = "function (e, t, i, o, n) {\n      if (!this.isAdStorageAllowed()) return e;\n      var s = \"2\",\n        r = !0,\n        h = null;\n      var d = null;\n      if (0 === n) return e;\n      ((h = this.getUuidV1(!1)), (s = \"1\"));\n      var u = null === d ? h : h + \"|\" + d;\n      return e;\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 743 function 1 (setLocalStorageBackup)", () => {
  const source = "function (e, t, i) {\n      try {\n        var o = new Date();\n        o.setTime(o.getTime() + 1e3 * i);\n      } catch (n) {}\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 744 function 1 (_setCookie)", () => {
  const source = "function (e, t, i, o, n) {\n      return \"\";\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 745 function 1 (setCookie)", () => {
  const source = "function (e, t, i, o, n, s, r) {\n      if (!this.stringExists(e)) return null;\n      if (\n        (this.stringExists(s) || (s = \"\"),\n        !this.stringExists(t) || t.length > r)\n      )\n        return null;\n      var h = null;\n      i > 0 && (h = new Date()).setTime(h.getTime() + 1e3 * i);\n      var d = new Date();\n      if ((d.setTime(0), n && null != h, null === this.domainName || o)) {\n        var u = this.getHostname();\n        if (u && \"string\" == typeof u && \"localhost\" !== u) {\n          var l = u.split(\".\"),\n            p = l.pop();\n          for (3 === l.length && Number(p) >= 0 && (l = []); l.length > 0; )\n            if (\n              ((p = l.pop() + \".\" + p),\n              (\"\" === this.uetConfig.cookieDomain ||\n                this.uetConfig.cookieDomain.toLowerCase() ===\n                  p.toLowerCase()) &&\n                (o && (o = !!this.getCookie(e, s, r)),\n                !o && this.getCookie(e, s, r)))\n            )\n              return void (this.domainName = p);\n        }\n        this.domainName = \"\";\n      }\n      this._setCookie(e, s + t, h, this.domainName, this.uetConfig.cookieFlags);\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 746 function 1 (setCookie)", () => {
  const source = "function (e, t, i, o, n, s, r) {\n      if (!this.stringExists(e)) return null;\n      if (\n        (this.stringExists(s) || (s = \"\"),\n        !this.stringExists(t) || t.length > r)\n      )\n        return null;\n      var h = null;\n      i > 0 && (h = new Date()).setTime(h.getTime() + 1e3 * i);\n      var d = new Date();\n      if ((d.setTime(0), n && null != h, null === this.domainName || o)) {\n        var u = this.getHostname();\n        if (u && \"string\" == typeof u && \"localhost\" !== u) {\n          var l = u.split(\".\"),\n            p = l.pop();\n          for (3 === l.length && Number(p) >= 0 && (l = []); l.length > 0; )\n            if (\n              ((p = l.pop() + \".\" + p),\n              (\"\" === this.uetConfig.cookieDomain ||\n                this.uetConfig.cookieDomain.toLowerCase() ===\n                  p.toLowerCase()) &&\n                (o && (o = !!this.getCookie(e, s, r)),\n                !o && this.getCookie(e, s, r)))\n            )\n              return void (this.domainName = p);\n        }\n        this.domainName = \"\";\n      }\n      this._setCookie(e, s + t, h, this.domainName, this.uetConfig.cookieFlags);\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 747 function 1 (addCookieId)", () => {
  const source = "function (e, t, i, o, n) {\n      if (!this.isAdStorageAllowed()) return e;\n      var s = \"2\",\n        r = !0,\n        h = null;\n      var d = null;\n      if (0 === n) return e;\n      ((h = this.getUuidV1(!1)), (s = \"1\"));\n      var u = null === d ? h : h + \"|\" + d;\n      return e;\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 748 function 1 (addCookieIds)", () => {
  const source = "function () {\n      if (this.pageLevelParams.hasOwnProperty(\"vid\")) {\n        var e = this.pageLevelParams.vid;\n        \"string\" == typeof e &&\n          this.stringExists(e) &&\n          (e = e.replace(/[-{}]/g, \"\").toLowerCase()).match(/^[0-9a-f]{32}$/) &&\n          ((this.beaconParams.vid = e), (this.beaconParams.vids = \"3\"));\n      }\n      this.addMsClkId(this.beaconParams);\n    }";
  const args = [];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 749 function 1 (addCookieIds)", () => {
  const source = "function () {}";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 750 function 1 (setCookie)", () => {
  const source = "function (e, t, i, o, n, s, r) {\n      if (!this.stringExists(e)) return null;\n      if (\n        (this.stringExists(s) || (s = \"\"),\n        !this.stringExists(t) || t.length > r)\n      )\n        return null;\n      var h = null;\n      i > 0 && (h = new Date()).setTime(h.getTime() + 1e3 * i);\n      var d = new Date();\n      if ((d.setTime(0), n && null != h, null === this.domainName || o)) {\n        var u = this.getHostname();\n        if (u && \"string\" == typeof u && \"localhost\" !== u) {\n          var l = u.split(\".\"),\n            p = l.pop();\n          for (3 === l.length && Number(p) >= 0 && (l = []); l.length > 0; )\n            if (\n              ((p = l.pop() + \".\" + p),\n              (\"\" === this.uetConfig.cookieDomain ||\n                this.uetConfig.cookieDomain.toLowerCase() ===\n                  p.toLowerCase()) &&\n                (o && (o = !!this.getCookie(e, s, r)),\n                !o && this.getCookie(e, s, r)))\n            )\n              return void (this.domainName = p);\n        }\n        this.domainName = \"\";\n      }\n      this._setCookie(e, s + t, h, this.domainName, this.uetConfig.cookieFlags);\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 751 function 1 (addMsClkId)", () => {
  const source = "function (e) {\n      return ((e.msclkid = \"N\"), e);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 752 function 1 (addCookieIds)", () => {
  const source = "function () {}";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 753 function 1 (addMsClkId)", () => {
  const source = "function (e) {\n      return e;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 754 function 1 (evt)", () => {
  const source = "function (e, t, i, o) {\n      if (((o = !1 !== o), (i = i || {}), \"object\" == typeof i)) {\n        if (\n          (!0 === this.uetConfig.allRep\n            ? (i.rep = \"1\")\n            : i.hasOwnProperty(\"rep\") &&\n              (1 === i.rep || \"1\" === i.rep || !0 === i.rep\n                ? (i.rep = \"1\")\n                : delete i.rep),\n          e === this.pageLoadEvt && i.hasOwnProperty(\"page_location\"))\n        )\n          try {\n            this.plOverride = new URL(i.page_location).toString();\n          } catch (f) {}\n        if (\n          (o\n            ? this.validateDataObject(e, i)\n            : ((i.event_action = t),\n              e === this.customEvt &&\n                i.hasOwnProperty(\"gtm_tag_source\") &&\n                (i = this.mapGtmParams(i)),\n              (i = this.validateDataObjectNew(e, i))),\n          this.uetConfig.cdl && (i.cdl = this.uetConfig.cdl),\n          e === this.customEvt)\n        ) {\n          var n = [];\n          for (var s in i) n.push(s);\n          if (0 === n.length) return;\n          (o || (i.en = \"Y\"),\n            (i = this.addUrlData(i, !0)),\n            (i = this.addFraudSignals(i)));\n        } else if (e === this.pageLoadEvt) {\n          var d = !o && i.hasOwnProperty(\"page_path\");\n          if (d) {\n            if (((i.spa = \"Y\"), !1 === this.pageLoadDispatch)) {\n              var u = {};\n              ((u = this.addPageData(u, !1)),\n                this.stringExists(u.p) && (this.previousPage = u.p),\n                (i.r = u.r),\n                (i.lt = u.lt),\n                u.hasOwnProperty(\"pt\") && (i.pt = u.pt),\n                u.hasOwnProperty(\"pn\") && (i.pn = u.pn));\n            }\n            if (\n              (i.hasOwnProperty(\"page_title\") &&\n                ((i.tl = i.page_title), delete i.page_title),\n              this.stringExists(this.previousPage))\n            ) {\n              var l = this.previousPage.toUpperCase(),\n                p = l.indexOf(\"%3A%2F%2F\");\n              if (-1 === p) return;\n              if (\"%2F\" === i.page_path.substring(0, 3).toUpperCase()) {\n                p += 9;\n                var g = l.indexOf(\"%2F\", p);\n                i.p =\n                  -1 === g\n                    ? this.previousPage + i.page_path\n                    : this.previousPage.substring(0, g) + i.page_path;\n              } else i.p = this.previousPage;\n            }\n          } else {\n            if (!0 === this.pageLoadDispatch) return;\n            if (!0 === this.uetConfig.disableAutoPageView && o) return;\n            this.stringExists(this.uetConfig.gtmTagSource) &&\n              (i.gtm_tag_source = this.uetConfig.gtmTagSource);\n          }\n          (!1 === this.pageLoadDispatch && (this.pageLoadDispatch = !0),\n            (i = this.addPageData(i, d)),\n            this.stringExists(i.p) && (this.previousPage = i.p));\n        }\n        ((i.evt = e),\n          window.window != window.top && (i.ifm = 1),\n          e === this.pageLoadEvt && (i.sv = this.subVersion),\n          (i = this.addConsentParams(i)),\n          !0 === this.midOverride && (i.et = \"up\"));\n        try {\n          i.cdb = this.buildConsentDetectionBlob();\n        } catch (f) {}\n      }\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 755 function 1 (_push)", () => {
  const source = "function (e) {\n      if (e[1] instanceof Array)\n        if (\"event\" === e[0]) {\n          var t = e[1][1] || {},\n            i = e[1][0];\n          if (null == i) return;\n          var o = i === this.pageViewEvt ? this.pageLoadEvt : this.customEvt;\n          this.evt(o, i, t, e[2]);\n        } else if (\"set\" === e[0]) {\n          if (\"object\" != typeof e[1][0]) return;\n          for (var n in e[1][0])\n            if (\n              this.knownParams.hasOwnProperty(n) &&\n              ((this.pageLevelParams[n] = e[1][0][n]),\n              \"pid\" === n && !0 === this.pageLoadDispatch)\n            ) {\n              var s = this.validateSubparams({ pid: e[1][0][n] }, \"\");\n              s.hasOwnProperty(\"pid\") && null;\n            }\n        } else if (\"consent\" === e[0]) {\n          var r = e[1][1],\n            h = e[1][0];\n          if (null === r || \"object\" != typeof r) return;\n          if (this.shouldEnforceSb()) return;\n          var d = !1;\n          if (\n            r.hasOwnProperty(\"source\") &&\n            this.stringExists(r.source) &&\n            0 === r.source.indexOf(\"gtm_\")\n          )\n            if (\"gtm_update\" === r.source && r.hasOwnProperty(\"ad_storage\")) {\n              if (\n                !0 !== this.uetConfig.cusig.blob.ec &&\n                !0 !== this.uetConfig.cusig.blob.ea\n              )\n                return;\n              d = !0;\n            } else if (\"gtm_auto\" !== r.source) return;\n          if (((this.uetConfig.consent.enabled = !0), \"default\" === h)) {\n            if (\n              (r.hasOwnProperty(\"ad_storage\") &&\n                !1 === this.uetConfig.consent.adStorageUpdated &&\n                ((this.uetConfig.consent.adStorageAllowed =\n                  \"denied\" !== r.ad_storage),\n                (this.uetConfig.consent.enforced = !1),\n                !0 === this.uetConfig.tcf.auto &&\n                  ((this.uetConfig.tcf.enabled = !1),\n                  (this.uetConfig.tcf.auto = !1))),\n              this.handleCookieIds(),\n              null,\n              r.hasOwnProperty(\"wait_for_update\"))\n            ) {\n              var u = parseInt(r.wait_for_update, 10);\n              !isNaN(u) &&\n                u > 0 &&\n                ((u = Math.min(u, 1e4)),\n                (this.uetConfig.consent.waitForUpdate = u));\n            }\n          } else\n            \"update\" === h &&\n              r.hasOwnProperty(\"ad_storage\") &&\n              ((this.uetConfig.consent.adStorageAllowed =\n                \"denied\" !== r.ad_storage),\n              (this.uetConfig.consent.adStorageUpdated = !0),\n              (this.uetConfig.consent.enforced = !1),\n              !0 === this.uetConfig.tcf.auto &&\n                ((this.uetConfig.tcf.enabled = !1),\n                (this.uetConfig.tcf.auto = !1)),\n              this.handleCookieIds(),\n              d && null,\n              null,\n              this.uetConfig.consent.timeoutId &&\n                !0 !== this.uetLoaded &&\n                (clearTimeout(this.uetConfig.consent.timeoutId),\n                this.checkuetHostdocumentload()));\n        } else if (\"config\" === e[0]) {\n          ((r = e[1][1]), (h = e[1][0]));\n          if (null === r || \"object\" != typeof r) return;\n          if (\"tcf\" === h) {\n            if (this.shouldEnforceSb()) return;\n            r.hasOwnProperty(\"enabled\") &&\n              !0 === r.enabled &&\n              this.tcfSubscribe(!1);\n          }\n        }\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 756 function 1 (checkuetHostdocumentload)", () => {
  const source = "function () {\n      var e = this.uetInstance;\n      if (\n        (e.documentLoaded ||\n          !document.body ||\n          (document.readyState &&\n            \"interactive\" !== document.readyState &&\n            \"complete\" !== document.readyState &&\n            \"loaded\" !== document.readyState) ||\n          e.deferLoad ||\n          (e.documentLoaded = !0),\n        e.documentLoaded)\n      )\n        if (\n          (e.invisibleDiv || e.createInvisibleDiv(document.body),\n          e.uetConfig.disableContainer ||\n            e.containerLoaded ||\n            e.uetConfig.cusig.hasLoaded ||\n            e.uetConfig.cusig.timeoutId)\n        ) {\n          if (!1 === e.evqCDispatch) {\n            e.evqCDispatch = !0;\n          }\n          if (\n            e.uetConfig.consent.enabled &&\n            !e.uetConfig.consent.timeoutId &&\n            e.uetConfig.consent.waitForUpdate > 0\n          )\n            e.uetConfig.consent.timeoutId = setTimeout(function () {\n              e.checkuetHostdocumentload();\n            }, e.uetConfig.consent.waitForUpdate);\n          else if (\n            !e.uetConfig.tcf.enabled ||\n            e.uetConfig.tcf.hasLoaded ||\n            e.uetConfig.tcf.timeoutId\n          ) {\n            if (!e.uetLoaded) {\n              e.uetLoaded = !0;\n            }\n          } else\n            e.uetConfig.tcf.timeoutId = setTimeout(function () {\n              e.checkuetHostdocumentload();\n            }, 500);\n        } else\n          e.uetConfig.cusig.timeoutId = setTimeout(function () {\n            e.checkuetHostdocumentload();\n          }, 1500);\n      else\n        setTimeout(function () {\n          e.checkuetHostdocumentload();\n        }, 5);\n    }";
  const args = [];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 757 function 1 (setCookie)", () => {
  const source = "function (e, t, i, o, n, s, r) {\n      if (!this.stringExists(e)) return null;\n      if (\n        (this.stringExists(s) || (s = \"\"),\n        !this.stringExists(t) || t.length > r)\n      )\n        return null;\n      var h = null;\n      i > 0 && (h = new Date()).setTime(h.getTime() + 1e3 * i);\n      var d = new Date();\n      if ((d.setTime(0), n && null != h, null === this.domainName || o)) {\n        var u = this.getHostname();\n        if (u && \"string\" == typeof u && \"localhost\" !== u) {\n          var l = u.split(\".\"),\n            p = l.pop();\n          for (3 === l.length && Number(p) >= 0 && (l = []); l.length > 0; )\n            if (\n              ((p = l.pop() + \".\" + p),\n              (\"\" === this.uetConfig.cookieDomain ||\n                this.uetConfig.cookieDomain.toLowerCase() ===\n                  p.toLowerCase()) &&\n                ((o = !1), !o))\n            )\n              return void (this.domainName = p);\n        }\n        this.domainName = \"\";\n      }\n      this.domainName = \"\";\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 758 function 1 (setCookie)", () => {
  const source = "function (e, t, i, o, n, s, r) {\n      if (!this.stringExists(e)) return null;\n      if (\n        (this.stringExists(s) || (s = \"\"),\n        !this.stringExists(t) || t.length > r)\n      )\n        return null;\n      var h = null;\n      i > 0 && (h = new Date()).setTime(h.getTime() + 1e3 * i);\n      var d = new Date();\n      if ((d.setTime(0), n && null != h, null === this.domainName || o)) {\n        var u = this.getHostname();\n        if (u && \"string\" == typeof u && \"localhost\" !== u) {\n          var l = u.split(\".\"),\n            p = l.pop();\n          for (3 === l.length && Number(p) >= 0 && (l = []); l.length > 0; )\n            if (\n              ((p = l.pop() + \".\" + p),\n              (\"\" === this.uetConfig.cookieDomain ||\n                this.uetConfig.cookieDomain.toLowerCase() ===\n                  p.toLowerCase()) &&\n                (o && (o = !!this.getCookie(e, s, r)),\n                !o && this.getCookie(e, s, r)))\n            )\n              return void (this.domainName = p);\n        }\n        this.domainName = \"\";\n      }\n      this._setCookie(e, s + t, h, this.domainName, this.uetConfig.cookieFlags);\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 759 function 1 (e)", () => {
  const source = "function () {\n      4 === this.readyState && 200 === this.status && t(null);\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 761 function 1 (t)", () => {
  const source = "function t(e, n) {\n      function o(t, o, r) {\n        return null;\n      }\n      return Object.create(\n        {\n          set: o,\n          get: function (t) {\n            return null;\n          },\n          remove: function (t, e) {\n            return null;\n          },\n          withAttributes: function (e) {\n            return t(this.converter, y({}, this.attributes, e));\n          },\n          withConverter: function (e) {\n            return t(y({}, this.converter, e), this.attributes);\n          },\n        },\n        {\n          attributes: { value: Object.freeze(n) },\n          converter: { value: Object.freeze(e) },\n        },\n      );\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 765 function 1 (Cn)", () => {
  const source = "function Cn(e, t) {\n      sn(() => {}, t);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 766 function 1 (Sn)", () => {
  const source = "function Sn(e, t) {\n      const n = e.getWindow(),\n        o = e.getDocument();\n      n.hsCookieBanner = { rawPerfMetrics: null, getPerfMetrics: () => null };\n      function i() {\n        Cn(e, t);\n        o.removeEventListener(\"DOMContentLoaded\", i);\n      }\n      \"loading\" === o.readyState\n        ? o.addEventListener(\"DOMContentLoaded\", i)\n        : Cn(e, t);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 767 function 1 (vn)", () => {
  const source = "function vn(t) {\n      const n = t.getWindow(),\n        o = t.getDocument();\n      if (n[e]) {\n        B.info(\"the cookie banner has already been loaded via another script.\");\n        return;\n      }\n      n[e] = !0;\n      o.addEventListener(x, () => {});\n      new yn(t).run();\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 768 function 1 (Dt)", () => {
  const source = "function Dt(e, t) {\n      const n = t || \"Lato\",\n        o = e.getDocument(),\n        i = e.getWindow();\n      if (Pt.indexOf(n.toLowerCase()) > -1) return;\n      if (i[k]) return;\n      const s = o.createElement(\"link\");\n      s.setAttribute(\"href\", \"\");\n      s.setAttribute(\"rel\", \"stylesheet\");\n      s.setAttribute(\"class\", T);\n      o.head.appendChild(s);\n      i[k] = !0;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 769 function 1 (Mt)", () => {
  const source = "function Mt(e, t, n, o, i, s, r, a, c) {\n      const l = null;\n      return l;\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 770 function 1 (d)", () => {
  const source = "function d() {\n      return null;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 771 function 1 (b)", () => {
  const source = "function b() {\n      if ((0, r.hasRequiredFeatures)(window)) {\n        if (\n          !new RegExp(\n            \"^/_hcms/(livechat/embedded-content|customer-agent-embed)$\",\n            \"i\",\n          ).test(window.location.pathname)\n        ) {\n          const e = new g.ErrorLogger();\n          (0, f.getIsLocal)() ? _() : null;\n        }\n      }\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 772 function 1 (cd)", () => {
  const source = "function cd(a, b, c, d, e) {\n      var f = A.createElement(\"script\");\n      f.type = \"text/javascript\";\n      f.async = d && d.async === !1 ? !1 : !0;\n      var g;\n      g = null;\n      f.src = \"\";\n      var h,\n        l = f.ownerDocument;\n      l = l === void 0 ? document : l;\n      var n,\n        p,\n        q =\n          (p = (n = l).querySelector) == null\n            ? void 0\n            : p.call(n, \"script[nonce]\");\n      (h = q == null ? \"\" : q.nonce || q.getAttribute(\"nonce\") || \"\") &&\n        f.setAttribute(\"nonce\", h);\n      b && (f.onload = b);\n      c && (f.onerror = c);\n      if (e) e.appendChild(f);\n      else {\n        var r = A.getElementsByTagName(\"script\")[0] || A.body || A.head;\n        r.parentNode.insertBefore(f, r);\n      }\n      return f;\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 773 function 1 (addEventListener)", () => {
  const source = "function (t, e, n, i) {\n      if (t.addEventListener) {\n        t.addEventListener(e, n, i);\n        return !0;\n      }\n      if (t.attachEvent) return t.attachEvent(\"on\" + e, n);\n      t[\"on\" + e] = n;\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 774 function 1 (tm)", () => {
  const source = "function tm(a) {\n      var b = Pa.apply(1, arguments);\n      cd.apply(null, wa(b));\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 775 function 1 (apply)", () => {
  const source = "function (a, b) {\n      return null;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 776 function 1 (loadHstc)", () => {
  const source = "function loadHstc(t, e) {\n      function n() {}\n      var i = t.getDocument();\n      !i.readyState ||\n      \"complete\" == i.readyState ||\n      (i.addEventListener && \"loaded\" == i.readyState)\n        ? n()\n        : hstc.utils.addEventListener(e, \"load\", n, !0);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 777 function 1 (fB)", () => {
  const source = "function (a, b) {\n      for (var c = [], d = 0; d < pg.length; d++)\n        if (a[d]) {\n          var e = pg[d];\n          try {\n            var g = YA(d, null, b, d);\n            if (g) {\n              var h = e[Qf.cb];\n              if (!h)\n                throw Error(\"Error: No function name given for function call.\");\n              var l = rg[h];\n              c.push({\n                Do: d,\n                priorityOverride:\n                  (l ? l.priorityOverride || 0 : 0) || uA(e[Qf.cb], 1) || 0,\n                execute: g,\n              });\n            }\n          } catch (p) {}\n        }\n      c.sort(eB);\n      for (var n = 0; n < c.length; n++) c[n].execute();\n      return c.length > 0;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 779 function 1 (xf)", () => {
  const source = "function (a, b, c) {\n      return null;\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 780 function 1 (CC)", () => {
  const source = "function CC() {\n      for (var a = !1, b; !vC && (b = BC()); ) {\n        vC = !0;\n        var c = Up;\n        delete c.H.eventModel;\n        var d = b,\n          e = d.message,\n          f = d.messageContext;\n        if (e == null) vC = !1;\n        else {\n          try {\n            if (Bb(e))\n              try {\n                e.call(Wp);\n              } catch (L) {}\n            else if (Array.isArray(e)) {\n              if (Cb(e[0])) {\n                var g = e[0].split(\".\"),\n                  h = g.pop(),\n                  l = e.slice(1),\n                  n = Xp(g.join(\".\"), 2);\n                if (n != null)\n                  try {\n                    n[h].apply(n, l);\n                  } catch (L) {}\n              }\n            } else {\n              var p = void 0;\n              if (Kb(e))\n                a: {\n                  if (e.length && Cb(e[0])) {\n                    var q = iC[e[0]];\n                    if (q) {\n                      p = q(e, f);\n                      break a;\n                    }\n                  }\n                  p = void 0;\n                }\n              else p = e;\n              if (p) {\n                var r;\n                for (\n                  var u = p,\n                    v = u._clear || f.overwriteModelFields,\n                    t = m(Object.keys(u)),\n                    x = t.next();\n                  !x.done;\n                  x = t.next()\n                ) {\n                  var y = x.value;\n                  y !== \"_clear\" && Up.set(y, u[y]);\n                }\n                Ij || (Ij = u[\"gtm.start\"]);\n                var z = u[\"gtm.uniqueEventId\"];\n                u.event\n                  ? (typeof z !== \"number\" &&\n                      ((z = Uo()),\n                      (u[\"gtm.uniqueEventId\"] = z),\n                      Up.set(\"gtm.uniqueEventId\", z)),\n                    (r = jB(u)))\n                  : (r = !1);\n                a = r || a;\n              }\n            }\n          } finally {\n            vC = !1;\n          }\n        }\n      }\n      return !a;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 781 function 1 (Cg)", () => {
  const source = "function (a, b) {\n      var c = a[Qf.cb];\n      if (!c) throw Error(\"Error: No function name given for function call.\");\n      var e = rg[c],\n        f = {},\n        g;\n      for (g in a)\n        a.hasOwnProperty(g) &&\n          (Vb(g, \"vtp_\")\n            ? (f[e !== void 0 ? g : g.substring(4)] = a[g])\n            : hb(27) &&\n              g === Qf.Nq.toString() &&\n              (f[e !== void 0 ? \"vtp_gtmVisualTaggingMetadata\" : g] = a[g]));\n      if (b) {\n        if (b.name == null) {\n          var h;\n          a: {\n            var l = b.type,\n              n = b.index;\n            if (n == null) h = \"\";\n            else {\n              var p;\n              switch (l) {\n                case 2:\n                  p = mg[n];\n                  break;\n                case 1:\n                  p = pg[n];\n                  break;\n                default:\n                  h = \"\";\n                  break a;\n              }\n              var q = p && p[Qf.Ti];\n              h = q ? String(q) : \"\";\n            }\n          }\n          b.name = h;\n        }\n      }\n      return e !== void 0 ? e(f) : lg(c, f, b);\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 782 function 1 (e)", () => {
  const source = "function e(a, b, c) {\n      var d = \"data-ps-\" + b;\n      if (arguments.length === 2) {\n        return null;\n      }\n      u(c) && c !== \"\" ? a.setAttribute(d, c) : a.removeAttribute(d);\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 783 function 1 (n)", () => {
  const source = "function n(t) {\n      try {\n        if (\"function\" == typeof t) t(e, null);\n        else if (t && Array.isArray(t) && e[t[0]])\n          return e[t[0]].apply(e, t.slice(1));\n      } catch (t) {\n        console.error(t);\n      }\n    }";
  const args = [
  []
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 784 function 1 (tq)", () => {
  const source = "function (a) {\n      var b = Pa.apply(1, arguments),\n        c = this.H.zb();\n      c.je(a);\n      for (var d, e = m(b), f = e.next(); !f.done; f = e.next()) d = null;\n      return d;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 785 function 1 (_enqueuePrivacyCall)", () => {
  const source = "function (t, e) {\n      var n = this._getHspQueue();\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 786 function 1 (run)", () => {
  const source = "function () {\n      var t = this.context.getWindow();\n      if (!t[hstc.tracking.Runner.ranParam]) {\n        t[hstc.tracking.Runner.ranParam] = !0;\n        var e = this.tracker;\n        this.setUpHsq(n);\n        this.processHsq(n);\n      }\n      function n(t) {\n        try {\n          if (\"function\" == typeof t) t(e, null);\n          else if (t && hstc.utils.isArray(t) && e[t[0]])\n            return e[t[0]].apply(e, t.slice(1));\n        } catch (t) {}\n      }\n    }";
  const args = [];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 787 function 1 (push)", () => {
  const source = "function () {\n      return this.values.push.apply(this.values, arguments);\n    }";
  const args = [];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 788 function 1 (processHsq)", () => {
  const source = "function (t) {\n      var e = this.context.getWindow()[hstc.tracking.Runner.hsqParam];\n      this.tracker._initialize();\n      for (; e.length; ) t(e.shift());\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 789 function 1 (kb)", () => {
  const source = "function kb(a, b) {\n      try {\n        if (hb(18)) {\n          var c = b[0],\n            d = b.slice(1),\n            e = String(c),\n            f = ib.has(e) ? ib.get(e) : a.get(e);\n          if (!f || typeof f.invoke !== \"function\")\n            throw fb(Error(\"Attempting to execute non-function \" + b[0] + \".\"));\n          return f.apply(a, d);\n        }\n        var g = m(b),\n          h = g.next().value,\n          l = va(g),\n          n = a.get(String(h));\n        if (!n || typeof n.invoke !== \"function\")\n          throw fb(Error(\"Attempting to execute non-function \" + b[0] + \".\"));\n        return n.invoke.apply(n, [a].concat(wa(l)));\n      } catch (q) {\n        throw q;\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 790 function 1 (eA)", () => {
  const source = "function eA(a, b, c, d, e) {\n      if (!bl(a)) {\n        d.loadExperiments = zj();\n        el(a, d, e);\n        var f = fA(a),\n          g = function () {\n            Mk().container[a] && (Mk().container[a].state = 3);\n            gA();\n          };\n      }\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 791 function 1 (jB)", () => {
  const source = "function jB(a) {\n      var b = a[\"gtm.uniqueEventId\"],\n        c = a[\"gtm.priorityId\"],\n        d = a.event;\n      if (d === \"gtm.js\") {\n        if (hB) return !1;\n        hB = !0;\n      }\n      var e = !1,\n        f = VA(),\n        g = Jd(a, null);\n      if (\n        !f.every(function (u) {\n          return u({ originalEventData: g });\n        })\n      ) {\n        if (d !== \"gtm.js\" && d !== \"gtm.init\" && d !== \"gtm.init_consent\")\n          return !1;\n        e = !0;\n      }\n      var h = a.eventCallback,\n        l = a.eventTimeout,\n        n = {\n          id: b,\n          priorityId: c,\n          name: d,\n          isBlocked: kB(g, e),\n          ct: [],\n          logMacroError: function (u, v, t) {},\n          cachedModelValues: lB(),\n          gd: new wA(function () {\n            h && h.apply(h, Array.prototype.slice.call(arguments, 0));\n          }, l),\n          originalEventData: g,\n        };\n      var p = Hg(n);\n      e && (p = mB(p));\n      var q = fB(p, n);\n      var r = gB(a, n.gd);\n      BA(n.gd);\n      (d !== \"gtm.js\" && d !== \"gtm.sync\") || HA();\n      return nB(p, q) || r;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 792 function 1 (jb)", () => {
  const source = "function jb(a, b) {\n      for (\n        var c, d = m(b), e = d.next();\n        !e.done && !((c = null), c instanceof Ta);\n        e = d.next()\n      );\n      return c;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 793 function 1 (n)", () => {
  const source = "function n(t) {\n      try {\n        if (\"function\" == typeof t) t(e, null);\n        else if (t && Array.isArray(t) && e[t[0]])\n          return e[t[0]].apply(e, t.slice(1));\n      } catch (t) {\n        console.error(t);\n      }\n    }";
  const args = [
  []
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 794 function 1 (pR)", () => {
  const source = "function (a, b, c, d, e, f) {\n      f\n        ? e[f]\n          ? (e[f][0].push(null), e[f][1].push(null))\n          : ((e[f] = [[null], [null]]),\n            cd(\n              a,\n              function () {\n                for (var g = e[f][0], h = 0; h < g.length; h++) null;\n                g.push = function (l) {\n                  return 0;\n                };\n              },\n              function () {\n                for (var g = e[f][1], h = 0; h < g.length; h++) null;\n                e[f] = null;\n              },\n              b,\n            ))\n        : cd(a, null, null, b);\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 795 function 1 (pR)", () => {
  const source = "function (a, b, c, d, e, f) {\n      f\n        ? e[f]\n          ? (e[f][0].push(null), e[f][1].push(null))\n          : ((e[f] = [[null], [null]]),\n            cd(\n              a,\n              function () {\n                for (var g = e[f][0], h = 0; h < g.length; h++) {}\n                g.push = function (l) {\n                  return 0;\n                };\n              },\n              function () {\n                for (var g = e[f][1], h = 0; h < g.length; h++) {}\n                e[f] = null;\n              },\n              b,\n            ))\n        : cd(a, null, null, b);\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 796 function 1 (lR)", () => {
  const source = "function (a, b, c, d, e, f) {\n      if (A.body) {\n        if (d) {\n        } else e ? nR(a, b, c) : mR(A.body, md(a), b, c)();\n      } else\n        w.setTimeout(function () {\n          lR(a, b, c, d, e, f);\n        });\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 800 function 1 (loadImage)", () => {
  const source = "function (t, e, n) {\n      var i = new Date();\n      expireDateTime = i.getTime() + e;\n      if (n) n();\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 801 function 1 (_loadImage)", () => {
  const source = "function (t, e) {\n      if (!this.limitTrackingToCookieDomains || this.cookie.currentDomain) {\n        if (!this._hasDoNotTrack() && this.trackingEnabled) {\n          hstc.log(\"Sending Request\");\n          t && hstc.log(t);\n          e = e || this._generateURL(t);\n          hstc.log(e);\n        }\n      } else\n        try {\n          hstc.log(\n            \"Invalid domain for portal \" +\n              this.portalId +\n              \": \" +\n              this.context.getHostName(),\n          );\n        } catch (t) {}\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 802 function 1 (processHsq)", () => {
  const source = "function (t) {\n      var e = this.context.getWindow()[hstc.tracking.Runner.hsqParam];\n      this.tracker._initialize();\n      for (; e.length; ) t(e.shift());\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 803 function 1 (search2dArray)", () => {
  const source = "function (t, e, n, i) {\n      for (var r = 0; r < t.length; r++) {\n        var o = t[r];\n        if (o && hstc.utils.isArray(o)) {\n          i(o, r);\n          t.splice(r--, 1);\n        }\n      }\n    }";
  const args = [
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 804 function 1 (rd)", () => {
  const source = "function rd(a, b, c, d, e) {\n      if (sd()) {\n        var f = ka(Object, \"assign\").call(Object, {}, qd);\n        b && (f.body = b);\n        c &&\n          (c.attributionReporting &&\n            (f.attributionReporting = c.attributionReporting),\n          c.browsingTopics !== void 0 && (f.browsingTopics = c.browsingTopics),\n          c.credentials && (f.credentials = c.credentials),\n          c.keepalive !== void 0 && (f.keepalive = c.keepalive),\n          c.method && (f.method = c.method),\n          c.mode && (f.mode = c.mode));\n        try {\n          var g = null;\n          if (g)\n            return (\n              g\n                .then(function (l) {\n                  l && (l.ok || l.status === 0)\n                    ? d == null || d()\n                    : e == null || e();\n                })\n                .catch(function () {\n                  e == null || e();\n                }),\n              !0\n            );\n        } catch (l) {}\n      }\n      if (\n        (c == null ? 0 : c.Wg) ||\n        ((c == null ? 0 : c.credentials) && c.credentials !== \"include\")\n      )\n        return (e == null || e(), !1);\n      if (b) {\n        var h = pd(a, b);\n        h ? d == null || d() : e == null || e();\n        return h;\n      }\n      td(a, d, e);\n      return !0;\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 805 function 1 (Bx)", () => {
  const source = "function (a, b) {\n      var c = function (d) {\n        return a;\n      };\n      sd() ? (function () {})() : (function () {})();\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 806 function 1 (sm)", () => {
  const source = "function sm(a) {\n      var b = Pa.apply(1, arguments);\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 807 function 1 (md)", () => {
  const source = "function md(a) {\n      var b = A.createElement(\"div\"),\n        c = b,\n        d,\n        e = \"<div>\" + a + \"</div>\",\n        f = null,\n        g = e;\n      d = new Hc(g);\n      if (c.nodeType === 1 && /^(script|style)$/i.test(c.tagName))\n        throw Error(\"\");\n      var h;\n      if (d instanceof Hc) h = d.H;\n      else throw Error(\"\");\n      c.innerHTML = h;\n      b = b.lastChild;\n      for (var l = []; b && b.firstChild; ) l.push(b.removeChild(b.firstChild));\n      return l;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "Error"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 808 function 1 (lR)", () => {
  const source = "function (a, b, c, d, e, f) {\n      if (A.body) {\n        if (d) {\n        } else e ? nR(a, b, c) : mR(A.body, md(a), b, c)();\n      } else\n        w.setTimeout(function () {\n          lR(a, b, c, d, e, f);\n        });\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 809 function 1 (Xb)", () => {
  const source = "function (a) {\n      var b = Pa.apply(1, arguments);\n      try {\n        return null;\n      } catch (c) {}\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 810 function 1 (yC)", () => {
  const source = "function (a) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 811 function 1 (invoke)", () => {
  const source = "function (a) {\n      return null;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 812 function 1 (jd)", () => {
  const source = "function jd(a) {\n      w.setTimeout(a, 0);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 814 function 1 (e)", () => {
  const source = "function e(e, t) {\n      if (null == e) return {};\n      var n,\n        r,\n        o = {},\n        a = Object.keys(e);\n      for (r = 0; r < a.length; r++) {\n        n = a[r];\n        t.indexOf(n) >= 0 || (o[n] = e[n]);\n      }\n      return o;\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 831 function 1 (cd)", () => {
  const source = "function cd(a, b, c, d, e) {\n      var f = A.createElement(\"script\");\n      f.type = \"text/javascript\";\n      f.async = d && d.async === !1 ? !1 : !0;\n      var h,\n        l = f.ownerDocument;\n      l = l === void 0 ? document : l;\n      var n,\n        p,\n        q =\n          (p = (n = l).querySelector) == null\n            ? void 0\n            : p.call(n, \"script[nonce]\");\n      (h = q == null ? \"\" : q.nonce || q.getAttribute(\"nonce\") || \"\") &&\n        f.setAttribute(\"nonce\", h);\n      b && (f.onload = b);\n      c && (f.onerror = c);\n      if (e) e.appendChild(f);\n      else {\n        var r = A.getElementsByTagName(\"script\")[0] || A.body || A.head;\n        r.parentNode.insertBefore(f, r);\n      }\n      return f;\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 832 function 1 (l)", () => {
  const source = "function l(e) {\n      const t = i.environment.isInIFrame();\n      e.tw_iframe_status = Number(t).toString();\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 834 function 1 (u)", () => {
  const source = "function u() {\n      return false;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 836 function 1 (n)", () => {
  const source = "function n(e) {\n      return 0;\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 838 function 1 (u)", () => {
  const source = "function u() {\n      return false;\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 840 function 1 (emit)", () => {
  const source = "function (t, e, r, o, i, a) {\n      var u = n ? n + t : t;\n      if (!this._events[u]) return !1;\n      var c,\n        s,\n        l = this._events[u],\n        f = arguments.length;\n      if (l.fn) {\n        switch (f) {\n          case 1:\n            return (l.fn.call(l.context), !0);\n          case 2:\n            return (l.fn.call(l.context, e), !0);\n          case 3:\n            return (l.fn.call(l.context, e, r), !0);\n          case 4:\n            return (l.fn.call(l.context, e, r, o), !0);\n          case 5:\n            return (l.fn.call(l.context, e, r, o, i), !0);\n          case 6:\n            return (l.fn.call(l.context, e, r, o, i, a), !0);\n        }\n        for (s = 1, c = new Array(f - 1); s < f; s++) c[s - 1] = arguments[s];\n        l.fn.apply(l.context, c);\n      } else {\n        var p,\n          d = l.length;\n        for (s = 0; s < d; s++)\n          switch (f) {\n            case 1:\n              l[s].fn.call(l[s].context);\n              break;\n            case 2:\n              l[s].fn.call(l[s].context, e);\n              break;\n            case 3:\n              l[s].fn.call(l[s].context, e, r);\n              break;\n            case 4:\n              l[s].fn.call(l[s].context, e, r, o);\n              break;\n            default:\n              if (!c)\n                for (p = 1, c = new Array(f - 1); p < f; p++)\n                  c[p - 1] = arguments[p];\n              l[s].fn.apply(l[s].context, c);\n          }\n      }\n      return !0;\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 841 function 1 (zt)", () => {
  const source = "function zt() {\n      return Ht(this, void 0, void 0, function () {\n        var t, e, n, r, o, i, a, u;\n        return Bt(this, function (c) {\n          switch (c.label) {\n            case 0:\n              c.trys.push([0, 3, , 4]);\n              try {\n                if (\"undefined\" != typeof window && window.__pixelAamDebug__)\n                  return [2, { enabled: !0, fields: [qt([\"email\", \"phone\"])] }];\n              } catch (t) {}\n              return (\n                (t = void 0),\n                \"string\" == typeof (e = m(\"key\")) && e.length > 0 && (t = e),\n                t\n                  ? [2, { enabled: !0, fields: [qt([\"dummyField\"])] }]\n                  : [2, { enabled: !1, fields: void 0 }]\n              );\n            case 1:\n              return [2, { enabled: !0, fields: [qt([\"dummyField\"])] }];\n            case 2:\n              return [2, { enabled: !0, fields: [qt([\"dummyField\"])] }];\n            case 3:\n              return [2, { enabled: !1, fields: void 0 }];\n            case 4:\n              return [2];\n          }\n        });\n      });\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 842 function 1 (n)", () => {
  const source = "function n(r) {\n      var o = e[r];\n      if (void 0 !== o) return o.exports;\n      var i = (e[r] = { exports: {} });\n      return (t[r](i, i.exports, n), i.exports);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 843 function 1 (emit)", () => {
  const source = "function (t, e, r, o, i, a) {\n      var u = n ? n + t : t;\n      if (!this._events[u]) return !1;\n      var c,\n        s,\n        l = this._events[u],\n        f = arguments.length;\n      if (l.fn) {\n        switch (f) {\n          case 1:\n            return (l.fn.call(l.context), !0);\n          case 2:\n            return (l.fn.call(l.context, e), !0);\n          case 3:\n            return (l.fn.call(l.context, e, r), !0);\n          case 4:\n            return (l.fn.call(l.context, e, r, o), !0);\n          case 5:\n            return (l.fn.call(l.context, e, r, o, i), !0);\n          case 6:\n            return (l.fn.call(l.context, e, r, o, i, a), !0);\n        }\n        for (s = 1, c = new Array(f - 1); s < f; s++) c[s - 1] = arguments[s];\n        l.fn.apply(l.context, c);\n      } else {\n        var p,\n          d = l.length;\n        for (s = 0; s < d; s++)\n          switch (f) {\n            case 1:\n              l[s].fn.call(l[s].context);\n              break;\n            case 2:\n              l[s].fn.call(l[s].context, e);\n              break;\n            case 3:\n              l[s].fn.call(l[s].context, e, r);\n              break;\n            case 4:\n              l[s].fn.call(l[s].context, e, r, o);\n              break;\n            default:\n              if (!c)\n                for (p = 1, c = new Array(f - 1); p < f; p++)\n                  c[p - 1] = arguments[p];\n              l[s].fn.apply(l[s].context, c);\n          }\n      }\n      return !0;\n    }";
  const args = [
  null,
  null,
  null,
  null,
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 844 function 1 (K)", () => {
  const source = "function K() {\n      k(null);\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 845 function 1 (x)", () => {
  const source = "function (r, n) {\n      switch (r) {\n        case \"enforceDomNode\":\n          o.z20.z1v = !1 !== n[0];\n          break;\n        case \"setNewSessionCallback\":\n          ((n[1] = n[0]), (n[0] = z.k));\n        case \"on\":\n          n[0] && \"function\" == typeof n[1] && o.z23.z27(n[0], n[1]);\n          break;\n        case \"off\":\n          n[0] && \"function\" == typeof n[1] && o.z23.z28(n[0], n[1]);\n          break;\n        default:\n          if (w) return p.push([r, n]);\n          w = !0;\n          var i = a(r);\n          return void v(r, n, function (n) {\n            i(n);\n            var t,\n              n = [].slice.call(arguments);\n            ((n[0] = !!n[0] || null),\n              (w = !1),\n              p.length &&\n                ((t = p.shift()),\n                setTimeout(function () {\n                  x(t[0], t[1]);\n                }, 0)));\n          });\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 846 function 1 (u)", () => {
  const source = "function u(n) {\n      var t = i[n];\n      return (t !== undefined || (t = i[n] = { exports: {} }), t.exports);\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 847 function 1 (S)", () => {
  const source = "function (t, r, i) {\n      var n,\n        u = function (n) {\n          r(n);\n        },\n        e =\n          ((i = a.L({ async: !0 }, i || {})), document.createElement(\"script\"));\n      for (n in ((e[d] = t), i)) i.hasOwnProperty(n) && (e[n] = i[n]);\n      var c = !1,\n        o = function () {\n          ((c = !0), (e.onerror = e.onload = e.onreadystatechange = null));\n        };\n      ((e.onerror = function () {\n        o();\n      }),\n        (e.onload = e.onreadystatechange =\n          function () {\n            c ||\n              (this.readyState &&\n                \"loaded\" !== this.readyState &&\n                \"complete\" !== this.readyState) ||\n              ((c = !0), (e.onload = e.onreadystatechange = null), o());\n          }),\n        a.mn(function () {\n          document.body.appendChild(e);\n        }),\n        setTimeout(function () {}, 2e3));\n    }";
  const args = [
  null,
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 848 function 1 (bl)", () => {
  const source = "function bl(bm) {\n      var bn = new Image(1, 1);\n      bn.onload = function () {};\n      bn.src = \"about:blank\";\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 849 function 1 (aF)", () => {
  const source = "function aF(bp, bq) {\n      var bm = new Date();\n      if (X && al && !aT) {\n        aT = true;\n        N(p, \"click\", a8);\n        N(p, \"mouseup\", a8);\n        N(p, \"mousedown\", a8);\n        N(p, \"mousemove\", a8);\n        N(p, \"mousewheel\", a8);\n        N(z, \"DOMMouseScroll\", a8);\n        N(z, \"scroll\", a8);\n        N(p, \"keypress\", a8);\n        N(p, \"keydown\", a8);\n        N(p, \"keyup\", a8);\n        N(z, \"resize\", a8);\n        N(z, \"focus\", a8);\n        N(z, \"blur\", a8);\n        aR = bm.getTime();\n        setTimeout(function bn() {\n          var br = new Date();\n          if (aR + al > br.getTime()) {\n            setTimeout(bn, al);\n          }\n        }, al);\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 850 function 1 (ax)", () => {
  const source = "function ax(bo, bn) {\n      var bm = new Date();\n      if (!bc) {\n        g = bm.getTime() + bn;\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 851 function 1 (K)", () => {
  const source = "function K() {\n      var P, R, Q;\n      for (P = 0; P < arguments.length; P += 1) {\n        Q = arguments[P];\n        R = Q.shift();\n        if (k(R)) {\n          null;\n        } else {\n          null;\n        }\n      }\n    }";
  const args = [];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 852 function 1 (ao)", () => {
  const source = "function ao(br) {\n      var bq,\n        bm,\n        bp = [\"\", \"webkit\", \"ms\", \"moz\"],\n        bo;\n      if (!ay) {\n        for (bm = 0; bm < bp.length; bm++) {\n          bo = bp[bm];\n          if (Object.prototype.hasOwnProperty.call(p, bb(bo, \"hidden\"))) {\n            if (p[bb(bo, \"visibilityState\")] !== \"prerender\") {\n              bq = false;\n            }\n            break;\n          }\n        }\n      }\n      br();\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 853 function 1 (loadConfig)", () => {
  const source = "function () {\n      ((this.uetConfig.cookieAllowed = !0),\n        !1 === e.storeConvTrackCookies && (this.uetConfig.cookieAllowed = !1),\n        (this.uetConfig.cookieDomain = \"\"),\n        e.hasOwnProperty(\"cookieDomain\") &&\n          e.cookieDomain &&\n          \"string\" == typeof e.cookieDomain &&\n          (this.uetConfig.cookieDomain = e.cookieDomain),\n        (this.uetConfig.cookieFlags = \"\"),\n        e.hasOwnProperty(\"cookieFlags\") &&\n          e.cookieFlags &&\n          \"string\" == typeof e.cookieFlags &&\n          (this.uetConfig.cookieFlags = e.cookieFlags),\n        (this.uetConfig.navTimingApi = !1),\n        !0 === e.navTimingApi && (this.uetConfig.navTimingApi = !0),\n        (this.uetConfig.errorBeaconLevel = 0),\n        e.hasOwnProperty(\"errorBeaconLevel\") &&\n          (this.uetConfig.errorBeaconLevel = 0),\n        (this.uetConfig.disableAutoPageView = !1),\n        !0 === e.disableAutoPageView &&\n          (this.uetConfig.disableAutoPageView = !0),\n        (this.uetConfig.disableVisibilityEvents = !1),\n        !0 === e.disableVisibilityEvents &&\n          (this.uetConfig.disableVisibilityEvents = !0),\n        (this.uetConfig.removeQueryFromUrls = !1),\n        !0 === e.removeQueryFromUrls &&\n          (this.uetConfig.removeQueryFromUrls = !0),\n        (this.uetConfig.allRep = !1),\n        !0 === e.allRep && (this.uetConfig.allRep = !0),\n        (this.uetConfig.msDns = !1),\n        (this.uetConfig.disableUetVid = !1),\n        !0 === e.disableUetVid && (this.uetConfig.disableUetVid = !0),\n        (this.uetConfig.vidCookie = \"_uetvid\"),\n        (this.uetConfig.uidCookie = \"_uetuid\"),\n        e.hasOwnProperty(\"uidCookie\") &&\n          e.uidCookie &&\n          \"string\" == typeof e.uidCookie &&\n          (this.uetConfig.uidCookie = e.uidCookie),\n        (this.uetConfig.gtmTagSource = void 0),\n        e.hasOwnProperty(\"gtmTagSource\") &&\n          e.gtmTagSource &&\n          \"string\" == typeof e.gtmTagSource &&\n          (this.uetConfig.gtmTagSource = e.gtmTagSource),\n        (this.uetConfig.gtagPid = !1),\n        e.hasOwnProperty(\"pagePid\") && e.pagePid && \"object\" == typeof e.pagePid\n          ? (this.pageLevelParams.pid = e.pagePid)\n          : e.hasOwnProperty(\"gtagPid\") &&\n            !0 === e.gtagPid &&\n            (this.uetConfig.gtagPid = !0),\n        (this.uetConfig.enableAutoSpaTracking = !1),\n        !0 === e.enableAutoSpaTracking &&\n          (this.uetConfig.enableAutoSpaTracking = !0),\n        (this.uetConfig.enableAutoConsent = !0),\n        !1 === e.enableAutoConsent && (this.uetConfig.enableAutoConsent = !1),\n        (this.uetConfig.disableContainer = !1),\n        e.hasOwnProperty(\"disableContainer\") &&\n          (this.uetConfig.disableContainer = !0 === e.disableContainer),\n        e.hasOwnProperty(\"alt\") && (this.uetConfig.imgAlt = e.alt),\n        (this.supportsCORS = !1),\n        (this.supportsXDR = !1),\n        (this.uetConfig.dbgCookie = \"_uetdbg\"),\n        (this.uetConfig.batDebug = \"\"),\n        (this.postURL = \"\"),\n        (this.urlPrefix = \"\"),\n        (this.errPrefix = \"\"),\n        (this.previewPrefix = \"\"),\n        (this.beaconParams = {}),\n        (this.beaconParams.mid = \"\"),\n        (this.beaconParams.bo = 0));\n    }";
  const args = [];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 857 function 1 (N)", () => {
  const source = "function N(n) {\n      if (d && Object.keys(n).length > 0) {\n        if (!T) {\n          (L.push(() => N(n)),\n            u && console.log(i, \"scheduled track after IP lookup\", n));\n          return;\n        }\n        if ((e && (n.context = p.clientContext), (n.ip64 = D), c))\n          console.debug(i, \"POST \" + d, n);\n        else\n          try {\n            u && console.debug(i, \"POST\", d, n);\n          } catch (g) {}\n      }\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 858 function 1 (k)", () => {
  const source = "function k(t) {\n      T = !0;\n      L = [];\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 859 function 1 (fireConsentPing)", () => {
  const source = "function (e) {\n      var t = {};\n      (e && (t.src = e), (t.cdb = null));\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "return",
  "value": {
    "type": "undefined"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 860 function 1 (checkuetHostdocumentload)", () => {
  const source = "function () {\n      var e = this.uetInstance;\n      if (\n        (e.documentLoaded ||\n          !document.body ||\n          (document.readyState &&\n            \"interactive\" !== document.readyState &&\n            \"complete\" !== document.readyState &&\n            \"loaded\" !== document.readyState) ||\n          e.deferLoad ||\n          (e.documentLoaded = !0),\n        e.documentLoaded)\n      )\n        if (\n          (e.invisibleDiv || e.createInvisibleDiv(document.body),\n          e.uetConfig.disableContainer ||\n            e.containerLoaded ||\n            e.uetConfig.cusig.hasLoaded ||\n            e.uetConfig.cusig.timeoutId)\n        ) {\n          if (!1 === e.evqCDispatch) {\n            e.evqCDispatch = !0;\n          }\n          if (\n            e.uetConfig.consent.enabled &&\n            !e.uetConfig.consent.timeoutId &&\n            e.uetConfig.consent.waitForUpdate > 0\n          )\n            e.uetConfig.consent.timeoutId = setTimeout(function () {\n              e.checkuetHostdocumentload();\n            }, e.uetConfig.consent.waitForUpdate);\n          else if (\n            !e.uetConfig.tcf.enabled ||\n            e.uetConfig.tcf.hasLoaded ||\n            e.uetConfig.tcf.timeoutId\n          ) {\n            if (!e.uetLoaded) {\n              e.uetLoaded = !0;\n            }\n          } else\n            e.uetConfig.tcf.timeoutId = setTimeout(function () {\n              e.checkuetHostdocumentload();\n            }, 500);\n        } else\n          e.uetConfig.cusig.timeoutId = setTimeout(function () {\n            e.checkuetHostdocumentload();\n          }, 1500);\n      else\n        setTimeout(function () {\n          e.checkuetHostdocumentload();\n        }, 5);\n    }";
  const args = [];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 861 function 1 (_push)", () => {
  const source = "function (e) {\n      if (e[1] instanceof Array)\n        if (\"event\" === e[0]) {\n          var t = e[1][1] || {},\n            i = e[1][0];\n          if (null == i) return;\n          var o = i === this.pageViewEvt ? this.pageLoadEvt : this.customEvt;\n          this.evt(o, i, t, e[2]);\n        } else if (\"set\" === e[0]) {\n          if (\"object\" != typeof e[1][0]) return;\n          for (var n in e[1][0])\n            if (\n              this.knownParams.hasOwnProperty(n) &&\n              ((this.pageLevelParams[n] = e[1][0][n]),\n              \"pid\" === n && !0 === this.pageLoadDispatch)\n            ) {\n              var s = this.validateSubparams({ pid: e[1][0][n] }, \"\");\n              s.hasOwnProperty(\"pid\") && null;\n            }\n        } else if (\"consent\" === e[0]) {\n          var r = e[1][1],\n            h = e[1][0];\n          if (null === r || \"object\" != typeof r) return;\n          if (this.shouldEnforceSb()) return;\n          var d = !1;\n          if (\n            r.hasOwnProperty(\"source\") &&\n            this.stringExists(r.source) &&\n            0 === r.source.indexOf(\"gtm_\")\n          )\n            if (\"gtm_update\" === r.source && r.hasOwnProperty(\"ad_storage\")) {\n              if (\n                !0 !== this.uetConfig.cusig.blob.ec &&\n                !0 !== this.uetConfig.cusig.blob.ea\n              )\n                return;\n              d = !0;\n            } else if (\"gtm_auto\" !== r.source) return;\n          if (((this.uetConfig.consent.enabled = !0), \"default\" === h)) {\n            if (\n              (r.hasOwnProperty(\"ad_storage\") &&\n                !1 === this.uetConfig.consent.adStorageUpdated &&\n                ((this.uetConfig.consent.adStorageAllowed =\n                  \"denied\" !== r.ad_storage),\n                (this.uetConfig.consent.enforced = !1),\n                !0 === this.uetConfig.tcf.auto &&\n                  ((this.uetConfig.tcf.enabled = !1),\n                  (this.uetConfig.tcf.auto = !1))),\n              this.handleCookieIds(),\n              null,\n              r.hasOwnProperty(\"wait_for_update\"))\n            ) {\n              var u = parseInt(r.wait_for_update, 10);\n              !isNaN(u) &&\n                u > 0 &&\n                ((u = Math.min(u, 1e4)),\n                (this.uetConfig.consent.waitForUpdate = u));\n            }\n          } else\n            \"update\" === h &&\n              r.hasOwnProperty(\"ad_storage\") &&\n              ((this.uetConfig.consent.adStorageAllowed =\n                \"denied\" !== r.ad_storage),\n              (this.uetConfig.consent.adStorageUpdated = !0),\n              (this.uetConfig.consent.enforced = !1),\n              !0 === this.uetConfig.tcf.auto &&\n                ((this.uetConfig.tcf.enabled = !1),\n                (this.uetConfig.tcf.auto = !1)),\n              this.handleCookieIds(),\n              d && null,\n              null,\n              this.uetConfig.consent.timeoutId &&\n                !0 !== this.uetLoaded &&\n                (clearTimeout(this.uetConfig.consent.timeoutId),\n                this.checkuetHostdocumentload()));\n        } else if (\"config\" === e[0]) {\n          ((r = e[1][1]), (h = e[1][0]));\n          if (null === r || \"object\" != typeof r) return;\n          if (\"tcf\" === h) {\n            if (this.shouldEnforceSb()) return;\n            r.hasOwnProperty(\"enabled\") &&\n              !0 === r.enabled &&\n              this.tcfSubscribe(!1);\n          }\n        }\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 862 function 1 (checkuetHostdocumentload)", () => {
  const source = "function () {\n      var e = this.uetInstance;\n      if (\n        (e.documentLoaded ||\n          !document.body ||\n          (document.readyState &&\n            \"interactive\" !== document.readyState &&\n            \"complete\" !== document.readyState &&\n            \"loaded\" !== document.readyState) ||\n          e.deferLoad ||\n          (e.documentLoaded = !0),\n        e.documentLoaded)\n      )\n        if (\n          (e.invisibleDiv || e.createInvisibleDiv(document.body),\n          e.uetConfig.disableContainer ||\n            e.containerLoaded ||\n            e.uetConfig.cusig.hasLoaded ||\n            e.uetConfig.cusig.timeoutId)\n        ) {\n          if (!1 === e.evqCDispatch) {\n            e.evqCDispatch = !0;\n          }\n          if (\n            e.uetConfig.consent.enabled &&\n            !e.uetConfig.consent.timeoutId &&\n            e.uetConfig.consent.waitForUpdate > 0\n          )\n            e.uetConfig.consent.timeoutId = setTimeout(function () {\n              e.checkuetHostdocumentload();\n            }, e.uetConfig.consent.waitForUpdate);\n          else if (\n            !e.uetConfig.tcf.enabled ||\n            e.uetConfig.tcf.hasLoaded ||\n            e.uetConfig.tcf.timeoutId\n          ) {\n            if (!e.uetLoaded) {\n              e.uetLoaded = !0;\n            }\n          } else\n            e.uetConfig.tcf.timeoutId = setTimeout(function () {\n              e.checkuetHostdocumentload();\n            }, 500);\n        } else\n          e.uetConfig.cusig.timeoutId = setTimeout(function () {\n            e.checkuetHostdocumentload();\n          }, 1500);\n      else\n        setTimeout(function () {\n          e.checkuetHostdocumentload();\n        }, 5);\n    }";
  const args = [];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 863 function 1 (fireSendBeacon)", () => {
  const source = "function (e, t) {\n      if (!0 !== this.uetConfig.msDns) {\n        this.beaconParams.bo = (this.beaconParams.bo || 0) + 1;\n        var i = this.combine(this.beaconParams, { evt: e });\n        (t && (i = this.clone(t, i)), (i = this.addConsentParams(i)));\n        var o = this.removeTrailingAmp(\n          this.getClUrl(this.previewPrefix) + this.stringifyToRequest(i),\n        );\n        try {\n        } catch (n) {}\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 864 function 1 (fireSendBeacon)", () => {
  const source = "function (e, t) {\n      if (!0 !== this.uetConfig.msDns) {\n        this.beaconParams.bo = (this.beaconParams.bo || 0) + 1;\n        var i = this.combine(this.beaconParams, { evt: e });\n        (t && (i = this.clone(t, i)), (i = this.addConsentParams(i)));\n        var o = this.removeTrailingAmp(\n          this.getClUrl(this.previewPrefix) + this.stringifyToRequest(i),\n        );\n        try {\n        } catch (n) {}\n      }\n    }";
  const args = [
  null,
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 865 function 1 (fireBeaconImg)", () => {
  const source = "function (e) {\n      if (!0 !== this.uetConfig.msDns) {\n        var t = this.createInvisibleElement(this.invisibleDiv, \"img\");\n        ((t.width = 0), (t.height = 0));\n        var i = Math.floor(1e6 * Math.random());\n        return (\n          t.setAttribute(\"alt\", \"\"),\n          this.uetConfig.imgAlt && t.setAttribute(\"alt\", this.uetConfig.imgAlt),\n          i\n        );\n      }\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 866 function 1 (_push)", () => {
  const source = "function (e) {\n      if (e[1] instanceof Array)\n        if (\"event\" === e[0]) {\n          var t = e[1][1] || {},\n            i = e[1][0];\n          if (null == i) return;\n          var o = i === this.pageViewEvt ? this.pageLoadEvt : this.customEvt;\n          this.evt(o, i, t, e[2]);\n        } else if (\"set\" === e[0]) {\n          if (\"object\" != typeof e[1][0]) return;\n          for (var n in e[1][0])\n            if (\n              this.knownParams.hasOwnProperty(n) &&\n              ((this.pageLevelParams[n] = e[1][0][n]),\n              \"pid\" === n && !0 === this.pageLoadDispatch)\n            ) {\n              var s = this.validateSubparams({ pid: e[1][0][n] }, \"\");\n              s.hasOwnProperty(\"pid\") && null;\n            }\n        } else if (\"consent\" === e[0]) {\n          var r = e[1][1],\n            h = e[1][0];\n          if (null === r || \"object\" != typeof r) return;\n          if (this.shouldEnforceSb()) return;\n          var d = !1;\n          if (\n            r.hasOwnProperty(\"source\") &&\n            this.stringExists(r.source) &&\n            0 === r.source.indexOf(\"gtm_\")\n          )\n            if (\"gtm_update\" === r.source && r.hasOwnProperty(\"ad_storage\")) {\n              if (\n                !0 !== this.uetConfig.cusig.blob.ec &&\n                !0 !== this.uetConfig.cusig.blob.ea\n              )\n                return;\n              d = !0;\n            } else if (\"gtm_auto\" !== r.source) return;\n          if (((this.uetConfig.consent.enabled = !0), \"default\" === h)) {\n            if (\n              (r.hasOwnProperty(\"ad_storage\") &&\n                !1 === this.uetConfig.consent.adStorageUpdated &&\n                ((this.uetConfig.consent.adStorageAllowed =\n                  \"denied\" !== r.ad_storage),\n                (this.uetConfig.consent.enforced = !1),\n                !0 === this.uetConfig.tcf.auto &&\n                  ((this.uetConfig.tcf.enabled = !1),\n                  (this.uetConfig.tcf.auto = !1))),\n              this.handleCookieIds(),\n              null,\n              r.hasOwnProperty(\"wait_for_update\"))\n            ) {\n              var u = parseInt(r.wait_for_update, 10);\n              !isNaN(u) &&\n                u > 0 &&\n                ((u = Math.min(u, 1e4)),\n                (this.uetConfig.consent.waitForUpdate = u));\n            }\n          } else\n            \"update\" === h &&\n              r.hasOwnProperty(\"ad_storage\") &&\n              ((this.uetConfig.consent.adStorageAllowed =\n                \"denied\" !== r.ad_storage),\n              (this.uetConfig.consent.adStorageUpdated = !0),\n              (this.uetConfig.consent.enforced = !1),\n              !0 === this.uetConfig.tcf.auto &&\n                ((this.uetConfig.tcf.enabled = !1),\n                (this.uetConfig.tcf.auto = !1)),\n              this.handleCookieIds(),\n              d && null,\n              null,\n              this.uetConfig.consent.timeoutId &&\n                !0 !== this.uetLoaded &&\n                (clearTimeout(this.uetConfig.consent.timeoutId),\n                this.checkuetHostdocumentload()));\n        } else if (\"config\" === e[0]) {\n          ((r = e[1][1]), (h = e[1][0]));\n          if (null === r || \"object\" != typeof r) return;\n          if (\"tcf\" === h) {\n            if (this.shouldEnforceSb()) return;\n            r.hasOwnProperty(\"enabled\") &&\n              !0 === r.enabled &&\n              this.tcfSubscribe(!1);\n          }\n        }\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 867 function 1 (fireBeacon)", () => {
  const source = "function (e) {\n      for (\n        var t = this.getClUrl(this.urlPrefix),\n          i = this.combine(this.beaconParams, e),\n          o = this.stringifyToRequest(i),\n          n = this.removeTrailingAmp(t + o),\n          s = [\n            \"r\",\n            \"el2\",\n            \"ec2\",\n            \"ea2\",\n            \"page_location\",\n            \"page_path\",\n            \"kw\",\n            \"p\",\n            \"tl\",\n            \"items\",\n          ],\n          r = 0;\n        encodeURI(n).length > this.URLLENGTHLIMIT && s.length > r;\n        r++\n      ) {\n        var h = s[r];\n        h in i &&\n          (0 == r\n            ? (i[h] = i[h].split(\"?\")[0])\n            : r <= 3\n              ? (i[h] = \"\")\n              : delete i[h],\n          (o = this.stringifyToRequest(i)),\n          (n = this.removeTrailingAmp(t + o)));\n      }\n      (this.snippetEventQueue.push(o),\n        this.snippetEventQueue.length > 20 && this.snippetEventQueue.shift());\n      try {\n        if (\"function\" == typeof window.CustomEvent) {\n          var d = new CustomEvent(\"UetEvent\", {\n            bubbles: !0,\n            detail: { uetEvent: o },\n          });\n          this.invisibleDiv.dispatchEvent(d);\n        }\n      } catch (u) {}\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 868 function 1 (_push)", () => {
  const source = "function (e) {\n      if (e[1] instanceof Array)\n        if (\"event\" === e[0]) {\n          var t = e[1][1] || {},\n            i = e[1][0];\n          if (null == i) return;\n          var o = i === this.pageViewEvt ? this.pageLoadEvt : this.customEvt;\n          this.evt(o, i, t, e[2]);\n        } else if (\"set\" === e[0]) {\n          if (\"object\" != typeof e[1][0]) return;\n          for (var n in e[1][0])\n            if (\n              this.knownParams.hasOwnProperty(n) &&\n              ((this.pageLevelParams[n] = e[1][0][n]),\n              \"pid\" === n && !0 === this.pageLoadDispatch)\n            ) {\n              var s = this.validateSubparams({ pid: e[1][0][n] }, \"\");\n              s.hasOwnProperty(\"pid\") && null;\n            }\n        } else if (\"consent\" === e[0]) {\n          var r = e[1][1],\n            h = e[1][0];\n          if (null === r || \"object\" != typeof r) return;\n          if (this.shouldEnforceSb()) return;\n          var d = !1;\n          if (\n            r.hasOwnProperty(\"source\") &&\n            this.stringExists(r.source) &&\n            0 === r.source.indexOf(\"gtm_\")\n          )\n            if (\"gtm_update\" === r.source && r.hasOwnProperty(\"ad_storage\")) {\n              if (\n                !0 !== this.uetConfig.cusig.blob.ec &&\n                !0 !== this.uetConfig.cusig.blob.ea\n              )\n                return;\n              d = !0;\n            } else if (\"gtm_auto\" !== r.source) return;\n          if (((this.uetConfig.consent.enabled = !0), \"default\" === h)) {\n            if (\n              (r.hasOwnProperty(\"ad_storage\") &&\n                !1 === this.uetConfig.consent.adStorageUpdated &&\n                ((this.uetConfig.consent.adStorageAllowed =\n                  \"denied\" !== r.ad_storage),\n                (this.uetConfig.consent.enforced = !1),\n                !0 === this.uetConfig.tcf.auto &&\n                  ((this.uetConfig.tcf.enabled = !1),\n                  (this.uetConfig.tcf.auto = !1))),\n              this.handleCookieIds(),\n              null,\n              r.hasOwnProperty(\"wait_for_update\"))\n            ) {\n              var u = parseInt(r.wait_for_update, 10);\n              !isNaN(u) &&\n                u > 0 &&\n                ((u = Math.min(u, 1e4)),\n                (this.uetConfig.consent.waitForUpdate = u));\n            }\n          } else\n            \"update\" === h &&\n              r.hasOwnProperty(\"ad_storage\") &&\n              ((this.uetConfig.consent.adStorageAllowed =\n                \"denied\" !== r.ad_storage),\n              (this.uetConfig.consent.adStorageUpdated = !0),\n              (this.uetConfig.consent.enforced = !1),\n              !0 === this.uetConfig.tcf.auto &&\n                ((this.uetConfig.tcf.enabled = !1),\n                (this.uetConfig.tcf.auto = !1)),\n              this.handleCookieIds(),\n              d && null,\n              null,\n              this.uetConfig.consent.timeoutId &&\n                !0 !== this.uetLoaded &&\n                (clearTimeout(this.uetConfig.consent.timeoutId),\n                this.checkuetHostdocumentload()));\n        } else if (\"config\" === e[0]) {\n          ((r = e[1][1]), (h = e[1][0]));\n          if (null === r || \"object\" != typeof r) return;\n          if (\"tcf\" === h) {\n            if (this.shouldEnforceSb()) return;\n            r.hasOwnProperty(\"enabled\") &&\n              !0 === r.enabled &&\n              this.tcfSubscribe(!1);\n          }\n        }\n    }";
  const args = [
  null
];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});

test("row 869 function 1 (checkuetHostdocumentload)", () => {
  const source = "function () {\n      var e = this.uetInstance;\n      if (\n        (e.documentLoaded ||\n          !document.body ||\n          (document.readyState &&\n            \"interactive\" !== document.readyState &&\n            \"complete\" !== document.readyState &&\n            \"loaded\" !== document.readyState) ||\n          e.deferLoad ||\n          (e.documentLoaded = !0),\n        e.documentLoaded)\n      )\n        if (\n          (e.invisibleDiv || e.createInvisibleDiv(document.body),\n          e.uetConfig.disableContainer ||\n            e.containerLoaded ||\n            e.uetConfig.cusig.hasLoaded ||\n            e.uetConfig.cusig.timeoutId)\n        ) {\n          if (!1 === e.evqCDispatch) {\n            e.evqCDispatch = !0;\n          }\n          if (\n            e.uetConfig.consent.enabled &&\n            !e.uetConfig.consent.timeoutId &&\n            e.uetConfig.consent.waitForUpdate > 0\n          )\n            e.uetConfig.consent.timeoutId = setTimeout(function () {\n              e.checkuetHostdocumentload();\n            }, e.uetConfig.consent.waitForUpdate);\n          else if (\n            !e.uetConfig.tcf.enabled ||\n            e.uetConfig.tcf.hasLoaded ||\n            e.uetConfig.tcf.timeoutId\n          ) {\n            if (!e.uetLoaded) {\n              e.uetLoaded = !0;\n            }\n          } else\n            e.uetConfig.tcf.timeoutId = setTimeout(function () {\n              e.checkuetHostdocumentload();\n            }, 500);\n        } else\n          e.uetConfig.cusig.timeoutId = setTimeout(function () {\n            e.checkuetHostdocumentload();\n          }, 1500);\n      else\n        setTimeout(function () {\n          e.checkuetHostdocumentload();\n        }, 5);\n    }";
  const args = [];
  const expected = {
  "outcome": "throw",
  "error": {
    "name": "TypeError"
  }
};
  const actual = runCase(source, args);
  assertCase(actual, expected);
});
