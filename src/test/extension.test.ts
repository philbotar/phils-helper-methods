import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

suite("Extension Test Suite", () => {
	vscode.window.showInformationMessage("Start all tests.");

	test("Sample test", () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test("Snippets file exists", () => {
		const snippetsPath = path.resolve(
			__dirname,
			"../../snippets/typescript.json",
		);
		const exists = fs.existsSync(snippetsPath);
		assert.ok(exists, "Snippets file does not exist");
	});

	test("Snippets file contains valid JSON", () => {
		const snippetsPath = path.resolve(
			__dirname,
			"../../snippets/typescript.json",
		);
		const content = fs.readFileSync(snippetsPath, "utf8");
		assert.doesNotThrow(
			() => JSON.parse(content),
			"Snippets file contains invalid JSON",
		);
	});

	test("Snippet keys are present", () => {
		const snippetsPath = path.resolve(
			__dirname,
			"../../snippets/typescript.json",
		);
		const content = fs.readFileSync(snippetsPath, "utf8");
		const snippets = JSON.parse(content);
		assert.ok(
			Object.keys(snippets).length > 0,
			"No snippets found in typescript.json",
		);
	});
});
