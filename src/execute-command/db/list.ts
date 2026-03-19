import { defaultConfig } from '@/config-store';
import { CliError } from '@/errors';
import { assertArgumentCount } from '@/execute-command/shared/args';
import { type CommandSuccess, type Dependencies } from '@/execute-command/types';

export async function handleDbList(
	args: string[],
	configPath: string,
	dependencies: Dependencies,
): Promise<CommandSuccess> {
	assertArgumentCount(args, 0, 'meowdb db list');

	let config = defaultConfig;
	try {
		config = await dependencies.readConfig(configPath);
	} catch (error: unknown) {
		if (!(error instanceof CliError && error.code === 'CONFIG_NOT_FOUND')) {
			throw error;
		}
	}

	const names = Object.keys(config.connections).sort((left, right) =>
		left.localeCompare(right),
	);
	const connections = names.map(name => {
		const connection = config.connections[name];
		if (!connection) {
			throw new CliError('INVALID_ARGUMENT', 'Configuration file is invalid.', {
				hint: 'Run `meowdb db list` again after fixing configuration.',
			});
		}

		return {
			name,
			url: connection.url,
			createdAt: connection.createdAt,
			active: config.activeDb === name,
		};
	});

	if (connections.length === 0) {
		return {
			command: 'db list',
			data: { activeDb: null, connections: [] },
			human: {
				lines: ['No databases configured.'],
				quietLines: [],
			},
		};
	}

	return {
		command: 'db list',
		data: {
			activeDb: config.activeDb,
			connections,
		},
		human: {
			lines: connections.map(connection => {
				const marker = connection.active ? '*' : '-';
				return `${marker} ${connection.name} (${connection.url})`;
			}),
			quietLines: connections.map(connection =>
				connection.active ? `${connection.name}*` : connection.name,
			),
		},
	};
}
