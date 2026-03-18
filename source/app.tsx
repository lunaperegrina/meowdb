import React from 'react';
import {Text} from 'ink';

type Props = {
	name: string | undefined;
};

export default function App({name = 'Stranger'}: Props) {
	return (
		<Text>
			MIAU, <Text color="green">{name}</Text>! MIAU!
		</Text>
	);
}
