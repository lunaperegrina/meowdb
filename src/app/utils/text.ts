const MIN_ELLIPSIS_LENGTH = 1;

export const truncateText = (value: string, maxLength: number): string => {
	if (maxLength <= MIN_ELLIPSIS_LENGTH) {
		return value.length > 0 ? '…' : '';
	}

	if (value.length <= maxLength) {
		return value;
	}

	return `${value.slice(0, maxLength - 1)}…`;
};

export const padCell = (value: string, width: number): string =>
	truncateText(value, width).padEnd(width, ' ');

export const formatCellValue = (value: unknown): string => {
	if (value === null) {
		return 'null';
	}

	if (value === undefined) {
		return 'undefined';
	}

	if (typeof value === 'string') {
		return value.replaceAll(/\r?\n/g, ' ');
	}

	if (
		typeof value === 'number' ||
		typeof value === 'boolean' ||
		typeof value === 'bigint'
	) {
		return String(value);
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	try {
		const serialized = JSON.stringify(value);
		if (serialized === undefined) {
			return String(value);
		}

		return serialized.replaceAll(/\r?\n/g, ' ');
	} catch {
		return String(value);
	}
};

export const getErrorMessage = (error: unknown): string => {
	if (error instanceof Error) {
		return error.message;
	}

	return 'Erro desconhecido.';
};
