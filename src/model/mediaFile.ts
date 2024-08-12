import type { App, TFile } from "obsidian";
import Sidecar from "./sidecar";
import { getMediaType, type MediaTypes } from "./types/mediaTypes";

export default class MediaFile {
    // The filename
    public name!: string;
    // The file extension
    public extension!: string;
    // The path to the file
    public path!: string;
    // The filetype
    // Might not be needed: Maybe remove, since we can do it as classes
    public type!: MediaTypes;

    // The relevant sidecar file
    public sidecar!: Sidecar;
    // The last modified timestamp
    public modified!: number;
    // The created timestamp
    public created!: number;

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
        f.sidecar = await Sidecar.create(file.path, app);

        f.name = file.basename;
        f.extension = file.extension;
        f.path = file.path;
        f.type = await getMediaType(f.extension);

        f.modified = file.stat.mtime;
        f.created = file.stat.ctime;
    }

    /**
     * Update a file after it has been edited
     * @param app The app instance
     * @param file The binary file to update
     */
    public async update(app: App, file: TFile): Promise<void> {
        await MediaFile.fill(this, file, app);
    }
}