<script lang="ts">
    import { onDestroy, onMount } from "svelte";
	import type MediaFile from "src/model/mediaFile";
    import { normalizePath, TAbstractFile, TFile, type App } from "obsidian";
    import { get } from "svelte/store";
	import appStore from "src/stores/appStore";
    import activeStore from "src/stores/activeStore";
	import type { WidgetEditorView } from "obsidian-typings";
	import type MediaCompanion from "main";
	import pluginStore from "src/stores/pluginStore";

    // Things that need to be done:
    // - Frontmatter editing, if possible
    
    let file: MediaFile | null = null;
    let app: App = get(appStore.app);
    let plugin: MediaCompanion = get(pluginStore.plugin);

    const ILLEGAL_FILENAMES = ["CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
                "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9", ".", ".."]
    const ILLEGAL_FILENAME_CHARACTERS = ["\/", "<", ">", ":", "\"", "\\", "|", "?", "*"];
  
    let metadataContainer: HTMLDivElement;
    let editorContainer: HTMLDivElement;
    let titleTextarea: HTMLTextAreaElement;

    let editorView: WidgetEditorView | null = null;

    let editorObserver: MutationObserver;
    let title = "";

    let renameDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
    let fileEditDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

    let fileContent: string = "";

    // @ts-ignore
    plugin.mutationHandler.addEventListener("file-moved", onExternalRename);
    // @ts-ignore
    plugin.mutationHandler.addEventListener("sidecar-edited", onExternalEdit);

    function onExternalRename(e: {file: MediaFile, oldPath: string}) {
        if (e.oldPath === file?.file.path) {
            file = e.file;
            title = e.file.file.basename;
        }
    }

    function onExternalEdit(e: {detail: MediaFile}) {
        if (e.detail === file) {
            if (editorView) {
                app.vault.read(e.detail.sidecar.file).then((content) => {
                    if (editorView) {
                        if (content === editorView.data) return;
                        editorObserver.disconnect();
                        editorView.set(content, true);
                        fileContent = content;
                        editorObserver.observe(editorContainer, { childList: true, subtree: true, characterData: true });
                    }
                });
            }
        }
    }

    function saveFile() {
        if (file && editorView) {
            if (fileContent === editorView.data) return;
            fileContent = editorView.data;
            app.vault.modify(file.sidecar.file, editorView.data);
        }
    }

    function renameFile() {
        if (!file) return;


        let trimmed = title.trim();
        let parentPath = file.file.parent ? file.file.parent.path : "";
        let newFilePath = normalizePath(parentPath + "/" + trimmed + "." + file.file.extension);

        if (trimmed === file.file.basename) {
            return;
        } else if (ILLEGAL_FILENAMES.contains(trimmed) || trimmed.length === 0 || trimmed[trimmed.length - 1] === ".") {
            console.error("Illegal filename");
        } else if (app.vault.getAbstractFileByPath(newFilePath)) {
            console.error("File already exists");
        } else {
            // Rename for the sidecar is managed already
            app.vault.rename(file.file, newFilePath);
        }
    }

    function onTitleInput() {
        if (renameDebounceTimeout) {
            clearTimeout(renameDebounceTimeout);
        }
        renameDebounceTimeout = setTimeout(renameFile, 1000);
    }

    function onTitleKeyDown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            e.preventDefault();
            titleTextarea.blur();
        }
        if (ILLEGAL_FILENAME_CHARACTERS.contains(e.key)) {
            e.preventDefault();
        }
    }
   
    onMount(async () => {
        editorView = app.embedRegistry.embedByExtension.md(
            { app, containerEl: editorContainer }, 
            null! as TFile, "") as WidgetEditorView;

        activeStore.file.subscribe(async (newFile) => {
            if (!newFile || !editorView) return; // If undefined, don't do anything

            if (editorObserver) {
                editorObserver.disconnect();
            }

            file = newFile;
            editorView.set(await app.vault.read(newFile.sidecar.file), true);
            title = newFile.file.basename;

            editorObserver = new MutationObserver(() => {
                // Needs debouncing
                if (fileEditDebounceTimeout) {
                    clearTimeout(fileEditDebounceTimeout);
                }
                fileEditDebounceTimeout = setTimeout(saveFile, 1000);
            });
            editorObserver.observe(editorContainer, { childList: true, subtree: true, characterData: true });

        });

        titleTextarea.addEventListener("input", onTitleInput);
        titleTextarea.addEventListener("keydown", onTitleKeyDown);

        editorView.editable = true;
        if (file) {
            editorView.set(await app.vault.read(file.sidecar.file), true);
        }
        editorView.inlineTitleEl.style.display = "none";
        editorView.showEditor();
    });

    onDestroy(() => {
        if (renameDebounceTimeout) {
            clearTimeout(renameDebounceTimeout);
            renameFile();
        }
        if (fileEditDebounceTimeout) {
            clearTimeout(fileEditDebounceTimeout);
            saveFile();
        }

        if (editorObserver) {
            editorObserver.disconnect();
        }

            // @ts-ignore
            plugin.mutationHandler.removeEventListener("file-moved", onExternalRename);
            // @ts-ignore
            plugin.mutationHandler.removeEventListener("sidecar-edited", onExternalEdit);


        titleTextarea.removeEventListener("input", onTitleInput);
        titleTextarea.removeEventListener("keydown", onTitleKeyDown);
    });
</script>
  
<div class="media-companion-sidecar-container">
    {#if !file}
        <h3 class="media-companion-sidecar-nofile">No file selected</h3>
    {:else}
    {#if file.file}
        <img src={app.vault.getResourcePath(file.file)} alt="{file.file.name}" class="media-companion-sidecar-image" />
    {/if}
    {/if}
        <textarea class="media-companion-sidecar-title" bind:value={title} bind:this={titleTextarea} hidden="{!file}"></textarea>
        <div bind:this={metadataContainer} hidden="{!file}" class="media-companion-sidecar-metadata"></div> 
        <div bind:this={editorContainer} hidden="{!file}" class="media-companion-sidecar-editor"></div>
</div>
  
<style>
    :global(.media-companion-sidecar-title) {
        font-size: 1.5em;
        font-weight: bold;
        width: 100%;
        background-color: var(--background-primary);
        border: none;
        resize: none;
        field-sizing: content;
    }

    :global(.media-companion-sidecar-container) {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        height: 100%;
        overflow-y: scroll;
        overflow-x: hidden;
    }

    :global(.media-companion-sidecar-nofile) {
        text-align: center;
    }

    :global(.media-companion-sidecar-image) {
        object-fit: contain;
        height: 15em;
        padding: 1em;
    }

    :global(.media-companion-sidecar-editor) {
        flex: 1;
        overflow-y: auto;
        padding: 1em;
        background-color: var(--background-primary);
        border: none;
    }
</style>
  