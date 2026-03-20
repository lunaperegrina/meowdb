import { SGR_MOUSE_PACKET_PATTERN } from '../constants.js';

export type MouseEventType = 'leftClick' | 'wheelUp' | 'wheelDown';

export type ParsedMouseEvent = {
	type: MouseEventType;
	x: number;
	y: number;
};

export type ParsedMouseInput = {
	consumed: boolean;
	events: ParsedMouseEvent[];
};

const parseSgrMousePacket = (
	buttonCodeRaw: string,
	xRaw: string,
	yRaw: string,
	marker: string,
): ParsedMouseEvent | null => {
	const buttonCode = Number.parseInt(buttonCodeRaw, 10);
	const x = Number.parseInt(xRaw, 10);
	const y = Number.parseInt(yRaw, 10);

	if (
		Number.isNaN(buttonCode) ||
		Number.isNaN(x) ||
		Number.isNaN(y) ||
		x <= 0 ||
		y <= 0
	) {
		return null;
	}

	if ((buttonCode & 64) === 64) {
		return {
			type: (buttonCode & 1) === 1 ? 'wheelDown' : 'wheelUp',
			x: x - 1,
			y: y - 1,
		};
	}

	const isButtonPress = marker === 'M';
	const isMotion = (buttonCode & 32) === 32;
	const isLeftButton = (buttonCode & 3) === 0;

	if (isButtonPress && !isMotion && isLeftButton) {
		return {
			type: 'leftClick',
			x: x - 1,
			y: y - 1,
		};
	}

	return null;
};

export const parseSgrMouseInput = (input: string): ParsedMouseInput => {
	const events: ParsedMouseEvent[] = [];
	let hasPacket = false;
	let consumedLength = 0;

	SGR_MOUSE_PACKET_PATTERN.lastIndex = 0;
	let match = SGR_MOUSE_PACKET_PATTERN.exec(input);
	while (match) {
		if (match.index !== consumedLength) {
			return {
				consumed: false,
				events: [],
			};
		}

		hasPacket = true;
		consumedLength += match[0].length;

		const parsedEvent = parseSgrMousePacket(match[1], match[2], match[3], match[4]);
		if (parsedEvent) {
			events.push(parsedEvent);
		}

		match = SGR_MOUSE_PACKET_PATTERN.exec(input);
	}

	if (!hasPacket || consumedLength !== input.length) {
		return {
			consumed: false,
			events: [],
		};
	}

	return {
		consumed: true,
		events,
	};
};
