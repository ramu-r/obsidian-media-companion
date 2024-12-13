import { writable } from "svelte/store";
import type { App } from "obsidian";

const app = writable<App>();
export default { app };
