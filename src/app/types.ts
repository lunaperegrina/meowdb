export type AppMode = 'chat' | 'slashMenu' | 'addForm' | 'listModal';

export type AddFormField = 'name' | 'postgresUrl';

export type SlashCommand = {
	id: 'add' | 'list' | 'tables';
	label: string;
	description: string;
};
