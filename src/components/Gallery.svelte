<script>
    import { MasonryInfiniteGrid } from "@egjs/svelte-infinitegrid";
	import { MediaUtil } from "src/util/media";
	import { onMount, tick } from "svelte";

    const shapes = Object.freeze({
        horizontal: 0,
        vertical: 1,
        square: 2,
    });

    const orderByOptions = Object.freeze({
        name: 0,
        size: 1,
        folder: 2,
        tags: 3,
        created: 4,
        modified: 5,
        dimensions: 6,
        random: 7,
        customFrontmatter: 8,
    });
    
    let settings = {
        columns: 3, // integer
        color: null, // null | HexString
        folders: [], // string[], if length == 0, all folders (formatted 'path/to/folder')
        tags: [], // string[], if length == 0, all tags (formatted '#abc')
        fileTypes: [], // string[], if length == 0, all file types (formatted 'png')
        shape: [], // shapes[], if length == 0, all shapes
        dimensions: {
            mindWidth: 0,
            maxWidth: Infinity,
            minHeight: 0, // 0 if empty
            maxHeight: Infinity, // Should be set to infinity if empty
        },
        orderBy: {
            option: orderByOptions.random,
            value: "" // value for custom frontmatter
        },
        orderIncreasing: true,
        hasFrontMatter: [], // list of frontMatter tags that should exist
        // Potentially add an option to check for certain values as well
        // Shouldn't be too hard to do, but let's get the above working first tbh
    }

    function getItems(nextGroupKey, count) {
        const nextItems = [];
        for (let i = 0; i < count; ++i) {
            const nextKey = nextGroupKey * count + i;
            nextItems.push({ groupKey: nextGroupKey, key: nextKey });
        }
        return nextItems;
    }

    function updateItems(e) {
        const nextGroupKey = (+e.groupKey || 0) + 1;

        items = [...items, ...getItems(nextGroupKey, 10)];
    }

    let files = MediaUtil.getFiles(); // Make this cached; We don't want to have to deal with async
    let items = [...getItems(0, 10)];

    let galleryContainer;
    let ig;

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
                    ig.updateItems();
                }
            });
        });
    });

</script>
  
<div class="gallery-container" bind:this="{galleryContainer}">
    {#await files}
        <span>waiting...</span>
    {:then fs}
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
            on:requestAppend={({ detail: e }) => updateItems(e)}
            let:visibleItems
        >
        {#each visibleItems as item (item.key)}
        <!-- TODO: Make sure this class doesn't change, add class to image, centre image if
        not full width -->
            <div class="item" style="width: calc(calc(99.8% / {settings.columns}) - 4px);">
                <img src="{fs[item.key].vault.getResourcePath(fs[item.key].path)}" alt="{fs[item.key].name}"/>
            </div>
        {/each}
        </MasonryInfiniteGrid>
    {:catch e}
        <p style="color: red">{e.message}</p>
    {/await} 
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