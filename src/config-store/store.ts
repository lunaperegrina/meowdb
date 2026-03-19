import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { type CliConfig, defaultConfig } from '@/config-store/types';
import {
	configNotFoundError,
	isConfigNotFoundError,
	isMissingFileError,
} from '@/config-store/shared/errors';
import { parseConfig } from '@/config-store/shared/validation';

export type ConfigStoreDependencies = {
	getHomeDirectory: () => string;
	getDirectoryName: (filePath: string) => string;
	joinPath: (...paths: string[]) => string;
	readFile: (filePath: string, encoding: BufferEncoding) => Promise<string>;
	writeFile: (
		filePath: string,
		data: string,
		encoding: BufferEncoding,
	) => Promise<void>;
	makeDirectory: (
		filePath: string,
		options: {
			recursive: boolean;
		},
	) => Promise<string | undefined>;
};

const defaultDependencies: ConfigStoreDependencies = {
	getHomeDirectory: () => os.homedir(),
	getDirectoryName: filePath => path.dirname(filePath),
	joinPath: (...paths) => path.join(...paths),
	readFile: async (filePath, encoding) => fs.readFile(filePath, encoding),
	writeFile: async (filePath, data, encoding) =>
		fs.writeFile(filePath, data, encoding),
	makeDirectory: async (filePath, options) => fs.mkdir(filePath, options),
};

export function createConfigStore(
	overrides: Partial<ConfigStoreDependencies> = {},
) {
	const dependencies = { ...defaultDependencies, ...overrides };

	function getConfigPath(environment: NodeJS.ProcessEnv = process.env): string {
		const root =
			environment['XDG_CONFIG_HOME'] ??
			dependencies.joinPath(dependencies.getHomeDirectory(), '.config');

		return dependencies.joinPath(root, 'meow-db', 'config.json');
	}

	async function readConfig(configPath: string): Promise<CliConfig> {
		let rawConfig: string;
		try {
			rawConfig = await dependencies.readFile(configPath, 'utf8');
		} catch (error: unknown) {
			if (isMissingFileError(error)) {
				throw configNotFoundError({ cause: error });
			}

			throw error;
		}

		return parseConfig(rawConfig);
	}

	async function writeConfig(configPath: string, config: CliConfig): Promise<void> {
		await dependencies.makeDirectory(dependencies.getDirectoryName(configPath), {
			recursive: true,
		});
		await dependencies.writeFile(
			configPath,
			JSON.stringify(config, null, 2),
			'utf8',
		);
	}

	async function loadOrCreateConfig(configPath: string): Promise<CliConfig> {
		try {
			return await readConfig(configPath);
		} catch (error: unknown) {
			if (isConfigNotFoundError(error)) {
				await writeConfig(configPath, defaultConfig);
				return {
					version: 1,
					activeDb: null,
					connections: {},
				};
			}

			throw error;
		}
	}

	return {
		getConfigPath,
		readConfig,
		writeConfig,
		loadOrCreateConfig,
	};
}
