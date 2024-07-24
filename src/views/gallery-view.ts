import { ItemView, WorkspaceLeaf } from "obsidian";

import Gallery from "./../components/Gallery.svelte";
import { MediaUtil } from "src/util/media";

export const VIEW_TYPE_GALLERY = "gallery-view";

export class GalleryView extends ItemView {
  component!: Gallery;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE_GALLERY;
  }

  getDisplayText() {
    return "Gallery view";
  }

  async onOpen() {
    this.component = new Gallery({
      target: this.contentEl,
      props: {}
    });
  }

  async onClose() {
    this.component.$destroy();
  }
}