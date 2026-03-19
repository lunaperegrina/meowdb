import { assertMaximumArgumentCount } from '@/execute-command/shared/args';
import { getActiveConnection } from '@/execute-command/shared/active-connection';
import { assertIdentifier } from '@/execute-command/shared/validation';
import { type CommandSuccess, type Dependencies } from '@/execute-command/types';

export async function handleTables(
	args: string[],
	configPath: string,
	dependencies: Dependencies,
): Promise<CommandSuccess> {
	assertMaximumArgumentCount(args, 1, 'meow tables [schema]');
	const schema = args[0] ?? 'public';
	assertIdentifier(schema, '--schema');
	const config = await dependencies.readConfig(configPath);
	const connection = getActiveConnection(config);
	const tables = await dependencies.listTables(connection.value.url, schema);

	if (tables.length === 0) {
		return {
			command: 'tables',
			data: { schema, tables: [] },
			human: {
				lines: [`No tables found in schema "${schema}".`],
				quietLines: [],
			},
		};
	}

	return {
		command: 'tables',
		data: { schema, tables },
		human: {
			lines: tables.map(table => `- ${table}`),
			quietLines: tables,
		},
	};
}
