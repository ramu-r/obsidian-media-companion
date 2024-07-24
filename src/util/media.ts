import { extractColors } from "extract-colors";
import type MediaCompanion from "main";
import type { App, TFile } from "obsidian";

export enum fileType {
    image = "Image",
    video = "Video",
    object = "Object",
    audio = "Audio",
    unknown = "Unknown",
}

export enum shape {
    square,
    horizontal,
    vertical,
}

export type ImageDetails = {
    size: {
        height: number,
        width: number,
    },
    colors: {[key in "red" | "green" | "blue" | "area"]:number}[], // ?? some type here idk what yet tbh
    shape: shape,
}

export type VideoDetails = {
    size: {
        height: number,
        width: number,
    },
    shape: shape,
    length: number,
}

export class MediaUtil {
    private static app: App;
    private static plugin: MediaCompanion;

    constructor() {
        console.error("Static class; Do not construct");
    }

    static async initialize(app: App, plugin: MediaCompanion) {
        MediaUtil.app = app;
        MediaUtil.plugin = plugin;
    }

    static async getFiles(): Promise<TFile[]> {
        return this.app.vault.getFiles().filter(
            (f) => {
                return f.extension != 'md' && this.plugin.settings.extensions.includes(f.extension);
            });
    }

    static async onMove() {
        
    }

    static async extensionToFileType(extension: string): Promise<fileType> {
        // TODO: Expand this to all supported file types
        switch (extension) {
            case 'jpg':
            case 'jpeg':
            case 'png':
                return fileType.image;
            default:
                return fileType.unknown;
        }
    }

    static async getShape(width: number, height: number): Promise<shape> {
        if (width > height) {
            return shape.horizontal;
        } else if (height > width) {
            return shape.vertical;
        } else {
            return shape.square;
        }
    }

    static async getDimensions(file: TFile): Promise<{width: number, height: number}|null> {
        if (await this.extensionToFileType(file.extension) == fileType.image) {
            const img = new Image();
			img.src = this.app.vault.getResourcePath(file);
			await img.decode();
            return {width: img.naturalWidth, height: img.naturalHeight};
        }
        return null;
    }

    static async getDetails(file: TFile): Promise<ImageDetails | VideoDetails | null> {
        switch(await this.extensionToFileType(file.extension)) {
            case fileType.image:

                let extracted = await extractColors(this.app.vault.getResourcePath(file));
                let colors = [];
                for (let e of extracted) {
                    colors.push({
                        red: e.red,
                        green: e.green,
                        blue: e.blue,
                        area: e.area,
                    });
                }

                // We know we're an image so we can just use it
                let dimensions = await this.getDimensions(file);
                let shape = this.getShape(dimensions!.width, dimensions!.height);

                return {
                    colors: colors,
                    size: dimensions!,
                    shape: await shape,
                }
            case fileType.video:
    
            default:
                return null
        }
    }
}