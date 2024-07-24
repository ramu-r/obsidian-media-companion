import type { App, TFile } from "obsidian";
import { SidecarUtil } from "./util/sidecar";
import type MediaCompanion from "main";
import { MediaUtil } from "./util/media";
import type { fileType, ImageDetails, VideoDetails } from "./util/media";

export type CacheData = {
    [key: string]: {
        name: string,
        folder: string,
        tags: string[],
        created: number,
        modified: number,
        sidecarModified: number, // Important for saving / retrieving cache
        extension: string,
        type: fileType,
        details: ImageDetails | VideoDetails | null,
        additionalFrontmatter: {[key:string]: any},
    }
}

export type CountCache = {
    [key: string]: number;
}

export class MediaCache {
    app!: App;
    plugin!: MediaCompanion;

    cache: CacheData = {};
    tagCache: CountCache = {};
    extensionCache: CountCache = {};
    fileTypeCache: CountCache = {};
    frontMatterCache: CountCache = {};
    folderCache: CountCache = {};

    constructor(app: App, plugin: MediaCompanion) {
        this.app = app;
        this.plugin = plugin;
    }

    async registerFile(file: TFile) {
        // Create a sidecar file for this file if there's not one already
        // Not entirely sure if this is the behavior I want here or if this is
        // a thing that media / the plugin file should do
        await SidecarUtil.createIfNotExist(file);

        this.cache[file.path] = {
            name: file.name,
            created: file.stat.ctime,
            modified: file.stat.mtime,
            folder: file.parent?.path ?? "",
            extension: file.extension,
            type: await MediaUtil.extensionToFileType(file.extension),
            tags: await SidecarUtil.getTags(file),
            // Asume there is a sidecar
            sidecarModified: (await SidecarUtil.getSidecar(file))!.stat.mtime,
            details: await MediaUtil.getDetails(file),
            additionalFrontmatter: await SidecarUtil.getAdditionalFrontMatter(file),
        }

        await this.expandCaches(file);
    }

    async deregisterFile(file: TFile) {
        if (file.path in this.cache) {
            await this.reduceCaches(file);

            delete this.cache[file.path];
        }
    }

    async reduceCaches(file: TFile) {
        this.removeFromCache(this.cache[file.path].tags, this.tagCache);
        this.removeFromCache([this.cache[file.path].extension], this.extensionCache);
        this.removeFromCache([this.cache[file.path].type], this.fileTypeCache);
        this.removeFromCache([this.cache[file.path].folder], this.folderCache);
        this.removeFromCache(this.cache[file.path].additionalFrontmatter.Keys(), this.frontMatterCache);
    }

    async expandCaches(file: TFile) {
        this.addToCache(this.cache[file.path].tags, this.tagCache);
        this.addToCache([this.cache[file.path].extension], this.extensionCache);
        this.addToCache([this.cache[file.path].type], this.fileTypeCache);
        this.addToCache([this.cache[file.path].folder], this.folderCache);
        this.addToCache(this.cache[file.path].additionalFrontmatter.Keys(), this.frontMatterCache);
    }

    async addToCache(items: string[], cache: CountCache) {
        for (let item of items) {
            if (item in cache) {
                cache[item]++;
            } else {
                cache[item] = 1;
            }
        }
    }

    async removeFromCache(items: string[], cache: CountCache) {
        for (let item of items) {
            if (item in cache) {
                cache[item]--;
                if (cache[item] < 1) {
                    delete cache[item];
                }
            }
        }
    }

    async onFileEdited(file: TFile) {
        if (this.plugin.settings.extensions.contains(file.extension)) {
            await this.deregisterFile(file);
            await this.registerFile(file);
        }
    }

    async onDeleted(file: TFile) {
        if (file.path in this.cache) {
            await this.deregisterFile(file);
        }
    }

    async onMoved(oldpath: string, file: TFile) {
        if (oldpath in this.cache) {
            this.cache[file.path] = this.cache[oldpath];
            delete this.cache[oldpath];
        }
    }

    async onFileCreated(file: TFile) {
        if (this.plugin.settings.extensions.contains(file.extension)) {
            await this.registerFile(file);    
        }
    }
}
