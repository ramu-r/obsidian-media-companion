import { writable } from "svelte/store";
import type MediaCompanion from "main";

const plugin = writable<MediaCompanion>();
export default { plugin };
