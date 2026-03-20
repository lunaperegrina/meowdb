export const wrapIndex = (index: number, total: number): number => {
	if (total <= 0) {
		return 0;
	}

	if (index < 0) {
		return total - 1;
	}

	if (index >= total) {
		return 0;
	}

	return index;
};

export const clamp = (value: number, min: number, max: number): number =>
	Math.min(max, Math.max(min, value));
