document.addEventListener('DOMContentLoaded', () => {
    let selectedFiles = [];
    let currentSelectionMode = null; // 'single', 'multiple', 'folder'

    // --- DOM Elements ---
    const uploadArea = document.getElementById("uploadArea");
    const fileInput = document.getElementById("fileInput");
    const folderInput = document.getElementById("folderInput");
    const customFileBtn = document.getElementById("customFileBtn");
    const customFolderBtn = document.getElementById("customFolderBtn");
    const removeImageBtn = document.getElementById("removeImageBtn");

    const folderOptionsContainer = document.getElementById("folderOptionsContainer");
    const retainFolderStructureCheckbox = document.getElementById("retainFolderStructure");

    const outputFormatSelect = document.getElementById("outputFormatSelect");
    const convertBtn = document.getElementById("convertBtn");
    const statusArea = document.getElementById("statusArea");

    const imagePreviewContainer = document.getElementById("imagePreviewContainer");
    const imagePreview = document.getElementById("imagePreview");
    const previewFileName = document.getElementById("previewFileName");

    // --- Functions ---

    function showStatus(message, type = "info") {
        statusArea.textContent = message;
        statusArea.className = `ic-status-area ic-status-${type}`;
    }

    function updateUIState() {
        const isFolderMode = currentSelectionMode === 'folder' && selectedFiles.length > 0;
        folderOptionsContainer.style.display = isFolderMode ? 'flex' : 'none';

        convertBtn.disabled = selectedFiles.length === 0;

        const isSingleFile = currentSelectionMode === 'single' && selectedFiles.length === 1;
        const isMultiFile = (currentSelectionMode === 'multiple' || currentSelectionMode === 'folder') && selectedFiles.length > 0;

        if (isSingleFile || isMultiFile) {
            uploadArea.classList.add('preview-active');
            imagePreviewContainer.style.display = 'flex';
            imagePreviewContainer.setAttribute("aria-hidden", "false");
        } else {
            uploadArea.classList.remove('preview-active');
            imagePreviewContainer.style.display = 'none';
            imagePreviewContainer.setAttribute("aria-hidden", "true");
        }

        document.getElementById('imagePreview').style.display = isSingleFile ? 'block' : 'none';
        document.getElementById('multiFileSummary').style.display = isMultiFile ? 'flex' : 'none';

        if (selectedFiles.length === 0) {
            showStatus("Select an image or folder to begin.", "info");
            imagePreview.src = "#";
            previewFileName.textContent = "";
            return;
        }

        if (isSingleFile) {
            const file = selectedFiles[0].file;
            previewFileName.textContent = file.name;
            const reader = new FileReader();
            reader.onload = e => {
                if (e.target?.result) {
                    imagePreview.src = e.target.result;
                }
            };
            reader.readAsDataURL(file);
        } else if (isMultiFile) {
            previewFileName.textContent = `${selectedFiles.length} images selected`;
        }
    }

    function resetSelections() {
        selectedFiles = [];
        currentSelectionMode = null;
        if (fileInput) fileInput.value = "";
        if (folderInput) folderInput.value = "";
        retainFolderStructureCheckbox.checked = false;
        updateUIState();
    }

    function isValidImageType(mimeType) {
        if (!mimeType) return false;
        return ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mimeType.toLowerCase());
    }

    async function processDirectory(entry) {
        return new Promise((resolve) => {
            const directoryReader = entry.createReader();
            let allEntries = [];

            const readEntries = () => {
                directoryReader.readEntries(async (entries) => {
                    if (entries.length > 0) {
                        allEntries = allEntries.concat(Array.from(entries));
                        readEntries();
                    } else {
                        let files = [];
                        for (const anEntry of allEntries) {
                            if (anEntry.isFile) {
                                const file = await new Promise(res => anEntry.file(res));
                                if (isValidImageType(file.type)) {
                                    files.push({
                                        file,
                                        relativePath: anEntry.fullPath.startsWith('/') ? anEntry.fullPath.substring(1) : anEntry.fullPath
                                    });
                                }
                            } else if (anEntry.isDirectory) {
                                const subFiles = await processDirectory(anEntry);
                                files = files.concat(subFiles);
                            }
                        }
                        resolve(files);
                    }
                }, (error) => {
                    console.error("Error reading directory entries:", error);
                    resolve([]);
                });
            };
            readEntries();
        });
    }

    function handleInputChange(fileList) {
        const files = Array.from(fileList);
        const isFolder = files.length > 0 && files[0].webkitRelativePath;

        if (isFolder) {
            currentSelectionMode = 'folder';
            selectedFiles = files
                .filter(file => isValidImageType(file.type))
                .map(file => ({
                    file,
                    relativePath: file.webkitRelativePath
                }));
            finalizeFolderSelection();
        } else {
            handleFileSelection(files);
        }
    }

    async function handleDrop(items) {
        const itemList = Array.from(items);
        const entry = itemList[0]?.webkitGetAsEntry();

        if (entry?.isDirectory) {
            currentSelectionMode = 'folder';
            showStatus("Scanning folder, please wait...", "info");
            selectedFiles = await processDirectory(entry);
            finalizeFolderSelection();
        } else {
            const files = [];
            for (const item of itemList) {
                if (item.kind === 'file') {
                    const file = item.getAsFile();
                    if (file) files.push(file);
                }
            }
            handleFileSelection(files);
        }
    }

    function handleFileSelection(files) {
        selectedFiles = files
            .filter(file => isValidImageType(file.type))
            .map(file => ({
                file,
                relativePath: file.name
            }));

        if (selectedFiles.length === 0) {
            showStatus("No valid image files (JPG, PNG, GIF, WEBP) found in selection.", "error");
            resetSelections();
            return;
        }

        currentSelectionMode = selectedFiles.length === 1 ? 'single' : 'multiple';
        if (currentSelectionMode === 'single') {
            showStatus(`Selected file: ${selectedFiles[0].file.name}. Ready to convert.`, "success");
        } else {
            showStatus(`Selected ${selectedFiles.length} images for batch conversion. Ready to convert.`, "success");
        }
        updateUIState();
    }

    function finalizeFolderSelection() {
        if (selectedFiles.length === 0) {
            showStatus("No valid image files (JPG, PNG, GIF, WEBP) found in the selected folder.", "error");
            resetSelections();
            return;
        }
        const folderName = selectedFiles[0].relativePath.split('/')[0] || "Selected Folder";
        showStatus(`Selected folder "${folderName}" with ${selectedFiles.length} image(s). Ready to convert.`, "success");
        updateUIState();
    }

    function getOutputFormat() {
        const format = outputFormatSelect.value.toUpperCase();
        switch (format) {
            case "JPEG": return { mimeType: "image/jpeg", extension: "jpg" };
            case "GIF": return { mimeType: "image/gif", extension: "gif" };
            case "WEBP": return { mimeType: "image/webp", extension: "webp" };
            case "PNG": default: return { mimeType: "image/png", extension: "png" };
        }
    }

    function processImage(file, outputMimeType) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = event => {
                if (!event.target?.result) {
                    console.warn(`Failed to read file data for ${file.name}.`);
                    return resolve(null);
                }
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) {
                        console.warn(`Could not get canvas context for ${file.name}.`);
                        return resolve(null);
                    }

                    const potentiallyTransparentSource = ['image/png', 'image/gif', 'image/webp'].includes(file.type.toLowerCase());
                    if (outputMimeType === "image/jpeg" && potentiallyTransparentSource) {
                        ctx.fillStyle = "#ffffff";
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }

                    ctx.drawImage(img, 0, 0);
                    const quality = 0.92;
                    canvas.toBlob(blob => resolve(blob), outputMimeType, quality);
                };
                img.onerror = () => {
                    console.error(`Image load error for ${file.name}`);
                    resolve(null);
                };
                img.src = event.target.result;
            };
            reader.onerror = () => {
                console.error(`FileReader error for ${file.name}`);
                resolve(null);
            };
            reader.readAsDataURL(file);
        });
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            if (document.body.contains(a)) {
                document.body.removeChild(a);
            }
            URL.revokeObjectURL(url);
        }, 100);
    }

    // --- Event Listeners ---

    customFileBtn.addEventListener("click", () => fileInput.click());
    customFolderBtn.addEventListener("click", () => folderInput.click());
    removeImageBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        resetSelections();
    });

    fileInput.addEventListener("change", (event) => handleInputChange(event.target.files));
    folderInput.addEventListener("change", (event) => handleInputChange(event.target.files));

    // CORRECTED: This listener now prevents clicks on buttons from triggering the file input.
    uploadArea.addEventListener("click", (e) => {
        // If the click is on a button, do nothing here.
        // Its own dedicated click listener will handle the action.
        if (e.target.closest('button')) {
            return;
        }

        // If the click was on the general area (and not a button), trigger the file input.
        if (e.target === uploadArea || e.target.closest('.ic-upload-content')) {
            fileInput.click();
        }
    });

    uploadArea.addEventListener("dragover", (event) => {
        event.preventDefault();
        uploadArea.classList.add("drag-over");
    });

    uploadArea.addEventListener("dragleave", () => {
        uploadArea.classList.remove("drag-over");
    });

    uploadArea.addEventListener("drop", (event) => {
        event.preventDefault();
        uploadArea.classList.remove("drag-over");
        if (event.dataTransfer?.items) {
            handleDrop(event.dataTransfer.items);
        }
    });

    convertBtn.addEventListener("click", async () => {
        if (selectedFiles.length === 0) {
            showStatus("No files selected for conversion.", "error");
            return;
        }

        convertBtn.disabled = true;
        showStatus("Initializing conversion...", "info");
        const { mimeType: outputMimeType, extension: outputExtension } = getOutputFormat();

        try {
            if (currentSelectionMode === 'single') {
                const { file } = selectedFiles[0];
                showStatus(`Converting ${file.name}...`, "info");
                const convertedBlob = await processImage(file, outputMimeType);
                if (convertedBlob) {
                    const originalName = file.name.substring(0, file.name.lastIndexOf(".") || file.name.length);
                    downloadBlob(convertedBlob, `${originalName}.${outputExtension}`);
                    showStatus(`Successfully converted ${file.name} to ${outputExtension.toUpperCase()}. Downloading...`, "success");
                } else {
                    showStatus(`Could not convert ${file.name}. The file might be corrupted.`, "error");
                }
            } else { // Handles 'multiple' and 'folder'
                const zip = new JSZip();
                let convertedCount = 0;
                const retainStructure = retainFolderStructureCheckbox.checked;

                showStatus(`Processing ${selectedFiles.length} images for ZIP archive...`, "info");

                for (let i = 0; i < selectedFiles.length; i++) {
                    const { file, relativePath } = selectedFiles[i];
                    showStatus(`Converting image ${i + 1} of ${selectedFiles.length}: ${file.name}...`, "info");
                    const convertedBlob = await processImage(file, outputMimeType);

                    if (convertedBlob) {
                        const originalNameWithoutExt = file.name.substring(0, file.name.lastIndexOf(".") || file.name.length);
                        const newFileName = `${originalNameWithoutExt}.${outputExtension}`;

                        let pathInZip = newFileName;
                        if (currentSelectionMode === 'folder' && retainStructure && relativePath.includes('/')) {
                            const originalPath = relativePath.substring(0, relativePath.lastIndexOf('/') + 1);
                            pathInZip = originalPath + newFileName;
                        }

                        zip.file(pathInZip, convertedBlob);
                        convertedCount++;
                    } else {
                        console.warn(`Skipped ${file.name} as conversion returned null.`);
                    }
                }

                if (convertedCount > 0) {
                    showStatus(`Creating ZIP file with ${convertedCount} converted image(s)...`, "info");
                    const zipBlob = await zip.generateAsync({ type: "blob" });
                    const archiveBaseName = currentSelectionMode === 'folder' ? (selectedFiles[0].relativePath.split('/')[0] || "converted_images") : "converted_images";
                    downloadBlob(zipBlob, `${archiveBaseName}_${outputExtension.toUpperCase()}.zip`);
                    showStatus(`${convertedCount} image(s) converted and zipped. Downloading...`, "success");
                } else {
                    showStatus("No images were successfully converted.", "error");
                }
            }
        } catch (error) {
            console.error("Conversion process failed:", error);
            showStatus(`Error during conversion: ${error.message}. Please try again.`, "error");
        } finally {
            resetSelections();
        }
    });

    // --- Initial UI State ---
    resetSelections();
});