import { formatRowsForHuman, formatRowsForQuiet } from '@/execute-command/rows/format';
import { assertArgumentCount, getRequiredArg } from '@/execute-command/shared/args';
import { getActiveConnection } from '@/execute-command/shared/active-connection';
import { assertIdentifier, assertPositiveLimit } from '@/execute-command/shared/validation';
import { type CommandSuccess, type Dependencies, type Flags } from '@/execute-command/types';

const rowsLimitDefault = 20;

export async function handleRows(
	args: string[],
	flags: Flags,
	configPath: string,
	dependencies: Dependencies,
): Promise<CommandSuccess> {
	assertArgumentCount(
		args,
		1,
		'meow rows <table> [--schema <schema>] [--limit <n>]',
	);
	const table = getRequiredArg(args, 0);
	const schema = flags.schema ?? 'public';
	const limit = flags.limit ?? rowsLimitDefault;

	assertIdentifier(schema, '--schema');
	assertIdentifier(table, '<table>');
	assertPositiveLimit(limit);

	const config = await dependencies.readConfig(configPath);
	const connection = getActiveConnection(config);
	const rows = await dependencies.getRows(
		connection.value.url,
		schema,
		table,
		limit,
	);

	return {
		command: 'rows',
		data: {
			table,
			schema,
			limit,
			rows,
		},
		human: {
			lines: formatRowsForHuman(rows),
			quietLines: formatRowsForQuiet(rows),
		},
	};
}
