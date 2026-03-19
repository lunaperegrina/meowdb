import { CliError } from '@/errors';
import { assertArgumentCount, getRequiredArg } from '@/execute-command/shared/args';
import { type CommandSuccess, type Dependencies } from '@/execute-command/types';

export async function handleDbUse(
	args: string[],
	configPath: string,
	dependencies: Dependencies,
): Promise<CommandSuccess> {
	assertArgumentCount(args, 1, 'meow db use <name>');
	const name = getRequiredArg(args, 0);
	const config = await dependencies.readConfig(configPath);

	if (!(name in config.connections)) {
		throw new CliError('DB_NOT_FOUND', `db "${name}" not found.`, {
			hint: 'Run `meow db list` to see available names.',
		});
	}

	config.activeDb = name;
	await dependencies.writeConfig(configPath, config);

	return {
		command: 'db use',
		data: { activeDb: name },
		human: {
			lines: [`Using db "${name}".`],
			quietLines: [name],
		},
	};
}
