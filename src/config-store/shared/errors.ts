import { CliError } from '@/errors';

type ConfigStoreErrorOptions = {
	cause?: unknown;
};

export function configNotFoundError(
	options: ConfigStoreErrorOptions = {},
): CliError {
	return new CliError('CONFIG_NOT_FOUND', 'Configuration file not found.', {
		hint: 'Run `meowdb db add <name> <url>` to create your first connection.',
		cause: options.cause,
	});
}

export function invalidConfigError(
	options: ConfigStoreErrorOptions = {},
): CliError {
	return new CliError('INVALID_ARGUMENT', 'Configuration file is invalid.', {
		hint: 'Delete the config file and run `meowdb db add <name> <url>` again.',
		cause: options.cause,
	});
}

export function isConfigNotFoundError(error: unknown): error is CliError {
	return error instanceof CliError && error.code === 'CONFIG_NOT_FOUND';
}

export function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
	return Boolean(
		error &&
			typeof error === 'object' &&
			'code' in error &&
			(error as NodeJS.ErrnoException).code === 'ENOENT',
	);
}
