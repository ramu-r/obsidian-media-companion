<script lang="ts">
	import Popup from "./Popup.svelte";

	export let icon = "calendar";
	export let text = "Date";
	export let updated: () => void = () => {};

	export let smtime: string | null = null;
	export let emtime: string | null = null;
	export let sctime: string | null = null;
	export let ectime: string | null = null;

	$: active = (smtime && emtime) != null || (sctime && ectime) != null;

	function reset() {
		smtime = null;
		emtime = null;
		sctime = null;
		ectime = null;

		updated();
	}
</script>

<Popup {icon} {text} {active} {reset}>
	<div class="MC-date-inputs">
		<div class="MC-date-row">
			<div class="MC-input-group">
				<label for="smtime">Modified: From</label>
				<input 
					id="smtime" 
					type="date" 
					bind:value={smtime} 
					on:keyup={updated}
					on:change={updated}
				/>
			</div>
			<div class="MC-input-group">
				<label for="emtime">To</label>
				<input 
					id="emtime" 
					type="date" 
					bind:value={emtime} 
					on:keyup={updated}
					on:change={updated}
				/>
			</div>
		</div>
		<div class="MC-dimension-row">
			<div class="MC-input-group">
				<label for="sctime">Creation: From</label>
				<input 
					id="sctimes" 
					type="date"
					bind:value={sctime} 
					on:keyup={updated}
					on:change={updated}
				/>
			</div>
			<div class="MC-input-group">
				<label for="ectime">To</label>
				<input 
					id="ectime" 
					type="date" 
					bind:value={ectime} 
					on:keyup={updated}
					on:change={updated}
				/>
			</div>
		</div>
	</div>
</Popup>

<style>
	:global(.MC-date-inputs) {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 8px;
		padding: 8px;
	}

	:global(.MC-date-row) {
		display: flex;
		gap: 8px;
		width: 100%;
	}
</style>
