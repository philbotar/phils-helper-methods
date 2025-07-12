import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, "my-dev-tools" is now active!');

	let disposable = vscode.commands.registerCommand(
		"my-dev-tools.helloWorld",
		() => {
			vscode.window.showInformationMessage("Hello World from My Dev Tools!");
		},
	);
	context.subscriptions.push(disposable);

	// Read the folder watch pattern from extension settings
	const config = vscode.workspace.getConfiguration("myDevTools");
	const folderWatchPatternString = config.get<string>(
		"folderWatchPattern",
		"^src/components",
	);

	let parentFolderRegex: RegExp;
	try {
		parentFolderRegex = new RegExp(folderWatchPatternString);
		console.log(
			`My Dev Tools: Monitoring folders matching regex: ${folderWatchPatternString}`,
		);
	} catch (e: any) {
		vscode.window.showErrorMessage(
			`My Dev Tools: Invalid regex pattern for folderWatchPattern in settings: ${e.message}`,
		);
		console.error(
			`My Dev Tools: Invalid regex pattern for folderWatchPattern: ${folderWatchPatternString}`,
			e,
		);
		// Fallback to a safe default if the user's regex is invalid
		parentFolderRegex = /^src\/components/;
		vscode.window.showWarningMessage(
			`My Dev Tools: Falling back to default pattern "^src/components" due to invalid regex.`,
		);
	}

	// Create a file system watcher for directories
	// The pattern '**/*' means watch all files and folders recursively
	// The includeFolders: true option ensures we get events for folder creation
	const folderWatcher = vscode.workspace.createFileSystemWatcher(
		new vscode.RelativePattern(vscode.workspace.workspaceFolders![0], "**/*"),
		false, // ignoreCreateEvents (we want them)
		true, // ignoreChangeEvents
		false, // ignoreDeleteEvents
	);

	// Register a listener for when a new directory is created
	folderWatcher.onDidCreate(async (uri: vscode.Uri) => {
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
		if (!workspaceFolder) {
			console.log("onDidCreate: Not in a workspace folder, returning.");
			return; // Not in a workspace folder
		}

		// Get the relative path of the created item
		const relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
		console.log(`onDidCreate: Checking relative path: ${relativePath}`);

		// Check if the created item is a directory and matches the target pattern
		let stats;
		try {
			stats = await fs.stat(uri.fsPath);
		} catch (error) {
			// If stat fails, it might not be a valid path or accessible, or it's not a directory
			console.error(`onDidCreate: Error stating path ${uri.fsPath}:`, error);
			return;
		}

		if (stats.isDirectory() && parentFolderRegex.test(relativePath)) {
			const newFolderName = path.basename(uri.fsPath);
			const newFolderPath = uri.fsPath;

			vscode.window.showInformationMessage(
				`New folder "${newFolderName}" created at ${relativePath}. Automatically scaffolding files...`,
			);

			const filesToCreate = [
				{
					name: `${newFolderName}.ts`, // Main component/module file
					content: generateComponentFileContent(newFolderName),
					type: "component",
				},
				{
					name: `${newFolderName}.test.ts`, // Test file
					content: generateTestFileContent(newFolderName),
					type: "test",
				},
				{
					name: `index.ts`, // Barrel file
					content: generateBarrelFileContent(newFolderName),
					type: "barrel",
				},
			];

			for (const file of filesToCreate) {
				const filePath = path.join(newFolderPath, file.name);
				try {
					await fs.writeFile(filePath, file.content);
					vscode.window.showInformationMessage(
						`Created ${file.type} file: ${file.name}`,
					);
				} catch (writeError) {
					vscode.window.showErrorMessage(
						`Failed to create ${file.type} file ${file.name}: ${writeError}`,
					);
					console.error(`Error writing file ${filePath}:`, writeError);
				}
			}
		} else {
			console.log(
				`onDidCreate: Folder "${relativePath}" did not match pattern or is not a directory. Is directory: ${stats.isDirectory()}, Matches regex: ${parentFolderRegex.test(
					relativePath,
				)}`,
			);
		}
	});

	context.subscriptions.push(folderWatcher);
}

export function deactivate() {}

function kebabToCamelCase(str: string): string {
	return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

// Helper function to generate content for the main component/module file
function generateComponentFileContent(componentName: string): string {
	return `export function ${kebabToCamelCase(componentName)}() {
	return "Hello, World from ${componentName}!";
}
`;
}

// Helper function to generate content for a test file
function generateTestFileContent(componentName: string): string {
	return `import assert from 'node:assert';
import { describe, test } from 'node:test';
import { ${kebabToCamelCase(componentName)} } from '../${componentName}'; 

void describe('GIVEN a ${kebabToCamelCase(componentName)} function', () => {
	void describe('WHEN it is called', () => {
		void test('THEN it should return the expected value', () => {
			const result = ${kebabToCamelCase(componentName)}();
			assert.strictEqual(result, 'Hello, World from ${componentName}!');
		});
	});
});
`;
}

// Helper function to generate content for a barrel file
function generateBarrelFileContent(componentName: string): string {
	return `export { ${kebabToCamelCase(
		componentName,
	)} } from './${componentName}';
`;
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}
