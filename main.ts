import { App, Plugin, PluginSettingTab, Setting, Workspace } from 'obsidian';
import { GalleryView, VIEW_TYPE_GALLERY } from 'src/views/gallery-view';
import { DEFAULT_SETTINGS } from 'src/settings'

import type { MediaCompanionSettings } from 'src/settings';
import Cache from 'src/cache';
import MutationHandler from 'src/mutationHandler';
import pluginStore from 'src/stores/pluginStore';
import appStore from 'src/stores/appStore';
import MediaFile from 'src/model/mediaFile';

export default class MediaCompanion extends Plugin {
	settings!: MediaCompanionSettings;
	cache!: Cache;
	mutationHandler!: MutationHandler;

	async onload() {
		pluginStore.plugin.set(this);
		appStore.app.set(this.app);

		await this.loadSettings();
		await this.registerViews();
		
		this.cache = new Cache(this.app, this);

		this.app.workspace.onLayoutReady(async () => {
			this.mutationHandler = new MutationHandler(this.app, this, this.cache);
			
			await this.cache.initialize();

			// @ts-ignore
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
