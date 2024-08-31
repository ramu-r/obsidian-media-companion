import type { App, HexString } from "obsidian";
import Cache from "./cache";
import { getShape, type Shape } from "./model/types/shape";
import type MediaFile from "./model/mediaFile";
import { MediaTypes } from "./model/types/mediaTypes";
import type MCImage from "./model/types/image/image";

export type QueryItem = { 
    groupKey: number, 
    resourcePath: string,
    name: string,
}

export enum OrderByOptions {
    random = "random",
    creationDate = "creationDate",
    modifiedDate = "modifiedDate",
    name = "name",
}

export type QueryDetails = {
    color: null | HexString, // null | HexString
    folders: string[], // string[], if length == 0, all folders (formatted 'path/to/folder')
    tags: string[], // string[], if length == 0, all tags (formatted 'abc')
    fileTypes: string[], // string[], if length == 0, all file types (formatted 'png')
    shape: Shape[], // shapes[], if length == 0, all shapes
    dimensions: {
        mindWidth: number,
        maxWidth: number,
        minHeight: number, // 0 if empty
        maxHeight: number, // Should be set to infinity if empty
    } | null,
    orderBy: {
        option: OrderByOptions,
        value: string // value for custom frontmatter
    },
    orderIncreasing: boolean,
    hasFrontMatter: string[], // list of frontMatter tags that should exist
    // Potentially add an option to check for certain values as well
    // Shouldn't be too hard to do, but let's get the above working first tbh
}

// TODO: Handle when a new media file has been added to the cache

/**
 * An object to handle search queries for the cache
 */
export default class Query {
    private cache: Cache;
    private app: App;
    private files: MediaFile[];
    private query: QueryDetails;
    private currentIndex: number;
    private totalFound: number;
    private group: number;
    public static readonly defaultQuery: QueryDetails = {
        color: null,
        folders: [],
        tags: [],
        fileTypes: [],
        shape: [],
        dimensions: null,
        orderBy: {
            option: OrderByOptions.random,
            value: ""
        },
        orderIncreasing: false,
        hasFrontMatter: []
    }

    public constructor(cache: Cache, app: App, query: QueryDetails = Query.defaultQuery) {
        this.cache = cache;
        this.app = app;
        this.files = [...cache.files];
        this.query = query;
        this.currentIndex = -1;
        this.totalFound = 0;
        this.group = 0;

        switch (this.query.orderBy.option) {
            case OrderByOptions.creationDate:
                this.files.sort((a, b) => a.file.stat.ctime - b.file.stat.ctime);
                break;
            case OrderByOptions.modifiedDate:
                this.files.sort((a, b) => a.file.stat.mtime - b.file.stat.mtime);
                break;
            case OrderByOptions.name:
                this.files.sort((a, b) => a.file.name.localeCompare(b.file.name));
                break;
            case OrderByOptions.random:
            default:
                this.files.sort(() => Math.random() - 0.5);
                break;
        }

        if (!this.query.orderIncreasing) {
            this.files.reverse();
        }
    }

    public async getItems(from: number, to: number): Promise<QueryItem[]> {
        let found = [];
        let mediaTypes = this.determineTypes();
        
        while (this.totalFound < to && this.currentIndex < this.cache.files.length) {
            this.currentIndex++;

            let item = this.files[this.currentIndex];

            if (mediaTypes.length > 0) {
                if (!mediaTypes.includes(item.getType())) continue;
            }

            if (this.query.fileTypes.length > 0) {
                if (!this.query.fileTypes.contains(item.file.extension)) continue;
            }

            if (mediaTypes.contains(MediaTypes.Image))
            {
                let image = item as MCImage;
                let size = await image.getCachedSize();

                if (this.query.dimensions) {
                    if (!(size) ||
                        size.width < this.query.dimensions.mindWidth || size.width > this.query.dimensions.maxWidth ||
                        size.height < this.query.dimensions.minHeight || size.height > this.query.dimensions.maxHeight) continue;
                }

                if (this.query.shape.length > 0) {
                    if (!(size) || !this.query.shape.contains(getShape(size.width, size.height))) continue;
                }

                if (this.query.color) {
                    // TODO: This is a bit more complicated. We want to do
                    // distance checking here...
                }
            }

            // Folders...
            if (this.query.folders.length > 0) {
                let hit = false;

                for (let folder of this.query.folders) {
                    if (item.file.path.startsWith(folder)) {
                        hit = true;
                        break;
                    }
                }

                if (!hit) continue;
            }

            // Tags...
            if (this.query.tags.length > 0) {
                let hit = false;

                for (let tag of this.query.tags) {
                    if (item.sidecar.getTags().contains(tag)) {
                        hit = true;
                        break;
                    }
                }

                if (!hit) continue;
            }

            // Frontmatter...
            if (this.query.hasFrontMatter.length > 0) {
                let hit = false;

                for (let fm of this.query.hasFrontMatter) {
                    if (item.sidecar.getFrontmatterTag(fm)) {
                        hit = true;
                        break;
                    }
                }

                if (!hit) continue;
            }

            if (this.totalFound < from) {
                this.totalFound++;
                continue;
            }
            found.push({
                groupKey: this.group,
                resourcePath: this.app.vault.getResourcePath(this.app.vault.getFileByPath(item.file.path)!),
                name: item.file.name,
            });
            this.totalFound++;
        }
        this.group++;

        return found;
    }

    private determineTypes(): MediaTypes[] {
        if ((this.query.dimensions 
                && this.query.dimensions.maxHeight !== Infinity
                && this.query.dimensions.maxWidth !== Infinity 
                && this.query.dimensions.minHeight !== 0
                && this.query.dimensions.mindWidth !== 0) 
            || this.query.shape.length > 0 
            || this.query.color) {
            // May in the future also be video
            return [MediaTypes.Image];
        }
        return [];
    }
}