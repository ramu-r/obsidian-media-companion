export interface MediaCompanionSettings {
	hideSidecar: boolean;
	extensions: string[];
}

export const DEFAULT_SETTINGS: MediaCompanionSettings = {
	hideSidecar: true,
	extensions: [
		'png',
		'jpg',
		'jpeg',
		'bmp',
		'avif',
		'webp',
		'gif',
	],
}
