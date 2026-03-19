import { Box, Text, render, useApp, useInput } from 'ink';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type InteractiveController } from '@/interactive/controller';
import { toCliError } from '@/errors';
import { formatHumanErrorLines, formatHumanSuccessLines } from '@/output';

type InteractiveAppProps = {
	controller: InteractiveController;
};

type SelectEntry =
	| {
			type: 'connection';
			name: string;
			maskedUrl: string;
			active: boolean;
	  }
	| { type: 'add' }
	| { type: 'exit' };

type MenuEntry = 'tables' | 'switch' | 'add' | 'exit';
type AddReturnScreen = 'select' | 'menu';
type ConnectionRow = {
	name: string;
	maskedUrl: string;
	active: boolean;
};

function moveSelection(current: number, delta: number, size: number): number {
	if (size <= 0) {
		return 0;
	}

	return (current + delta + size) % size;
}

function formatErrorLines(error: unknown): string[] {
	return formatHumanErrorLines(toCliError(error), false);
}

function InteractiveApp({ controller }: InteractiveAppProps) {
	const { exit } = useApp();
	const [isBusy, setIsBusy] = useState<boolean>(true);
	const [screen, setScreen] = useState<'select' | 'menu' | 'add'>('select');
	const [activeDb, setActiveDb] = useState<string | null>(null);
	const [connections, setConnections] = useState<ConnectionRow[]>([]);
	const [selectIndex, setSelectIndex] = useState<number>(0);
	const [menuIndex, setMenuIndex] = useState<number>(0);
	const [addField, setAddField] = useState<'name' | 'url'>('name');
	const [addName, setAddName] = useState<string>('');
	const [addUrl, setAddUrl] = useState<string>('');
	const [addReturnScreen, setAddReturnScreen] =
		useState<AddReturnScreen>('select');
	const [errorLines, setErrorLines] = useState<string[]>([]);
	const [infoLines, setInfoLines] = useState<string[]>([]);

	const selectEntries = useMemo<SelectEntry[]>(
		() => [
			...connections.map(connection => ({
				type: 'connection' as const,
				name: connection.name,
				maskedUrl: connection.maskedUrl,
				active: connection.active,
			})),
			{ type: 'add' as const },
			{ type: 'exit' as const },
		],
		[connections],
	);

	const menuEntries: MenuEntry[] = ['tables', 'switch', 'add', 'exit'];

	const refreshConnections = useCallback(async () => {
		setIsBusy(true);
		try {
			const state = await controller.getConnections();
			setConnections(state.connections);
			setActiveDb(state.activeDb);
			setSelectIndex(current =>
				Math.min(current, Math.max(state.connections.length + 1, 0)),
			);
		} catch (error: unknown) {
			setErrorLines(formatErrorLines(error));
		} finally {
			setIsBusy(false);
		}
	}, [controller]);

	useEffect(() => {
		void refreshConnections();
	}, [refreshConnections]);

	const resetAddForm = useCallback(() => {
		setAddField('name');
		setAddName('');
		setAddUrl('');
	}, []);

	const openAddScreen = useCallback((returnScreen: AddReturnScreen) => {
		setAddReturnScreen(returnScreen);
		setScreen('add');
		setErrorLines([]);
		resetAddForm();
	}, [resetAddForm]);

	const submitAddConnection = useCallback(async () => {
		const name = addName.trim();
		const url = addUrl.trim();

		if (!name || !url) {
			setErrorLines(['Error: Name and PostgreSQL URL are required.']);
			return;
		}

		setIsBusy(true);
		try {
			const addResult = await controller.addConnection(name, url);
			const useResult = await controller.selectConnection(name);
			setActiveDb(name);
			setInfoLines([
				...formatHumanSuccessLines(addResult, false),
				...formatHumanSuccessLines(useResult, false),
			]);
			setErrorLines([]);
			await refreshConnections();
			resetAddForm();
			setScreen('menu');
			setMenuIndex(0);
		} catch (error: unknown) {
			setErrorLines(formatErrorLines(error));
		} finally {
			setIsBusy(false);
		}
	}, [addName, addUrl, controller, refreshConnections, resetAddForm]);

	const selectCurrentConnection = useCallback(async (name: string) => {
		setIsBusy(true);
		try {
			const useResult = await controller.selectConnection(name);
			setActiveDb(name);
			setInfoLines(formatHumanSuccessLines(useResult, false));
			setErrorLines([]);
			await refreshConnections();
			setScreen('menu');
			setMenuIndex(0);
		} catch (error: unknown) {
			setErrorLines(formatErrorLines(error));
		} finally {
			setIsBusy(false);
		}
	}, [controller, refreshConnections]);

	const runMenuAction = useCallback(async (entry: MenuEntry) => {
		if (entry === 'switch') {
			setScreen('select');
			return;
		}

		if (entry === 'add') {
			openAddScreen('menu');
			return;
		}

		if (entry === 'exit') {
			exit();
			return;
		}

		setIsBusy(true);
		try {
			const result = await controller.listTables();
			setInfoLines(formatHumanSuccessLines(result, false));
			setErrorLines([]);
		} catch (error: unknown) {
			setErrorLines(formatErrorLines(error));
		} finally {
			setIsBusy(false);
		}
	}, [controller, exit, openAddScreen]);

	useInput((input, key) => {
		if (isBusy) {
			return;
		}

		if (screen === 'select') {
			if (key.upArrow) {
				setSelectIndex(current =>
					moveSelection(current, -1, selectEntries.length),
				);
				return;
			}

			if (key.downArrow) {
				setSelectIndex(current => moveSelection(current, 1, selectEntries.length));
				return;
			}

			if (key.escape) {
				exit();
				return;
			}

			if (key.return) {
				const currentEntry = selectEntries[selectIndex];
				if (!currentEntry) {
					return;
				}

				if (currentEntry.type === 'connection') {
					void selectCurrentConnection(currentEntry.name);
					return;
				}

				if (currentEntry.type === 'add') {
					openAddScreen('select');
					return;
				}

				exit();
				return;
			}
		}

		if (screen === 'menu') {
			if (key.upArrow) {
				setMenuIndex(current => moveSelection(current, -1, menuEntries.length));
				return;
			}

			if (key.downArrow) {
				setMenuIndex(current => moveSelection(current, 1, menuEntries.length));
				return;
			}

			if (key.escape) {
				setScreen('select');
				return;
			}

			if (key.return) {
				const action = menuEntries[menuIndex];
				if (action) {
					void runMenuAction(action);
				}
			}

			return;
		}

		if (key.escape) {
			setScreen(addReturnScreen);
			setErrorLines([]);
			return;
		}

		if (key.tab || key.upArrow || key.downArrow) {
			setAddField(current => (current === 'name' ? 'url' : 'name'));
			return;
		}

		if (key.backspace || key.delete) {
			if (addField === 'name') {
				setAddName(current => current.slice(0, -1));
			} else {
				setAddUrl(current => current.slice(0, -1));
			}

			return;
		}

		if (key.return) {
			if (addField === 'name') {
				setAddField('url');
				return;
			}

			void submitAddConnection();
			return;
		}

		if (!key.ctrl && !key.meta && input.length > 0) {
			if (addField === 'name') {
				setAddName(current => current + input);
			} else {
				setAddUrl(current => current + input);
			}
		}
	});

	return (
		<Box flexDirection="column">
			<Text bold color="cyanBright">
				MEOWDB
			</Text>

			{isBusy && (
				<Text color="yellow">
					Working...
				</Text>
			)}

			{screen === 'select' && (
				<Box flexDirection="column" marginTop={1}>
					<Text>Select a database:</Text>
					{selectEntries.map((entry, index) => {
						const selected = index === selectIndex;
						const prefix = selected ? '>' : ' ';

						if (entry.type === 'connection') {
							const activeLabel =
								entry.name === activeDb ? ' (active)' : '';
							return (
								<Box key={entry.name} flexDirection="column">
									<Text color={selected ? 'green' : undefined}>
										{prefix} {entry.name}
										{activeLabel}
									</Text>
									<Text dimColor>  {entry.maskedUrl}</Text>
								</Box>
							);
						}

						if (entry.type === 'add') {
							return (
								<Text key="add" color={selected ? 'green' : undefined}>
									{prefix} Add database
								</Text>
							);
						}

						return (
							<Text key="exit" color={selected ? 'green' : undefined}>
								{prefix} Exit
							</Text>
						);
					})}
					<Text dimColor>Use Up/Down and Enter. Esc exits.</Text>
				</Box>
			)}

			{screen === 'menu' && (
				<Box flexDirection="column" marginTop={1}>
					<Text>Active database: {activeDb ?? '-'}</Text>
					<Text color={menuIndex === 0 ? 'green' : undefined}>
						{menuIndex === 0 ? '>' : ' '} List tables
					</Text>
					<Text color={menuIndex === 1 ? 'green' : undefined}>
						{menuIndex === 1 ? '>' : ' '} Switch database
					</Text>
					<Text color={menuIndex === 2 ? 'green' : undefined}>
						{menuIndex === 2 ? '>' : ' '} Add database
					</Text>
					<Text color={menuIndex === 3 ? 'green' : undefined}>
						{menuIndex === 3 ? '>' : ' '} Exit
					</Text>
					<Text dimColor>Use Up/Down and Enter. Esc goes back.</Text>
				</Box>
			)}

			{screen === 'add' && (
				<Box flexDirection="column" marginTop={1}>
					<Text>Add database connection</Text>
					<Text color={addField === 'name' ? 'green' : undefined}>
						{addField === 'name' ? '>' : ' '} Name: {addName || '<empty>'}
					</Text>
					<Text color={addField === 'url' ? 'green' : undefined}>
						{addField === 'url' ? '>' : ' '} PostgreSQL URL:{' '}
						{addUrl || '<empty>'}
					</Text>
					<Text dimColor>Tab/Arrows switch field, Enter submits, Esc cancels.</Text>
				</Box>
			)}

			{errorLines.length > 0 && (
				<Box flexDirection="column" marginTop={1}>
					{errorLines.map((line, index) => (
						<Text key={`error-${index}`} color="red">
							{line}
						</Text>
					))}
				</Box>
			)}

			{infoLines.length > 0 && (
				<Box flexDirection="column" marginTop={1}>
					{infoLines.map((line, index) => (
						<Text key={`info-${index}`} color="gray">
							{line}
						</Text>
					))}
				</Box>
			)}
		</Box>
	);
}

type RunInteractiveCliOptions = {
	controller: InteractiveController;
};

export async function runInteractiveCli(
	options: RunInteractiveCliOptions,
): Promise<void> {
	const instance = render(<InteractiveApp controller={options.controller} />);
	await instance.waitUntilExit();
}
