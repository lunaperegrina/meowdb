import { Box, Text } from 'ink';
import { MAIN_BACKGROUND, MODAL_HEIGHT, PRIMARY_TEXT, SECONDARY_TEXT } from '../constants.js';
import { truncateText } from '../utils/text.js';
import type { DatabaseEntry } from '../../types/database.js';

type DatabaseListModalProps = {
	activeDatabaseId: string | null;
	isSettingActive: boolean;
	listEntries: DatabaseEntry[];
	listIndex: number;
	listMaxUrlLength: number;
	terminalColumns: number;
};

export function DatabaseListModal({
	activeDatabaseId,
	isSettingActive,
	listEntries,
	listIndex,
	listMaxUrlLength,
	terminalColumns,
}: DatabaseListModalProps) {
	return (
		<Box
			width={terminalColumns}
			paddingX={1}
			paddingBottom={1}
			backgroundColor={MAIN_BACKGROUND}
		>
			<Box
				flexDirection="column"
				borderStyle="round"
				borderColor="yellow"
				paddingX={1}
				width={Math.max(24, terminalColumns - 2)}
				height={MODAL_HEIGHT}
			>
				<Box justifyContent="space-between">
					<Text bold color={PRIMARY_TEXT}>
						Databases
					</Text>
					<Text color={SECONDARY_TEXT}>esc</Text>
				</Box>
				{listEntries.length === 0 ? (
					<Text color={SECONDARY_TEXT}>Nenhuma database cadastrada.</Text>
				) : (
					listEntries.map((database, index) => {
						const isSelected = index === listIndex;
						const isActive = database.id === activeDatabaseId;
						return (
							<Box key={database.id} flexDirection="column">
								<Text color={isSelected ? 'yellow' : PRIMARY_TEXT}>
									{`${isSelected ? '›' : ' '} ${database.name}${isActive ? ' (active)' : ''}`}
								</Text>
								<Text color={SECONDARY_TEXT}>
									{`   ${truncateText(database.postgresUrl, listMaxUrlLength)}`}
								</Text>
							</Box>
						);
					})
				)}
				<Text color={SECONDARY_TEXT}>{isSettingActive && 'Ativando database...'}</Text>
			</Box>
		</Box>
	);
}
