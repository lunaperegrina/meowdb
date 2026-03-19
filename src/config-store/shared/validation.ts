import { type CliConfig } from '@/config-store/types';
import { invalidConfigError } from '@/config-store/shared/errors';

export function parseConfig(raw: string): CliConfig {
	let parsed: unknown;

	try {
		parsed = JSON.parse(raw) as unknown;
	} catch (error: unknown) {
		throw invalidConfigError({ cause: error });
	}

	return validateConfig(parsed);
}

export function validateConfig(value: unknown): CliConfig {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw invalidConfigError();
	}

	const config = value as Partial<CliConfig>;
	if (config.version !== 1) {
		throw invalidConfigError();
	}

	if (config.activeDb !== null && typeof config.activeDb !== 'string') {
		throw invalidConfigError();
	}

	if (
		!config.connections ||
		typeof config.connections !== 'object' ||
		Array.isArray(config.connections)
	) {
		throw invalidConfigError();
	}

	for (const connection of Object.values(config.connections)) {
		if (!connection || typeof connection !== 'object' || Array.isArray(connection)) {
			throw invalidConfigError();
		}

		const typedConnection = connection as Partial<
			CliConfig['connections'][string]
		>;
		if (
			typeof typedConnection.url !== 'string' ||
			typeof typedConnection.createdAt !== 'string'
		) {
			throw invalidConfigError();
		}
	}

	return {
		version: 1,
		activeDb: config.activeDb ?? null,
		connections: config.connections as CliConfig['connections'],
	};
}
