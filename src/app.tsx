import { useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import {
	addDatabase,
	getState,
	setActiveDatabase,
} from './storage/databases.js';
import { listTableRows, listTables } from './storage/postgres.js';
import type {
	DatabaseState,
	TableReference,
	TableRowsPreview,
} from './types/database.js';

const FALLBACK_COLUMNS = 80;
const FALLBACK_ROWS = 24;
const STATUS_BAR_HEIGHT = 1;
const INPUT_BAR_HEIGHT = 5;
const MODAL_HEIGHT = 9;
const ROWS_MODAL_HEIGHT = 14;
const ROWS_PREVIEW_LIMIT = 50;
const ROW_NUMBER_WIDTH = 4;
const CELL_MIN_WIDTH = 8;
const CELL_MAX_WIDTH = 24;
const CELL_SEPARATOR = ' | ';

const getTerminalSize = (stdout: NodeJS.WriteStream) => ({
	columns: stdout.columns && stdout.columns > 0 ? stdout.columns : FALLBACK_COLUMNS,
	rows: stdout.rows && stdout.rows > 0 ? stdout.rows : FALLBACK_ROWS,
});

type AppMode =
	| 'chat'
	| 'slashMenu'
	| 'addForm'
	| 'listModal'
	| 'tablesModal'
	| 'rowsModal';
type AddFormField = 'name' | 'postgresUrl';

type SlashCommand = {
	id: 'add' | 'list' | 'tables';
	label: string;
	description: string;
};

const slashCommands: SlashCommand[] = [
	{ id: 'add', label: 'add', description: 'Add database' },
	{ id: 'list', label: 'list', description: 'List databases' },
	{ id: 'tables', label: 'tables', description: 'List tables and preview rows' },
];

const isNavigationKey = (key: {
	tab?: boolean;
	upArrow?: boolean;
	downArrow?: boolean;
	leftArrow?: boolean;
	rightArrow?: boolean;
	pageUp?: boolean;
	pageDown?: boolean;
	escape?: boolean;
}) =>
	Boolean(
		key.tab ||
			key.upArrow ||
			key.downArrow ||
			key.leftArrow ||
			key.rightArrow ||
			key.pageUp ||
			key.pageDown ||
			key.escape,
	);

const normalizeInput = (value: string) => value.replaceAll(/\r?\n/g, '');
const ESCAPE_INPUT = '\u001B';

const wrapIndex = (index: number, total: number): number => {
	if (total <= 0) {
		return 0;
	}

	if (index < 0) {
		return total - 1;
	}

	if (index >= total) {
		return 0;
	}

	return index;
};

const truncateText = (value: string, maxLength: number): string => {
	if (maxLength <= 1) {
		return value.length > 0 ? '…' : '';
	}

	if (value.length <= maxLength) {
		return value;
	}

	return `${value.slice(0, maxLength - 1)}…`;
};

const padCell = (value: string, width: number): string =>
	truncateText(value, width).padEnd(width, ' ');

const formatCellValue = (value: unknown): string => {
	if (value === null) {
		return 'null';
	}

	if (value === undefined) {
		return 'undefined';
	}

	if (typeof value === 'string') {
		return value.replaceAll(/\r?\n/g, ' ');
	}

	if (
		typeof value === 'number' ||
		typeof value === 'boolean' ||
		typeof value === 'bigint'
	) {
		return String(value);
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	try {
		const serialized = JSON.stringify(value);
		if (serialized === undefined) {
			return String(value);
		}

		return serialized.replaceAll(/\r?\n/g, ' ');
	} catch {
		return String(value);
	}
};

const getErrorMessage = (error: unknown): string => {
	if (error instanceof Error) {
		return error.message;
	}

	return 'Erro desconhecido.';
};

const getRowsViewport = (
	terminalColumns: number,
	totalColumns: number,
	requestedOffset: number,
): {
	cellWidth: number;
	visibleColumnCount: number;
	maxOffset: number;
	offset: number;
} => {
	if (totalColumns <= 0) {
		return {
			cellWidth: CELL_MIN_WIDTH,
			visibleColumnCount: 0,
			maxOffset: 0,
			offset: 0,
		};
	}

	const innerWidth = Math.max(24, terminalColumns - 8);
	const availableForCells = Math.max(
		1,
		innerWidth - ROW_NUMBER_WIDTH - CELL_SEPARATOR.length,
	);
	const maxVisibleColumnCount = Math.max(
		1,
		Math.floor(
			(availableForCells + CELL_SEPARATOR.length)
				/ (CELL_MIN_WIDTH + CELL_SEPARATOR.length),
		),
	);
	const visibleColumnCount = Math.min(totalColumns, maxVisibleColumnCount);
	const separatorsWidth = CELL_SEPARATOR.length * Math.max(0, visibleColumnCount - 1);
	const cellWidth = Math.min(
		CELL_MAX_WIDTH,
		Math.max(
			CELL_MIN_WIDTH,
			Math.floor((availableForCells - separatorsWidth) / visibleColumnCount),
		),
	);
	const maxOffset = Math.max(0, totalColumns - visibleColumnCount);
	const offset = Math.min(Math.max(0, requestedOffset), maxOffset);

	return {
		cellWidth,
		visibleColumnCount,
		maxOffset,
		offset,
	};
};

const INITIAL_DATABASE_STATE: DatabaseState = {
	activeDatabaseId: null,
	databases: [],
};

export default function App() {
	const { stdout } = useStdout();
	const [messages, setMessages] = useState<string[]>([]);
	const [draft, setDraft] = useState('');
	const [mode, setMode] = useState<AppMode>('chat');
	const [slashQuery, setSlashQuery] = useState('');
	const [slashIndex, setSlashIndex] = useState(0);
	const [formField, setFormField] = useState<AddFormField>('name');
	const [formName, setFormName] = useState('');
	const [formPostgresUrl, setFormPostgresUrl] = useState('');
	const [listIndex, setListIndex] = useState(0);
	const [databaseState, setDatabaseState] = useState<DatabaseState>(INITIAL_DATABASE_STATE);
	const [isLoadingDatabases, setIsLoadingDatabases] = useState(true);
	const [isSavingDatabase, setIsSavingDatabase] = useState(false);
	const [isSettingActive, setIsSettingActive] = useState(false);
	const [tables, setTables] = useState<TableReference[]>([]);
	const [tablesIndex, setTablesIndex] = useState(0);
	const [isLoadingTables, setIsLoadingTables] = useState(false);
	const [selectedTable, setSelectedTable] = useState<TableReference | null>(null);
	const [rowsPreview, setRowsPreview] = useState<TableRowsPreview | null>(null);
	const [rowsIndex, setRowsIndex] = useState(0);
	const [rowsColumnOffset, setRowsColumnOffset] = useState(0);
	const [isLoadingRows, setIsLoadingRows] = useState(false);
	const [terminalSize, setTerminalSize] = useState(() => getTerminalSize(stdout));

	const rowsCount = rowsPreview?.rows.length ?? 0;
	const rowsColumnCount = rowsPreview?.columns.length ?? 0;

	useEffect(() => {
		const handleResize = () => {
			setTerminalSize(getTerminalSize(stdout));
		};

		stdout.on('resize', handleResize);
		return () => {
			stdout.off('resize', handleResize);
		};
	}, [stdout]);

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

				setMessages(previous => [
					...previous,
					`Erro ao carregar databases: ${getErrorMessage(error)}`,
				]);
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
	}, []);

	const pushMessage = (message: string) => {
		setMessages(previous => [...previous, message]);
	};

	const filteredCommands = useMemo(() => {
		const query = slashQuery.trim().toLowerCase();

		if (query.length === 0) {
			return slashCommands;
		}

		return slashCommands.filter(command =>
			command.label.toLowerCase().includes(query),
		);
	}, [slashQuery]);

	useEffect(() => {
		setSlashIndex(previous => wrapIndex(previous, filteredCommands.length));
	}, [filteredCommands.length]);

	useEffect(() => {
		setListIndex(previous => wrapIndex(previous, databaseState.databases.length));
	}, [databaseState.databases.length]);

	useEffect(() => {
		setTablesIndex(previous => wrapIndex(previous, tables.length));
	}, [tables.length]);

	useEffect(() => {
		setRowsIndex(previous => wrapIndex(previous, rowsCount));
	}, [rowsCount]);

	useEffect(() => {
		if (rowsColumnCount === 0) {
			if (rowsColumnOffset !== 0) {
				setRowsColumnOffset(0);
			}
			return;
		}

		const viewport = getRowsViewport(
			terminalSize.columns,
			rowsColumnCount,
			rowsColumnOffset,
		);
		if (viewport.offset !== rowsColumnOffset) {
			setRowsColumnOffset(viewport.offset);
		}
	}, [rowsColumnCount, rowsColumnOffset, terminalSize.columns]);

	const activeDatabase = useMemo(
		() =>
			databaseState.databases.find(
				database => database.id === databaseState.activeDatabaseId,
			) ?? null,
		[databaseState],
	);

	const openListModal = () => {
		const activeIndex = databaseState.databases.findIndex(
			database => database.id === databaseState.activeDatabaseId,
		);
		setListIndex(activeIndex >= 0 ? activeIndex : 0);
		setMode('listModal');
		setDraft('');
		setSlashQuery('');
		setSlashIndex(0);
	};

	const closeSlashMenu = () => {
		setMode('chat');
		setSlashQuery('');
		setSlashIndex(0);
	};

	const openTablesModal = async () => {
		if (isLoadingTables || isLoadingRows) {
			return;
		}

		if (!activeDatabase) {
			pushMessage('Nenhuma database ativa. Use /add ou /list para selecionar uma database.');
			closeSlashMenu();
			return;
		}

		setMode('tablesModal');
		setDraft('');
		setSlashQuery('');
		setSlashIndex(0);
		setRowsPreview(null);
		setSelectedTable(null);
		setRowsIndex(0);
		setRowsColumnOffset(0);
		setIsLoadingTables(true);

		try {
			const nextTables = await listTables(activeDatabase.postgresUrl);
			setTables(nextTables);
			setTablesIndex(0);
		} catch (error) {
			setMode('chat');
			pushMessage(`Erro ao carregar tabelas: ${getErrorMessage(error)}`);
		} finally {
			setIsLoadingTables(false);
		}
	};

	const openRowsModal = async () => {
		if (isLoadingRows || isLoadingTables || !activeDatabase) {
			return;
		}

		const table = tables[tablesIndex];
		if (!table) {
			return;
		}

		setMode('rowsModal');
		setSelectedTable(table);
		setRowsPreview(null);
		setRowsIndex(0);
		setRowsColumnOffset(0);
		setIsLoadingRows(true);

		try {
			const preview = await listTableRows(
				activeDatabase.postgresUrl,
				table.schema,
				table.name,
				ROWS_PREVIEW_LIMIT,
			);
			setRowsPreview(preview);
		} catch (error) {
			setMode('tablesModal');
			pushMessage(`Erro ao carregar rows: ${getErrorMessage(error)}`);
		} finally {
			setIsLoadingRows(false);
		}
	};

	const selectSlashCommand = () => {
		const selectedCommand = filteredCommands[slashIndex];
		if (!selectedCommand) {
			pushMessage('Nenhum comando encontrado.');
			closeSlashMenu();
			return;
		}

		if (selectedCommand.id === 'add') {
			setMode('addForm');
			setFormField('name');
			setFormName('');
			setFormPostgresUrl('');
			setDraft('');
			setSlashQuery('');
			setSlashIndex(0);
			return;
		}

		if (selectedCommand.id === 'list') {
			openListModal();
			return;
		}

		void openTablesModal();
	};

	const submitAddForm = async () => {
		if (isSavingDatabase) {
			return;
		}

		setIsSavingDatabase(true);
		try {
			const state = await addDatabase({
				name: formName,
				postgresUrl: formPostgresUrl,
			});
			const createdDatabase =
				state.databases.find(database => database.id === state.activeDatabaseId) ?? null;

			setDatabaseState(state);
			setMode('chat');
			setFormField('name');
			setFormName('');
			setFormPostgresUrl('');
			pushMessage(
				createdDatabase
					? `Database "${createdDatabase.name}" salva e ativada.`
					: 'Database salva e ativada.',
			);
		} catch (error) {
			pushMessage(`Erro ao salvar database: ${getErrorMessage(error)}`);
		} finally {
			setIsSavingDatabase(false);
		}
	};

	const activateSelectedDatabase = async () => {
		if (isSettingActive || databaseState.databases.length === 0) {
			return;
		}

		const selectedDatabase = databaseState.databases[listIndex];
		if (!selectedDatabase) {
			return;
		}

		setIsSettingActive(true);
		try {
			const state = await setActiveDatabase(selectedDatabase.id);
			setDatabaseState(state);
			setMode('chat');
			pushMessage(`Database ativa: ${selectedDatabase.name}`);
		} catch (error) {
			pushMessage(`Erro ao ativar database: ${getErrorMessage(error)}`);
		} finally {
			setIsSettingActive(false);
		}
	};

	useInput((input, key) => {
		const isEscapePressed = key.escape || input === ESCAPE_INPUT;

		if (isEscapePressed) {
			if (mode === 'slashMenu') {
				closeSlashMenu();
				return;
			}

			if (mode === 'addForm') {
				setMode('chat');
				setFormField('name');
				return;
			}

			if (mode === 'listModal' || mode === 'tablesModal') {
				setMode('chat');
				return;
			}

			if (mode === 'rowsModal') {
				setMode('tablesModal');
				return;
			}
		}

		if (key.ctrl || key.meta) {
			return;
		}

		const cleanedInput = normalizeInput(input);

		if (mode === 'slashMenu') {
			if (key.return) {
				selectSlashCommand();
				return;
			}

			if (key.upArrow) {
				setSlashIndex(previous => wrapIndex(previous - 1, filteredCommands.length));
				return;
			}

			if (key.downArrow || key.tab) {
				setSlashIndex(previous => wrapIndex(previous + 1, filteredCommands.length));
				return;
			}

			if (key.backspace || key.delete) {
				if (slashQuery.length === 0) {
					closeSlashMenu();
					return;
				}

				setSlashQuery(previous => previous.slice(0, -1));
				setSlashIndex(0);
				return;
			}

			if (isNavigationKey(key)) {
				return;
			}

			if (cleanedInput.length > 0 && cleanedInput !== '/') {
				setSlashQuery(previous => previous + cleanedInput);
				setSlashIndex(0);
			}

			return;
		}

		if (mode === 'addForm') {
			if (key.tab || key.upArrow || key.downArrow) {
				setFormField(previous => (previous === 'name' ? 'postgresUrl' : 'name'));
				return;
			}

			if (key.return) {
				void submitAddForm();
				return;
			}

			if (key.backspace || key.delete) {
				if (formField === 'name') {
					setFormName(previous => previous.slice(0, -1));
				} else {
					setFormPostgresUrl(previous => previous.slice(0, -1));
				}
				return;
			}

			if (isNavigationKey(key)) {
				return;
			}

			if (cleanedInput.length > 0) {
				if (formField === 'name') {
					setFormName(previous => previous + cleanedInput);
				} else {
					setFormPostgresUrl(previous => previous + cleanedInput);
				}
			}

			return;
		}

		if (mode === 'listModal') {
			if (key.upArrow) {
				setListIndex(previous => wrapIndex(previous - 1, databaseState.databases.length));
				return;
			}

			if (key.downArrow || key.tab) {
				setListIndex(previous => wrapIndex(previous + 1, databaseState.databases.length));
				return;
			}

			if (key.return) {
				void activateSelectedDatabase();
			}

			return;
		}

		if (mode === 'tablesModal') {
			if (isLoadingTables || tables.length === 0) {
				return;
			}

			if (key.upArrow) {
				setTablesIndex(previous => wrapIndex(previous - 1, tables.length));
				return;
			}

			if (key.downArrow || key.tab) {
				setTablesIndex(previous => wrapIndex(previous + 1, tables.length));
				return;
			}

			if (key.return) {
				void openRowsModal();
			}

			return;
		}

		if (mode === 'rowsModal') {
			if (isLoadingRows || !rowsPreview) {
				return;
			}

			if (key.upArrow) {
				setRowsIndex(previous => wrapIndex(previous - 1, rowsPreview.rows.length));
				return;
			}

			if (key.downArrow) {
				setRowsIndex(previous => wrapIndex(previous + 1, rowsPreview.rows.length));
				return;
			}

			if (key.leftArrow) {
				setRowsColumnOffset(previous => Math.max(0, previous - 1));
				return;
			}

			if (key.rightArrow) {
				setRowsColumnOffset(previous => {
					const viewport = getRowsViewport(
						terminalSize.columns,
						rowsPreview.columns.length,
						previous,
					);
					return Math.min(viewport.maxOffset, previous + 1);
				});
			}

			return;
		}

		if (input === '/' && draft.length === 0) {
			setMode('slashMenu');
			setSlashQuery('');
			setSlashIndex(0);
			return;
		}

		if (key.return) {
			const message = draft.trim();
			if (message.length > 0) {
				setMessages(previous => [...previous, message]);
			}

			setDraft('');
			return;
		}

		if (key.backspace || key.delete) {
			setDraft(previous => previous.slice(0, -1));
			return;
		}

		if (
			key.escape ||
			key.tab ||
			key.upArrow ||
			key.downArrow ||
			key.leftArrow ||
			key.rightArrow ||
			key.pageUp ||
			key.pageDown
		) {
			return;
		}

		if (cleanedInput.length > 0) {
			setDraft(previous => previous + cleanedInput);
		}
	});

	const modalRows =
		mode === 'chat'
			? 0
			: mode === 'rowsModal'
				? ROWS_MODAL_HEIGHT
				: MODAL_HEIGHT;
	const messageViewportRows = Math.max(
		1,
		terminalSize.rows - INPUT_BAR_HEIGHT - STATUS_BAR_HEIGHT - modalRows - 2,
	);
	const visibleMessages = messages.slice(-messageViewportRows);
	const inputLabel =
		mode === 'chat'
			? `› ${draft}`
			: mode === 'slashMenu'
				? `› /${slashQuery}`
				: mode === 'addForm'
					? '› preenchendo formulário de database'
					: mode === 'listModal'
						? '› selecionando database ativa'
						: mode === 'tablesModal'
							? '› selecionando tabela'
							: selectedTable
								? `› visualizando rows: ${selectedTable.qualifiedName}`
								: '› visualizando rows';

	const dbIndicator = isLoadingDatabases
		? 'loading...'
		: activeDatabase
			? `${activeDatabase.name}`
			: 'none';

	const listEntries = databaseState.databases;
	const listMaxUrlLength = Math.max(12, terminalSize.columns - 18);
	const tableNameMaxLength = Math.max(10, terminalSize.columns - 12);

	const rowsViewport = useMemo(() => {
		if (!rowsPreview) {
			return {
				cellWidth: CELL_MIN_WIDTH,
				visibleColumnCount: 0,
				maxOffset: 0,
				offset: 0,
				visibleColumns: [] as string[],
			};
		}

		const viewport = getRowsViewport(
			terminalSize.columns,
			rowsPreview.columns.length,
			rowsColumnOffset,
		);
		return {
			...viewport,
			visibleColumns: rowsPreview.columns.slice(
				viewport.offset,
				viewport.offset + viewport.visibleColumnCount,
			),
		};
	}, [rowsPreview, rowsColumnOffset, terminalSize.columns]);

	const rowsHeaderLine = useMemo(() => {
		if (rowsViewport.visibleColumns.length === 0) {
			return '';
		}

		const headerColumns = rowsViewport.visibleColumns
			.map(column => padCell(column, rowsViewport.cellWidth))
			.join(CELL_SEPARATOR);
		return `${padCell('row', ROW_NUMBER_WIDTH)}${CELL_SEPARATOR}${headerColumns}`;
	}, [rowsViewport]);

	const rowsWindowSize = Math.max(1, ROWS_MODAL_HEIGHT - 6);
	const maxRowsWindowStart = Math.max(0, rowsCount - rowsWindowSize);
	const rowsWindowStart = Math.min(
		maxRowsWindowStart,
		Math.max(0, rowsIndex - Math.floor(rowsWindowSize / 2)),
	);
	const visibleRows = rowsPreview
		? rowsPreview.rows.slice(rowsWindowStart, rowsWindowStart + rowsWindowSize)
		: [];

	const tablesWindowSize = Math.max(1, MODAL_HEIGHT - 3);
	const maxTablesWindowStart = Math.max(0, tables.length - tablesWindowSize);
	const tablesWindowStart = Math.min(
		maxTablesWindowStart,
		Math.max(0, tablesIndex - Math.floor(tablesWindowSize / 2)),
	);
	const visibleTables = tables.slice(
		tablesWindowStart,
		tablesWindowStart + tablesWindowSize,
	);

	return (
		<Box
			flexDirection="column"
			width={terminalSize.columns}
			height={terminalSize.rows}
		>
			<Box
				flexDirection="column"
				flexGrow={1}
				width={terminalSize.columns}
				padding={1}
				overflow="hidden"
				backgroundColor="#000"
			>
				{visibleMessages.length === 0 ? (
					<Text dimColor>Digite / para abrir o slash menu.</Text>
				) : null}
				{visibleMessages.map((message, index) => (
					<Text key={`${index}-${message}`}>{message}</Text>
				))}
			</Box>

			{mode === 'slashMenu' ? (
				<Box width={terminalSize.columns} paddingX={1} paddingBottom={1} backgroundColor="#000">
					<Box
						flexDirection="column"
						borderStyle="round"
						borderColor="cyan"
						paddingX={1}
						width={Math.max(24, terminalSize.columns - 2)}
						height={MODAL_HEIGHT}
					>
						{filteredCommands.length === 0 ? (
							<Text color="red">Nenhum comando encontrado.</Text>
						) : (
							filteredCommands.map((command, index) => {
								const isSelected = index === slashIndex;
								return (
									<Box key={command.id} justifyContent="space-between">
										<Text color={isSelected ? 'cyan' : undefined}>
											{`${isSelected ? '›' : ' '} /${command.label}`}
										</Text>
										<Text dimColor>{command.description}</Text>
									</Box>
								);
							})
						)}
					</Box>
				</Box>
			) : null}

			{mode === 'addForm' ? (
				<Box width={terminalSize.columns} paddingX={1} paddingBottom={1} backgroundColor="#000">
					<Box
						flexDirection="column"
						borderStyle="round"
						borderColor="green"
						paddingX={1}
						width={Math.max(24, terminalSize.columns - 2)}
						height={MODAL_HEIGHT}
					>
						<Box justifyContent="space-between">
							<Text bold>Add database</Text>
							<Text dimColor>esc</Text>
						</Box>
						<Text color={formField === 'name' ? 'green' : undefined}>
							{`name: ${formField === 'name' ? '›' : ' '} ${formName.length > 0 ? formName : '...'}`}
						</Text>
						<Text color={formField === 'postgresUrl' ? 'green' : undefined}>
							{`postgresURL: ${formField === 'postgresUrl' ? '›' : ' '} ${formPostgresUrl.length > 0 ? formPostgresUrl : '...'}`}
						</Text>
						<Text dimColor>tab alterna campo • enter salva • esc cancela</Text>
						<Text dimColor>
							{isSavingDatabase
								? 'Salvando database...'
								: 'URL aceita: postgres:// ou postgresql://'}
						</Text>
					</Box>
				</Box>
			) : null}

			{mode === 'listModal' ? (
				<Box width={terminalSize.columns} paddingX={1} paddingBottom={1} backgroundColor="#000">
					<Box
						flexDirection="column"
						borderStyle="round"
						borderColor="yellow"
						paddingX={1}
						width={Math.max(24, terminalSize.columns - 2)}
						height={MODAL_HEIGHT}
					>
						<Box justifyContent="space-between">
							<Text bold>Databases</Text>
							<Text dimColor>esc</Text>
						</Box>
						{listEntries.length === 0 ? (
							<Text dimColor>Nenhuma database cadastrada.</Text>
						) : (
							listEntries.map((database, index) => {
								const isSelected = index === listIndex;
								const isActive = database.id === databaseState.activeDatabaseId;
								return (
									<Box key={database.id} flexDirection="column">
										<Text color={isSelected ? 'yellow' : undefined}>
											{`${isSelected ? '›' : ' '} ${database.name}${isActive ? ' (active)' : ''}`}
										</Text>
										<Text dimColor>
											{`   ${truncateText(database.postgresUrl, listMaxUrlLength)}`}
										</Text>
									</Box>
								);
							})
						)}
						<Text dimColor>{isSettingActive && 'Ativando database...'}</Text>
					</Box>
				</Box>
			) : null}

			{mode === 'tablesModal' ? (
				<Box width={terminalSize.columns} paddingX={1} paddingBottom={1} backgroundColor="#000">
					<Box
						flexDirection="column"
						borderStyle="round"
						borderColor="magenta"
						paddingX={1}
						width={Math.max(24, terminalSize.columns - 2)}
						height={MODAL_HEIGHT}
					>
						<Box justifyContent="space-between">
							<Text bold>Tables</Text>
							<Text dimColor>esc</Text>
						</Box>
						{isLoadingTables ? (
							<Text dimColor>Carregando tabelas...</Text>
						) : tables.length === 0 ? (
							<Text dimColor>Nenhuma tabela encontrada.</Text>
						) : (
							visibleTables.map((table, index) => {
								const absoluteIndex = tablesWindowStart + index;
								const isSelected = absoluteIndex === tablesIndex;
								return (
									<Text key={table.qualifiedName} color={isSelected ? 'magenta' : undefined}>
										{`${isSelected ? '›' : ' '} ${truncateText(table.qualifiedName, tableNameMaxLength)}`}
									</Text>
								);
							})
						)}
						<Text dimColor>
							{tables.length > 0
								? `${tablesIndex + 1}/${tables.length} • enter abre rows`
								: 'esc fecha'}
						</Text>
					</Box>
				</Box>
			) : null}

			{mode === 'rowsModal' ? (
				<Box width={terminalSize.columns} paddingX={1} paddingBottom={1} backgroundColor="#000">
					<Box
						flexDirection="column"
						borderStyle="round"
						borderColor="cyan"
						paddingX={1}
						width={Math.max(24, terminalSize.columns - 2)}
						height={ROWS_MODAL_HEIGHT}
					>
						<Box justifyContent="space-between">
							<Text bold>
								{selectedTable
									? `Rows • ${truncateText(selectedTable.qualifiedName, Math.max(10, terminalSize.columns - 24))}`
									: 'Rows'}
							</Text>
							<Text dimColor>esc</Text>
						</Box>
						{isLoadingRows ? (
							<Text dimColor>Carregando rows...</Text>
						) : !rowsPreview ? (
							<Text dimColor>Nenhuma row carregada.</Text>
						) : rowsViewport.visibleColumns.length === 0 ? (
							<Text dimColor>Não há colunas para exibir.</Text>
						) : (
							<>
								<Text color="cyan">{rowsHeaderLine}</Text>
								{rowsPreview.rows.length === 0 ? (
									<Text dimColor>Sem rows para exibir.</Text>
								) : (
									visibleRows.map((row, index) => {
										const absoluteIndex = rowsWindowStart + index;
										const isSelected = absoluteIndex === rowsIndex;
										const rowLabel = padCell(String(absoluteIndex + 1), ROW_NUMBER_WIDTH);
										const rowCells = rowsViewport.visibleColumns
											.map(column => padCell(formatCellValue(row[column]), rowsViewport.cellWidth))
											.join(CELL_SEPARATOR);
										const rowLine = `${rowLabel}${CELL_SEPARATOR}${rowCells}`;

										return (
											<Text key={`${absoluteIndex}-${rowLine}`} color={isSelected ? 'yellow' : undefined}>
												{rowLine}
											</Text>
										);
									})
								)}
								<Text dimColor>
									{`mostrando ${visibleRows.length}/${rowsPreview.rows.length} rows (limit ${rowsPreview.limit})`}
								</Text>
								<Text dimColor>
									{`colunas ${rowsViewport.offset + 1}-${rowsViewport.offset + rowsViewport.visibleColumns.length}/${rowsPreview.columns.length}`}
								</Text>
							</>
						)}
						<Text dimColor>↑/↓ rows • ←/→ colunas • esc volta</Text>
					</Box>
				</Box>
			) : null}

			<Box
				width={terminalSize.columns}
				height={INPUT_BAR_HEIGHT}
				padding={1}
				backgroundColor="#161616"
				flexDirection="column"
				justifyContent="space-between"
			>
				<Text>{inputLabel}</Text>
				<Text>
					<Text color="green">Database </Text>
					{dbIndicator}
				</Text>
			</Box>
		</Box>
	);
}
