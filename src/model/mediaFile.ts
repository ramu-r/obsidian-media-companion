import type { App, TFile } from "obsidian";
import Sidecar from "./sidecar";
import { getMediaType, type MediaTypes } from "./types/mediaTypes";

export default class MediaFile {
    public sidecar!: Sidecar;
    public file!: TFile;
    protected app!: App;

    protected static last_updated_tag = "MediaCompanion Last Updated";
    
    protected constructor() { }

    /**
     * Create a new MediaFile from a binary file
     * @param file The file to create a MediaFile from
     * @param app The app instance
     * @returns The created MediaFile
     */
    public static async create(file: TFile, app: App): Promise<MediaFile> {
        let f = new MediaFile();

        await MediaFile.fill(f, file, app);

        return f;
    }

    /**
     * Fill the variables of the MediaFile
     * @param f The MediaFile to fill
     * @param file The related binary file
     * @param app The app instance
     */
    protected static async fill(f: MediaFile, file: TFile, app: App): Promise<void> {
        f.file = file;
        f.app = app;
        
        f.sidecar = await Sidecar.create(file, app);

        await f.update();
    }

    public getType(): MediaTypes {
        return getMediaType(this.file.extension);
    }

    /**
     * Update a file after it has been edited
     */
    public async update(): Promise<void> {
        let last_updated = this.sidecar.getFrontmatterTag(MediaFile.last_updated_tag);

        if (!last_updated ||
            last_updated < this.file.stat.mtime) {
            await this.sidecar.setFrontmatterTag(MediaFile.last_updated_tag, new Date(), "datetime");
        }
    }
}