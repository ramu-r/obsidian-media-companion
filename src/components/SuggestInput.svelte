<!-- 
Modified version of: https://github.com/agustinl/MC-input 
Available under MIT:
MIT License Copyright (c) 2024 Agustín Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Modified to:
- Match obsidian UI to some extent
- Remove unneeded features
-->
<script lang="ts">
	let tag: string = "";
	let arrelementsmatch: { label: string, search: string }[] = [];
	let autoCompleteIndex = -1;
	
	let regExpEscape = (s: string) => {
	  return s.replace(/[-\\^$*+?.()|[\]{}]/g, "\\$&")
	}

	let inputElement: HTMLInputElement;
	
	export let selected: string[] = [];
	export let maxTags: number | undefined = undefined;
	export let placeholder: string = "";
	export let autoComplete: string[] | boolean = false;
	export let autoCompleteFilter: boolean = true;
	export let name: string = "MC-input";
	export let id: string = uniqueID();
	export let minChars: number = 1;
	export let labelText: string = name;
	export let labelShow: boolean = labelText ? true : false;
	export let onlyAutocomplete: boolean = true;
	export let onChange: () => void = function(){};

	let layoutElement: HTMLElement;
	
	$: selected = selected;
	$: addKeys = [13];
	$: maxTags = maxTags;
	$: removeKeys = [8];
	$: placeholder = placeholder;
	$: autoComplete = autoComplete;
	$: autoCompleteFilter = true;
	$: name = name;
	$: id = id;
	$: minChars = minChars;
	$: onlyAutocomplete = onlyAutocomplete;
	$: labelText = labelText;
	$: labelShow = labelShow;
	$: cleanOnBlur = false;
	
	$: matchsID = id + "_matchs";
	
	let storePlaceholder = placeholder;
	
	function setTag(e: KeyboardEvent) {
		const matches = document.getElementById(matchsID);
		// Get the focused tag from the autocomplete list, if there is one
		const focusedElement = matches?.querySelector('li.focus')?.textContent;
	
		// Set the current tag to the focused tag if there is one, otherwise use the input value
		// @ts-ignore
		const currentTag = focusedElement ?? e.target?.value;
	
		if (addKeys) {
			addKeys.forEach(function(key) {
				if (key === e.keyCode) {
	
					if (currentTag) e.preventDefault();
	
					if (autoComplete && onlyAutocomplete && document.getElementById(matchsID)) {
						addTag(arrelementsmatch?.[autoCompleteIndex]?.label);
					} else {
						addTag(currentTag);
					}
				}
			});
		}
	
		if (removeKeys) {
			removeKeys.forEach(function(key) {
				if (key === e.keyCode && tag === "") {
					let removed = selected.pop();
					selected = selected;

					if (removed) {
						onChange();
					}
	
					arrelementsmatch = [];

					inputElement.readOnly = false;
					placeholder = storePlaceholder;
					inputElement.focus();
				}
			});
		}
	
		// ArrowDown : focus on first element of the autocomplete
		if (e.keyCode === 40 && autoComplete && document.getElementById(matchsID)) {
			// Last element on the list ? Go to the first
			if (autoCompleteIndex + 1 === arrelementsmatch.length) autoCompleteIndex = 0
			else autoCompleteIndex++
		} else if (e.keyCode === 38) {
			// ArrowUp
			// First element on the list ? Go to the last
			if (autoCompleteIndex <= 0) autoCompleteIndex = arrelementsmatch.length - 1
			else autoCompleteIndex--
		} else if (e.keyCode === 27) {
			// Escape
			arrelementsmatch = [];
			inputElement.focus();
		}
	
	}
	
	function addTag(currentTag: string) {
	
		currentTag = currentTag.trim();
	
		if (currentTag == "") return;
		if (maxTags && selected.length == maxTags) return;
		if (selected.includes(currentTag)) return;
		if (onlyAutocomplete && arrelementsmatch.length === 0) return;

		selected.push(currentTag)
		selected = selected;
		tag = "";

		onChange();
	
		// Hide autocomplete list
		// Focus on svelte tags input
		arrelementsmatch = [];
		autoCompleteIndex = -1;
		inputElement.focus();
	
		if (maxTags && selected.length == maxTags) {
			inputElement.readOnly = true;
			placeholder = "";
		};
	
	}

	function removeTag(i: number) {
		selected.splice(i, 1);
		selected = selected;

		onChange();

		// Hide autocomplete list
		// Focus on svelte tags input
		arrelementsmatch = [];
		inputElement.readOnly = false;
		placeholder = storePlaceholder;
		inputElement.focus();

	}
		
	function onFocus() {
		layoutElement.classList.add('focus');
	}
	
	function onBlur(_: any, __: any) {
		layoutElement.classList.remove('focus');
		
		// Clean input on
		if (cleanOnBlur) {
			tag = "";
		}
	
		arrelementsmatch = []
		autoCompleteIndex = -1
	}
	
	function onClick() {
		minChars == 0 && getMatchElements(null);
	}

	function escapeHTML(string: string) {
		const htmlEscapes = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#x27;',
			'/': '&#x2F;'
		};

		// @ts-ignore
		return ('' + string).replace(/[&<>"'\/]/g, match => htmlEscapes[match]);
	}
	
	function buildMatchMarkup(search: string, value: string) {
		return escapeHTML(value).replace(RegExp(regExpEscape(search.toLowerCase()), 'i'), "<strong>$&</strong>")
	}
	
	async function getMatchElements(input: KeyboardEvent | null) {
	
		if (!autoComplete) return;
		if (maxTags && selected.length >= maxTags) return;
	
		// @ts-ignore
		let value = input ? input.target?.value : "";
		let autoCompleteValues = autoComplete as string[]; // At this point we can be sure
			
		// Escape
		if ((minChars > 0 && value == "") || (input && input.keyCode === 27) || value.length < minChars ) {
			arrelementsmatch = [];
			return;
		}
	
		let matchs: string[] | { label: string, search: string }[]  = autoCompleteValues;
	
		if(autoCompleteFilter !== false) {
			matchs = autoCompleteValues.filter(e => e.toLowerCase().includes(value.toLowerCase()))
		}
		matchs = matchs.map(matchTag => {
			return {
				label: matchTag,
				search: buildMatchMarkup(value, matchTag)
			}
		});
	
		matchs = matchs.filter(tag => !selected.includes(tag.label));
	
		arrelementsmatch = matchs;
	}
	
	function uniqueID() {
		return 'sti_' + Math.random().toString(36).substring(2, 11);
	};
</script>
	
<div class="MC-input-layout" bind:this={layoutElement}>
	<label for={id} class={labelShow ? "" : "sr-only"}>{labelText}</label>
	
	{#if selected.length > 0}
		{#each selected as tag, i}
			<button type="button" class="MC-input-tag">
				{tag}
                <span class="MC-input-tag-remove" on:pointerdown={() => removeTag(i)}> &#215;</span>
			</button>
		{/each}
	{/if}
	<input
		type="text"
		id={id}
		name={name}
		bind:value={tag}
		on:keydown={setTag}
		on:keyup={getMatchElements}
		on:focus={onFocus}
		on:blur={(e) => onBlur(e, tag)}
		on:pointerdown={onClick}
		class="MC-input"
		placeholder={placeholder}
		autocomplete="off"
		bind:this={inputElement}
	>
</div>
	
{#if autoComplete && arrelementsmatch.length > 0}
	<div class="MC-input-matchs-parent">
		<ul id="{id}_matchs" class="MC-input-matchs">
			{#each arrelementsmatch as element, index}
				<li
					tabindex="-1"
					class:focus={index === autoCompleteIndex}
					on:pointerdown|preventDefault={() => addTag(element.label)}>
						{@html element.search}
					</li>
			{/each}
		</ul>
	</div>
{/if}
	
<style>
/* CSS MC-input */	
	:global(.MC-input-layout label) {
		margin: 0 5px 0 0;
		padding: 0;
	}
	
	/* MC-input-layout */
	
	:global(.MC-input-layout) {
		margin: 5px;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		padding: 0px 5px 0px 5px;
		border: var(--input-border-width) solid var(--background-modifier-border);
		background: var(--background-modifier-form-field);
		border-radius: var(--input-radius);
	}
	
	:global(.MC-input-tag-remove) {
		cursor: pointer;
	}
	
	:global(.MC-input-layout:focus,
	.MC-input-layout:hover) {
		border-color: var(--background-modifier-border-hover);
	}
	
	
	/* MC-input */
	
	:global(input[type='text'].MC-input) {
		/* Parent handles background */
		padding: 2px 5px;
		background: unset;
		flex: 1;
		margin: 0;
		border: none;
	}
	
	:global(input[type='text'].MC-input:focus) {
		outline: 0;
		box-shadow: none;
	}
	
	/* MC-input-tag */
	
	:global(button.MC-input-tag) {
		padding: 2px 5px;
		cursor: text;
		display: flex;
		white-space: nowrap;
		user-select: text;
		list-style: none;
		background: var(--tag-background);
		border: var(--tag-border-width) solid var(--tag-border-color);
		color: var(--tag-color);
		height: var(--input-height);
		padding-top: 0;
		padding-bottom: 0;
		box-shadow: none;
		margin-right: 5px;
		margin-top: 0;
	}

	/* MC-input-matchs */
	
	:global(.MC-input-matchs-parent) {
		position: relative;
	}
	
	:global(.MC-input-matchs) {
		padding: 2px 5px;
		z-index: var(--layer-notice);
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		margin: 3px 0;
		padding: 0px;
		background: var(--dropdown-background);
		border: var(--input-border-width) solid var(--background-modifier-border);
		border-radius: var(--modal-radius);
		max-height: 310px;
		overflow: scroll;
		overflow-x: auto;
	}
	
	:global(.MC-input-matchs li) {
		list-style: none;
		padding: 5px;
		border-radius: var(--modal-radius);
		cursor: pointer;
	}
	
	:global(.MC-input-matchs li:hover,
	.MC-input-matchs li.focus) {
		background: var(--dropdown-background);
		background-position: var(--dropdown-background-position);
		background-size: var(--dropdown-background-size);
		mix-blend-mode: var(--dropdown-background-blend-mode);
		size: var(--dropdown-background-size);
		outline: none;
	}
	
	/* MC-input disabled */
				
	:global(.MC-input-layout label.sr-only) {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
