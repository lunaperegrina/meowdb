import type { SlashCommand } from './types.js';

export const slashCommands: SlashCommand[] = [
	{ id: 'add', label: 'add', description: 'Add database' },
	{ id: 'list', label: 'list', description: 'List databases' },
	{
		id: 'tables',
		label: 'tables',
		description: 'Reload tables for active database',
	},
];
