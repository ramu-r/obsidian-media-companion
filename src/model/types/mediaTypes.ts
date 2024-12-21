/**
 * The supported media types for the plugin
 */
export enum MediaTypes {
	Image = "image",
	//Video = "video",
	//Audio = "audio",
	Unknown = "unknown",
}

/**
 * Finds the media type of a file based on its extension
 * @param extention The extension of the file
 * @returns The media type of the file
 */
export function getMediaType(extention: string): MediaTypes {
	switch (extention) {
		case "png":
		case "jpg":
		case "jpeg":
		case "webp":
		case "avif":
		case "bmp":
		case "gif":
			return MediaTypes.Image;
		default:
			return MediaTypes.Unknown;
	}
}
