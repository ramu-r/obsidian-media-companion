// The tags in the frontmatter that are reserved for other purposes
// such as image width and height
export const reservedImageTags: string[] = ["size", "shape", "colors"];

export const reservedFrontMatterTags: string[] = [...new Set([
    ...reservedImageTags,
])];

// The frontmatter tag used by obsidian to store tags
export const tagsTag: string = "tags";