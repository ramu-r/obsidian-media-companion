export interface MediaCompanionSettings {
	mySetting: string;
    extensions: string[];
}

export const DEFAULT_SETTINGS: MediaCompanionSettings = {
	mySetting: 'default',
    extensions: [
        'png',
        'jpg',
        'jpeg',
    ]
}