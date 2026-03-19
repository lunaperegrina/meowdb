import process from 'node:process';
import { createInterface, type Interface } from 'node:readline/promises';
import { type InteractiveController } from '@/interactive/controller';
import { toCliError } from '@/errors';
import { formatHumanErrorLines, formatHumanSuccessLines } from '@/output';

type RunPromptFallbackOptions = {
	controller: InteractiveController;
	quiet: boolean;
};

function isClosedPromptError(error: unknown): boolean {
	if (!error || typeof error !== 'object') {
		return false;
	}

	const typedError = error as { name?: unknown; code?: unknown };
	return (
		typedError.name === 'AbortError' || typedError.code === 'ERR_USE_AFTER_CLOSE'
	);
}

function printLines(lines: string[]): void {
	for (const line of lines) {
		process.stdout.write(`${line}\n`);
	}
}

function printError(error: unknown, quiet: boolean): void {
	printLines(formatHumanErrorLines(toCliError(error), quiet));
}

function printResult(lines: string[], quiet: boolean): void {
	if (!quiet || lines.length > 0) {
		printLines(lines);
	}
}

async function promptChoice(
	rl: Interface,
	question: string,
	choicesCount: number,
): Promise<number> {
	while (true) {
		let answer: string;
		try {
			answer = (await rl.question(question)).trim();
		} catch (error: unknown) {
			if (isClosedPromptError(error)) {
				return choicesCount - 1;
			}

			throw error;
		}

		const index = Number(answer);
		if (Number.isInteger(index) && index >= 1 && index <= choicesCount) {
			return index - 1;
		}

		process.stdout.write('Invalid selection. Enter a number from the list.\n');
	}
}

async function promptAddConnection(
	rl: Interface,
	controller: InteractiveController,
	quiet: boolean,
): Promise<string | null> {
	while (true) {
		let name: string;
		try {
			name = (await rl.question('Database name (blank cancels): ')).trim();
		} catch (error: unknown) {
			if (isClosedPromptError(error)) {
				return null;
			}

			throw error;
		}

		if (!name) {
			return null;
		}

		let url: string;
		try {
			url = (await rl.question('PostgreSQL URL (blank cancels): ')).trim();
		} catch (error: unknown) {
			if (isClosedPromptError(error)) {
				return null;
			}

			throw error;
		}

		if (!url) {
			return null;
		}

		try {
			const addResult = await controller.addConnection(name, url);
			const useResult = await controller.selectConnection(name);
			printResult(formatHumanSuccessLines(addResult, quiet), quiet);
			printResult(formatHumanSuccessLines(useResult, quiet), quiet);
			return name;
		} catch (error: unknown) {
			printError(error, quiet);
		}
	}
}

async function promptSelectConnection(
	rl: Interface,
	controller: InteractiveController,
	quiet: boolean,
): Promise<string | null> {
	while (true) {
		const state = await controller.getConnections();

		process.stdout.write('\nSelect a database:\n');
		for (const [index, connection] of state.connections.entries()) {
			const active = connection.active ? ' (active)' : '';
			process.stdout.write(
				`${index + 1}. ${connection.name}${active} - ${connection.maskedUrl}\n`,
			);
		}

		const addIndex = state.connections.length + 1;
		const exitIndex = state.connections.length + 2;
		process.stdout.write(`${addIndex}. Add database\n`);
		process.stdout.write(`${exitIndex}. Exit\n`);

		const selectedIndex = await promptChoice(rl, 'Choice: ', exitIndex);
		if (selectedIndex < state.connections.length) {
			const connection = state.connections[selectedIndex];
			if (!connection) {
				process.stdout.write('Invalid connection selection.\n');
				continue;
			}

			try {
				const result = await controller.selectConnection(connection.name);
				printResult(formatHumanSuccessLines(result, quiet), quiet);
				return connection.name;
			} catch (error: unknown) {
				printError(error, quiet);
			}

			continue;
		}

		if (selectedIndex === addIndex - 1) {
			const addedName = await promptAddConnection(rl, controller, quiet);
			if (addedName) {
				return addedName;
			}

			continue;
		}

		return null;
	}
}

export async function runPromptFallback(
	options: RunPromptFallbackOptions,
): Promise<void> {
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	try {
		while (true) {
			const selectedConnection = await promptSelectConnection(
				rl,
				options.controller,
				options.quiet,
			);
			if (!selectedConnection) {
				return;
			}

			let activeConnection = selectedConnection;
			let showingMenu = true;
			while (showingMenu) {
				process.stdout.write(`\nActive database: ${activeConnection}\n`);
				process.stdout.write('1. List tables\n');
				process.stdout.write('2. Switch database\n');
				process.stdout.write('3. Add database\n');
				process.stdout.write('4. Exit\n');

				const selectedAction = await promptChoice(rl, 'Choice: ', 4);
				if (selectedAction === 0) {
					try {
						const result = await options.controller.listTables();
						printResult(
							formatHumanSuccessLines(result, options.quiet),
							options.quiet,
						);
					} catch (error: unknown) {
						printError(error, options.quiet);
					}

					continue;
				}

				if (selectedAction === 1) {
					showingMenu = false;
					continue;
				}

				if (selectedAction === 2) {
					const addedName = await promptAddConnection(
						rl,
						options.controller,
						options.quiet,
					);
					if (addedName) {
						activeConnection = addedName;
					}

					continue;
				}

				return;
			}
		}
	} finally {
		rl.close();
	}
}
