# Roadmap

A description of feature that are currently being worked on / being considered

## MVP

Everything needed for a minimal viable product. In general, this means: Cleaning things up, making it respond to files being removed / added / moved / edited.

- [x] Remove sidecar files from the file explorer (default explorer only)
- [x] Make auto-renaming of sidecars actually work...
- [x] Allow users to turn off hiding sidecar files
- [x] Hide things from the file explorer also if there are multiple windows or it is revealed later
- [x] When opening an media file, open a side-view with 1. The media file 2. An editor window for the sidecar file
- [x] When clicking on a file in the gallery view, do the same as above, and highlight the file
- [x] Remove sidecar files from the graph view - possibly add sidecar tag to file - Not necessary, people can filter them themselves
- [x] Update gallery to use own system. The current system is quite broken
- [x] Make file rename red when file can't be renamed to given name
- [x] Open sidecar window on correct moments
- [x] Fix issue with observer when window is initially closed
- [x] Show a notice with updates when a lot of new files have been detected; Show progress for feature extraction
- [x] Add icons to windows
- [x] Allow searching in the gallery
- [x] Make the gallery fit nicely again...
- [x] Update file type, add to settings
- [x] Fix some jank with the sidecar file saving and being loaded in
- [x] Add search suggestions
- [x] Make the gallery responsive
- [ ] Make sure things work on mobile
- [ ] Write test cases, perform them
- [ ] Lint everything
- [ ] Make code more readable
- [x] Use the right embedding system to embed files...
- [ ] Fix saving stuff - When someone clicks on a new file fast - https://docs.obsidian.md/Reference/TypeScript+API/debounce, https://docs.obsidian.md/Reference/TypeScript+API/Debouncer/run
- [ ] Resolve lag when switching tab - Likely due to the gallery width

## File types

Supporting more file types is the next step. Mainly, these are the things being considered:

- [ ] Video / animated files. Mp4, gif 
- [ ] Audio files. mp3, wav, etc.
- [ ] 3d files. obj, gltf - incl. embedding
- [ ] Wonderdraft and dungeondraft files - incl. embedding. Doesn't actually seem possible due to the file format...

## Performance

Performance for a media querying application / plugin like this is a concern. Currently, the largest bottle necks seem to be:

- [ ] Feature extraction. Feature extraction for images is quite slow. This might be because of the image loading.
