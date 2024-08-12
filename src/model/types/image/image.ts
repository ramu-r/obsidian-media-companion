import MediaFile from "src/model/mediaFile";
import { getShape, type Shape } from "../shape";
import type { App, TFile } from "obsidian";
import { extractColors } from "extract-colors";

export default class MCImage extends MediaFile {
    // The size of the image
    public size!: {
        width: number;
        height: number;
    };
    // The shape of the image
    public shape!: Shape;
    // The colors of the image
    // Dictated by the extract-colors package
    public colors!: any;

    protected constructor() { super(); }

    /**
     * Create a new MCImage from a file: Use as constructor
     * @param file The file to create the image from
     * @param app The app instance
     * @returns The created MCImage
     */
    public static async create(file: TFile, app: App): Promise<MCImage> {
        let f = new MCImage();

        await MCImage.fill(f, file, app);

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

        // Get the size...
        let size = await this.parseSize(await f.sidecar.getTag("size", app));
        if (!size) size = await this.readSize(file, app);

        f.size = size;
        f.shape = await getShape(f.size.width, f.size.height);

        let color = await f.sidecar.getTag("colors", app);
        if (!color) color = await this.readColors(file, app);

        f.colors = color;
        
        await f.setTags(app);
    }

    /**
     * Set the frontmatter properties in the related sidecar file
     * @param app The app instance
     */
    private async setTags(app: App): Promise<void> {
        await this.sidecar.setTag("size", await this.sizeToList(), app);
        await this.sidecar.setTag("shape", this.shape, app);
        await this.sidecar.setTag("colors", this.colors, app);
    }

    /**
     * Extracts the colors from a given image file
     * @param file The file to read the colors from
     * @param app The app instance
     * @returns The colors, in the format dictated by the extract-colors package
     */
    private static async readColors(file: TFile, app: App): Promise<any> {
        let extracted = await extractColors(app.vault.getResourcePath(file));
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

    /**
     * Attempts to parse the given object as an array wit [width, height]. 
     * Returns undefined if failed
     * @param size An object potentially holding the width and height of an image
     * @returns The width and height object, undefined if not present
     */
    private static async parseSize(size: any): Promise<{ width: number, height: number } | undefined> {
        if (!(size instanceof Array)) return undefined;
        
        if (size.length !== 2) return undefined;

        return { width: size[0], height: size[1] };
    }

    /**
     * Turns the size of the image into a list
     * @returns The size of the image as a list
     */
    private async sizeToList(): Promise<number[]> {
        return [this.size.width, this.size.height];
    }

    /**
     * Read the width and height from a binary image
     * @param file The binary file to read the size from
     * @param app The app instance
     * @returns The size of the image
     */
    private static async readSize(file: TFile, app: App): Promise<{ width: number, height: number }> {
        const image = new Image();
        
        image.src = app.vault.getResourcePath(file);
        
        await image.decode();

        return { width: image.naturalWidth, height: image.naturalHeight };
    }

    /**
     * Update the information stored about the file
     * @param app The app instance
     * @param file The binary file to update from
     */
    public async update(app: App, file: TFile) {
        await super.update(app, file);

        if (this.modified > this.sidecar.modified) {
            // Update size/shape/colors
            this.size = await MCImage.readSize(file, app);
            this.shape = await getShape(this.size.width, this.size.height);
            this.colors = MCImage.readColors(file, app);
        }

        await this.setTags(app);
    }
}