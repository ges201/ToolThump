let selectedFiles = []
let currentConversionType = null

// Hidden actual file inputs
const singleFileInput = document.getElementById("singleFile")
const folderInput = document.getElementById("folderInput")

// Custom button facades
const customSingleFileBtn = document.getElementById("customSingleFileBtn")
const customFolderBtn = document.getElementById("customFolderBtn")

// Custom text displays for file names
const customSingleFileText = document.getElementById("customSingleFileText")
const customFolderText = document.getElementById("customFolderText")

// Input groups for active styling
const singleFileGroup = document.getElementById("singleFileGroup")
const folderGroup = document.getElementById("folderGroup")

// ADDED: Folder options
const retainStructureContainer = document.getElementById("retainStructureContainer");
const retainFolderStructureCheckbox = document.getElementById("retainFolderStructure");


const outputFormatSelect = document.getElementById("outputFormatSelect")
const convertBtn = document.getElementById("convertBtn")
const statusArea = document.getElementById("statusArea")
const imagePreviewContainer = document.getElementById("imagePreviewContainer")
const imagePreview = document.getElementById("imagePreview")
const previewFileName = document.getElementById("previewFileName")

const fileSummaryContainer = document.getElementById("fileSummaryContainer")
const fileSummary = document.getElementById("fileSummary")


const defaultSingleFileText = "No file selected"
const defaultFolderText = "No folder selected"
const placeholderClass = "text-placeholder"
const activeInputClass = "input-active" // Class to highlight the active input group

function showStatus(message, type = "info") {
    statusArea.textContent = message
    statusArea.className = `ic-status-area ic-status-${type}` // Use full class names for status area
}

function updateUIState() {
    const isFolderMode = currentConversionType === 'folder' && selectedFiles.length > 0;
    retainStructureContainer.style.display = isFolderMode ? 'flex' : 'none';

    customSingleFileText.classList.toggle(
        placeholderClass,
        customSingleFileText.textContent === defaultSingleFileText
    )
    customFolderText.classList.toggle(
        placeholderClass,
        customFolderText.textContent === defaultFolderText
    )

    if (selectedFiles.length > 0) {
        convertBtn.disabled = false
        fileSummaryContainer.setAttribute("aria-hidden", "false")

        if (currentConversionType === "single" && selectedFiles[0]) {
            const file = selectedFiles[0].file
            previewFileName.textContent = `Preview: ${file.name}`
            const reader = new FileReader()
            reader.onload = e => {
                if (e.target?.result) {
                    imagePreview.src = e.target.result
                    imagePreviewContainer.setAttribute("aria-hidden", "false")
                }
            }
            reader.readAsDataURL(file)
            fileSummary.textContent = `Selected file: ${file.name}`
            singleFileGroup.classList.add(activeInputClass)
            folderGroup.classList.remove(activeInputClass)
        } else if (currentConversionType === "folder" && selectedFiles.length > 0) {
            imagePreviewContainer.setAttribute("aria-hidden", "true")
            imagePreview.src = "#"
            previewFileName.textContent = ""

            // Determine if it's a true folder selection for summary text
            let isActualFolder = selectedFiles.some(f => f.relativePath && f.relativePath !== f.file.name);
            const numFiles = selectedFiles.length;
            const filesNoun = numFiles === 1 ? "image" : "images";

            if (isActualFolder) {
                // customFolderText should contain the folder name here (set by folderInput handler)
                fileSummary.textContent = `Selected folder: "${customFolderText.textContent}" (${numFiles} ${filesNoun} found).`;
            } else {
                // customFolderText should contain "X file(s)" here (set by folderInput handler)
                fileSummary.textContent = `Selected ${customFolderText.textContent} for batch processing.`;
            }
            folderGroup.classList.add(activeInputClass)
            singleFileGroup.classList.remove(activeInputClass)
        }
    } else {
        convertBtn.disabled = true
        showStatus("Please select an image or a folder.", "info")
        imagePreviewContainer.setAttribute("aria-hidden", "true")
        imagePreview.src = "#"
        previewFileName.textContent = ""
        fileSummary.textContent = ""
        fileSummaryContainer.setAttribute("aria-hidden", "true")
        singleFileGroup.classList.remove(activeInputClass)
        folderGroup.classList.remove(activeInputClass)
    }
}

function resetSelections() {
    selectedFiles = []
    currentConversionType = null
    singleFileInput.value = "" // Clear file input value
    folderInput.value = ""   // Clear folder input value
    customSingleFileText.textContent = defaultSingleFileText
    customFolderText.textContent = defaultFolderText
    updateUIState()
}

customSingleFileBtn.addEventListener("click", () => {
    singleFileInput.click()
})

customFolderBtn.addEventListener("click", () => {
    folderInput.click()
})

