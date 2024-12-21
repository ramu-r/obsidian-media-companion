export interface MediaCompanionSettings {
	hideSidecar: boolean
	extensions: string[];
}

export const DEFAULT_SETTINGS: MediaCompanionSettings = {
	hideSidecar: false,
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
