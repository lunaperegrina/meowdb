import { CliError } from '@/errors';
import { type CommandSuccess, type Dependencies } from '@/execute-command/types';
import { handleDbAdd } from '@/execute-command/db/add';
import { handleDbInfo } from '@/execute-command/db/info';
import { handleDbList } from '@/execute-command/db/list';
import { handleDbRemove } from '@/execute-command/db/remove';
import { handleDbUse } from '@/execute-command/db/use';

export async function handleDb(
	args: string[],
	configPath: string,
	dependencies: Dependencies,
): Promise<CommandSuccess> {
	const [subcommand, ...rest] = args;

	if (!subcommand) {
		throw new CliError('INVALID_ARGUMENT', 'Missing `db` subcommand.', {
			hint: 'Run `meow db --help` for usage.',
		});
	}

	switch (subcommand) {
		case 'add': {
			return handleDbAdd(rest, configPath, dependencies);
		}

		case 'list': {
			return handleDbList(rest, configPath, dependencies);
		}

		case 'use': {
			return handleDbUse(rest, configPath, dependencies);
		}

		case 'info': {
			return handleDbInfo(rest, configPath, dependencies);
		}

		case 'remove': {
			return handleDbRemove(rest, configPath, dependencies);
		}

		default: {
			throw new CliError(
				'INVALID_ARGUMENT',
				`Unknown db subcommand "${subcommand}".`,
				{
					hint: 'Run `meow db --help` for usage.',
				},
			);
		}
	}
}
