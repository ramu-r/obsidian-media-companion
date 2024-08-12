<script lang="ts">
    import { MasonryInfiniteGrid } from "@egjs/svelte-infinitegrid";
	import { onMount, tick } from "svelte";
    import type MediaCompanion from "main";
    import type { QueryItem } from "src/query";
	import pluginStore from "src/stores/pluginStore";
	import Query from "src/query";
	import { get } from "svelte/store";
	import type { App } from "obsidian";
	import appStore from "src/stores/appStore";

    let plugin: MediaCompanion = get(pluginStore.plugin);
    let app: App = get(appStore.app);
    let query: Query = new Query(plugin.cache, app);

    const groupSize = 10;

    function updateItems(e: QueryItem) {
        const nextIndex = ((+e.groupKey || 0) + 1) * groupSize;

        items = [...items, ...query.getItems(nextIndex, nextIndex + groupSize)];
    }

    let items = [...query.getItems(0, 10)];

    let galleryContainer: any;
    let ig: MasonryInfiniteGrid;

    // Needed to be moved up here, otherwise it breaks
    const onRequestAppend = ({ detail: e }: any) => { updateItems(e); };

    onMount(() => {
        tick().then(() => {
            // We need this because sometimes the thing doesn't realize it's at the bottom of
            // the page... So we're checking ourselves, and then rendering the items if we are
            // which also requests new items if they're needed
            galleryContainer.addEventListener("scroll", () => {
                if (Math.abs(galleryContainer.scrollHeight - galleryContainer.scrollTop - galleryContainer.clientHeight) < 1) {
                    // For some reason, whether this works or not is inconsistent...
                    // But it works well enough for now. And as far as I can observe, it does actually
                    // add the items eventually, if it can. There's a danger of it skipping items though
                    updateItems(items[items.length-1]);
                }
                ig.renderItems();
            });
        });
    });

</script>
  
<div class="gallery-container" bind:this="{galleryContainer}">
    <MasonryInfiniteGrid
        bind:this={ig}
        class="gallery"    
        scrollContainer={galleryContainer}
        usePlaceholder={true}
        useResizeObserver={true}
        resizeDebounce={10}
        percentage={true}
        columns={3}
        gap={0}
        {items}
        on:requestAppend={onRequestAppend}
        let:visibleItems
    >
    {#each visibleItems as item (item.key)}
    <!-- TODO: Make sure this class doesn't change, add class to image, centre image if
    not full width -->
        <div class="item" style="width: calc(calc(99.8% / {3}) - 4px);">
            <img src="{item.data.resourcePath}" alt="{item.data.name}"/>
        </div>
    {/each}
    </MasonryInfiniteGrid>
</div>
  
<style>
    .gallery-container {
        /* We need to set the height here so the masonry works
            Just setting the max-height does not work */
        height: 100%;
        width: 100%;
        overflow-y: scroll;
        overflow-x: hidden;
    }
</style>