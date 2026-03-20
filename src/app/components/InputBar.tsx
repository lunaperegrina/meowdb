import { Box, Text } from 'ink';
import { INPUT_BAR_HEIGHT, PRIMARY_TEXT, SURFACE_BACKGROUND } from '../constants.js';

type InputBarProps = {
	dbIndicator: string;
	inputLabel: string;
	terminalColumns: number;
};

export function InputBar({ dbIndicator, inputLabel, terminalColumns }: InputBarProps) {
	return (
		<Box
			width={terminalColumns}
			height={INPUT_BAR_HEIGHT}
			padding={1}
			backgroundColor={SURFACE_BACKGROUND}
			flexDirection="column"
			justifyContent="space-between"
		>
			<Text color={PRIMARY_TEXT}>{inputLabel}</Text>
			<Text color={PRIMARY_TEXT}>
				<Text color="green">Database </Text>
				{dbIndicator}
			</Text>
		</Box>
	);
}
