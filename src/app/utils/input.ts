export type InputKey = {
	tab?: boolean;
	upArrow?: boolean;
	downArrow?: boolean;
	leftArrow?: boolean;
	rightArrow?: boolean;
	pageUp?: boolean;
	pageDown?: boolean;
	escape?: boolean;
	return?: boolean;
	backspace?: boolean;
	delete?: boolean;
	ctrl?: boolean;
	meta?: boolean;
};

export const isNavigationKey = (key: InputKey) =>
	Boolean(
		key.tab ||
			key.upArrow ||
			key.downArrow ||
			key.leftArrow ||
			key.rightArrow ||
			key.pageUp ||
			key.pageDown ||
			key.escape,
	);

export const normalizeInput = (value: string) => value.replaceAll(/\r?\n/g, '');
