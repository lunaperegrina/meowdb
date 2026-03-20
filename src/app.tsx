import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import {
	CELL_MIN_WIDTH,
	CELL_SEPARATOR,
	DISABLE_MOUSE_TRACKING,
	ENABLE_MOUSE_TRACKING,
	ESCAPE_INPUT,
	INPUT_BAR_HEIGHT,
	MAIN_BACKGROUND,
	MODAL_HEIGHT,
	PRIMARY_TEXT,
	ROW_NUMBER_WIDTH,
	SECONDARY_TEXT,
	SPLIT_GAP,
	STATUS_BAR_HEIGHT,
} from './app/constants.js';
import { slashCommands } from './app/slashCommands.js';
import { useDatabaseExplorer } from './app/hooks/useDatabaseExplorer.js';
import { AddDatabaseModal } from './app/components/AddDatabaseModal.js';
import { DatabaseListModal } from './app/components/DatabaseListModal.js';
import { InputBar } from './app/components/InputBar.js';
import { RowsPanel } from './app/components/RowsPanel.js';
import { SlashMenuModal } from './app/components/SlashMenuModal.js';
import { TablesSidebar } from './app/components/TablesSidebar.js';
import type { AddFormField, AppMode } from './app/types.js';
import { isNavigationKey, normalizeInput, type InputKey } from './app/utils/input.js';
import { getRowsViewport, getSplitPaneSizes, getTerminalSize } from './app/utils/layout.js';
import { clamp, wrapIndex } from './app/utils/math.js';
import { parseSgrMouseInput } from './app/utils/mouse.js';
import { padCell } from './app/utils/text.js';

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
	const [terminalSize, setTerminalSize] = useState(() => getTerminalSize(stdout));

	const pushMessage = useCallback((message: string) => {
		setMessages(previous => [...previous, message]);
	}, []);

	const {
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
	} = useDatabaseExplorer({ pushMessage });

	const filteredCommands = useMemo(() => {
		const query = slashQuery.trim().toLowerCase();

		if (query.length === 0) {
			return slashCommands;
		}

		return slashCommands.filter(command =>
			command.label.toLowerCase().includes(query),
		);
	}, [slashQuery]);

	const hasActiveDatabase = activeDatabase !== null;
	const splitPaneSizes = useMemo(
		() => getSplitPaneSizes(terminalSize.columns, hasActiveDatabase),
		[hasActiveDatabase, terminalSize.columns],
	);

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
		if (!stdout.isTTY) {
			return;
		}

		const disableMouseTracking = () => {
			stdout.write(DISABLE_MOUSE_TRACKING);
		};

		stdout.write(ENABLE_MOUSE_TRACKING);
		process.on('beforeExit', disableMouseTracking);
		process.on('exit', disableMouseTracking);

		return () => {
			process.off('beforeExit', disableMouseTracking);
			process.off('exit', disableMouseTracking);
			disableMouseTracking();
		};
	}, [stdout]);

	useEffect(() => {
		setSlashIndex(previous => wrapIndex(previous, filteredCommands.length));
	}, [filteredCommands.length]);

	useEffect(() => {
		setListIndex(previous => wrapIndex(previous, databaseState.databases.length));
	}, [databaseState.databases.length]);

	useEffect(() => {
		setTablesIndex(previous => wrapIndex(previous, tables.length));
	}, [setTablesIndex, tables.length]);

	useEffect(() => {
		if (rowsColumnCount === 0) {
			if (rowsColumnOffset !== 0) {
				setRowsColumnOffset(0);
			}
			return;
		}

		const viewport = getRowsViewport(
			splitPaneSizes.contentWidth,
			rowsColumnCount,
			rowsColumnOffset,
		);
		if (viewport.offset !== rowsColumnOffset) {
			setRowsColumnOffset(viewport.offset);
		}
	}, [
		rowsColumnCount,
		rowsColumnOffset,
		setRowsColumnOffset,
		splitPaneSizes.contentWidth,
	]);

	const modalRows =
		mode === 'slashMenu' || mode === 'addForm' || mode === 'listModal'
			? MODAL_HEIGHT
			: 0;
	const mainViewportRows = Math.max(
		1,
		terminalSize.rows - INPUT_BAR_HEIGHT - STATUS_BAR_HEIGHT - modalRows - 2,
	);
	const visibleMessages = messages.slice(-mainViewportRows);
	const inputLabel =
		mode === 'chat'
			? `› ${draft}`
			: mode === 'slashMenu'
				? `› /${slashQuery}`
				: mode === 'addForm'
					? '› preenchendo formulário de database'
					: '› selecionando database ativa';
	const dbIndicator = isLoadingDatabases
		? 'loading...'
		: activeDatabase
			? `${activeDatabase.name}`
			: 'none';

	const listEntries = databaseState.databases;
	const listMaxUrlLength = Math.max(12, terminalSize.columns - 18);
	const tableNameMaxLength = Math.max(10, splitPaneSizes.sidebarWidth - 4);
	const selectedSidebarTable = tables[tablesIndex] ?? null;

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
			splitPaneSizes.contentWidth,
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
	}, [rowsPreview, rowsColumnOffset, splitPaneSizes.contentWidth]);

	const rowsHeaderLine = useMemo(() => {
		if (rowsViewport.visibleColumns.length === 0) {
			return '';
		}

		const headerColumns = rowsViewport.visibleColumns
			.map(column => padCell(column, rowsViewport.cellWidth))
			.join(CELL_SEPARATOR);
		return `${padCell('row', ROW_NUMBER_WIDTH)}${CELL_SEPARATOR}${headerColumns}`;
	}, [rowsViewport]);

	const rowsWindowSize = Math.max(1, mainViewportRows - 6);
	const maxRowsWindowStart = Math.max(0, rowsCount - rowsWindowSize);

	useEffect(() => {
		setRowsWindowStart(previous => clamp(previous, 0, maxRowsWindowStart));
	}, [maxRowsWindowStart, setRowsWindowStart]);

	const visibleRows = rowsPreview
		? rowsPreview.rows.slice(rowsWindowStart, rowsWindowStart + rowsWindowSize)
		: [];
	const visibleRowsStart = visibleRows.length > 0 ? rowsWindowStart + 1 : 0;
	const visibleRowsEnd = rowsWindowStart + visibleRows.length;

	const tablesWindowSize = Math.max(1, mainViewportRows - 4);
	const maxTablesWindowStart = Math.max(0, tables.length - tablesWindowSize);
	const tablesWindowStart = Math.min(
		maxTablesWindowStart,
		Math.max(0, tablesIndex - Math.floor(tablesWindowSize / 2)),
	);
	const visibleTables = tables.slice(
		tablesWindowStart,
		tablesWindowStart + tablesWindowSize,
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

		closeSlashMenu();
		if (!activeDatabase) {
			pushMessage('Nenhuma database ativa. Use /add ou /list para selecionar uma database.');
			return;
		}

		void loadTablesForDatabase(activeDatabase);
	};

	const submitAddForm = async () => {
		const saved = await saveDatabase({
			name: formName,
			postgresUrl: formPostgresUrl,
		});
		if (!saved) {
			return;
		}

		setMode('chat');
		setFormField('name');
		setFormName('');
		setFormPostgresUrl('');
	};

	const activateSelectedDatabase = async () => {
		if (isSettingActive || databaseState.databases.length === 0) {
			return;
		}

		const selectedDatabase = databaseState.databases[listIndex];
		if (!selectedDatabase) {
			return;
		}

		const activated = await activateDatabase(selectedDatabase.id);
		if (activated) {
			setMode('chat');
		}
	};

	useInput((input, key) => {
		const keyState = key as InputKey;
		const parsedMouseInput = parseSgrMouseInput(input);
		if (parsedMouseInput.consumed) {
			if (mode !== 'chat' || !hasActiveDatabase) {
				return;
			}

			const splitPaneX = 1;
			const splitPaneY = 1;
			const sidebarXStart = splitPaneX;
			const sidebarXEnd = sidebarXStart + splitPaneSizes.sidebarWidth;
			const tablesListYStart = splitPaneY + 1;
			const tablesListYEnd = tablesListYStart + visibleTables.length;
			const contentXStart = sidebarXEnd + SPLIT_GAP;
			const contentXEnd = contentXStart + splitPaneSizes.contentWidth;
			const contentYStart = splitPaneY + 1;
			const contentYEnd = contentYStart + Math.max(0, mainViewportRows - 1);

			for (const mouseEvent of parsedMouseInput.events) {
				const isWithinSidebar =
					mouseEvent.x >= sidebarXStart &&
					mouseEvent.x < sidebarXEnd &&
					mouseEvent.y >= splitPaneY &&
					mouseEvent.y < splitPaneY + mainViewportRows;

				if (isWithinSidebar) {
					if (
						(mouseEvent.type === 'wheelUp' || mouseEvent.type === 'wheelDown') &&
						!isLoadingTables &&
						tables.length > 0
					) {
						const delta = mouseEvent.type === 'wheelDown' ? 1 : -1;
						setTablesIndex(previous => clamp(previous + delta, 0, tables.length - 1));
					}

					if (
						mouseEvent.type === 'leftClick' &&
						!isLoadingTables &&
						mouseEvent.y >= tablesListYStart &&
						mouseEvent.y < tablesListYEnd
					) {
						const relativeIndex = mouseEvent.y - tablesListYStart;
						const absoluteIndex = tablesWindowStart + relativeIndex;
						const table = tables[absoluteIndex];
						if (table) {
							setTablesIndex(absoluteIndex);
							void loadRowsForTable(table);
						}
					}

					continue;
				}

				const isWithinContent =
					mouseEvent.x >= contentXStart &&
					mouseEvent.x < contentXEnd &&
					mouseEvent.y >= contentYStart &&
					mouseEvent.y < contentYEnd;

				if (
					isWithinContent &&
					(mouseEvent.type === 'wheelUp' || mouseEvent.type === 'wheelDown') &&
					rowsPreview &&
					!isLoadingRows
				) {
					const delta = mouseEvent.type === 'wheelDown' ? 1 : -1;
					setRowsWindowStart(previous =>
						clamp(previous + delta, 0, maxRowsWindowStart),
					);
				}
			}

			return;
		}

		const isEscapePressed = keyState.escape || input === ESCAPE_INPUT;

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

			if (mode === 'listModal') {
				setMode('chat');
				return;
			}
		}

		if (keyState.ctrl || keyState.meta) {
			return;
		}

		const cleanedInput = normalizeInput(input);

		if (mode === 'slashMenu') {
			if (keyState.return) {
				selectSlashCommand();
				return;
			}

			if (keyState.upArrow) {
				setSlashIndex(previous => wrapIndex(previous - 1, filteredCommands.length));
				return;
			}

			if (keyState.downArrow || keyState.tab) {
				setSlashIndex(previous => wrapIndex(previous + 1, filteredCommands.length));
				return;
			}

			if (keyState.backspace || keyState.delete) {
				if (slashQuery.length === 0) {
					closeSlashMenu();
					return;
				}

				setSlashQuery(previous => previous.slice(0, -1));
				setSlashIndex(0);
				return;
			}

			if (isNavigationKey(keyState)) {
				return;
			}

			if (cleanedInput.length > 0 && cleanedInput !== '/') {
				setSlashQuery(previous => previous + cleanedInput);
				setSlashIndex(0);
			}

			return;
		}

		if (mode === 'addForm') {
			if (keyState.tab || keyState.upArrow || keyState.downArrow) {
				setFormField(previous => (previous === 'name' ? 'postgresUrl' : 'name'));
				return;
			}

			if (keyState.return) {
				void submitAddForm();
				return;
			}

			if (keyState.backspace || keyState.delete) {
				if (formField === 'name') {
					setFormName(previous => previous.slice(0, -1));
				} else {
					setFormPostgresUrl(previous => previous.slice(0, -1));
				}
				return;
			}

			if (isNavigationKey(keyState)) {
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
			if (keyState.upArrow) {
				setListIndex(previous => wrapIndex(previous - 1, databaseState.databases.length));
				return;
			}

			if (keyState.downArrow || keyState.tab) {
				setListIndex(previous => wrapIndex(previous + 1, databaseState.databases.length));
				return;
			}

			if (keyState.return) {
				void activateSelectedDatabase();
			}

			return;
		}

		if (keyState.upArrow) {
			if (!isLoadingTables && tables.length > 0) {
				setTablesIndex(previous => wrapIndex(previous - 1, tables.length));
			}
			return;
		}

		if (keyState.downArrow || keyState.tab) {
			if (!isLoadingTables && tables.length > 0) {
				setTablesIndex(previous => wrapIndex(previous + 1, tables.length));
			}
			return;
		}

		if (keyState.leftArrow) {
			if (rowsPreview) {
				setRowsColumnOffset(previous => Math.max(0, previous - 1));
			}
			return;
		}

		if (keyState.rightArrow) {
			if (rowsPreview) {
				setRowsColumnOffset(previous => Math.min(rowsViewport.maxOffset, previous + 1));
			}
			return;
		}

		if (input === '/' && draft.length === 0) {
			setMode('slashMenu');
			setSlashQuery('');
			setSlashIndex(0);
			return;
		}

		if (keyState.return) {
			const message = draft.trim();
			if (message.length > 0) {
				setMessages(previous => [...previous, message]);
				setDraft('');
				return;
			}

			if (!isLoadingRows && !isLoadingTables && activeDatabase && tables.length > 0) {
				void loadRowsForSelectedTable();
			}
			return;
		}

		if (keyState.backspace || keyState.delete) {
			setDraft(previous => previous.slice(0, -1));
			return;
		}

		if (keyState.escape || keyState.pageUp || keyState.pageDown) {
			return;
		}

		if (cleanedInput.length > 0) {
			setDraft(previous => previous + cleanedInput);
		}
	});

	return (
		<Box flexDirection="column" width={terminalSize.columns} height={terminalSize.rows}>
			<Box
				flexDirection="column"
				flexGrow={1}
				width={terminalSize.columns}
				padding={1}
				overflow="hidden"
				backgroundColor={MAIN_BACKGROUND}
			>
				{hasActiveDatabase ? (
					<Box flexDirection="row" flexGrow={1} overflow="hidden">
						<TablesSidebar
							activeDatabaseName={activeDatabase.name}
							isLoadingTables={isLoadingTables}
							sidebarWidth={splitPaneSizes.sidebarWidth}
							tableNameMaxLength={tableNameMaxLength}
							tables={tables}
							tablesError={tablesError}
							tablesIndex={tablesIndex}
							tablesWindowStart={tablesWindowStart}
							visibleTables={visibleTables}
						/>

						<Box width={SPLIT_GAP} />

						<RowsPanel
							contentWidth={splitPaneSizes.contentWidth}
							isLoadingRows={isLoadingRows}
							rowsCount={rowsCount}
							rowsError={rowsError}
							rowsHeaderLine={rowsHeaderLine}
							rowsPreview={rowsPreview}
							rowsViewport={rowsViewport}
							rowsWindowStart={rowsWindowStart}
							selectedSidebarTable={selectedSidebarTable}
							selectedTable={selectedTable}
							visibleRows={visibleRows}
							visibleRowsEnd={visibleRowsEnd}
							visibleRowsStart={visibleRowsStart}
						/>
					</Box>
				) : (
					<>
						{visibleMessages.length === 0 ? (
							<Text color={SECONDARY_TEXT}>Digite / para abrir o slash menu.</Text>
						) : null}
						{visibleMessages.map((message, index) => (
							<Text key={`${index}-${message}`} color={PRIMARY_TEXT}>
								{message}
							</Text>
						))}
					</>
				)}
			</Box>

			{mode === 'slashMenu' ? (
				<SlashMenuModal
					filteredCommands={filteredCommands}
					slashIndex={slashIndex}
					terminalColumns={terminalSize.columns}
				/>
			) : null}

			{mode === 'addForm' ? (
				<AddDatabaseModal
					formField={formField}
					formName={formName}
					formPostgresUrl={formPostgresUrl}
					isSavingDatabase={isSavingDatabase}
					terminalColumns={terminalSize.columns}
				/>
			) : null}

			{mode === 'listModal' ? (
				<DatabaseListModal
					activeDatabaseId={databaseState.activeDatabaseId}
					isSettingActive={isSettingActive}
					listEntries={listEntries}
					listIndex={listIndex}
					listMaxUrlLength={listMaxUrlLength}
					terminalColumns={terminalSize.columns}
				/>
			) : null}

			<InputBar
				dbIndicator={dbIndicator}
				inputLabel={inputLabel}
				terminalColumns={terminalSize.columns}
			/>
		</Box>
	);
}
