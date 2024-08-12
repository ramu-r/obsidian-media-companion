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
export async function getMediaType(extention: string): Promise<MediaTypes> {
    switch (extention) {
    case "png":
    case "jpg":
    case "jpeg":
        return MediaTypes.Image;
    default:
        return MediaTypes.Unknown;
    }
}