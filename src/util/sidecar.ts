import type MediaCompanion from "main";
import type { App, TFile } from "obsidian";

export let reservedFrontMatterFields: string[] = ['tags', 'cssclasses', 'mediacompanion'];

export class SidecarUtil {
    private static app: App;
    private static plugin: MediaCompanion;

    static async initialize(app: App, plugin: MediaCompanion) {
        SidecarUtil.app = app;
        SidecarUtil.plugin = plugin;
    }

    constructor() {
        console.error("Static class; Do not construct");
    }

    static async createIfNotExist(file: TFile): Promise<TFile> {
        if (await this.hasSidecar(file)) return (await this.getSidecar(file))!;
        
        const filename = `${file.path}.md`

        // Find all the information that needs to be in the file
        let metadata = await this.getSidecarMetadata(file);

        let sidecar = await this.app.vault.create(filename, "");
        // We're just going to assume it's empty, since there's like. No way it's not.
        await this.app.fileManager.processFrontMatter(sidecar, (f) => f = metadata);

        return sidecar;
    }

    static async hasSidecar(file: TFile): Promise<boolean> {
        return (await this.getSidecar(file)) !== null;
    }

    static async getSidecar(file: TFile): Promise<TFile | null> {
        return this.app.vault.getFileByPath(`${file.path}.md`);
    }

    static async getSidecarMetadata(file: TFile): Promise<Object> {
        let frontMatter: {[key:string]: any} = {};
        this.app.fileManager.processFrontMatter(file, (f) => frontMatter = f);
        return frontMatter;
    }

    static async getTags(file: TFile): Promise<string[]> {
        let tags: string[] = [];
        this.app.fileManager.processFrontMatter(file, (f) => tags = f.tags);
        return tags;
    }

    static async getAdditionalFrontMatter(file: TFile) : Promise<{[key:string]: any}> {
        let frontMatter: {[key:string]: any} = {};
        this.app.fileManager.processFrontMatter(file, (f) => frontMatter = f);
        
        for (let reserved of reservedFrontMatterFields) {
            delete frontMatter[reserved];
        }
        
        return frontMatter;
    }

    static async filesWithoutSidecar(): Promise<TFile[]> {
        let files = this.app.vault.getFiles();
        let needs_sidecar = [];

        for (const file of files) {
            if (file.extension == 'md') continue;
            if (!this.plugin.settings.extensions.includes(file.extension)) continue;
            if (await this.hasSidecar(file)) continue;
            
            needs_sidecar.push(file);
        }

        return needs_sidecar;
    }

    static async sidecarFiles(): Promise<TFile[]> {
        let files = this.app.vault.getFiles();
        let sidecars = [];

        for (const file of files) {
            if (file.extension == 'md') continue;

            var sidecar = await this.getSidecar(file);

            if (sidecar !== null) {
                sidecars.push(sidecar);
            }
        }

        return sidecars;
    }

    static async registerRequiredSidecarFiles() {
        let required = await this.filesWithoutSidecar();

        for (const file of required) {
            this.createIfNotExist(file);
        }
    }
}