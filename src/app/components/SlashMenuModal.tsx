import { Box, Text } from 'ink';
import { MAIN_BACKGROUND, MODAL_HEIGHT, PRIMARY_TEXT, SECONDARY_TEXT } from '../constants.js';
import type { SlashCommand } from '../types.js';

type SlashMenuModalProps = {
	filteredCommands: SlashCommand[];
	slashIndex: number;
	terminalColumns: number;
};

export function SlashMenuModal({
	filteredCommands,
	slashIndex,
	terminalColumns,
}: SlashMenuModalProps) {
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
				borderColor="cyan"
				paddingX={1}
				width={Math.max(24, terminalColumns - 2)}
				height={MODAL_HEIGHT}
			>
				{filteredCommands.length === 0 ? (
					<Text color="red">Nenhum comando encontrado.</Text>
				) : (
					filteredCommands.map((command, index) => {
						const isSelected = index === slashIndex;
						return (
							<Box key={command.id} justifyContent="space-between">
								<Text color={isSelected ? 'cyan' : PRIMARY_TEXT}>
									{`${isSelected ? '›' : ' '} /${command.label}`}
								</Text>
								<Text color={SECONDARY_TEXT}>{command.description}</Text>
							</Box>
						);
					})
				)}
			</Box>
		</Box>
	);
}
