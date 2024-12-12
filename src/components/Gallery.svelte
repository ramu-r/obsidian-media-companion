<script lang="ts">
	import { onDestroy, onMount, tick } from "svelte";
    import type MediaCompanion from "main";
	import pluginStore from "src/stores/pluginStore";
	import Query, { OrderByOptions } from "src/query";
	import { get } from "svelte/store";
	import { type App } from "obsidian";
	import appStore from "src/stores/appStore";
    import Masonry from "masonry-layout";
	import type MediaFile from "src/model/mediaFile";
    import imagesLoaded from "imagesloaded";
	import activeStore from "src/stores/activeStore";
	import type { Shape } from "src/model/types/shape";
	import SuggestInput from "./SuggestInput.svelte";
	import MediaFileEmbed from "./MediaFileEmbed.svelte"

    let plugin: MediaCompanion = get(pluginStore.plugin);
    let app: App = get(appStore.app);

    plugin.mutationHandler.addEventListener("file-created", (file) => {})

    type DisplayItem = {
        uri: string;
        file: MediaFile;
    }

    let elementSize: number = 200;

    let searchDebounce: ReturnType<typeof setTimeout> | null = null;
    let searchColor: string = "";
    let searchFolders: string[] = [];
    let searchTags: string[] = [];
    let searchFileTypes: string[] = [];
    let searchShapes: Shape[] = [];
    let orderBy: OrderByOptions = OrderByOptions.name;
    let orderIncreasing: boolean = true;

	let isCollapsed: boolean = false;

    let masonry: Masonry;
    let masonryContainer: HTMLDivElement;
    let scrollContainer: HTMLElement;
    let items: DisplayItem[] = [];
    let allItems: MediaFile[] = [];
    let query: Query = new Query(plugin.cache);

    let isLoading: boolean = false;
    let currentGroup: number = 0;
    const groupSize: number = 20;
    
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const resizeObserver = new ResizeObserver(() => onResize());

    // @ts-ignore
    plugin.mutationHandler.addEventListener("file-created", onNewFile);
    // @ts-ignore
    plugin.mutationHandler.addEventListener("file-removed", onFileRemoved);
    // @ts-ignore
    plugin.mutationHandler.addEventListener("file-changed", onFileChanged);
    // @ts-ignore
    plugin.mutationHandler.addEventListener("file-moved", onFileMoved);
    // @ts-ignore
    plugin.mutationHandler.addEventListener("sidecar-edited", onFileChanged);

	function toggleCollapse() {
		isCollapsed = !isCollapsed;
	}

    function getDisplayItem(file: MediaFile): DisplayItem {
        return {
            uri: app.vault.getResourcePath(file.file),
            file: file,
        };
    }

    function onFileMoved(e: { detail: {file: MediaFile, oldPath: string} }) {
        let allFilesIndex = allItems.findIndex((item) => item.file.path === e.detail.oldPath);
        let itemsIndex = items.findIndex((item) => item.file.file.path === e.detail.oldPath);

        query.testFile(e.detail.file).then((res) => {
            if (res) {
                if (allFilesIndex === -1) {
                    allItems = [e.detail.file, ...allItems];
                } else {
                    allItems[allFilesIndex] = e.detail.file;
                }
                if (itemsIndex === -1) {
                    items = [getDisplayItem(e.detail.file), ...items];
                } else {
                    items[itemsIndex] = getDisplayItem(e.detail.file);
                }
            }
            else {
                if (allFilesIndex !== -1) {
                    allItems = allItems.splice(allFilesIndex, 1);
                }
                if (itemsIndex !== -1) {
                    items = items.splice(itemsIndex, 1);
                }
            }

            items = [...items];
            reloadMasonry();
        })
    }

    function onNewFile(e: { detail: MediaFile }) {
        // Check if the mediaFile is already in allItems or 

        if (query) {
            query.testFile(e.detail).then((res) => {
                if (res) {
                    allItems = [e.detail, ...allItems];
                    items = [getDisplayItem(e.detail), ...items];
                    reloadMasonry();
                }
            });
        }
    }

    function onFileRemoved(e: { detail: MediaFile }) {
        allItems = allItems.filter((item) => item !== e.detail);
        items = items.filter((item) => item.file !== e.detail);
        items = [...items];
        reloadMasonry();
    }

    function onFileChanged(e: { detail: MediaFile }) {
        let allFilesIndex = allItems.findIndex((item) => item === e.detail);
        let itemsIndex = items.findIndex((item) => item.file === e.detail);

        query.testFile(e.detail).then((res) => {
            if (res) {
                if (allFilesIndex === -1) {
                    allItems = [e.detail, ...allItems];
                }
                if (itemsIndex === -1) {
                    items = [getDisplayItem(e.detail), ...items];
                }
            }
            else {
                if (allFilesIndex !== -1) {
                    allItems = allItems.splice(allFilesIndex, 1);
                }
                if (itemsIndex !== -1) {
                    items = items.splice(itemsIndex, 1);
                }
            }

            items = [...items];
            reloadMasonry();
        });
    }

    function onResize() { 
        if (scrollContainer && masonryContainer) {

            if (resizeTimeout) clearTimeout(resizeTimeout);

            resizeTimeout = setTimeout(() => {
                // Need to do it twice here to adjust the image sizes and then
                // adjust the masonry layout to fit the new image sizes
                reloadMasonry();
                reloadMasonry();

				if (!isScrollbarVisible()) {
					loadNextGroup().then(() => {});
				}
            }, 50);
        }
    }

    async function loadNextGroup() {
        isLoading = true;

        const startIndex = currentGroup * groupSize;
        const endIndex = startIndex + groupSize;

        if (startIndex >= allItems.length) return; // Don't bother with isLoading, we're done

        const nextGroup = allItems.slice(startIndex, endIndex);

        // Turn nextGroup into a object with { uri, file }
        // This is needed for the masonry layout
        let formattedGroup = nextGroup.map((item) => {
            return getDisplayItem(item);
        });

        items = [...items, ...formattedGroup];

        await tick();

        reloadMasonry();

        currentGroup++;

        // Small timeout to prevent loading everything instantly
        // Also needed for `isScrollbarVisible` to work correctly
        await new Promise((resolve) => setTimeout(resolve, 50));

        if (!isScrollbarVisible()) {
            await loadNextGroup();
        }
        else {
            isLoading = false;
        }
    }

    function reloadMasonry() {
        if (masonry && masonryContainer) {
            imagesLoaded(masonryContainer, () => {
                // @ts-ignore
                masonry.reloadItems();
                // @ts-ignore
                masonry.layout();
            });
        }
    }
 
    function onScroll() {
        if (!scrollContainer) return;

        const nearBottom = scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 100;

        if (nearBottom && !isLoading) loadNextGroup();
    }

    function isScrollbarVisible() {
        return scrollContainer.scrollHeight > scrollContainer.clientHeight && scrollContainer.clientHeight != 0;
    }

    onMount(async () => {
        await plugin.cache.initialize();
        allItems = await query.getItems();

        masonry = new Masonry(masonryContainer, {
            transitionDuration: 0, // Turn off animations; Looks weird when adding items
			columnWidth: ".gallery-sizer",
            itemSelector: ".gallery-item",
            fitWidth: true,
        });

        await loadNextGroup();

        resizeObserver.observe(scrollContainer);

        scrollContainer.addEventListener("scroll", onScroll);
    });

    onDestroy(() => {
        scrollContainer.removeEventListener("scroll", onScroll);
        if (resizeObserver) {
            resizeObserver.disconnect();
        }

        // @ts-ignore
        plugin.mutationHandler.removeEventListener("file-created", onNewFile);
        // @ts-ignore
        plugin.mutationHandler.removeEventListener("file-removed", onFileRemoved);
        // @ts-ignore
        plugin.mutationHandler.removeEventListener("file-changed", onFileChanged);
        // @ts-ignore
        plugin.mutationHandler.removeEventListener("file-moved", onFileChanged);
        // @ts-ignore
        plugin.mutationHandler.removeEventListener("sidecar-edited", onFileChanged);
    });

    function onFileClicked(file: MediaFile) {
        activeStore.file.set(file);
    }

    function onSearchChange() {
        // Debounce search
        if (searchDebounce) clearTimeout(searchDebounce);

        searchDebounce = setTimeout(async () => {
            items = [];
            currentGroup = 0;
            query = new Query(plugin.cache, {
                color: searchColor,
                folders: searchFolders,
                name: "",
                tags: searchTags.map(tag => tag.startsWith('#') ? tag.slice(1) : tag),
                fileTypes: searchFileTypes,
                shape: searchShapes,
                dimensions: null, 
                orderBy: {
                    option: orderBy,
                    value: ""
                },
                orderIncreasing: orderIncreasing,
                hasFrontMatter: []
            });
            allItems = await query.getItems();
            await loadNextGroup();
			reloadMasonry();
        }, 300);
    }
