import { CliError } from '../../errors';
import { assertArgumentCount, getRequiredArg } from '../shared/args';
import { type CommandSuccess, type Dependencies } from '../types';

export async function handleDbRemove(
	args: string[],
	configPath: string,
	dependencies: Dependencies,
): Promise<CommandSuccess> {
	assertArgumentCount(args, 1, 'meow db remove <name>');
	const name = getRequiredArg(args, 0);
	const config = await dependencies.readConfig(configPath);

	if (!(name in config.connections)) {
		throw new CliError('DB_NOT_FOUND', `db "${name}" not found.`, {
			hint: 'Run `meow db list` to see available names.',
		});
	}

	const { [name]: omittedConnection, ...remainingConnections } =
		config.connections;
	void omittedConnection;
	config.connections = remainingConnections;
	if (config.activeDb === name) {
		config.activeDb = null;
	}

	await dependencies.writeConfig(configPath, config);

	return {
		command: 'db remove',
		data: { name },
		human: {
			lines: [`Removed db "${name}".`],
			quietLines: [name],
		},
	};
}
