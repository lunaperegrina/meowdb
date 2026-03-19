export function formatRowsForHuman(rows: Array<Record<string, unknown>>): string[] {
	if (rows.length === 0) {
		return ['No rows found.'];
	}

	const headers = new Set<string>();
	for (const row of rows) {
		for (const key of Object.keys(row)) {
			headers.add(key);
		}
	}

	const orderedHeaders = [...headers];
	const widths = orderedHeaders.map(header => header.length);

	const serializedRows = rows.map(row =>
		orderedHeaders.map((header, index) => {
			const value = stringifyCell(row[header]);
			const currentWidth = widths[index] ?? 0;
			widths[index] = Math.max(currentWidth, value.length);
			return value;
		}),
	);

	const headerLine = orderedHeaders
		.map((header, index) => header.padEnd(widths[index] ?? 0))
		.join(' | ');
	const separatorLine = widths.map(width => '-'.repeat(width)).join('-|-');
	const rowLines = serializedRows.map(serialized =>
		serialized
			.map((cell, index) => cell.padEnd(widths[index] ?? 0))
			.join(' | '),
	);

	return [headerLine, separatorLine, ...rowLines];
}

export function formatRowsForQuiet(rows: Array<Record<string, unknown>>): string[] {
	if (rows.length === 0) {
		return [];
	}

	const firstRow = rows[0];
	if (!firstRow) {
		return [];
	}

	const headers = Object.keys(firstRow);
	const lines = [headers.join('\t')];

	for (const row of rows) {
		lines.push(headers.map(header => stringifyCell(row[header])).join('\t'));
	}

	return lines;
}

export function stringifyCell(value: unknown): string {
	if (value === null) {
		return 'null';
	}

	if (typeof value === 'object') {
		return JSON.stringify(value);
	}

	return String(value);
}
