import { createConfigStore } from '@/config-store/store';

export { type CliConfig, type ConnectionConfig, defaultConfig } from '@/config-store/types';
export {
	type ConfigStoreDependencies,
	createConfigStore,
} from '@/config-store/store';

const configStore = createConfigStore();

export const getConfigPath = configStore.getConfigPath;
export const readConfig = configStore.readConfig;
export const writeConfig = configStore.writeConfig;
export const loadOrCreateConfig = configStore.loadOrCreateConfig;
