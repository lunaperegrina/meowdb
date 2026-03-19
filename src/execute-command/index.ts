import process from 'node:process';
import {
	getConfigPath,
	loadOrCreateConfig,
	readConfig,
	writeConfig,
} from '@/config-store';
import { CliError } from '@/errors';
import {
	getRows as getRowsFromPostgres,
	listTables as listTablesFromPostgres,
} from '@/postgres';
import { handleDb } from '@/execute-command/db';
import { handleRows } from '@/execute-command/rows';
import { handleTables } from '@/execute-command/tables';
import { type CommandSuccess, type Dependencies, type Flags } from '@/execute-command/types';

const defaultDependencies: Dependencies = {
	getNow: () => new Date().toISOString(),
	getPath: getConfigPath,
	loadConfig: loadOrCreateConfig,
	readConfig,
	writeConfig,
	listTables: listTablesFromPostgres,
	getRows: getRowsFromPostgres,
};

export async function executeCommand(
	input: string[],
	flags: Flags,
	overrides: Partial<Dependencies> = {},
	environment: NodeJS.ProcessEnv = process.env,
): Promise<CommandSuccess> {
	const dependencies = { ...defaultDependencies, ...overrides };
	const [command, ...rest] = input;
	const configPath = dependencies.getPath(environment);

	if (!command) {
		throw new CliError('INVALID_ARGUMENT', 'No command provided.', {
			hint: 'Run `meowdb --help` to see available commands.',
		});
	}

	switch (command) {
		case 'db': {
			return handleDb(rest, configPath, dependencies);
		}

		case 'tables': {
			return handleTables(rest, configPath, dependencies);
		}

		case 'rows': {
			return handleRows(rest, flags, configPath, dependencies);
		}

		default: {
			throw new CliError('INVALID_ARGUMENT', `Unknown command "${command}".`, {
				hint: 'Run `meowdb --help` to see available commands.',
			});
		}
	}
}

export type { CommandSuccess, Dependencies, Flags } from '@/execute-command/types';
