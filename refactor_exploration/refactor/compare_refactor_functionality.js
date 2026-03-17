const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const {
  methodDefinitionFunctions,
  methodDefinitionInvalidFunctions,
} = require('./method_definition_functions');
const {
  methodCodeRefactoredFunctions,
  methodCodeRefactoredInvalidFunctions,
} = require('./method_code_refactored_functions');

const TRACKING_KEYWORDS = [
  'track',
  'tracking',
  'analytics',
  'cookie',
  'visitor',
  'audience',
  'mbox',
  'beacon',
  'consent',
  'adobe',
  'utm',
  'pixel',
  'telemetry',
  'dyid',
  'event',
  'optout',
  'measure',
  'segment',
  'campaign',
  'clickid',
];

const MAX_ARITY = 6;
const EXEC_TIMEOUT_MS = 120;

function pairKey(row, functionIndex) {
  return `${row}:${functionIndex}`;
}

function hasTrackingToken(text) {
  const lower = String(text || '').toLowerCase();
  return TRACKING_KEYWORDS.some((kw) => lower.includes(kw));
}

function createState() {
  return {
    callTracking: new Set(),
    callNonTracking: new Set(),
    writeTracking: new Set(),
    writeNonTracking: new Set(),
  };
}

function addCall(state, pathParts) {
  const label = pathParts.join('.');
  if (hasTrackingToken(label)) {
    state.callTracking.add(label);
  } else {
    state.callNonTracking.add(label);
  }
}

function addWrite(state, pathParts) {
  const label = pathParts.join('.');
  if (hasTrackingToken(label)) {
    state.writeTracking.add(label);
  } else {
    state.writeNonTracking.add(label);
  }
}

function createStub(pathParts, state) {
  const fn = function stubbedFunction() {
    addCall(state, pathParts);
    return proxy;
  };

  const handler = {
    get(_target, prop) {
      if (prop === Symbol.toPrimitive) {
        return () => 0;
      }
      if (prop === 'valueOf') {
        return () => 0;
      }
      if (prop === 'toString') {
        return () => `[Stub:${pathParts.join('.')}]`;
      }
      if (prop === 'then') {
        return undefined;
      }
      const next = createStub(pathParts.concat(String(prop)), state);
      return next;
    },
    set(_target, prop, _value) {
      addWrite(state, pathParts.concat(String(prop)));
      return true;
    },
    apply(_target, _thisArg, _argList) {
      addCall(state, pathParts);
      return proxy;
    },
    construct(_target, _argList) {
      addCall(state, pathParts.concat('new'));
      return proxy;
    },
    has() {
      return true;
    },
  };

  const proxy = new Proxy(fn, handler);
  return proxy;
}

class FakePromise {
  constructor(executor) {
    if (typeof executor === 'function') {
      try {
        executor(() => {}, () => {});
      } catch {
        // ignore
      }
    }
  }

  then() {
    return this;
  }

  catch() {
    return this;
  }

  finally() {
    return this;
  }

  static resolve() {
    return new FakePromise();
  }

  static reject() {
    return new FakePromise();
  }
}

function createSandbox(state) {
  const target = Object.create(null);
  const noop = () => undefined;

  target.console = {
    log: noop,
    error: noop,
    warn: noop,
    info: noop,
    debug: noop,
  };
  target.setTimeout = () => 0;
  target.clearTimeout = noop;
  target.setInterval = () => 0;
  target.clearInterval = noop;
  target.setImmediate = () => 0;
  target.clearImmediate = noop;
  target.queueMicrotask = noop;
  target.Promise = FakePromise;

  return new Proxy(target, {
    has() {
      return true;
    },
    get(obj, prop) {
      if (prop === Symbol.unscopables) {
        return undefined;
      }

      if (Object.prototype.hasOwnProperty.call(obj, prop)) {
        return obj[prop];
      }

      if (prop in globalThis) {
        const value = globalThis[prop];
        if (typeof value === 'function') {
          return value.bind(globalThis);
        }
        return value;
      }

      const stub = createStub([String(prop)], state);
      obj[prop] = stub;
      return stub;
    },
    set(obj, prop, value) {
      obj[prop] = value;
      addWrite(state, [String(prop)]);
      return true;
    },
  });
}

