import type MediaCompanion from "main";
import { TFile, type App, type TAbstractFile } from "obsidian";
import MediaFile from "./model/mediaFile";
import type Cache from "./cache";
import { getMediaType, MediaTypes } from "./model/types/mediaTypes";
import MCImage from "./model/types/image/image";

/**
 * Handles mutations in the vault
 */
export default class MutationHandler extends EventTarget {
    public app: App;
    public plugin: MediaCompanion;
    public cache: Cache;

    public constructor(app: App, plugin: MediaCompanion, cache: Cache) {
        super();
        
        this.app = app;
        this.plugin = plugin;
        this.cache = cache;
    }

    public initializeEvents(): void {
        this.plugin.registerEvent(this.app.vault.on("create", this.onFileCreated.bind(this)));
        this.plugin.registerEvent(this.app.vault.on("delete", this.onDeleted.bind(this)));
        this.plugin.registerEvent(this.app.vault.on("rename", this.onMoved.bind(this)));
        this.plugin.registerEvent(this.app.vault.on("modify", this.onFileEdited.bind(this)));
    }

    /**
     * Callback for file editing
     * @param file The edited file
     */
    public onFileEdited(file: TAbstractFile): void {
        if (!(file instanceof TFile)) return;

        // In case of a markdown file, look for the extension:
        let isMarkdown = file.extension === "md";

        let mediaPath = file.path;

        if (isMarkdown && !file.path.endsWith(".sidecar.md")) return;
        if (isMarkdown) {
            mediaPath = file.path.substring(0, file.path.length - 11);
        }

        this.cache.getFile(mediaPath).then(f => {
            if (f) {
                f.update().then(() => {});
                if (isMarkdown) {
                    this.dispatchEvent(new CustomEvent("sidecar-edited", { detail: f }));
                } else {
                    this.dispatchEvent(new CustomEvent("file-edited", { detail: f }));
                }
            }
        });
    }

    /**
     * Callback for file deletion
     * @param file The deleted file
     */
    public onDeleted(file: TAbstractFile): void {
        if (!(file instanceof TFile)) return;

        // If someone (accidentally) deletes a sidecar file,
        // make a new one
        this.cache.isSidecar(file).then(isSidecar => {
            if (isSidecar) {
                let mediaPath = file.path.substring(0, file.path.length - 11);
                let mediaFile = this.app.vault.getFileByPath(mediaPath);
            
                if (mediaFile) this.onFileCreated(mediaFile);
            }
        });

        if (!this.plugin.settings.extensions.contains(file.extension)) return;

        // get the file
        this.cache.getFile(file.path).then(f => {
            if (f) {
                this.dispatchEvent(new CustomEvent("file-deleted", { detail: f }));
            }
        });

        this.cache.removeFile(file).then(() => {});
        
        // Get sidecar file and remove it
        let sidecar = this.app.vault.getFileByPath(`${file.path}.sidecar.md`);
        if (sidecar) {
            this.app.vault.delete(sidecar).then(() => {});
        }
    }

    /**
     * Callback for file moving or renaming
     * @param file The new file
     * @param oldpath The old path of the file
     */
    public onMoved(file: TAbstractFile, oldpath: string): void {
        if (!(file instanceof TFile)) return;

        // If someone moved a sidecar file
        // Make a new one :(
        this.cache.isSidecar(file).then(isSidecar => {
            if (isSidecar) {
                let mediaPath = file.path.substring(0, file.path.length - 11);
                let mediaFile = this.app.vault.getFileByPath(mediaPath);

                if (mediaFile) { 
                    this.onFileCreated(mediaFile);
                }
            }
        });

        if (!this.plugin.settings.extensions.contains(file.extension)) return;

        this.cache.getFile(file.path).then((cacheFile) => {
            let sidecar = this.app.vault.getFileByPath(`${oldpath}.sidecar.md`);

            if (sidecar) {
                this.app.fileManager.renameFile(sidecar, `${file.path}.sidecar.md`).then(() => {});
            }

            if (!cacheFile) {
                this.createMediaFile(file).then((mediaFile) => {
                    if (mediaFile) {
                        this.dispatchEvent(new CustomEvent("file-moved", { detail: {file: mediaFile, oldPath: oldpath} }));
                    }
                });
            }

        });      
    }

    /**
     * Callback for file creation
     * @param file The created file
     */
    public onFileCreated(file: TAbstractFile): void {
        this.createMediaFile(file).then((mediaFile) => {
            if (mediaFile) {
                this.dispatchEvent(new CustomEvent("file-created", { detail: mediaFile }));
            }
        });
    }

    private async createMediaFile(file: TAbstractFile, sidecar: TFile | null = null): Promise<MediaFile | null> {
        if (!(file instanceof TFile) || !this.plugin.settings.extensions.contains(file.extension)) return null;

        // Make sure it is not already in the cache
        if (await this.cache.getFile(file.path)) return null;

        let mediaFile = null;

        switch (getMediaType(file.extension)) {
            case MediaTypes.Image:
                mediaFile = await MCImage.create(file, this.app);
                break;
            case MediaTypes.Unknown:
                mediaFile = await MediaFile.create(file, this.app);
                break;
        }

        if (mediaFile) {
            await this.cache.addFile(mediaFile);
        }

        return mediaFile;
    }
}