"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const BEFORE_ORIGINAL_FILE = path.join(ROOT, "backups", "original.original.js");
const BEFORE_PLANNED_FILE = path.join(ROOT, "backups", "planned-parenthood-gtm.original.js");
const AFTER_ORIGINAL_FILE = path.join(ROOT, "original.js");
const AFTER_PLANNED_FILE = path.join(ROOT, "planned-parenthood-gtm.js");

function readFile(filePath) {
    return fs.readFileSync(filePath, "utf8");
}

function extractBootstrapSource(filePath, source) {
    const marker = "(function() {";
    const markerIndex = source.indexOf(marker);
    const hasContainerBlob = source.indexOf('"resource"') !== -1;
    if (markerIndex === -1 || !hasContainerBlob) {
        return source;
    }

    return source.slice(0, markerIndex);
}

function assertNeutralizedRuntime(windowObj) {
    assert.strictEqual(typeof windowObj.dataLayer, "object");
    assert.strictEqual(typeof windowObj.dataLayer.push, "function");
    assert.strictEqual(typeof windowObj.gtag, "function");
    assert.strictEqual(typeof windowObj.google_tag_manager, "object");
    assert.strictEqual(typeof windowObj.google_tag_manager.e, "function");

    const startLength = windowObj.dataLayer.length;
    const returnValue = windowObj.dataLayer.push({ event: "unit_test_event" });
    assert.strictEqual(returnValue, startLength);
    assert.strictEqual(windowObj.dataLayer.length, startLength);
    assert.strictEqual(windowObj.dataLayer._pp_noop, true);

    assert.doesNotThrow(function() {
        windowObj.gtag("event", "unit_test_event", { category: "test" });
    });
    assert.strictEqual(windowObj.google_tag_manager.e("1 + 1"), undefined);
}

function createWindow() {
    const window = {
        dataLayer: [],
        console: console,
    };

    window.window = window;
    window.self = window;
    window.globalThis = window;

    return window;
}

function runInVm(source, filename) {
    const window = createWindow();
    const context = vm.createContext({ window: window, self: window, globalThis: window, console: console });
    new vm.Script(source, { filename: filename }).runInContext(context, { timeout: 1000 });
    return window;
}

function loadRuntime(filePath) {
    const source = readFile(filePath);
    const bootstrap = extractBootstrapSource(filePath, source);
    return runInVm(bootstrap, path.basename(filePath));
}

function runTest(name, fn) {
    try {
        fn();
        console.log("PASS", name);
    } catch (err) {
        console.error("FAIL", name);
        console.error(err && err.stack ? err.stack : err);
        process.exitCode = 1;
    }
}

runTest("backup originals are preserved", function() {
    assert.strictEqual(fs.existsSync(BEFORE_ORIGINAL_FILE), true);
    assert.strictEqual(fs.existsSync(BEFORE_PLANNED_FILE), true);
});

runTest("backup original.js still exposes legacy eval runtime", function() {
    const beforeWindow = loadRuntime(BEFORE_ORIGINAL_FILE);

    assert.strictEqual(typeof beforeWindow.google_tag_manager, "object");
    assert.strictEqual(typeof beforeWindow.google_tag_manager.e, "function");
    assert.strictEqual(beforeWindow.google_tag_manager.e("1 + 1"), 2);
});

runTest("neutralized original.js provides no-op compatibility APIs", function() {
    const afterWindow = loadRuntime(AFTER_ORIGINAL_FILE);
    assertNeutralizedRuntime(afterWindow);
});

runTest("neutralized planned-parenthood-gtm.js provides no-op compatibility APIs", function() {
    const afterWindow = loadRuntime(AFTER_PLANNED_FILE);
    assertNeutralizedRuntime(afterWindow);
});

runTest("neutralized shim is idempotent", function() {
    const source = readFile(AFTER_PLANNED_FILE);
    const window = createWindow();
    const context = vm.createContext({ window: window, self: window, globalThis: window, console: console });

    const script = new vm.Script(source, { filename: path.basename(AFTER_PLANNED_FILE) });
    script.runInContext(context, { timeout: 1000 });
    script.runInContext(context, { timeout: 1000 });

    assert.strictEqual(window.dataLayer._pp_noop, true);
    assert.strictEqual(typeof window.dataLayer.push, "function");
    assert.strictEqual(typeof window.gtag, "function");
    assert.strictEqual(typeof window.google_tag_manager.e, "function");
});
