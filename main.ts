import { App, MarkdownEditView, MarkdownRenderer, normalizePath, Plugin, PluginSettingTab, Setting, View, Workspace, WorkspaceLeaf } from 'obsidian';
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

			await this.registerEvents();

			// @ts-ignore - Need to set this manually, unsure if there's a better way
			this.app.metadataTypeManager.properties[MediaFile.last_updated_tag.toLowerCase()].type = "datetime";
		});

		this.addRibbonIcon('image', 'Open Gallery', (_: MouseEvent) => {
			this.createGallery();
		});

		await this.registerCommands();

		this.addSettingTab(new MediaCompanionSettingTab(this.app, this));
	}

	async registerEvents() {
		this.mutationHandler.initializeEvents();

		this.registerEvent(this.app.workspace.on("layout-change", async () => {
			const explorers = this.app.workspace.getLeavesOfType("file-explorer");
			for (let explorer of explorers) {
				await this.cache.hideAll(explorer);
			}
		}));

		this.registerEvent(this.app.workspace.on("file-open", async (file) => {
			if (file) {
				if (this.settings.extensions.contains(file.extension.toLowerCase())) {
					let mediaFile = await this.cache.getFile(file.path);
					if (mediaFile) {
						activeStore.file.set(mediaFile);
					}
				}
			}
		}));

		activeStore.file.subscribe(async (file) => {
			if (file) {
				await this.createSidecar();				
			}
		});
	}

	async onunload() {}

	async registerViews() {
		this.registerView(VIEW_TYPE_GALLERY, (leaf) => new GalleryView(leaf, this));
		this.registerView(VIEW_TYPE_SIDECAR, (leaf) => new SidecarView(leaf));
	}

	async createSidecar(focus: boolean = true) {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_SIDECAR);
		let leaf: WorkspaceLeaf | null = null;

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = this.app.workspace.getRightLeaf(false);
			await leaf?.setViewState({type: VIEW_TYPE_SIDECAR, active: true });
		}

		if (leaf && focus) {
			this.app.workspace.revealLeaf(leaf);
		}
	}

	async createGallery() {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_GALLERY);
		let leaf: WorkspaceLeaf | null = null;

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = this.app.workspace.getLeaf(true);
			await leaf?.setViewState({type: VIEW_TYPE_GALLERY, active: true });
		}
		
		this.app.workspace.revealLeaf(leaf);
	}

	async registerCommands() { }

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
			.setDesc('Hide sidecar files in the file explorer (Recommended)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.hideSidecar)
				.onChange(async (value) => {
					this.plugin.settings.hideSidecar = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Extensions')
			.setDesc('Extensions to be considered as media files, separated by commas')
			.addText(text => text
				.setPlaceholder('jpg, png, gif')
				.setValue(this.plugin.settings.extensions.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.extensions = value.split(',')
						.map((ext) => ext.trim())
						.map((ext) => ext.replace('.', ''))
						.filter((ext) => ext.length > 0)
						.map((ext) => ext.toLowerCase())
						.filter((ext) => ext !== 'md');
					await this.plugin.saveSettings();
				}));
	}
}