function normalize(value, depth = 0) {
  if (depth > 4) {
    return '[MaxDepth]';
  }

  if (value === undefined) {
    return { type: 'undefined' };
  }
  if (value === null) {
    return null;
  }

  const t = typeof value;

  if (t === 'number') {
    if (Number.isNaN(value)) {
      return { type: 'number', value: 'NaN' };
    }
    if (!Number.isFinite(value)) {
      return { type: 'number', value: value > 0 ? 'Infinity' : '-Infinity' };
    }
    return value;
  }

  if (t === 'string' || t === 'boolean') {
    return value;
  }

  if (t === 'bigint') {
    return { type: 'bigint', value: String(value) };
  }

  if (t === 'symbol') {
    return { type: 'symbol', value: String(value) };
  }

  if (t === 'function') {
    return { type: 'function' };
  }

  if (Array.isArray(value)) {
    return value.slice(0, 12).map((item) => normalize(item, depth + 1));
  }

  if (t === 'object') {
    const out = {};
    for (const key of Object.keys(value).slice(0, 12)) {
      out[key] = normalize(value[key], depth + 1);
    }
    return { type: 'object', value: out };
  }

  return { type: 'unknown', value: String(value) };
}

function runFunction(source, args) {
  const state = createState();
  const sandbox = createSandbox(state);
  const context = vm.createContext({ sandbox });
  const scriptSource = [
    'with (sandbox) {',
    `  const __fn = (${source});`,
    `  const __args = ${JSON.stringify(args)};`,
    '  __result = __fn(...__args);',
    '}',
  ].join('\n');

  try {
    const script = new vm.Script(scriptSource, { displayErrors: true });
    script.runInContext(context, { timeout: EXEC_TIMEOUT_MS });

    return {
      outcome: 'return',
      value: normalize(context.__result),
      callTracking: Array.from(state.callTracking).sort(),
      callNonTracking: Array.from(state.callNonTracking).sort(),
      writeTracking: Array.from(state.writeTracking).sort(),
      writeNonTracking: Array.from(state.writeNonTracking).sort(),
    };
  } catch (error) {
    return {
      outcome: 'throw',
      errorName: error && error.name ? error.name : 'Error',
      callTracking: Array.from(state.callTracking).sort(),
      callNonTracking: Array.from(state.callNonTracking).sort(),
      writeTracking: Array.from(state.writeTracking).sort(),
      writeNonTracking: Array.from(state.writeNonTracking).sort(),
    };
  }
}

