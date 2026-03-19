import { assertArgumentCount } from '@/execute-command/shared/args';
import { getActiveConnection } from '@/execute-command/shared/active-connection';
import { type CommandSuccess, type Dependencies } from '@/execute-command/types';

export async function handleDbInfo(
	args: string[],
	configPath: string,
	dependencies: Dependencies,
): Promise<CommandSuccess> {
	assertArgumentCount(args, 0, 'meow db info');
	const config = await dependencies.readConfig(configPath);
	const connection = getActiveConnection(config);

	return {
		command: 'db info',
		data: {
			name: connection.name,
			url: connection.value.url,
			createdAt: connection.value.createdAt,
		},
		human: {
			lines: [
				`Active db: ${connection.name}`,
				`URL: ${connection.value.url}`,
				`Created at: ${connection.value.createdAt}`,
			],
			quietLines: [connection.name],
		},
	};
}
