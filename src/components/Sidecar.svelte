<script lang="ts">
    import { onDestroy, onMount } from "svelte";
	import type MediaFile from "src/model/mediaFile";
    import { normalizePath, TFile, type App } from "obsidian";
    import { get } from "svelte/store";
	import appStore from "src/stores/appStore";
    import activeStore from "src/stores/activeStore";
	import type { WidgetEditorView } from "obsidian-typings";
	import type MediaCompanion from "main";
	import pluginStore from "src/stores/pluginStore";
	import MediaFileEmbed from "./MediaFileEmbed.svelte";
	import { debounce } from "obsidian";
    
    let file: MediaFile | null = null;
    let app: App = get(appStore.app);
    let plugin: MediaCompanion = get(pluginStore.plugin);

	// These file names and/or characters are not supported on various platforms, and should therefore
	// not be used by users when renaming the files.
	// While obsidian does not prevent users from using "^" and "#" while editing file names on desktop,
	// it does when file names are edited on mobile, as these characters aren't supported on mobile
	// We choose to completely disable them for the purposes of this plugin.
    const ILLEGAL_FILENAMES = ["CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
                "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9", ".", ".."]
    const ILLEGAL_FILENAME_CHARACTERS = ["\/", "<", ">", ":", "\"", "\\", "|", "?", "*", "[", "]", "^", "#"];
  
    let metadataContainer: HTMLDivElement;
    let editorContainer: HTMLDivElement;
    let titleTextarea: HTMLTextAreaElement;

    let editorView: WidgetEditorView | null = null;

    let editorObserver: MutationObserver;
    let title = "";
    let invalidName = false;

    let renameDebounce = debounce(() => {
		renameFile();
	}, 1000, true);
    let fileEditDebounce = debounce(() => {
		saveFile();
	});

    let fileContent: string = "";
    let fileContentLastEdited: number = 0;

    // @ts-ignore
    plugin.mutationHandler.addEventListener("file-moved", onExternalRename);
    // @ts-ignore
    plugin.mutationHandler.addEventListener("sidecar-edited", onExternalEdit);

	// Will set the file title and the current file being edited to the correct
	// information for the sake of seamless editing
    function onExternalRename(e: { detail: {file: MediaFile, oldPath: string}}) {
        if (e.detail.oldPath === file?.file.path) {
            file = e.detail.file;
            title = e.detail.file.file.basename;
        }
    }

	// Fills the file with the new information when the sidecar has been edited
    function onExternalEdit(e: {detail: MediaFile}) {
        if (e.detail === file) {
            if (editorView) {
                if (fileContentLastEdited + 500 > e.detail.sidecar.file.stat.mtime) return;
                app.vault.read(e.detail.sidecar.file).then((content) => {
                    if (editorView) {
                        if (content === editorView.data) return;
                        editorView.set(content, true);
                        fileContent = content;
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

	// Validates the currently given file name, and renames the file is the name is valid
    function renameFile() {
        if (!file) return;

        let trimmed = title.trim();
        let parentPath = file.file.parent ? file.file.parent.path : "";
        let newFilePath = normalizePath(parentPath + "/" + trimmed + "." + file.file.extension);

        if (trimmed === file.file.basename) {
            invalidName = false;
            return;
        } else if (ILLEGAL_FILENAMES.contains(trimmed) || trimmed.length === 0 || trimmed[trimmed.length - 1] === ".") {
            console.error("[Media Companion]: Illegal filename, file not renamed");
            invalidName = true;
        } else if (app.vault.getAbstractFileByPathInsensitive(newFilePath)) {
            console.error("[Media Companion]: File already exists, file not renamed");
            invalidName = true;
        } else {
            // Rename for the sidecar is managed already
            app.fileManager.renameFile(file.file, newFilePath);
            invalidName = false;
        }
    }

    function onTitleInput() {
        renameDebounce();
    }

    function onTitleKeyDown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            e.preventDefault();
            titleTextarea.blur();
        }
        if (ILLEGAL_FILENAME_CHARACTERS.contains(e.key)) {
			// TODO: add some pop-up with information
            e.preventDefault();
        }
    }
   
    onMount(async () => {
        editorView = app.embedRegistry.embedByExtension.md(
            { app, containerEl: editorContainer }, 
            null! as TFile, "") as WidgetEditorView;

        activeStore.file.subscribe(async (newFile) => {
            if (!newFile || !editorView) return; // If undefined, don't do anything

			// Make sure the rename and file edits are finished up
			// before we overwrite the file. This way the references are still
			// correct
			renameDebounce.run();
			renameDebounce.cancel();
			fileEditDebounce.run();
			fileEditDebounce.cancel();

            invalidName = false;

			// Disconnect and reconnect the observer because we're using
			// the obsidian embed registry to create the new elements for us
            if (editorObserver) {
                editorObserver.disconnect();
            }

            file = newFile;
            editorView.set(await app.vault.read(newFile.sidecar.file), true);
            title = newFile.file.basename;

            editorObserver = new MutationObserver(() => {
                fileContentLastEdited = Date.now();

                // Needs debouncing
                fileEditDebounce();
            });
            editorObserver.observe(editorContainer, { childList: true, subtree: true, characterData: true });

        });

        titleTextarea.addEventListener("input", onTitleInput);
        titleTextarea.addEventListener("keydown", onTitleKeyDown);

        editorView.editable = true;
        if (file) {
            editorView.set(await app.vault.read(file.sidecar.file), true);
        }
		// Stop displaying the title element; We use a custom one
        editorView.inlineTitleEl.style.display = "none";
        editorView.showEditor();
    });

    onDestroy(() => {
		// Make sure everything gets saved, and only then remove the debounces
		renameDebounce.run();
		renameDebounce.cancel();

        fileEditDebounce.run();
		fileEditDebounce.cancel();

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
  
<div class="MC-sidecar-container">
    {#if !file}
        <h3 class="MC-sidecar-nofile">No file selected</h3>
    {:else}
    {#if file.file}
		<div class="MC-embed-container">
    	    <MediaFileEmbed file={file.file} />
		</div>
    {/if}
    {/if}
        <textarea class="MC-sidecar-title" class:MC-sidecar-title-invalid={invalidName} bind:value={title} bind:this={titleTextarea} hidden="{!file}"></textarea>
    {#if invalidName}
        <p class="MC-sidecar-title-message">Invalid filename</p>
    {/if}
        <div bind:this={metadataContainer} hidden="{!file}" class="MC-sidecar-metadata"></div> 
        <div bind:this={editorContainer} hidden="{!file}" class="MC-sidecar-editor"></div>
</div>
  
<style>
    :global(.MC-sidecar-title) {
        font-size: 1.5em;
        font-weight: bold;
        width: 100%;
        background-color: var(--background-primary);
        border: none;
        resize: none;
        field-sizing: content;
    }

    :global(.MC-sidecar-title-invalid) {
        border: 1px solid red;
        color: red;
    }

    :global(.MC-sidecar-title-invalid:active) {
        border: 1px solid red;
        color: red;
    }

    :global(.MC-sidecar-title-message) {
        color: red;
        text-align: center;
        padding: 0;
        margin: 0;
    }

    :global(.MC-sidecar-container) {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        height: 100%;
        overflow-y: scroll;
        overflow-x: hidden;
    }

    :global(.MC-sidecar-nofile) {
        text-align: center;
    }

    :global(.MC-embed-container) {
        max-height: 15em;
        margin: 1em;
    }

    :global(.MC-sidecar-editor) {
        flex: 1;
        overflow-y: auto;
        padding: 1em;
        background-color: var(--background-primary);
        border: none;
    }
</style>
  