function buildInputCases(originalSource, refactoredSource, arity) {
  const joined = `${originalSource}\n${refactoredSource}`;
  const size = Math.min(Math.max(arity, 0), MAX_ARITY);

  const makeArgs = (seed) => Array.from({ length: size }, (_v, idx) => seed(idx));
  const cases = [];

  cases.push(makeArgs(() => undefined));
  cases.push(makeArgs((idx) => idx + 1));
  cases.push(
    makeArgs((idx) => {
      if (idx === 0) {
        return { origin: 'null', value: 1, id: 'id-1', cookie: 'k=v' };
      }
      if (idx === 1) {
        return 'sample';
      }
      if (idx === 2) {
        return true;
      }
      if (idx === 3) {
        return [];
      }
      if (idx === 4) {
        return {};
      }
      return 0;
    })
  );

  if (/Array\.isArray\(/.test(joined) && size > 0) {
    const arr = makeArgs(() => undefined);
    arr[0] = [];
    cases.push(arr);
  }

  if (/\.origin/.test(joined) && size > 0) {
    const obj = makeArgs(() => undefined);
    obj[0] = { origin: 'null' };
    cases.push(obj);
  }

  if (/cookie|visitor|track|analytics|beacon/i.test(joined) && size > 0) {
    const trk = makeArgs(() => undefined);
    trk[0] = 'cookie=value';
    cases.push(trk);
  }

  return cases;
}

function arraysEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

function compareCase(originalRun, refactoredRun, mode) {
  const trackingDiff =
    !arraysEqual(originalRun.callTracking, refactoredRun.callTracking) ||
    !arraysEqual(originalRun.writeTracking, refactoredRun.writeTracking);

  if (originalRun.outcome !== refactoredRun.outcome) {
    return {
      equivalentExceptTracking: false,
      reason: 'Different outcome (return vs throw)',
      trackingDiff,
    };
  }

  if (originalRun.outcome === 'throw') {
    if (originalRun.errorName !== refactoredRun.errorName) {
      return {
        equivalentExceptTracking: false,
        reason: `Different error type (${originalRun.errorName} vs ${refactoredRun.errorName})`,
        trackingDiff,
      };
    }
  } else {
    try {
      assert.deepStrictEqual(originalRun.value, refactoredRun.value);
    } catch {
      return {
        equivalentExceptTracking: false,
        reason: 'Different return value',
        trackingDiff,
      };
    }
  }

  if (mode === 'strict' && !arraysEqual(originalRun.callNonTracking, refactoredRun.callNonTracking)) {
    return {
      equivalentExceptTracking: false,
      reason: 'Different non-tracking call side effects',
      trackingDiff,
    };
  }

  if (mode !== 'relaxed' && !arraysEqual(originalRun.writeNonTracking, refactoredRun.writeNonTracking)) {
    return {
      equivalentExceptTracking: false,
      reason: 'Different non-tracking writes',
      trackingDiff,
    };
  }

  return {
    equivalentExceptTracking: true,
    reason: trackingDiff ? 'Equivalent with tracking differences' : 'Equivalent with no observed differences',
    trackingDiff,
  };
}

function mapByKey(entries) {
  const out = new Map();
  for (const entry of entries) {
    out.set(pairKey(entry.row, entry.functionIndex), entry);
  }
  return out;
}

function main() {
  const originalMap = mapByKey(methodDefinitionFunctions);
  const refactoredMap = mapByKey(methodCodeRefactoredFunctions);

  const allKeys = new Set([...originalMap.keys(), ...refactoredMap.keys()]);

  const report = {
    generatedAt: new Date().toISOString(),
    input: {
      originalFile: 'method_definition_functions.js',
      refactoredFile: 'method_code_refactored_functions.js',
      originalStandaloneCount: methodDefinitionFunctions.length,
      refactoredStandaloneCount: methodCodeRefactoredFunctions.length,
      originalInvalidCount: methodDefinitionInvalidFunctions.length,
      refactoredInvalidCount: methodCodeRefactoredInvalidFunctions.length,
    },
    summary: {
      pairedFunctions: 0,
      equivalentExceptTracking: 0,
      behaviorChangedNonTracking: 0,
      relaxedEquivalentExceptTracking: 0,
      relaxedBehaviorChangedNonTracking: 0,
      inconclusive: 0,
      unmatchedOriginalOnly: 0,
      unmatchedRefactoredOnly: 0,
      withTrackingDifferences: 0,
    },
    details: [],
  };

  const sortedKeys = Array.from(allKeys).sort((a, b) => {
    const [ar, ai] = a.split(':').map(Number);
    const [br, bi] = b.split(':').map(Number);
    if (ar !== br) {
      return ar - br;
    }
    return ai - bi;
  });

  for (const key of sortedKeys) {
    const original = originalMap.get(key);
    const refactored = refactoredMap.get(key);

    if (!original || !refactored) {
      const detail = {
        key,
        row: Number(key.split(':')[0]),
        functionIndex: Number(key.split(':')[1]),
        status: 'inconclusive',
        reason: original ? 'Missing in refactored set' : 'Missing in original set',
      };
      report.details.push(detail);
      report.summary.inconclusive += 1;
      if (original && !refactored) {
        report.summary.unmatchedOriginalOnly += 1;
      }
      if (!original && refactored) {
        report.summary.unmatchedRefactoredOnly += 1;
      }
      continue;
    }

    report.summary.pairedFunctions += 1;

    const arity = Math.max(original.fn.length, refactored.fn.length);
    const inputCases = buildInputCases(original.fn.toString(), refactored.fn.toString(), arity);

    let status = 'equivalent_except_tracking';
    let reason = 'No non-tracking differences observed';
    let relaxedStatus = 'equivalent_except_tracking';
    let relaxedReason = 'No observable return/error differences';
    let trackingDiffObserved = false;
    let firstDiff = null;
    let firstRelaxedDiff = null;

    for (let caseIndex = 0; caseIndex < inputCases.length; caseIndex += 1) {
      const args = inputCases[caseIndex];
      const originalRun = runFunction(original.fn.toString(), args);
      const refactoredRun = runFunction(refactored.fn.toString(), args);
      const cmp = compareCase(originalRun, refactoredRun, 'strict');
      const relaxedCmp = compareCase(originalRun, refactoredRun, 'relaxed');

      if (cmp.trackingDiff) {
        trackingDiffObserved = true;
      }

      if (!cmp.equivalentExceptTracking) {
        status = 'behavior_changed_non_tracking';
        reason = cmp.reason;
        firstDiff = {
          caseIndex,
          args,
          originalRun,
          refactoredRun,
        };
        break;
      }

      if (!relaxedCmp.equivalentExceptTracking && !firstRelaxedDiff) {
        relaxedStatus = 'behavior_changed_non_tracking';
        relaxedReason = relaxedCmp.reason;
        firstRelaxedDiff = {
          caseIndex,
          args,
          originalRun,
          refactoredRun,
        };
      }
    }

    if (status === 'equivalent_except_tracking') {
      report.summary.equivalentExceptTracking += 1;
      if (trackingDiffObserved) {
        report.summary.withTrackingDifferences += 1;
      }
    } else {
      report.summary.behaviorChangedNonTracking += 1;
    }

    if (relaxedStatus === 'equivalent_except_tracking') {
      report.summary.relaxedEquivalentExceptTracking += 1;
    } else {
      report.summary.relaxedBehaviorChangedNonTracking += 1;
    }

    report.details.push({
      key,
      row: original.row,
      functionIndex: original.functionIndex,
      originalName: original.name,
      refactoredName: refactored.name,
      status,
      reason,
      relaxedStatus,
      relaxedReason,
      trackingDifferenceObserved: trackingDiffObserved,
      firstDiff,
      firstRelaxedDiff,
    });
  }

  const outJsonPath = path.join(process.cwd(), 'method_code_refactor_comparison_report.json');
  fs.writeFileSync(outJsonPath, JSON.stringify(report, null, 2), 'utf8');

  const changed = report.details.filter((d) => d.status === 'behavior_changed_non_tracking');
  const inconclusive = report.details.filter((d) => d.status === 'inconclusive');
  const summaryLines = [
    '# Refactor Functional Comparison Summary',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Paired functions: ${report.summary.pairedFunctions}`,
    `- Equivalent except tracking: ${report.summary.equivalentExceptTracking}`,
    `- Behavior changed (non-tracking): ${report.summary.behaviorChangedNonTracking}`,
    `- Relaxed equivalent except tracking: ${report.summary.relaxedEquivalentExceptTracking}`,
    `- Relaxed behavior changed (non-tracking): ${report.summary.relaxedBehaviorChangedNonTracking}`,
    `- Inconclusive: ${report.summary.inconclusive}`,
    `- Unmatched original only: ${report.summary.unmatchedOriginalOnly}`,
    `- Unmatched refactored only: ${report.summary.unmatchedRefactoredOnly}`,
    `- Equivalent pairs with tracking diffs observed: ${report.summary.withTrackingDifferences}`,
    '',
    '## First Non-Tracking Differences (up to 20)',
    '',
  ];

  for (const item of changed.slice(0, 20)) {
    summaryLines.push(
      `- row ${item.row} fn ${item.functionIndex} (${item.originalName} -> ${item.refactoredName}): ${item.reason}`
    );
  }

  if (changed.length === 0) {
    summaryLines.push('- None');
  }

  summaryLines.push('', '## First Inconclusive Items (up to 20)', '');

  for (const item of inconclusive.slice(0, 20)) {
    summaryLines.push(`- row ${item.row} fn ${item.functionIndex}: ${item.reason}`);
  }

  if (inconclusive.length === 0) {
    summaryLines.push('- None');
  }

  const outSummaryPath = path.join(process.cwd(), 'method_code_refactor_comparison_summary.md');
  fs.writeFileSync(outSummaryPath, `${summaryLines.join('\n')}\n`, 'utf8');

  console.log(`Wrote ${path.basename(outJsonPath)} and ${path.basename(outSummaryPath)}`);
  console.log(
    `Paired=${report.summary.pairedFunctions}, EquivalentExceptTracking=${report.summary.equivalentExceptTracking}, ChangedNonTracking=${report.summary.behaviorChangedNonTracking}, Inconclusive=${report.summary.inconclusive}`
  );
}

main();
