export type DatabaseEntry = {
	id: string;
	name: string;
	postgresUrl: string;
	createdAt: string;
	updatedAt: string;
};

export type DatabaseState = {
	activeDatabaseId: string | null;
	databases: DatabaseEntry[];
};

export type AddDatabaseInput = {
	name: string;
	postgresUrl: string;
};

export type TableReference = {
	schema: string;
	name: string;
	qualifiedName: string;
};

export type TableRowsPreview = {
	columns: string[];
	rows: Array<Record<string, unknown>>;
	limit: number;
};
