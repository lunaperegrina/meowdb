import { type CliConfig, type ConnectionConfig } from '@/config-store';
import { CliError } from '@/errors';

export function getActiveConnection(config: CliConfig): {
	name: string;
	value: ConnectionConfig;
} {
	if (!config.activeDb) {
		throw new CliError('DB_NOT_SELECTED', 'No active db selected.', {
			hint: 'Run `meow db use <name>` to select one.',
		});
	}

	const connection = config.connections[config.activeDb];
	if (!connection) {
		throw new CliError('DB_NOT_FOUND', `db "${config.activeDb}" not found.`, {
			hint: 'Run `meow db list` to see available names.',
		});
	}

	return {
		name: config.activeDb,
		value: connection,
	};
}
