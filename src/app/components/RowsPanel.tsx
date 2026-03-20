import { Box, Text } from 'ink';
import { CELL_SEPARATOR, PRIMARY_TEXT, ROW_NUMBER_WIDTH, SECONDARY_TEXT } from '../constants.js';
import { formatCellValue, padCell, truncateText } from '../utils/text.js';
import type { TableReference, TableRowsPreview } from '../../types/database.js';

type RowsViewportWithColumns = {
	cellWidth: number;
	offset: number;
	visibleColumns: string[];
};

type RowsPanelProps = {
	contentWidth: number;
	isLoadingRows: boolean;
	rowsCount: number;
	rowsError: string | null;
	rowsHeaderLine: string;
	rowsPreview: TableRowsPreview | null;
	rowsViewport: RowsViewportWithColumns;
	rowsWindowStart: number;
	selectedSidebarTable: TableReference | null;
	selectedTable: TableReference | null;
	visibleRows: Array<Record<string, unknown>>;
	visibleRowsEnd: number;
	visibleRowsStart: number;
};

export function RowsPanel({
	contentWidth,
	isLoadingRows,
	rowsCount,
	rowsError,
	rowsHeaderLine,
	rowsPreview,
	rowsViewport,
	rowsWindowStart,
	selectedSidebarTable,
	selectedTable,
	visibleRows,
	visibleRowsEnd,
	visibleRowsStart,
}: RowsPanelProps) {
	return (
		<Box flexDirection="column" flexGrow={1} width={contentWidth} overflow="hidden">
			<Text bold color={PRIMARY_TEXT}>
				{selectedTable
					? `Rows • ${truncateText(selectedTable.qualifiedName, Math.max(10, contentWidth - 12))}`
					: selectedSidebarTable
						? `Rows • ${truncateText(selectedSidebarTable.qualifiedName, Math.max(10, contentWidth - 12))}`
						: 'Rows'}
			</Text>
			{isLoadingRows ? (
				<Text color={SECONDARY_TEXT}>Carregando rows...</Text>
			) : rowsError ? (
				<Text color="red">{`Erro ao carregar rows: ${rowsError}`}</Text>
			) : !selectedTable || !rowsPreview ? (
				<Text color={SECONDARY_TEXT}>
					Clique ou selecione uma table na sidebar para carregar rows.
				</Text>
			) : rowsViewport.visibleColumns.length === 0 ? (
				<Text color={SECONDARY_TEXT}>Não há colunas para exibir.</Text>
			) : (
				<>
					<Text color="cyan">{rowsHeaderLine}</Text>
					{rowsPreview.rows.length === 0 ? (
						<Text color={SECONDARY_TEXT}>Sem rows para exibir.</Text>
					) : (
						visibleRows.map((row, index) => {
							const absoluteIndex = rowsWindowStart + index;
							const rowLabel = padCell(String(absoluteIndex + 1), ROW_NUMBER_WIDTH);
							const rowCells = rowsViewport.visibleColumns
								.map(column => padCell(formatCellValue(row[column]), rowsViewport.cellWidth))
								.join(CELL_SEPARATOR);
							const rowLine = `${rowLabel}${CELL_SEPARATOR}${rowCells}`;

							return (
								<Text key={`${absoluteIndex}-${rowLine}`} color={PRIMARY_TEXT}>
									{rowLine}
								</Text>
							);
						})
					)}
					<Text color={SECONDARY_TEXT}>
						{`rows ${visibleRowsStart}-${visibleRowsEnd}/${rowsCount} (limit ${rowsPreview.limit})`}
					</Text>
					<Text color={SECONDARY_TEXT}>
						{`colunas ${rowsViewport.offset + 1}-${rowsViewport.offset + rowsViewport.visibleColumns.length}/${rowsPreview.columns.length}`}
					</Text>
				</>
			)}
			<Text color={SECONDARY_TEXT}>
				↑/↓ tables • click carrega rows • wheel sidebar/rows • ←/→ colunas
			</Text>
		</Box>
	);
}
