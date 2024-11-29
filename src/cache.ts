import type { App, TFile } from "obsidian";
import MediaFile from "./model/mediaFile";
import type MediaCompanion from "main";
import { getMediaType, MediaTypes } from "./model/types/mediaTypes";
import MCImage from "./model/types/image/image";
import type { FileExplorerLeaf } from "obsidian-typings";

/**
 * Represents a cache for media files
 */
export default class Cache {
    // The cached files
    public files: MediaFile[];

    private app: App;
    private plugin: MediaCompanion;

    private initializing: boolean = false;
    private initialized: boolean = false;

    public constructor(app: App, plugin: MediaCompanion) {
        this.files = [];
        
        this.app = app;
        this.plugin = plugin;
    }

    /**
     * Initialize the cahce with all the (supported) files in the vault
     */
    public async initialize(): Promise<void> {
        if (this.initialized) return;
        
        // Prevent multiple initializations
        if (this.initializing) {
            while (this.initializing) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return;
        }

        this.initializing = true;
        
        let files = this.app.vault.getFiles();

        let timer = Date.now();

        let total_files = files.length;

        files = files.filter(f => this.plugin.settings.extensions.contains(f.extension));

        console.log(
            `%c[Media Companion]: %cBuilding cache with ${files.length} media files found of ${total_files} files total \n                   If this is the first time, this may take a while`, 
            "color: #00b7eb", "color: inherit"
        );

        for (let file of files) {
            let mediaFile;

            switch (getMediaType(file.extension)) {
                case MediaTypes.Image:
                    mediaFile = await MCImage.create(file, this.app);
                    break;
                case MediaTypes.Unknown:
                default:
                    mediaFile = await MediaFile.create(file, this.app);
                    break;
            }
                
            await this.addFile(mediaFile);
        }

        console.log(
            `%c[Media Companion]: %cFinished building cache in ${(Date.now() - timer) / 1000}s, ${this.files.length} files in cache`, 
            "color: #00b7eb", "color: inherit"
        );

        this.initialized = true;
        this.initializing = false;
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
    public async removeFile(file: TFile): Promise<boolean> {
        let length = this.files.length;
        
        this.files = this.files.filter(f => f.file !== file);

        return this.files.length < length;
    }

    /**
     * Get a file from the cache
     * @param path The path of the file to get from the cache
     * @returns The file if it exists in the cache, otherwise undefined
     */
    public async getFile(path: string): Promise<MediaFile | undefined> {
        return this.files.find(f => f.file.path === path);
    }

    /**
     * Checks whether a file is a sidecar file managed by the plugin
     * @param file The file to validate
     * @returns Whether or not it is a sidecar file managed by the plugin
     */
    public async isSidecar(file: TFile): Promise<boolean> {
        if (file.extension !== "md") return false;

        // Check if the path ends in ".sidecar.md"
        if (!file.path.endsWith(".sidecar.md")) return false;

        // Else, get the media file and check if it exists
        let mediaPath = file.path.substring(0, file.path.length - 11);        
        let mediaFile = await this.getFile(mediaPath);

        return mediaFile !== undefined;
    }

    public async hideAll(leaf: FileExplorerLeaf): Promise<void> {
        for (let file of this.files) {
            await file.sidecar.hide(leaf);
        }
    }
}