import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDatabase, getState, setActiveDatabase } from '../../storage/databases.js';
import { listTableRows, listTables } from '../../storage/postgres.js';
import { ROWS_PREVIEW_LIMIT } from '../constants.js';
import { getErrorMessage } from '../utils/text.js';
import type {
	DatabaseEntry,
	DatabaseState,
	TableReference,
	TableRowsPreview,
} from '../../types/database.js';

type UseDatabaseExplorerOptions = {
	pushMessage: (message: string) => void;
};

type SaveDatabaseInput = {
	name: string;
	postgresUrl: string;
};

const INITIAL_DATABASE_STATE: DatabaseState = {
	activeDatabaseId: null,
	databases: [],
};

export const useDatabaseExplorer = ({
	pushMessage,
}: UseDatabaseExplorerOptions) => {
	const [databaseState, setDatabaseState] = useState<DatabaseState>(INITIAL_DATABASE_STATE);
	const [isLoadingDatabases, setIsLoadingDatabases] = useState(true);
	const [isSavingDatabase, setIsSavingDatabase] = useState(false);
	const [isSettingActive, setIsSettingActive] = useState(false);
	const [tables, setTables] = useState<TableReference[]>([]);
	const [tablesIndex, setTablesIndex] = useState(0);
	const [isLoadingTables, setIsLoadingTables] = useState(false);
	const [tablesError, setTablesError] = useState<string | null>(null);
	const [selectedTable, setSelectedTable] = useState<TableReference | null>(null);
	const [rowsPreview, setRowsPreview] = useState<TableRowsPreview | null>(null);
	const [rowsError, setRowsError] = useState<string | null>(null);
	const [rowsColumnOffset, setRowsColumnOffset] = useState(0);
	const [rowsWindowStart, setRowsWindowStart] = useState(0);
	const [isLoadingRows, setIsLoadingRows] = useState(false);
	const tablesLoadIdRef = useRef(0);
	const rowsLoadIdRef = useRef(0);

	useEffect(() => {
		let mounted = true;

		const bootstrapDatabaseState = async () => {
			try {
				const state = await getState();
				if (!mounted) {
					return;
				}

				setDatabaseState(state);
			} catch (error) {
				if (!mounted) {
					return;
				}

				pushMessage(`Erro ao carregar databases: ${getErrorMessage(error)}`);
			} finally {
				if (mounted) {
					setIsLoadingDatabases(false);
				}
			}
		};

		void bootstrapDatabaseState();

		return () => {
			mounted = false;
		};
	}, [pushMessage]);

	const activeDatabase = useMemo(
		() =>
			databaseState.databases.find(
				database => database.id === databaseState.activeDatabaseId,
			) ?? null,
		[databaseState],
	);

	const resetRowsState = useCallback(() => {
		rowsLoadIdRef.current += 1;
		setSelectedTable(null);
		setRowsPreview(null);
		setRowsError(null);
		setRowsColumnOffset(0);
		setRowsWindowStart(0);
		setIsLoadingRows(false);
	}, []);

	const loadTablesForDatabase = useCallback(
		async (database: DatabaseEntry | null) => {
			const loadId = tablesLoadIdRef.current + 1;
			tablesLoadIdRef.current = loadId;

			setTables([]);
			setTablesIndex(0);
			setTablesError(null);
			resetRowsState();

			if (!database) {
				setIsLoadingTables(false);
				return;
			}

			setIsLoadingTables(true);
			try {
				const nextTables = await listTables(database.postgresUrl);
				if (tablesLoadIdRef.current !== loadId) {
					return;
				}

				setTables(nextTables);
				setTablesIndex(0);
			} catch (error) {
				if (tablesLoadIdRef.current !== loadId) {
					return;
				}

				setTablesError(getErrorMessage(error));
			} finally {
				if (tablesLoadIdRef.current === loadId) {
					setIsLoadingTables(false);
				}
			}
		},
		[resetRowsState],
	);

	useEffect(() => {
		void loadTablesForDatabase(activeDatabase);
	}, [activeDatabase, loadTablesForDatabase]);

	const loadRowsForTable = useCallback(
		async (table: TableReference) => {
			if (!activeDatabase) {
				return;
			}

			const loadId = rowsLoadIdRef.current + 1;
			rowsLoadIdRef.current = loadId;

			setSelectedTable(table);
			setRowsPreview(null);
			setRowsError(null);
			setRowsColumnOffset(0);
			setRowsWindowStart(0);
			setIsLoadingRows(true);

			try {
				const preview = await listTableRows(
					activeDatabase.postgresUrl,
					table.schema,
					table.name,
					ROWS_PREVIEW_LIMIT,
				);
				if (rowsLoadIdRef.current !== loadId) {
					return;
				}

				setRowsPreview(preview);
			} catch (error) {
				if (rowsLoadIdRef.current !== loadId) {
					return;
				}

				setRowsError(getErrorMessage(error));
			} finally {
				if (rowsLoadIdRef.current === loadId) {
					setIsLoadingRows(false);
				}
			}
		},
		[activeDatabase],
	);

	const loadRowsForSelectedTable = useCallback(async () => {
		const table = tables[tablesIndex];
		if (!table) {
			return;
		}

		await loadRowsForTable(table);
	}, [loadRowsForTable, tables, tablesIndex]);

	const saveDatabase = useCallback(
		async (input: SaveDatabaseInput): Promise<boolean> => {
			if (isSavingDatabase) {
				return false;
			}

			setIsSavingDatabase(true);
			try {
				const state = await addDatabase(input);
				const createdDatabase =
					state.databases.find(database => database.id === state.activeDatabaseId) ?? null;

				setDatabaseState(state);
				pushMessage(
					createdDatabase
						? `Database "${createdDatabase.name}" salva e ativada.`
						: 'Database salva e ativada.',
				);
				return true;
			} catch (error) {
				pushMessage(`Erro ao salvar database: ${getErrorMessage(error)}`);
				return false;
			} finally {
				setIsSavingDatabase(false);
			}
		},
		[isSavingDatabase, pushMessage],
	);

	const activateDatabase = useCallback(
		async (databaseId: string): Promise<boolean> => {
			if (isSettingActive) {
				return false;
			}

			setIsSettingActive(true);
			try {
				const state = await setActiveDatabase(databaseId);
				const selectedDatabase =
					state.databases.find(database => database.id === databaseId) ?? null;

				setDatabaseState(state);
				if (selectedDatabase) {
					pushMessage(`Database ativa: ${selectedDatabase.name}`);
				}
				return true;
			} catch (error) {
				pushMessage(`Erro ao ativar database: ${getErrorMessage(error)}`);
				return false;
			} finally {
				setIsSettingActive(false);
			}
		},
		[isSettingActive, pushMessage],
	);

	return {
		activeDatabase,
		activateDatabase,
		databaseState,
		isLoadingDatabases,
		isLoadingRows,
		isLoadingTables,
		isSavingDatabase,
		isSettingActive,
		loadRowsForSelectedTable,
		loadRowsForTable,
		loadTablesForDatabase,
		rowsColumnOffset,
		rowsError,
		rowsPreview,
		rowsWindowStart,
		saveDatabase,
		selectedTable,
		setRowsColumnOffset,
		setRowsWindowStart,
		setTablesIndex,
		tables,
		tablesError,
		tablesIndex,
	};
};
