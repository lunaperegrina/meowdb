export type ConnectionConfig = {
	url: string;
	createdAt: string;
};

export type CliConfig = {
	version: 1;
	activeDb: string | null;
	connections: Record<string, ConnectionConfig>;
};

export const defaultConfig: CliConfig = {
	version: 1,
	activeDb: null,
	connections: {},
};
