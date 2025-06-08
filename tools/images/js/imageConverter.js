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
            let folderDisplayName = "folder"
            if (selectedFiles[0]?.relativePath) {
                const firstPath = selectedFiles[0].relativePath
                folderDisplayName = firstPath.split("/")[0] || folderDisplayName
            }
            fileSummary.textContent = `Selected folder: "${folderDisplayName}" (${selectedFiles.length} image(s) found).`
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
    // Placeholder class is managed by updateUIState based on text content
    updateUIState() // This will also call showStatus and handle active classes & summary visibility
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
        // If user cancels file dialog, reset if no file was previously selected for this method
        if (currentConversionType === "single" || !selectedFiles.length) {
            resetSelections()
        }
        inputElement.value = "" // Ensure it's cleared for next change event
        return
    }

    const file = files[0]
    if (!isValidImageType(file.type)) {
        showStatus(
            `Error: Unsupported file type (${file.type}). Please select JPG, PNG, GIF, or WEBP.`,
            "error"
        )
        resetSelections() // Reset everything on error
        return
    }

    selectedFiles = [{ file }]
    currentConversionType = "single"
    customSingleFileText.textContent = file.name
    customFolderText.textContent = defaultFolderText // Reset other custom text
    folderInput.value = "" // Clear the other file input
    updateUIState()
    showStatus(`File "${file.name}" selected. Ready to convert.`, "info")
})

folderInput.addEventListener("change", event => {
    const inputElement = event.target
    const files = inputElement.files

    if (!files || files.length === 0) {
        // If user cancels folder dialog, reset if no folder was previously selected for this method
        if (currentConversionType === "folder" || !selectedFiles.length) {
            resetSelections()
        }
        inputElement.value = "" // Ensure it's cleared for next change event
        return
    }

    const newSelectedFiles = []
    // files is a FileList, not an array, so use a standard for loop.
    for (let i = 0; i < files.length; i++) {
        const file = files[i]
        // Check if webkitRelativePath exists and is not empty for folder context
        if (isValidImageType(file.type) && file.webkitRelativePath) {
            newSelectedFiles.push({ file, relativePath: file.webkitRelativePath })
        } else if (isValidImageType(file.type) && !file.webkitRelativePath && files.length === 1) {
            // Fallback for browsers that might not support webkitRelativePath fully but allow single file from "folder" pick
            // This case is less common for true folder selections.
            newSelectedFiles.push({ file, relativePath: file.name })
        }
    }

    if (newSelectedFiles.length === 0) {
        showStatus(
            "No valid image files (JPG, PNG, GIF, WEBP) found in the selected folder or its subdirectories.",
            "error"
        )
        resetSelections() // Reset everything on error
        return
    }

    selectedFiles = newSelectedFiles
    currentConversionType = "folder"

    let folderDisplayName = "Selected Folder"
    // Extract folder name from the first file's relative path
    if (selectedFiles[0]?.relativePath) {
        const firstPath = selectedFiles[0].relativePath
        folderDisplayName = firstPath.split("/")[0] || folderDisplayName
    }
    customFolderText.textContent = folderDisplayName
    customSingleFileText.textContent = defaultSingleFileText // Reset other custom text
    singleFileInput.value = "" // Clear the other file input

    updateUIState()
    showStatus(
        `${selectedFiles.length} image(s) from folder "${folderDisplayName}" selected. Ready to convert.`,
        "info"
    )
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
            showStatus(
                `Processing ${selectedFiles.length} images for ZIP archive...`,
                "info"
            )

            for (let i = 0; i < selectedFiles.length; i++) {
                const { file, relativePath } = selectedFiles[i]
                try {
                    // Update status for each file in folder processing
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

                        let pathInZip = newFileName
                        if (relativePath) {
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
                        if (!zip.files["conversion_notes.txt"]) {
                            zip.file(
                                `conversion_notes.txt`,
                                `Skipped files (conversion resulted in null, possibly unsupported format or corrupted):\n`
                            )
                        }
                        // Use `zip.files["conversion_notes.txt"].async("string").then(...)` to append safely if needed,
                        // but for simple appends, JSZip handles multiple .file calls by overwriting or creating.
                        // For appending content to an existing file, one must read, append, then write.
                        // Simple approach: log each skipped file on a new line. If file created first time, it's header + first entry.
                        const currentNotes = zip.files["conversion_notes.txt"] ? await zip.files["conversion_notes.txt"].async("string") : `Skipped files (conversion resulted in null, possibly unsupported format or corrupted):\n`;
                        zip.file(`conversion_notes.txt`, currentNotes + `- ${file.name}\n`);

                    }
                } catch (imgError) {
                    console.error(`Error converting ${file.name}:`, imgError)
                    // Show error for individual file, but continue processing others
                    // The overall status will be updated at the end. We could accumulate these errors.
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
                let folderName = "converted_images"
                if (selectedFiles[0]?.relativePath) {
                    const firstPath = selectedFiles[0].relativePath
                    folderName = firstPath.split("/")[0] || folderName
                }
                downloadBlob(zipBlob, `${folderName}_${outputExtension}.zip`)
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
                if (Object.keys(zip.files).length > 0) { // If only error/notes files exist
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
        // Reset UI for next operation, happens after success or error message shown
        // Consider a slight delay or user action before resetting if messages are important to read.
        // For now, direct reset is fine.
        resetSelections()
    }
})

function processImage(file, outputMimeType) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = event => {
            if (!event.target?.result) {
                console.warn(`Failed to read file data for ${file.name}.`);
                return resolve(null); // Resolve with null for graceful skipping
            }
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement("canvas")
                canvas.width = img.naturalWidth
                canvas.height = img.naturalHeight
                const ctx = canvas.getContext("2d")
                if (!ctx) {
                    console.warn(`Could not get canvas context for ${file.name}.`);
                    return resolve(null); // Resolve with null
                }

                // Handle transparency: if converting to JPEG (which doesn't support alpha),
                // draw a white background first.
                // Only do this if the original image might have transparency (e.g. PNG, GIF, WEBP)
                // and the target is JPEG.
                const potentiallyTransparentSource = ['image/png', 'image/gif', 'image/webp'].includes(file.type.toLowerCase());
                if (outputMimeType === "image/jpeg" && potentiallyTransparentSource) {
                    ctx.fillStyle = "#ffffff"; // White background
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                ctx.drawImage(img, 0, 0)

                let quality = 0.92 // Default quality for lossy formats
                if (
                    outputMimeType === "image/jpeg" ||
                    outputMimeType === "image/webp" // WEBP can be lossy or lossless, canvas.toBlob defaults to lossy
                ) {
                    canvas.toBlob(blob => resolve(blob), outputMimeType, quality)
                } else { // PNG, GIF
                    canvas.toBlob(blob => resolve(blob), outputMimeType)
                }
            }
            img.onerror = (err) => {
                console.error(`Image load error for ${file.name}:`, err)
                resolve(null); // Resolve with null for graceful skipping
            }
            img.src = event.target.result
        }
        reader.onerror = (err) => {
            console.error(`FileReader error for ${file.name}:`, err);
            resolve(null); // Resolve with null
        }
        reader.readAsDataURL(file)
    })
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

// Initial UI state setup
document.addEventListener('DOMContentLoaded', () => {
    resetSelections(); // Set initial state correctly
});