import { Box, Text } from 'ink';
import { PRIMARY_TEXT, SECONDARY_TEXT } from '../constants.js';
import { truncateText } from '../utils/text.js';
import type { TableReference } from '../../types/database.js';

type TablesSidebarProps = {
	activeDatabaseName: string;
	isLoadingTables: boolean;
	sidebarWidth: number;
	tableNameMaxLength: number;
	tables: TableReference[];
	tablesError: string | null;
	tablesIndex: number;
	tablesWindowStart: number;
	visibleTables: TableReference[];
};

export function TablesSidebar({
	activeDatabaseName,
	isLoadingTables,
	sidebarWidth,
	tableNameMaxLength,
	tables,
	tablesError,
	tablesIndex,
	tablesWindowStart,
	visibleTables,
}: TablesSidebarProps) {
	return (
		<Box flexDirection="column" width={sidebarWidth} overflow="hidden">
			<Text bold color={PRIMARY_TEXT}>
				{`Tables • ${truncateText(activeDatabaseName, Math.max(10, sidebarWidth - 12))}`}
			</Text>
			{isLoadingTables ? (
				<Text color={SECONDARY_TEXT}>Carregando tabelas...</Text>
			) : tablesError ? (
				<Text color="red">{`Erro ao carregar tabelas: ${tablesError}`}</Text>
			) : tables.length === 0 ? (
				<Text color={SECONDARY_TEXT}>Nenhuma tabela encontrada.</Text>
			) : (
				visibleTables.map((table, index) => {
					const absoluteIndex = tablesWindowStart + index;
					const isSelected = absoluteIndex === tablesIndex;
					return (
						<Text key={table.qualifiedName} color={isSelected ? 'magenta' : PRIMARY_TEXT}>
							{`${isSelected ? '›' : ' '} ${truncateText(table.qualifiedName, tableNameMaxLength)}`}
						</Text>
					);
				})
			)}
			<Text color={SECONDARY_TEXT}>
				{tables.length > 0
					? `${tablesIndex + 1}/${tables.length} • enter/click carrega rows`
					: 'use /tables para recarregar'}
			</Text>
		</Box>
	);
}
