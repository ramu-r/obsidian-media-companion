import { writable } from "svelte/store";
import type MediaFile from "src/model/mediaFile";

const file = writable<MediaFile>();
export default { file };