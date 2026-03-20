import {
	CELL_MAX_WIDTH,
	CELL_MIN_WIDTH,
	CELL_SEPARATOR,
	CONTENT_MIN_WIDTH,
	FALLBACK_COLUMNS,
	FALLBACK_ROWS,
	ROW_NUMBER_WIDTH,
	SIDEBAR_MAX_WIDTH,
	SIDEBAR_MIN_WIDTH,
	SPLIT_GAP,
} from '../constants.js';

export type SplitPaneSizes = {
	mainWidth: number;
	sidebarWidth: number;
	contentWidth: number;
};

export type RowsViewport = {
	cellWidth: number;
	visibleColumnCount: number;
	maxOffset: number;
	offset: number;
};

export const getTerminalSize = (stdout: NodeJS.WriteStream) => ({
	columns: stdout.columns && stdout.columns > 0 ? stdout.columns : FALLBACK_COLUMNS,
	rows: stdout.rows && stdout.rows > 0 ? stdout.rows : FALLBACK_ROWS,
});

export const getSplitPaneSizes = (
	terminalColumns: number,
	hasActiveDatabase: boolean,
): SplitPaneSizes => {
	const mainWidth = Math.max(24, terminalColumns - 2);
	if (!hasActiveDatabase) {
		return {
			mainWidth,
			sidebarWidth: 0,
			contentWidth: mainWidth,
		};
	}

	const preferredSidebar = Math.floor(mainWidth * 0.34);
	const boundedSidebar = Math.min(
		SIDEBAR_MAX_WIDTH,
		Math.max(SIDEBAR_MIN_WIDTH, preferredSidebar),
	);
	const maxSidebarForContent = Math.max(
		SIDEBAR_MIN_WIDTH,
		mainWidth - CONTENT_MIN_WIDTH - SPLIT_GAP,
	);
	const sidebarWidth = Math.min(boundedSidebar, maxSidebarForContent);
	const contentWidth = Math.max(CONTENT_MIN_WIDTH, mainWidth - sidebarWidth - SPLIT_GAP);

	return {
		mainWidth,
		sidebarWidth,
		contentWidth,
	};
};

export const getRowsViewport = (
	terminalColumns: number,
	totalColumns: number,
	requestedOffset: number,
): RowsViewport => {
	if (totalColumns <= 0) {
		return {
			cellWidth: CELL_MIN_WIDTH,
			visibleColumnCount: 0,
			maxOffset: 0,
			offset: 0,
		};
	}

	const innerWidth = Math.max(24, terminalColumns - 8);
	const availableForCells = Math.max(1, innerWidth - ROW_NUMBER_WIDTH - CELL_SEPARATOR.length);
	const maxVisibleColumnCount = Math.max(
		1,
		Math.floor((availableForCells + CELL_SEPARATOR.length) / (CELL_MIN_WIDTH + CELL_SEPARATOR.length)),
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
