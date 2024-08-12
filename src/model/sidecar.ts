import type { App, CachedMetadata, TFile } from "obsidian";
import { reservedFrontMatterTags } from "./frontmatter";

/** 
 * Represents a sidecar file for a media file
 */
export default class Sidecar {
    // Sidecar path
    public path!: string;
    // Last modified timestamp
    public modified!: number;

    // Tags in file and frontmatter
    public tags!: string[];
    // Additional frontmatter, excluding reserved tags
    public frontMatter!: { [key: string]: any };

    private constructor() { }

    /**
     * Create a new sidecar file and link it to a media file
     * @param file The media file to link it to
     * @param app The app instance
     * @returns The created sidecar
     */
    public static async create(mediaFilePath: string, app: App): Promise<Sidecar> {
        let file = new Sidecar();

        await file.fill(mediaFilePath, app);

        return file;
    }

    /**
     * Fill the sidecar with its metadata
     * @param file The media file to use for filling
     * @param app The app instance
     */
    protected async fill(mediaFilePath: string, app: App) {
        this.path = `${mediaFilePath}.md`;

        let file = await this.createIfNotExists(app);

        this.modified = file.stat.mtime;
        await this.processFrontMatter(app);
    }

    /**
     * Create a sidecar file if it does not exist yet
     * @param app The app instance
     * @returns The already existing or newly created sidecar file
     */
    private async createIfNotExists(app: App): Promise<TFile> {
        let file = app.vault.getFileByPath(this.path);

        if (!file) {
            file = await app.vault.create(this.path, "");
        }

        return file;
    }

    /**
     * Process the frontmatter of the file
     * @param app The app instance
     */
    private async processFrontMatter(app: App): Promise<void> {
        const file = await this.createIfNotExists(app);
        const cache = app.metadataCache.getFileCache(file);

        if (!cache) {
            this.frontMatter = {};
            this.tags = [];
            return;
        }

        // We _must_ clone here: Otherwise it's a reference, and we actually
        // delete the tags from the cache in the following steps
        if (cache.frontmatter) {
            this.frontMatter = structuredClone(cache.frontmatter);
        } else {
            this.frontMatter = {};
        }
        
        for (let tag of reservedFrontMatterTags) {
            if (this.frontMatter[tag]) delete this.frontMatter[tag];
        }
        if (this.frontMatter["tags"]) delete this.frontMatter["tags"];

        this.tags = await this.processTags(cache);
    }

    /**
     * Finds all tags in the file: Both the frontmatter and the body, and returns
     * them without duplicates and hashtags.
     * @param cache The metadata cache of the file
     * @returns The tags, without hashtags and duplicates
     */
    private async processTags(cache: CachedMetadata): Promise<string[]> {
        let tags = cache.tags?.map(t => t.tag) ?? [];

        const fmTags = cache.frontmatter?.tags ?? [];

        if (Array.isArray(fmTags)) {
            tags = tags.concat(fmTags);
        } else {
            tags.push(fmTags);
        }

        // We make it lowercase here and remove dupes;
        // For search reasons, we're going to ignore case sensitivity
        tags = tags.map(t => t.toLowerCase());
        tags = [...new Set(tags)];

        // Remove the leading hash
        return tags.map(t => t.startsWith("#") ? t.slice(1) : t);
    }

    /**
     * Gets the information from a tag in the frontmatter
     * @param tag The tag to get from the frontmatter
     * @param app The app instance
     * @returns The data in the tag, or undefined if it does not exist
     */
    public async getTag(tag: string, app: App): Promise<any | undefined> {
        const file = app.vault.getFileByPath(this.path);
        if (!file) return undefined;
        
        const cache = app.metadataCache.getFileCache(file)?.frontmatter;
        if (!cache) return undefined;
        
        return cache[tag];
    }

    /** 
     * Sets the information in a tag in the frontmatter
     * @param tag The tag to set in the frontmatter
     * @param value The value to set
     * @param app The app instance
     */
    public async setTag(tag: string, value: any, app: App): Promise<void> {
        this.frontMatter[tag] = value;

        // But also write the frontMatter to the file...
        let file = app.vault.getFileByPath(this.path);
 
        if (!file) return;

        try {
            await app.fileManager.processFrontMatter(file, (fm) => fm[tag] = value);
        } catch (e) {
            console.log(e);
        }
    }
}