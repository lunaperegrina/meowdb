import { type CliConfig } from '../config-store';

export type Flags = {
	json: boolean;
	quiet: boolean;
	schema?: string;
	limit?: number;
};

export type HumanOutput = {
	lines: string[];
	quietLines?: string[];
};

export type CommandSuccess = {
	command: string;
	data: unknown;
	human: HumanOutput;
};

export type Dependencies = {
	getNow: () => string;
	getPath: (env?: NodeJS.ProcessEnv) => string;
	loadConfig: (configPath: string) => Promise<CliConfig>;
	readConfig: (configPath: string) => Promise<CliConfig>;
	writeConfig: (configPath: string, config: CliConfig) => Promise<void>;
	listTables: (url: string, schema: string) => Promise<string[]>;
	getRows: (
		url: string,
		schema: string,
		table: string,
		limit: number,
	) => Promise<Array<Record<string, unknown>>>;
};