singleFileInput.addEventListener("change", event => {
    const inputElement = event.target
    const files = inputElement.files

    if (!files || files.length === 0) {
        if (currentConversionType === "single" || !selectedFiles.length) {
            resetSelections()
        }
        inputElement.value = ""
        return
    }

    const file = files[0]
    if (!isValidImageType(file.type)) {
        showStatus(
            `Error: Unsupported file type (${file.type}). Please select JPG, PNG, GIF, or WEBP.`,
            "error"
        )
        resetSelections()
        return
    }

    selectedFiles = [{ file }]
    currentConversionType = "single"
    customSingleFileText.textContent = file.name
    customFolderText.textContent = defaultFolderText
    folderInput.value = ""
    updateUIState()
    showStatus(`File "${file.name}" selected. Ready to convert.`, "info")
})

folderInput.addEventListener("change", event => {
    const inputElement = event.target
    const files = inputElement.files

    if (!files || files.length === 0) {
        if (currentConversionType === "folder" || !selectedFiles.length) {
            resetSelections()
        }
        inputElement.value = ""
        return
    }

    const newSelectedFiles = []
    for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (isValidImageType(file.type)) {
            // If webkitRelativePath is present and not empty, it's a true folder selection.
            // Otherwise, fallback to using file.name (for flat structure, e.g., on mobile).
            const relativePath = file.webkitRelativePath || file.name;
            newSelectedFiles.push({ file, relativePath: relativePath });
        }
    }

    if (newSelectedFiles.length === 0) {
        showStatus(
            "No valid image files (JPG, PNG, GIF, WEBP) found in the selection.",
            "error"
        )
        resetSelections()
        return
    }

    selectedFiles = newSelectedFiles
    currentConversionType = "folder"

    // Determine if this was a "true" folder selection by checking if any file has a path component
    let isActualFolderSelection = selectedFiles.some(f => f.relativePath && f.relativePath.includes('/'));

    let folderDisplayName;
    if (isActualFolderSelection && selectedFiles[0]?.relativePath) {
        const firstPath = selectedFiles[0].relativePath;
        folderDisplayName = firstPath.split("/")[0] || "Selected Folder";
    } else if (newSelectedFiles.length > 0) {
        folderDisplayName = `${newSelectedFiles.length} file(s)`;
    } else { // Should not be reached due to checks above
        folderDisplayName = defaultFolderText;
    }

    customFolderText.textContent = folderDisplayName
    customSingleFileText.textContent = defaultSingleFileText
    singleFileInput.value = ""

    updateUIState() // This will now use the updated customFolderText for its summary

    if (isActualFolderSelection) {
        showStatus(
            `${selectedFiles.length} image(s) from folder "${folderDisplayName}" selected. Ready to convert.`,
            "info"
        );
    } else {
        showStatus(
            `${selectedFiles.length} file(s) selected for batch conversion. Ready to convert.`,
            "info"
        );
    }
})

function isValidImageType(mimeType) {
    if (!mimeType) return false;
    return ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
        mimeType.toLowerCase()
    )
}

function getOutputFormat() {
    const format = outputFormatSelect.value.toUpperCase()
    switch (format) {
        case "JPEG":
            return { mimeType: "image/jpeg", extension: "jpg" }
        case "GIF":
            return { mimeType: "image/gif", extension: "gif" }
        case "WEBP":
            return { mimeType: "image/webp", extension: "webp" }
        case "PNG":
        default:
            return { mimeType: "image/png", extension: "png" }
    }
}

