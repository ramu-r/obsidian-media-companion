import { ItemView, WorkspaceLeaf } from "obsidian";
import Sidecar from "./../components/Sidecar.svelte";
import type MediaFile from "src/model/mediaFile";

export const VIEW_TYPE_SIDECAR = "media-companion-sidecar-view";

export class SidecarView extends ItemView {
  component!: Sidecar;
  file!: MediaFile;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE_SIDECAR;
  }

  getDisplayText() {
    return "Sidecar";
  }

  async onOpen() {
    this.component = new Sidecar({
      target: this.contentEl,
      props: { },
    });
  }

  async onClose() {
    if (this.component) {
      this.component.$destroy();
    }
  }
}