</script>

<div class="media-companion-gallery-view-container">
{#await plugin.cache.initialize()}
    <h1 class="media-companion-gallery-loading">Loading cache...</h1>
{:then}
<div class="media-companion-gallery-search collapsible" class:collapsed={isCollapsed}>
	<div class="media-companion-gallery-properties">
		<div class="left-section">
			<input type="color" name="Color" bind:value={searchColor} on:input={onSearchChange}>
			<button on:click={()=>{searchColor = ""; onSearchChange()}} class="media-companion-clear-btn">&times;</button>
		</div>
        <div class="center-section">
            - <input type="range" bind:value={elementSize} min="100" max="500" on:input={() => reloadMasonry()}> +
        </div>
		<div class="right-section">
			<label for="orderBy" class="sort-label">Sort by:</label>
			<select bind:value={orderBy} on:change={onSearchChange}>
				{#each Object.values(OrderByOptions) as option}
					<option value={option}>{option.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, str => str.toUpperCase())}</option>
				{/each}
			</select>
			<button class="sort-toggle" on:click={() => { onSearchChange(); orderIncreasing = !orderIncreasing; }}>
				<i class={orderIncreasing ? 'up' : 'down'}></i>
			</button>
		</div>
	</div>	
	<SuggestInput 
		selected={searchFolders}
		autoComplete={app.vault.getAllFolders().map(folder => folder.path)} 
		labelText={"Folders"} 
		onChange={onSearchChange}
		/>
	<SuggestInput
		selected={searchTags}
		autoComplete={Object.keys(app.metadataCache.getTags())}
		labelText={"Tags"}
		onChange={onSearchChange}
		/>
	<SuggestInput
		selected={searchFileTypes}
		autoComplete={plugin.settings.extensions}
		labelText={"File types"}
		onChange={onSearchChange}
		/>
</div>
<hr class="media-companion-gallery-search-hr">
<button on:click={toggleCollapse} class="media-companion-collapse-button">
	{isCollapsed ? "⮟" : "⮝"}
</button>
<div class="gallery-container" bind:this={scrollContainer}>
    <div class="gallery-masonry" bind:this={masonryContainer}>
		<div class="gallery-sizer" style="width: {elementSize}px;"></div>
        {#each items as item}
            <button class="gallery-item" style="width: {elementSize}px;" on:click={() => onFileClicked(item.file)}>
				<MediaFileEmbed file={item.file.file} />
            </button>
        {/each}
    </div>
</div>
{/await}
</div>

<style>
	:global(.media-companion-collapse-button) {
		display: inline-block;
		position: relative;
		width: auto;
		margin-left: auto;
		margin-right: 0;
		z-index: calc(var(--layer-notice) - 1);
	}

	:global(.media-companion-gallery-properties) {
    	display: flex;
    	justify-content: space-between;
    	align-items: center;
    	width: 100%;
		padding: 5px;
	}

	:global(.left-section) {
	    display: flex;
	    align-items: center;
	}

	:global(.left-section input[type="color"]) {
	    margin-right: 8px;
	    vertical-align: middle;
	}

    :global(.center-section) {
        display: flex;
        align-items: center;
    }

	:global(.media-companion-gallery-properties .media-companion-clear-btn) {
	    background: none;
	    border: none;
	    font-size: 16px;
	    padding: 0;
	    cursor: pointer;
		box-shadow: none;
	}

	:global(.right-section) {
	    display: flex;
	    align-items: center;
	}

	:global(.right-section label) {
	    margin-right: 10px;
	}

	:global(.right-section select) {
	    margin-right: 10px;
	}

	:global(.sort-toggle) {
	    cursor: pointer;
	}

	:global(.sort-toggle i) {
	    font-size: 16px;
	}

	.sort-toggle .up::before {
	    content: "↑"; /* Up arrow */
	}

	.sort-toggle .down::before {
	    content: "↓"; /* Down arrow */
	}

	:global(.collapsible) {
		transition: all 1s ease
	}

	:global(.collapsed) {
		height: 1px;
		overflow: hidden; 
	}

    :global(.media-companion-gallery-view-container) {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    :global(.gallery-masonry) {
        display: block;
        width: 100%;
    }

    :global(.media-companion-gallery-search-hr) {
        margin: 4px;
    }

    :global(.media-companion-gallery-loading) {
        text-align: center;
    }

    :global(.gallery-container) {
		top: -1em;
		position: relative;
        display: flex;
		width: 100%;
        justify-content: center;
        overflow: scroll;
        flex-grow: 1;
		padding: 0 !important;
    }

    :global(button.gallery-item) {
        all: unset;
        padding: 0px;
        /* width: 20%; */
        box-sizing: border-box;
    }

	:global(.gallery-item div) {
		border: 2px solid #00000000;
	}

    :global(.gallery-item:focus div) {
		border: 2px solid var(--interactive-accent);
		border-radius: 2px;
    }
</style>
