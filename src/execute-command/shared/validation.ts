import { CliError } from '@/errors';

const identifierPattern = /^[a-zA-Z_]\w*$/;

export function assertIdentifier(value: string, label: string): void {
	if (!identifierPattern.test(value)) {
		throw new CliError(
			'INVALID_ARGUMENT',
			`Invalid SQL identifier for ${label}.`,
			{
				hint: 'Use only letters, numbers, and underscore, starting with a letter or underscore.',
			},
		);
	}
}

export function assertPositiveLimit(value: number): void {
	if (!Number.isInteger(value) || value <= 0) {
		throw new CliError(
			'INVALID_ARGUMENT',
			'Limit must be a positive integer.',
			{
				hint: 'Run `meowdb rows <table> --limit 20`.',
			},
		);
	}
}

export function normalizeDatabaseUrl(value: string): string {
	let parsed: URL;
	try {
		parsed = new URL(value);
	} catch (error: unknown) {
		throw new CliError('INVALID_ARGUMENT', 'Database URL is invalid.', {
			hint: 'Use a valid URL like `postgresql://user:pass@host:5432/db`.',
			cause: error,
		});
	}

	if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
		throw new CliError(
			'INVALID_ARGUMENT',
			'Database URL protocol must be postgres.',
			{
				hint: 'Use `postgresql://...`.',
			},
		);
	}

	return parsed.toString();
}
