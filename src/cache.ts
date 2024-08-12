import type { App, TFile } from "obsidian";
import MediaFile from "./model/mediaFile";
import type MediaCompanion from "main";
import { getMediaType, MediaTypes } from "./model/types/mediaTypes";
import MCImage from "./model/types/image/image";

/**
 * Represents a cache for media files
 */
export default class Cache {
    // The cached files
    public files: MediaFile[];

    private app: App;
    private plugin: MediaCompanion;

    public constructor(app: App, plugin: MediaCompanion) {
        this.files = [];
        
        this.app = app;
        this.plugin = plugin;
    }

    /**
     * Initialize the cahce with all the (supported) files in the vault
     */
    public async initialize(): Promise<void> {
        let files = this.app.vault.getFiles();

        let timer = Date.now();

        console.log(
            "%c[Media Companion]: %cBuilding cache (If this is the first time, this may take a while)", 
            "color: #00b7eb", "color: inherit"
        );

        let total_files = files.length;

        files = files.filter(f => this.plugin.settings.extensions.contains(f.extension));

        console.log(
            `%c[Media Companion]: %c${files.length} media files found of ${total_files} files total`, 
            "color: #00b7eb", "color: inherit"
        );
        
        await Promise.all(files.map(async (file) => {
            let mediaFile;

            switch (await getMediaType(file.extension)) {
                case MediaTypes.Image:
                    mediaFile = await MCImage.create(file, this.app);
                    break;
                case MediaTypes.Unknown:
                default:
                    mediaFile = await MediaFile.create(file, this.app);
                    break;
            }
                
            await this.addFile(mediaFile);
        }));

        console.log(
            `%c[Media Companion]: %cFinished building cache in ${(Date.now() - timer) / 1000}s, ${this.files.length} files in cache`, 
            "color: #00b7eb", "color: inherit"
        );
    }

    /**
     * Add a file to the cache
     * @param file The file to add to the cache
     */
    public async addFile(file: MediaFile): Promise<void> {
        this.files.push(file);
    }

    /**
     * Remove a file from the cache
     * @param file The file to remove
     * @returns Whether the operation removed a file or not
     */
    public async removeFile(file: string): Promise<boolean> {
        let length = this.files.length;
        
        this.files = this.files.filter(f => f.path !== file);

        return this.files.length < length;
    }

    /**
     * Get a file from the cache
     * @param path The path of the file to get from the cache
     * @returns The file if it exists in the cache, otherwise undefined
     */
    public async getFile(path: string): Promise<MediaFile | undefined> {
        return this.files.find(f => f.path === path);
    }

    /**
     * Checks whether a file is a sidecar file managed by the plugin
     * @param file The file to validate
     * @returns Whether or not it is a sidecar file managed by the plugin
     */
    public async isSidecar(file: TFile): Promise<boolean> {
        if (file.extension !== "md") return false;

        let mediaPath = file.path.substring(0, file.path.length - 3);
        let mediaFile = await this.getFile(mediaPath);

        return mediaFile !== undefined;
    }
}