<script lang="ts">
	import { onDestroy, onMount, tick } from "svelte";
    import type MediaCompanion from "main";
	import pluginStore from "src/stores/pluginStore";
	import Query from "src/query";
	import { get } from "svelte/store";
	import type { App } from "obsidian";
	import appStore from "src/stores/appStore";
    import Masonry from "masonry-layout";
	import type MediaFile from "src/model/mediaFile";
    import imagesLoaded from "imagesloaded";

    let plugin: MediaCompanion = get(pluginStore.plugin);
    let app: App = get(appStore.app);
    let query: Query = new Query(plugin.cache);

    let masonry: Masonry;
    let masonryContainer: HTMLDivElement;
    let parentElement: HTMLElement;
    let items: MediaFile[] = [];
    let allItems: MediaFile[] = [];

    let isLoading: boolean = false;
    let currentGroup: number = 0;
    const groupSize: number = 20;
    
    let resizeTimeout: NodeJS.Timeout | null = null;
    const resizeObserver = new ResizeObserver(() => { 
        if (parentElement && masonryContainer) {
            // @ts-ignore
            masonryContainer.style.width = `${parentElement.offsetWidth}px`;

            if (resizeTimeout) clearTimeout(resizeTimeout);

            resizeTimeout = setTimeout(() => {
                // Need to do it twice here to adjust the image sizes and then
                // adjust the masonry layout to fit the new image sizes
                reloadMasonry();
                reloadMasonry();
            }, 50);
        }
    });

    async function loadNextGroup() {
        isLoading = true;

        const startIndex = currentGroup * groupSize;
        const endIndex = startIndex + groupSize;

        if (startIndex >= allItems.length) return; // Don't bother with isLoading, we're done

        const nextGroup = allItems.slice(startIndex, endIndex);
        items = [...items, ...nextGroup];

        await tick();

        reloadMasonry();

        currentGroup++;

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
        if (!masonryContainer?.parentElement) return;

        const parent = masonryContainer.parentElement;
        const nearBottom = parent.scrollTop + parent.clientHeight >= parent.scrollHeight - 100;

        if (nearBottom && !isLoading) loadNextGroup();
    }

    function isScrollbarVisible() {
        const parent = masonryContainer.parentElement;
        return parent ? parent.scrollHeight > parent.clientHeight : false;
    }

    onMount(async () => {
        allItems = await query.getItems();

        masonry = new Masonry(masonryContainer, {
            transitionDuration: 0, // Turn off animations; Looks weird when adding items
            itemSelector: ".gallery-item",
            // columnWidth: ".gallery-sizer",
            fitWidth: true,
        });

        await loadNextGroup();

        parentElement = masonryContainer.parentElement as HTMLElement;
        resizeObserver.observe(parentElement);

        //@ts-ignore
        parentElement.style.overflowX = "hidden";

        parentElement.addEventListener("scroll", onScroll);
    });

    onDestroy(() => {
        masonryContainer.parentElement?.removeEventListener("scroll", onScroll);
    });
</script>

<div class="gallery-masonry" bind:this={masonryContainer}>
    {#each items as item}
        <div class="gallery-item">
            <img src={app.vault.getResourcePath(item.file)} alt={item.file.name} loading="lazy" />
        </div>
    {/each}
</div>

<style>
  :global(.gallery-masonry) {
    display: block;
    min-width: 100%;
  }

  :global(.gallery-item) {
    padding: 5px;
    width: 20%;
    box-sizing: border-box;
  }

  :global(.gallery-item img) {
    width: 100%;
    height: auto;
    display: block;
  }
</style>