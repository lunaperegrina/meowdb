import { CliError } from '@/errors';

export function assertArgumentCount(
	args: string[],
	expected: number,
	usage: string,
): void {
	if (args.length !== expected) {
		throw new CliError(
			'INVALID_ARGUMENT',
			`Invalid arguments for \`${usage}\`.`,
			{
				hint: `Usage: ${usage}`,
			},
		);
	}
}

export function assertMaximumArgumentCount(
	args: string[],
	max: number,
	usage: string,
): void {
	if (args.length > max) {
		throw new CliError(
			'INVALID_ARGUMENT',
			`Invalid arguments for \`${usage}\`.`,
			{
				hint: `Usage: ${usage}`,
			},
		);
	}
}

export function getRequiredArg(args: string[], index: number): string {
	const argument = args[index];
	if (!argument) {
		throw new CliError('INVALID_ARGUMENT', 'Required argument is missing.', {
			hint: 'Run `meow --help` to see command usage.',
		});
	}

	return argument;
}