convertBtn.addEventListener("click", async () => {
    if (selectedFiles.length === 0 || !currentConversionType) {
        showStatus("No files selected for conversion.", "error")
        return
    }

    convertBtn.disabled = true
    showStatus("Initializing conversion...", "info")

    const {
        mimeType: outputMimeType,
        extension: outputExtension
    } = getOutputFormat()

    try {
        if (currentConversionType === "single" && selectedFiles[0]) {
            const { file } = selectedFiles[0]
            showStatus(`Converting ${file.name}...`, "info")
            const convertedBlob = await processImage(file, outputMimeType)
            if (convertedBlob) {
                const originalName = file.name.substring(
                    0,
                    file.name.lastIndexOf(".") || file.name.length
                )
                downloadBlob(convertedBlob, `${originalName}.${outputExtension}`)
                showStatus(
                    `Successfully converted ${file.name
                    } to ${outputExtension.toUpperCase()}. Downloading...`,
                    "success"
                )
            } else {
                showStatus(
                    `Could not convert ${file.name}. The file might be corrupted or in an unsupported sub-format.`,
                    "error"
                )
            }
        } else if (currentConversionType === "folder") {
            const zip = new JSZip()
            let convertedCount = 0
            const retainStructure = retainFolderStructureCheckbox.checked; // Checkbox state

            showStatus(
                `Processing ${selectedFiles.length} images for ZIP archive...`,
                "info"
            )

            for (let i = 0; i < selectedFiles.length; i++) {
                const { file, relativePath } = selectedFiles[i]
                try {
                    showStatus(
                        `Converting image ${i + 1} of ${selectedFiles.length}: ${file.name
                        }...`,
                        "info"
                    )
                    const convertedBlob = await processImage(file, outputMimeType)
                    if (convertedBlob) {
                        const originalNameWithoutExt = file.name.substring(
                            0,
                            file.name.lastIndexOf(".") || file.name.length
                        )
                        const newFileName = `${originalNameWithoutExt}.${outputExtension}`

                        // MODIFIED: Determine path in ZIP based on checkbox
                        let pathInZip = newFileName;
                        if (retainStructure && relativePath && relativePath.includes('/') && relativePath !== file.name) {
                            const dirPath = relativePath.substring(
                                0,
                                relativePath.lastIndexOf("/") + 1
                            )
                            pathInZip = dirPath + newFileName
                        }

                        zip.file(pathInZip, convertedBlob)
                        convertedCount++
                    } else {
                        console.warn(`Skipped ${file.name} as conversion returned null.`)
                        const currentNotes = zip.files["conversion_notes.txt"] ? await zip.files["conversion_notes.txt"].async("string") : `Skipped files (conversion resulted in null, possibly unsupported format or corrupted):\n`;
                        zip.file(`conversion_notes.txt`, currentNotes + `- ${file.name}\n`);

                    }
                } catch (imgError) {
                    console.error(`Error converting ${file.name}:`, imgError)
                    const currentErrors = zip.files["conversion_errors.txt"] ? await zip.files["conversion_errors.txt"].async("string") : `Files skipped due to errors during conversion processing:\n`;
                    zip.file(`conversion_errors.txt`, currentErrors + `- ${file.name}: ${imgError.message}\n`);
                }
            }

            if (convertedCount > 0) {
                showStatus(
                    `Creating ZIP file with ${convertedCount} converted image(s)...`,
                    "info"
                )
                const zipBlob = await zip.generateAsync({ type: "blob" })

                let archiveBaseName = "converted_images";
                if (selectedFiles[0]?.relativePath && selectedFiles.some(f => f.relativePath && f.relativePath.includes('/'))) {
                    const firstPath = selectedFiles[0].relativePath;
                    archiveBaseName = firstPath.split("/")[0] || archiveBaseName;
                }

                downloadBlob(zipBlob, `${archiveBaseName}_${outputExtension}.zip`)
                let successMessage = `${convertedCount} image(s) converted and zipped. Downloading...`
                if (
                    convertedCount < selectedFiles.length &&
                    (zip.files["conversion_notes.txt"] ||
                        zip.files["conversion_errors.txt"])
                ) {
                    successMessage +=
                        " Some files were skipped; see notes/errors in the ZIP."
                }
                showStatus(successMessage, "success")
            } else {
                let noConversionMessage = "No images were successfully converted."
                if (Object.keys(zip.files).length > 0) {
                    const zipBlob = await zip.generateAsync({ type: "blob" })
                    downloadBlob(zipBlob, `conversion_report_empty.zip`)
                    noConversionMessage +=
                        " A ZIP with error/notes logs has been generated."
                }
                showStatus(noConversionMessage, "error")
            }
        }
    } catch (error) {
        console.error("Conversion process failed:", error)
        showStatus(
            `Error during conversion: ${error.message}. Please try again.`,
            "error"
        )
    } finally {
        resetSelections()
    }
})

function processImage(file, outputMimeType) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = event => {
            if (!event.target?.result) {
                console.warn(`Failed to read file data for ${file.name}.`);
                return resolve(null);
            }
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement("canvas")
                canvas.width = img.naturalWidth
                canvas.height = img.naturalHeight
                const ctx = canvas.getContext("2d")
                if (!ctx) {
                    console.warn(`Could not get canvas context for ${file.name}.`);
                    return resolve(null);
                }

                const potentiallyTransparentSource = ['image/png', 'image/gif', 'image/webp'].includes(file.type.toLowerCase());
                if (outputMimeType === "image/jpeg" && potentiallyTransparentSource) {
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                ctx.drawImage(img, 0, 0)

                let quality = 0.92
                if (
                    outputMimeType === "image/jpeg" ||
                    outputMimeType === "image/webp"
                ) {
                    canvas.toBlob(blob => resolve(blob), outputMimeType, quality)
                } else {
                    canvas.toBlob(blob => resolve(blob), outputMimeType)
                }
            }
            img.onerror = (err) => {
                console.error(`Image load error for ${file.name}:`, err)
                resolve(null);
            }
            img.src = event.target.result
        }
        reader.onerror = (err) => {
            console.error(`FileReader error for ${file.name}:`, err);
            resolve(null);
        }
        reader.readAsDataURL(file)
    })
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none"; // Hide the element from view
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Delay revoking the object URL to allow time for the download to initiate,
    // especially important on some mobile browsers.
    setTimeout(() => {
        if (document.body.contains(a)) { // Check if element still exists
            document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
    }, 100); // 100ms delay
}

// Initial UI state setup
document.addEventListener('DOMContentLoaded', () => {
    resetSelections();
});