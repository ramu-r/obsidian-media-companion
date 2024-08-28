import MediaFile from "src/model/mediaFile";
import type { App, TFile } from "obsidian";
import { extractColors } from "extract-colors";

export default class MCImage extends MediaFile {
    protected static size_tag = "size";
    protected static colors_tag = "colors";

    protected constructor() { super(); }

    /**
     * Create a new MCImage from a file: Use as constructor
     * @param file The file to create the image from
     * @param app The app instance
     * @returns The created MCImage
     */
    public static async create(file: TFile, app: App): Promise<MCImage> {
        let f = new MCImage();

        await MCImage.fill(f, file, app)

        return f;
    }

    /**
     * Fill the properties of a file
     * @param f The file to fill
     * @param file The related binary file
     * @param app The app instance
     */
    protected static async fill(f: MCImage, file: TFile, app: App): Promise<void> {
        await super.fill(f, file, app);
    }

    /**
     * Set the frontmatter properties in the related sidecar file
     * @param app The app instance
     */
    private async setTags(): Promise<void> {
        //let size = await this.readSize();
        //await this.sidecar.setFrontmatterTag(MCImage.size_tag, [size.width, size.height]);
        
        //await this.sidecar.setFrontmatterTag(MCImage.colors_tag, await this.readColors());
    }

    /**
     * Extracts the colors from a given image file
     * @param file The file to read the colors from
     * @param app The app instance
     * @returns The colors, in the format dictated by the extract-colors package
     */
    private async readColors(): Promise<any> {
        let extracted = await extractColors(this.app.vault.getResourcePath(this.file));
        let colors = [];

        for (let e of extracted) {
            colors.push({
                red: e.red,
                green: e.green,
                blue: e.blue,
                area: e.area,
            });
        }

        return colors;
    }

    public getCachedColors(): any {
        if (!this.sidecar.getFrontmatterTag(MCImage.colors_tag)) {
            this.update().then(() => {});
        }

        return this.sidecar.getFrontmatterTag(MCImage.colors_tag);
    }

    /**
     * Attempts to parse the given object as an array wit [width, height]. 
     * Returns undefined if failed
     * @param size An object potentially holding the width and height of an image
     * @returns The width and height object, undefined if not present
     */
    private static parseSize(size: any): { width: number, height: number } | undefined {
        if (!(size instanceof Array)) return undefined;
        
        if (size.length !== 2) return undefined;

        return { width: size[0], height: size[1] };
    }

    /**
     * Read the width and height from a binary image
     * @param file The binary file to read the size from
     * @param app The app instance
     * @returns The size of the image
     */
    private async readSize(): Promise<{ width: number, height: number }> {
        const image = new Image();
        
        image.src = this.app.vault.getResourcePath(this.file);
        
        await image.decode();

        return { width: image.naturalWidth, height: image.naturalHeight };
    }

    public getCachedSize(): { width: number, height: number } | undefined {
        if (!this.sidecar.getFrontmatterTag(MCImage.size_tag)) {
            this.update().then(() => {});
        }

        return MCImage.parseSize(this.sidecar.getFrontmatterTag(MCImage.size_tag));
    }

    /**
     * Update the information stored about the file
     */
    public async update() {
        // If last_updated is older than when the files last updated, update regardless
        // or last_updated is not present

        // Or, if one of our things is not cached / can't be parsed
        let last_updated = this.sidecar.getFrontmatterTag(MediaFile.last_updated_tag);

        if (!last_updated ||
            last_updated < this.file.stat.mtime ||
            /* !this.getCachedSize() || !this.getCachedColors()*/ false) {
            await this.setTags();
        }

        // Finally, update the last_updated tag
        await super.update();
    }
}