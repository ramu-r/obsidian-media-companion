import type { App, HexString } from "obsidian";
import Cache from "./cache";
import { getShape, type Shape } from "./model/types/shape";
import type MediaFile from "./model/mediaFile";
import { MediaTypes } from "./model/types/mediaTypes";
import type MCImage from "./model/types/image/image";

export enum OrderByOptions {
    random = "random",
    creationDate = "creationDate",
    modifiedDate = "modifiedDate",
    name = "name",
}

export type QueryDetails = {
    color: null | HexString, // null | HexString
    folders: string[], // string[], if length == 0, all folders (formatted 'path/to/folder')
    name: string, // string, if empty, all names
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
    private files: MediaFile[];
    private query: QueryDetails;
    private currentIndex: number;
    private totalFound: number;
    public static readonly defaultQuery: QueryDetails = {
        color: null,
        folders: [],
        name: "",
        tags: [],
        fileTypes: [],
        shape: [],
        dimensions: null,
        orderBy: {
            option: OrderByOptions.name,
            value: ""
        },
        orderIncreasing: true,
        hasFrontMatter: []
    }

    public constructor(cache: Cache, query: QueryDetails = Query.defaultQuery) {
        this.cache = cache;
        this.query = query;
        this.currentIndex = -1;
        this.totalFound = 0;
        this.files = [];
    }

    public async orderFiles() {
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

    public async testFile(item: MediaFile): Promise<boolean> {
        let mediaTypes = this.determineTypes();

        if (mediaTypes.length > 0) {
            if (!mediaTypes.includes(item.getType())) return false;
        }

        if (this.query.fileTypes.length > 0) {
            if (!this.query.fileTypes.contains(item.file.extension)) return false;
        }

        if (mediaTypes.contains(MediaTypes.Image))
        {
            let image = item as MCImage;
            let size = await image.getCachedSize();

            if (this.query.dimensions) {
                if (!(size) ||
                    size.width < this.query.dimensions.mindWidth || size.width > this.query.dimensions.maxWidth ||
                    size.height < this.query.dimensions.minHeight || size.height > this.query.dimensions.maxHeight) return false;
            }

            if (this.query.shape.length > 0) {
                if (!(size) || !this.query.shape.contains(getShape(size.width, size.height))) return false;
            }

            if (this.query.color) {
				// From: https://gist.github.com/vahidk/05184faf3d92a0aa1b46aeaa93b07786
				// No attribution required, but here it is anyway
				function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
					r /= 255; g /= 255; b /= 255;
					let max = Math.max(r, g, b);
					let min = Math.min(r, g, b);
					let d = max - min;
					let h: number = 0;
					if (d === 0) h = 0;
					else if (max === r) h = (g - b) / d % 6;
					else if (max === g) h = (b - r) / d + 2;
					else if (max === b) h = (r - g) / d + 4;
					let l = (min + max) / 2;
					let s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
					return [h * 60, s, l];
				}

                // Extract RGB values from the color hex string
				let color = this.query.color;
				let r = parseInt(color.substring(1, 3), 16);
				let g = parseInt(color.substring(3, 5), 16);
				let b = parseInt(color.substring(5, 7), 16);

				let hsl = rgbToHsl(r, g, b);

				let h = hsl[0];
				let s = hsl[1];
				let l = hsl[2];				

				let distance = 0;

				let colors = await image.getCachedColors()

				if (!colors) return false;
				if (colors.length === 0) return false;
				
				for (let color of colors) {
					let colorHsl = rgbToHsl(color.red, color.green, color.blue);

					// Handle hue wrap around
					// In HSL, the hue is a value from 0 to 360
					// where in practice, 0 and 360 are the same
					// Imagine them as a circle, where 0 and 360 degrees are the same point
					let hDiff = Math.min(Math.abs(colorHsl[0] - h), Math.abs(colorHsl[0] - h + 360));
					let sDiff = Math.abs(colorHsl[1] - s);
					let lDiff = Math.abs(colorHsl[2] - l);

					// Completely arbitrary, might want to tweak
					distance += (hDiff / 180 + sDiff + lDiff) * color.area;

					// Completely arbitrary, might want to tweak
					// Break out in the for loop so we don't compute more than we need to
					if (distance > 0.5) return false;
				}				
            }
        }

        if (this.query.name.length > 0) {
            if (!item.file.basename.toLowerCase().includes(this.query.name.toLowerCase())) return false;
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

            if (!hit) return false;
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

            if (!hit) return false;
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

            if (!hit) return false;
        }

        return true;
    }

    public async getItems(): Promise<MediaFile[]> {
        await this.cache.initialize();

        this.files = [...this.cache.files];

        await this.orderFiles();

        let found = [];
        
        while (this.currentIndex < this.cache.files.length - 1) {
            this.currentIndex++;

            let item = this.files[this.currentIndex];

            if (await this.testFile(item)) {
                found.push(item);
                this.totalFound++;
            }
        }
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
