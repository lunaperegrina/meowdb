import { type CommandSuccess, type Dependencies } from '@/execute-command/types';
import { assertArgumentCount, getRequiredArg } from '@/execute-command/shared/args';
import { normalizeDatabaseUrl } from '@/execute-command/shared/validation';
import { CliError } from '@/errors';

export async function handleDbAdd(
	args: string[],
	configPath: string,
	dependencies: Dependencies,
): Promise<CommandSuccess> {
	assertArgumentCount(args, 2, 'meow db add <name> <url>');
	const name = getRequiredArg(args, 0);
	const url = getRequiredArg(args, 1);
	const normalizedUrl = normalizeDatabaseUrl(url);
	const config = await dependencies.loadConfig(configPath);

	if (name in config.connections) {
		throw new CliError('INVALID_ARGUMENT', `db "${name}" already exists.`, {
			hint: 'Run `meow db list` to inspect available names.',
		});
	}

	config.connections[name] = {
		url: normalizedUrl,
		createdAt: dependencies.getNow(),
	};

	await dependencies.writeConfig(configPath, config);

	return {
		command: 'db add',
		data: {
			name,
			url: normalizedUrl,
		},
		human: {
			lines: [`Added db "${name}".`],
			quietLines: [name],
		},
	};
}
