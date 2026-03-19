import process from 'node:process';
import { getConfigPath, loadOrCreateConfig } from '@/config-store';
import {
	executeCommand,
	type CommandSuccess,
	type Flags,
} from '@/execute-command/index';
import { CliError } from '@/errors';

export type InteractiveConnection = {
	name: string;
	maskedUrl: string;
	active: boolean;
};

export type ConnectionState = {
	activeDb: string | null;
	connections: InteractiveConnection[];
};

export type InteractiveController = {
	getConnections: () => Promise<ConnectionState>;
	addConnection: (name: string, url: string) => Promise<CommandSuccess>;
	selectConnection: (name: string) => Promise<CommandSuccess>;
	listTables: (schema?: string) => Promise<CommandSuccess>;
};

type CreateInteractiveControllerOptions = {
	environment?: NodeJS.ProcessEnv;
	flags?: Partial<Flags>;
};

export function maskDatabaseUrl(rawUrl: string): string {
	try {
		const parsed = new URL(rawUrl);
		if (parsed.username) {
			parsed.username = '***';
		}

		if (parsed.password) {
			parsed.password = '***';
		}

		return parsed.toString();
	} catch {
		return '<invalid-url>';
	}
}

function createCommandFlags(flags?: Partial<Flags>): Flags {
	return {
		json: false,
		quiet: false,
		schema: flags?.schema,
		limit: flags?.limit,
	};
}

export function createInteractiveController(
	options: CreateInteractiveControllerOptions = {},
): InteractiveController {
	const environment = options.environment ?? process.env;
	const commandFlags = createCommandFlags(options.flags);
	const configPath = getConfigPath(environment);

	async function getConnections(): Promise<ConnectionState> {
		const config = await loadOrCreateConfig(configPath);
		const names = Object.keys(config.connections).sort((left, right) =>
			left.localeCompare(right),
		);

		const connections: InteractiveConnection[] = names.map(name => {
			const connection = config.connections[name];
			if (!connection) {
				throw new CliError('INVALID_ARGUMENT', 'Configuration file is invalid.', {
					hint: 'Delete the config file and run `meowdb db add <name> <url>` again.',
				});
			}

			return {
				name,
				maskedUrl: maskDatabaseUrl(connection.url),
				active: config.activeDb === name,
			};
		});

		return {
			activeDb: config.activeDb,
			connections,
		};
	}

	async function addConnection(
		name: string,
		url: string,
	): Promise<CommandSuccess> {
		return executeCommand(['db', 'add', name, url], commandFlags, {}, environment);
	}

	async function selectConnection(name: string): Promise<CommandSuccess> {
		return executeCommand(['db', 'use', name], commandFlags, {}, environment);
	}

	async function listTables(schema?: string): Promise<CommandSuccess> {
		const args = ['tables'];
		if (schema) {
			args.push(schema);
		}

		return executeCommand(args, commandFlags, {}, environment);
	}

	return {
		getConnections,
		addConnection,
		selectConnection,
		listTables,
	};
}
