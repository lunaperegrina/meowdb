import {Client} from 'pg';
import type {TableReference, TableRowsPreview} from '../types/database.js';

const DEFAULT_ROWS_LIMIT = 50;

const normalizeLimit = (limit: number): number => {
	if (!Number.isFinite(limit)) {
		return DEFAULT_ROWS_LIMIT;
	}

	return Math.max(1, Math.floor(limit));
};

const escapeIdentifier = (value: string): string => `"${value.replaceAll('"', '""')}"`;

const withClient = async <T>(
	postgresUrl: string,
	callback: (client: Client) => Promise<T>,
): Promise<T> => {
	const client = new Client({connectionString: postgresUrl});
	await client.connect();

	try {
		return await callback(client);
	} finally {
		await client.end();
	}
};

export const listTables = async (postgresUrl: string): Promise<TableReference[]> =>
	withClient(postgresUrl, async client => {
		const result = await client.query<{
			table_schema: string;
			table_name: string;
		}>(
			`SELECT table_schema, table_name
       FROM information_schema.tables
       WHERE table_type = 'BASE TABLE'
         AND table_schema NOT IN ('pg_catalog', 'information_schema')
       ORDER BY table_schema ASC, table_name ASC`,
		);

		return result.rows.map(row => ({
			schema: row.table_schema,
			name: row.table_name,
			qualifiedName: `${row.table_schema}.${row.table_name}`,
		}));
	});

export const listTableRows = async (
	postgresUrl: string,
	schema: string,
	table: string,
	limit = DEFAULT_ROWS_LIMIT,
): Promise<TableRowsPreview> =>
	withClient(postgresUrl, async client => {
		const normalizedLimit = normalizeLimit(limit);
		const schemaIdentifier = escapeIdentifier(schema);
		const tableIdentifier = escapeIdentifier(table);
		const query = `SELECT * FROM ${schemaIdentifier}.${tableIdentifier} LIMIT $1`;
		const result = await client.query<Record<string, unknown>>(query, [normalizedLimit]);
		const columns = result.fields.map(field => field.name);
		const rows = result.rows.map(row => {
			const normalizedRow: Record<string, unknown> = {};
			for (const column of columns) {
				normalizedRow[column] = row[column];
			}

			return normalizedRow;
		});

		return {
			columns,
			rows,
			limit: normalizedLimit,
		};
	});
