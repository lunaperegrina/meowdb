import { Box, Text } from 'ink';
import { MAIN_BACKGROUND, MODAL_HEIGHT, PRIMARY_TEXT, SECONDARY_TEXT } from '../constants.js';
import type { AddFormField } from '../types.js';

type AddDatabaseModalProps = {
	formField: AddFormField;
	formName: string;
	formPostgresUrl: string;
	isSavingDatabase: boolean;
	terminalColumns: number;
};

export function AddDatabaseModal({
	formField,
	formName,
	formPostgresUrl,
	isSavingDatabase,
	terminalColumns,
}: AddDatabaseModalProps) {
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
				borderColor="green"
				paddingX={1}
				width={Math.max(24, terminalColumns - 2)}
				height={MODAL_HEIGHT}
			>
				<Box justifyContent="space-between">
					<Text bold color={PRIMARY_TEXT}>
						Add database
					</Text>
					<Text color={SECONDARY_TEXT}>esc</Text>
				</Box>
				<Text color={formField === 'name' ? 'green' : PRIMARY_TEXT}>
					{`name: ${formField === 'name' ? '›' : ' '} ${formName.length > 0 ? formName : '...'}`}
				</Text>
				<Text color={formField === 'postgresUrl' ? 'green' : PRIMARY_TEXT}>
					{`postgresURL: ${formField === 'postgresUrl' ? '›' : ' '} ${formPostgresUrl.length > 0 ? formPostgresUrl : '...'}`}
				</Text>
				<Text color={SECONDARY_TEXT}>tab alterna campo • enter salva • esc cancela</Text>
				<Text color={SECONDARY_TEXT}>
					{isSavingDatabase
						? 'Salvando database...'
						: 'URL aceita: postgres:// ou postgresql://'}
				</Text>
			</Box>
		</Box>
	);
}
