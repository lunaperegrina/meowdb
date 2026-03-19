import { CliError } from '../../errors';
import { type CommandSuccess, type Dependencies } from '../types';
import { handleDbAdd } from './add';
import { handleDbInfo } from './info';
import { handleDbList } from './list';
import { handleDbRemove } from './remove';
import { handleDbUse } from './use';

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
