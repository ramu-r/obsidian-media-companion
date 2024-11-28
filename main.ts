import { App, MarkdownEditView, MarkdownRenderer, normalizePath, Plugin, PluginSettingTab, Setting, View, Workspace } from 'obsidian';
import { GalleryView, VIEW_TYPE_GALLERY } from 'src/views/gallery-view';
import { DEFAULT_SETTINGS } from 'src/settings'

import type { MediaCompanionSettings } from 'src/settings';
import Cache from 'src/cache';
import MutationHandler from 'src/mutationHandler';
import pluginStore from 'src/stores/pluginStore';
import appStore from 'src/stores/appStore';
import MediaFile from 'src/model/mediaFile';
import { SidecarView, VIEW_TYPE_SIDECAR } from 'src/views/sidecar-view';
import activeStore from 'src/stores/activeStore';

export default class MediaCompanion extends Plugin {
	settings!: MediaCompanionSettings;
	cache!: Cache;
	mutationHandler!: MutationHandler;

	async onload() {
		pluginStore.plugin.set(this);
		appStore.app.set(this.app);

		await this.loadSettings();
		
		this.cache = new Cache(this.app, this);
		this.mutationHandler = new MutationHandler(this.app, this, this.cache);

		// We want to register our views here but only start rendering them once the cache is initialized
		await this.registerViews();

		this.app.workspace.onLayoutReady(async () => {
			await this.cache.initialize();

			this.mutationHandler.initializeEvents();

			// @ts-ignore - Need to set this manually, unsure if there's a better way
			this.app.metadataTypeManager.properties[MediaFile.last_updated_tag.toLowerCase()].type = "datetime";
		});

		this.addRibbonIcon('image', 'Open Gallery', (_: MouseEvent) => {
			this.createGallery();
		});

		await this.registerCommands();

		this.addSettingTab(new MediaCompanionSettingTab(this.app, this));
	}

	async onunload() {}

	async registerViews() {
		this.registerView(VIEW_TYPE_GALLERY, (leaf) => new GalleryView(leaf, this));
		this.registerView(VIEW_TYPE_SIDECAR, (leaf) => new SidecarView(leaf));
	}

	async createGallery() {
		const { workspace } = this.app;

		let leaf = workspace.getLeaf(true);
		await leaf?.setViewState({type: VIEW_TYPE_GALLERY, active: true });
		workspace.revealLeaf(leaf);
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
			id: 'test-sidecar',
			name: 'Test Sidecar',
			callback: () => {
				activeStore.file.set(this.cache.files[0]);

				const leaf = this.app.workspace.getRightLeaf(false);
				if (leaf) {
					leaf.setViewState({type: VIEW_TYPE_SIDECAR}).then(() => {});
					this.app.workspace.revealLeaf(leaf); 
				}
			}
		})
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
			.setName('Hide sidecar files')
			.setDesc('Hide sidecar files in the file explorer')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.hideSidecar)
				.onChange(async (value) => {
					this.plugin.settings.hideSidecar = value;
					await this.plugin.saveSettings();
				}));
	}
}
