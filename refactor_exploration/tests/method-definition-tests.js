"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const CSV_PATH = path.resolve(__dirname, "..", "temp_3.csv");

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

function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];

        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i += 1;
                } else {
                    inQuotes = false;
                }
            } else {
                field += ch;
            }
            continue;
        }

        if (ch === '"') {
            inQuotes = true;
            continue;
        }

        if (ch === ",") {
            row.push(field);
            field = "";
            continue;
        }

        if (ch === "\n") {
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
            continue;
        }

        if (ch === "\r") {
            continue;
        }

        field += ch;
    }

    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows;
}

function skipString(source, index, quote) {
    let i = index + 1;
    while (i < source.length) {
        const ch = source[i];
        if (ch === "\\") {
            i += 2;
            continue;
        }
        if (quote === "`" && ch === "$" && source[i + 1] === "{") {
            i = skipTemplateExpression(source, i + 2);
            continue;
        }
        if (ch === quote) {
            return i + 1;
        }
        i += 1;
    }
    return i;
}

function skipLineComment(source, index) {
    let i = index + 2;
    while (i < source.length && source[i] !== "\n") {
        i += 1;
    }
    return i;
}

function skipBlockComment(source, index) {
    const end = source.indexOf("*/", index + 2);
    return end === -1 ? source.length : end + 2;
}

function skipTemplateExpression(source, index) {
    let depth = 1;
    let i = index;
    while (i < source.length) {
        const ch = source[i];
        const next = source[i + 1];

        if (ch === "'" || ch === '"' || ch === "`") {
            i = skipString(source, i, ch);
            continue;
        }
        if (ch === "/" && next === "/") {
            i = skipLineComment(source, i);
            continue;
        }
        if (ch === "/" && next === "*") {
            i = skipBlockComment(source, i);
            continue;
        }
        if (ch === "{") {
            depth += 1;
            i += 1;
            continue;
        }
        if (ch === "}") {
            depth -= 1;
            i += 1;
            if (depth === 0) {
                return i;
            }
            continue;
        }
        i += 1;
    }
    return i;
}

function findMatchingBrace(source, openBraceIndex) {
    let depth = 1;
    let i = openBraceIndex + 1;

    while (i < source.length) {
        const ch = source[i];
        const next = source[i + 1];

        if (ch === "'" || ch === '"' || ch === "`") {
            i = skipString(source, i, ch);
            continue;
        }
        if (ch === "/" && next === "/") {
            i = skipLineComment(source, i);
            continue;
        }
        if (ch === "/" && next === "*") {
            i = skipBlockComment(source, i);
            continue;
        }
        if (ch === "{") {
            depth += 1;
            i += 1;
            continue;
        }
        if (ch === "}") {
            depth -= 1;
            i += 1;
            if (depth === 0) {
                return i - 1;
            }
            continue;
        }
        i += 1;
    }

    return -1;
}

function extendThroughTerminator(source, indexAfterBrace) {
    let i = indexAfterBrace;
    while (i < source.length && /\s/.test(source[i])) {
        i += 1;
    }
    if (source[i] === ";") {
        return i + 1;
    }
    return i;
}

function extractFunctionSnippets(source) {
    const snippets = [];
    const seen = new Set();

    const declarationPattern = /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g;
    let match = declarationPattern.exec(source);
    while (match) {
        const openBrace = source.indexOf("{", declarationPattern.lastIndex);
        if (openBrace !== -1) {
            const closeBrace = findMatchingBrace(source, openBrace);
            if (closeBrace !== -1) {
                const start = match.index;
                const end = extendThroughTerminator(source, closeBrace + 1);
                const text = source.slice(start, end);
                const key = start + ":" + end;
                if (!seen.has(key)) {
                    seen.add(key);
                    snippets.push({ name: match[1], text: text });
                }
            }
        }
        match = declarationPattern.exec(source);
    }

    const functionAssignmentPattern = /\b([A-Za-z_$][\w$]*)\s*=\s*function\s*\(/g;
    match = functionAssignmentPattern.exec(source);
    while (match) {
        const fnIndex = source.indexOf("function", match.index);
        const openBrace = fnIndex === -1 ? -1 : source.indexOf("{", fnIndex);
        if (openBrace !== -1) {
            const closeBrace = findMatchingBrace(source, openBrace);
            if (closeBrace !== -1) {
                const start = match.index;
                const end = extendThroughTerminator(source, closeBrace + 1);
                const text = source.slice(start, end);
                const key = start + ":" + end;
                if (!seen.has(key)) {
                    seen.add(key);
                    snippets.push({ name: match[1], text: text });
                }
            }
        }
        match = functionAssignmentPattern.exec(source);
    }

    const arrowAssignmentPattern = /\b([A-Za-z_$][\w$]*)\s*=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{/g;
    match = arrowAssignmentPattern.exec(source);
    while (match) {
        const openBrace = source.indexOf("{", arrowAssignmentPattern.lastIndex - 1);
        if (openBrace !== -1) {
            const closeBrace = findMatchingBrace(source, openBrace);
            if (closeBrace !== -1) {
                const start = match.index;
                const end = extendThroughTerminator(source, closeBrace + 1);
                const text = source.slice(start, end);
                const key = start + ":" + end;
                if (!seen.has(key)) {
                    seen.add(key);
                    snippets.push({ name: match[1], text: text });
                }
            }
        }
        match = arrowAssignmentPattern.exec(source);
    }

    return snippets;
}

const csvText = fs.readFileSync(CSV_PATH, "utf8");
const rows = parseCsv(csvText);

runTest("csv has expected header", function() {
    assert.ok(rows.length > 1, "expected header and data rows");
    assert.strictEqual(rows[0][0], "method_definition");
    assert.strictEqual(rows[0][1], "method_code_neutralized");
});

const dataRows = rows.slice(1);

runTest("every row has both columns", function() {
    dataRows.forEach(function(cols, index) {
        assert.ok(cols.length >= 2, "row " + (index + 2) + " missing columns");
        assert.ok(cols[0].length > 0, "row " + (index + 2) + " method_definition is empty");
    });
});

let totalFunctions = 0;

dataRows.forEach(function(cols, rowIndex) {
    const methodDefinition = cols[0];
    const snippets = extractFunctionSnippets(methodDefinition);

    runTest("row " + (rowIndex + 2) + " extracts at least one function snippet", function() {
        assert.ok(snippets.length > 0, "no function snippets extracted from method_definition");
    });

    snippets.forEach(function(snippet, snippetIndex) {
        totalFunctions += 1;

        runTest("row " + (rowIndex + 2) + " function " + snippet.name + " parses", function() {
            assert.ok(snippet.text.length > 0, "extracted snippet is empty");
            assert.doesNotThrow(function() {
                new vm.Script(snippet.text, {
                    filename: "temp_3.csv:row" + (rowIndex + 2) + ":fn" + (snippetIndex + 1),
                });
            });
        });
    });
});

runTest("extracted functions across dataset", function() {
    assert.ok(totalFunctions > 0, "expected at least one extracted function snippet");
});
