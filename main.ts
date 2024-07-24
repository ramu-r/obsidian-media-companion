import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';
import { GalleryView, VIEW_TYPE_GALLERY } from 'src/views/gallery-view';
import { DEFAULT_SETTINGS } from 'src/settings'
import { extractColors } from "extract-colors";

import type { MediaCompanionSettings } from 'src/settings';
import { SidecarUtil } from 'src/util/sidecar';
import { MediaUtil } from 'src/util/media';

    // Some issues: When we reach the last images, it breaks due to reading prop of undefined
    // Which can be solved by adding a .length check when we use cache -> Or, we just create a
	// query class, which yield returns things 😌

    // When we switch between tabs it breaks a little bit, because of the window resize.
    // We should fix this by checking the positions, maybe? -> Can't think of a fix yet, fine
	// for now. Going to look into making my own masonry implementation instead.

    // Other todo items:
    // - Cache
    // - Caching info
    // - Semantic file drags!!!!
    // - Adding search stuff
    // - Adding image info to sidecar files
    // - Creating sidecar files on new file created
    // - Moving sidecar files with files
    // - Deleting sidecar files with files
    
    // From there, work can be done on:
    // - Supporting videos, gifs
    // - Supporting audio
    // - Supporting object files, 3d stuff -> Different plugin?

export default class MediaCompanion extends Plugin {
	settings!: MediaCompanionSettings;

	async onload() {
		await SidecarUtil.initialize(this.app, this);
		await MediaUtil.initialize(this.app, this);

		await this.loadSettings();
		await this.registerViews();

		this.addRibbonIcon('image', 'Open Gallery', (_: MouseEvent) => {
			this.createGallery();
		});

		await this.registerCommands();

		this.addSettingTab(new MediaCompanionSettingTab(this.app, this));

		// TODO: Remove this and create as needed instead
		SidecarUtil.registerRequiredSidecarFiles();
	}

	async onunload() {}

	async registerViews() {
		this.registerView(VIEW_TYPE_GALLERY, (leaf) => new GalleryView(leaf));
	}

	async registerCommands() {
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				console.log("A");
			},
		});

		this.addCommand({
			id: 'test-command',
			name: 'Test Thing',
			callback: () => {
				MediaUtil.getFiles().then((f) => {
					const img = new Image();
					img.src = this.app.vault.getResourcePath(f[0]);
					img.decode().then((e) => {
						console.log([img.naturalHeight, img.naturalWidth]);
					});
					
				})},
		});

		this.addCommand({
			id: 'delete-sidecar-command',
			name: 'Delete Sidecars',
			callback: () => {
				console.log("Starting deletion...");
				SidecarUtil.sidecarFiles().then((files) => {
					for (const file of files) {
						this.app.vault.delete(file);
					}
				});
				console.log("Finished deleting sidecars");
			},
		});
	}

	async createGallery() {
		const { workspace } = this.app;

		let leaf = workspace.getLeaf(true);
		await leaf?.setViewState({type: VIEW_TYPE_GALLERY, active: true });
		workspace.revealLeaf(leaf);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class MediaCompanionSettingTab extends PluginSettingTab {
	plugin: MediaCompanion;

	constructor(app: App, plugin: MediaCompanion) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
