// ToolThump/tools/images/image-resizer/imageResizer.js
function initImageResizer() {
    const imageUpload = document.getElementById('irImageUpload');
    const fileNameDisplay = document.getElementById('irFileName');
    const imagePreview = document.getElementById('irImagePreview');
    const imageUploadPlaceholder = document.getElementById('irImageUploadPlaceholder');
    const originalDimensionsDisplay = document.getElementById('irOriginalDimensions');
    const newDimensionsDisplay = document.getElementById('irNewDimensions');

    const modeFreeRadio = document.getElementById('irModeFree');
    const modeRatioRadio = document.getElementById('irModeRatio');

    const freeCropOptionsDiv = document.getElementById('irFreeCropOptions');
    const ratioCropOptionsDiv = document.getElementById('irRatioCropOptions');

    const displayWidthInput = document.getElementById('irDisplayWidth');
    const displayHeightInput = document.getElementById('irDisplayHeight');

    const aspectRatioSelect = document.getElementById('irAspectRatioSelect');
    const ratioReferenceWidthInput = document.getElementById('irRatioReferenceWidth');

    const resizeButton = document.getElementById('irResizeButton');
    const errorMessage = document.getElementById('irErrorMessage');

    let uploadedImageFile = null;
    let currentImageSrc = null;
    let originalWidth = 0;
    let originalHeight = 0;
    let cropper = null;
    let lastCropData = null;
    let isUpdatingInputsProgrammatically = false;
    let isUpdatingRatioInputProgrammatically = false;

    function displayError(message) { errorMessage.textContent = message; }
    function clearError() { errorMessage.textContent = ''; }

    function updateUIDisplayFromCropper() {
        if (!cropper || !cropper.cropped) {
            newDimensionsDisplay.textContent = 'Selection: N/A';
            if (displayWidthInput) displayWidthInput.value = '';
            if (displayHeightInput) displayHeightInput.value = '';
            resizeButton.disabled = true;
            return;
        }
        const data = cropper.getData(true);
        newDimensionsDisplay.textContent = `Selection: ${data.width}px x ${data.height}px`;
        if (modeFreeRadio.checked) {
            isUpdatingInputsProgrammatically = true;
            if (displayWidthInput) { if (document.activeElement !== displayWidthInput || Math.abs(parseInt(displayWidthInput.value) - data.width) > 1) { displayWidthInput.value = data.width; } }
            if (displayHeightInput) { if (document.activeElement !== displayHeightInput || Math.abs(parseInt(displayHeightInput.value) - data.height) > 1) { displayHeightInput.value = data.height; } }
            isUpdatingInputsProgrammatically = false;
        }
        resizeButton.disabled = !(data.width > 0 && data.height > 0);
    }

    function initializeOrReinitializeCropper() {
        if (!currentImageSrc) return;
        if (cropper) { try { if (cropper.cropped) lastCropData = cropper.getData(); } catch (e) { lastCropData = null; } cropper.destroy(); cropper = null; }
        imagePreview.src = currentImageSrc; imagePreview.style.visibility = 'visible';
        if (imageUploadPlaceholder) imageUploadPlaceholder.style.display = 'none';
        const isFreeMode = modeFreeRadio.checked;
        if (displayWidthInput) displayWidthInput.readOnly = !isFreeMode;
        if (displayHeightInput) displayHeightInput.readOnly = !isFreeMode;

        let cropperOptions = {
            viewMode: 1, dragMode: 'crop', responsive: true, autoCropArea: 0.85,
            background: false, guides: true, center: true, highlight: true,
            toggleDragModeOnDblclick: false,
            ready: function () {
                let initialCropBoxSet = false;
                if (modeRatioRadio.checked && ratioReferenceWidthInput.value && originalWidth > 0) {
                    const targetW = parseInt(ratioReferenceWidthInput.value, 10);
                    const currentAspectRatio = this.cropper.options.aspectRatio; // This will be a number now
                    if (!isNaN(targetW) && targetW > 0 && !isNaN(currentAspectRatio) && currentAspectRatio > 0) {
                        const w = Math.min(targetW, originalWidth);
                        const h = Math.round(w / currentAspectRatio);
                        if (h > 0 && h <= originalHeight) { this.cropper.setData({ width: w, height: h }); initialCropBoxSet = true; }
                    }
                }
                if (!initialCropBoxSet && lastCropData) {
                    const currentAspectRatio = this.cropper.options.aspectRatio;
                    if (isNaN(currentAspectRatio) || (Math.abs((lastCropData.width / lastCropData.height) - currentAspectRatio) < 0.01)) { // isNaN for Free Crop
                        this.cropper.setData(lastCropData); initialCropBoxSet = true;
                    }
                }
                if (!initialCropBoxSet) { this.cropper.crop(); }
                updateUIDisplayFromCropper();
                resizeButton.disabled = !this.cropper.cropped;
            },
            crop: function (event) { updateUIDisplayFromCropper(); },
            cropend: function () {
                if (modeRatioRadio.checked && cropper && cropper.cropped) {
                    const cropData = cropper.getData(true);
                    isUpdatingRatioInputProgrammatically = true;
                    if (document.activeElement !== ratioReferenceWidthInput || ratioReferenceWidthInput.value !== cropData.width.toString()) { ratioReferenceWidthInput.value = cropData.width; }
                    isUpdatingRatioInputProgrammatically = false;
                }
                updateUIDisplayFromCropper();
            }
        };

        if (isFreeMode) {
            cropperOptions.aspectRatio = NaN;
        } else { // Fixed Ratio Mode
            let selectedRatioValue = aspectRatioSelect.value; // Will be "1", "1.77...", or "original"
            let newAspectRatio;
            if (selectedRatioValue === "original") {
                newAspectRatio = originalWidth && originalHeight ? originalWidth / originalHeight : 1; // Default to 1 if original not loaded
            } else {
                newAspectRatio = parseFloat(selectedRatioValue); // Should always be a valid number
            }
            // Ensure newAspectRatio is a valid number, if not, default to 1 (Square)
            if (isNaN(newAspectRatio) || newAspectRatio <= 0) {
                newAspectRatio = 1;
                aspectRatioSelect.value = "1"; // Reflect this default in the dropdown
            }
            cropperOptions.aspectRatio = newAspectRatio;
        }
        cropper = new Cropper(imagePreview, cropperOptions);
    }

    function handleImageFile(file) {
        uploadedImageFile = file; fileNameDisplay.textContent = file.name; lastCropData = null;
        if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp'].includes(file.type)) { displayError('Unsupported file type.'); resetCropperUI(true); return; }
        clearError(); resizeButton.disabled = true;
        const reader = new FileReader();
        reader.onload = (e) => {
            currentImageSrc = e.target.result;
            const tempImg = new Image();
            tempImg.onload = () => {
                originalWidth = tempImg.naturalWidth; originalHeight = tempImg.naturalHeight;
                originalDimensionsDisplay.textContent = `Original: ${originalWidth}px x ${originalHeight}px`;
                if (displayWidthInput) displayWidthInput.max = originalWidth;
                if (displayHeightInput) displayHeightInput.max = originalHeight;
                if (ratioReferenceWidthInput) {
                    ratioReferenceWidthInput.max = originalWidth;
                    if (!ratioReferenceWidthInput.value || parseInt(ratioReferenceWidthInput.value, 10) <= 0) { ratioReferenceWidthInput.value = originalWidth; }
                    else { let currentRefWidth = parseInt(ratioReferenceWidthInput.value, 10); if (currentRefWidth > originalWidth) { ratioReferenceWidthInput.value = originalWidth; } }
                }
                initializeOrReinitializeCropper(); // Image loaded, re-init cropper
            };
            tempImg.onerror = () => { displayError('Could not load image dimensions.'); resetCropperUI(true); };
            tempImg.src = currentImageSrc;
        };
        reader.onerror = () => { displayError('Error reading file.'); resetCropperUI(true); };
        reader.readAsDataURL(file);
    }

    imageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) { handleImageFile(file); } else { resetCropperUI(true); }
    });

    const previewWrapper = document.querySelector('.ir-image-preview-wrapper');
    if (previewWrapper) { previewWrapper.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); previewWrapper.style.borderColor = 'var(--accent-color)'; }); previewWrapper.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); previewWrapper.style.borderColor = 'var(--border-color)'; }); previewWrapper.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); previewWrapper.style.borderColor = 'var(--border-color)'; const files = e.dataTransfer.files; if (files.length > 0) { imageUpload.files = files; handleImageFile(files[0]); } }); if (imageUploadPlaceholder) imageUploadPlaceholder.addEventListener('click', () => imageUpload.click()); previewWrapper.addEventListener('click', () => { if (!currentImageSrc) imageUpload.click(); }); }

    function resetCropperUI(fullReset = false) {
        if (cropper) { cropper.destroy(); cropper = null; }
        if (fullReset) { uploadedImageFile = null; currentImageSrc = null; lastCropData = null; originalWidth = 0; originalHeight = 0; fileNameDisplay.textContent = 'No image selected.'; imagePreview.src = "#"; imagePreview.style.visibility = 'hidden'; if (imageUploadPlaceholder) imageUploadPlaceholder.style.display = 'flex'; originalDimensionsDisplay.textContent = ''; if (ratioReferenceWidthInput) { ratioReferenceWidthInput.value = ''; ratioReferenceWidthInput.removeAttribute('max'); } if (displayWidthInput) displayWidthInput.removeAttribute('max'); if (displayHeightInput) displayHeightInput.removeAttribute('max'); }
        newDimensionsDisplay.textContent = 'Selection: N/A';
        if (displayWidthInput) displayWidthInput.value = ''; if (displayHeightInput) displayHeightInput.value = '';
        resizeButton.disabled = true; clearError();
        const isFreeModeActive = modeFreeRadio.checked;
        if (freeCropOptionsDiv) freeCropOptionsDiv.style.display = isFreeModeActive ? 'block' : 'none';
        if (ratioCropOptionsDiv) ratioCropOptionsDiv.style.display = !isFreeModeActive ? 'block' : 'none';
        if (displayWidthInput) displayWidthInput.readOnly = !isFreeModeActive;
        if (displayHeightInput) displayHeightInput.readOnly = !isFreeModeActive;

        // Ensure aspect ratio select is valid if switching to ratio mode or resetting
        if (!isFreeModeActive) {
            if (!aspectRatioSelect.value || parseFloat(aspectRatioSelect.value) <= 0) { // Check if value is truly invalid for a number based ratio
                const firstOption = aspectRatioSelect.options[0];
                if (firstOption) {
                    aspectRatioSelect.value = firstOption.value; // Default to the first actual ratio
                }
            }
        }
    }

    function updateModeUI() {
        const isFree = modeFreeRadio.checked;
        if (displayWidthInput) displayWidthInput.readOnly = !isFree;
        if (displayHeightInput) displayHeightInput.readOnly = !isFree;
        if (freeCropOptionsDiv) freeCropOptionsDiv.style.display = isFree ? 'block' : 'none';
        if (ratioCropOptionsDiv) ratioCropOptionsDiv.style.display = !isFree ? 'block' : 'none';

        if (!isFree) { // Switching TO Ratio mode or already in it
            // Ensure a valid fixed ratio is selected if the current one is somehow invalid
            // (e.g. if "original" is selected but no image is loaded, it defaults to 1 in initializeOrReinitializeCropper)
            // Or if aspectRatioSelect.value was programmatically set to something no longer valid.
            let isValidSelection = false;
            for (let i = 0; i < aspectRatioSelect.options.length; i++) {
                if (aspectRatioSelect.options[i].value === aspectRatioSelect.value) {
                    isValidSelection = true;
                    break;
                }
            }
            if (!isValidSelection && aspectRatioSelect.options.length > 0) {
                aspectRatioSelect.value = aspectRatioSelect.options[0].value; // Default to first available option
            }
        }

        if (currentImageSrc) {
            initializeOrReinitializeCropper();
        } else if (!isFree) {
            // If no image and switching to ratio mode, ensure cropper placeholder is shown
            // and maybe disable ratio width input until image is loaded.
            if (imageUploadPlaceholder) imageUploadPlaceholder.style.display = 'flex';
            imagePreview.style.visibility = 'hidden';
            if (cropper) { cropper.destroy(); cropper = null; } // Clear any existing cropper
        }
    }

    modeFreeRadio.addEventListener('change', updateModeUI);
    modeRatioRadio.addEventListener('change', updateModeUI);
    aspectRatioSelect.addEventListener('change', () => {
        if (modeRatioRadio.checked && currentImageSrc) initializeOrReinitializeCropper();
    });

    function handleDimensionInputChange() {
        if (isUpdatingInputsProgrammatically || !modeFreeRadio.checked || !cropper || !cropper.cropped || !originalWidth || !originalHeight) return;
        const currentCropData = cropper.getData(); let newWidth = parseInt(displayWidthInput.value, 10); let newHeight = parseInt(displayHeightInput.value, 10);
        let dataToSet = {}; let needsUpdate = false;
        if (!isNaN(newWidth)) { if (newWidth > originalWidth) { newWidth = originalWidth; displayWidthInput.value = newWidth; } if (newWidth < 1) newWidth = 1; if (newWidth !== Math.round(currentCropData.width)) { dataToSet.width = newWidth; needsUpdate = true; } }
        if (!isNaN(newHeight)) { if (newHeight > originalHeight) { newHeight = originalHeight; displayHeightInput.value = newHeight; } if (newHeight < 1) newHeight = 1; if (newHeight !== Math.round(currentCropData.height)) { dataToSet.height = newHeight; needsUpdate = true; } }
        if (needsUpdate) { dataToSet.x = currentCropData.x; dataToSet.y = currentCropData.y; if (dataToSet.width === undefined) dataToSet.width = currentCropData.width; if (dataToSet.height === undefined) dataToSet.height = currentCropData.height; cropper.setData(dataToSet); }
    }
    if (displayWidthInput) displayWidthInput.addEventListener('input', handleDimensionInputChange);
    if (displayHeightInput) displayHeightInput.addEventListener('input', handleDimensionInputChange);

    function handleRatioReferenceWidthChange() {
        if (isUpdatingRatioInputProgrammatically || !modeRatioRadio.checked || !cropper || /*!cropper.cropped ||*/ !originalWidth) { return; } // Allow update even if not fully cropped yet
        let targetWidth = parseInt(ratioReferenceWidthInput.value, 10);
        if (isNaN(targetWidth)) { if (ratioReferenceWidthInput.value.trim() !== "") { /* Maybe clear error or show small hint */ } return; }
        let capped = false; if (targetWidth > originalWidth) { targetWidth = originalWidth; capped = true; } if (targetWidth < 1) { targetWidth = 1; capped = true; }
        if (capped) { isUpdatingRatioInputProgrammatically = true; ratioReferenceWidthInput.value = targetWidth; isUpdatingRatioInputProgrammatically = false; }
        const currentAspectRatio = cropper.options.aspectRatio;
        if (!isNaN(currentAspectRatio) && currentAspectRatio > 0) {
            const currentCropperData = cropper.getData(); const targetHeight = Math.round(targetWidth / currentAspectRatio);
            if (Math.abs(targetWidth - Math.round(currentCropperData.width)) > 1 || Math.abs(targetHeight - Math.round(currentCropperData.height)) > 1) {
                if (targetHeight > 0 && targetHeight <= originalHeight) { cropper.setData({ width: targetWidth, height: targetHeight }); }
                else if (targetHeight > originalHeight) { const finalHeight = originalHeight; const finalWidth = Math.round(finalHeight * currentAspectRatio); isUpdatingRatioInputProgrammatically = true; ratioReferenceWidthInput.value = finalWidth; isUpdatingRatioInputProgrammatically = false; cropper.setData({ width: finalWidth, height: finalHeight }); }
            }
        }
    }
    if (ratioReferenceWidthInput) ratioReferenceWidthInput.addEventListener('input', handleRatioReferenceWidthChange);

    resizeButton.addEventListener('click', () => {
        if (!uploadedImageFile || !cropper || !cropper.cropped) { displayError('Upload image and select area.'); return; } clearError(); const cropData = cropper.getData(true); if (cropData.width <= 0 || cropData.height <= 0) { displayError('Invalid crop dimensions.'); return; }
        let outputWidth = cropData.width; let outputHeight = cropData.height;
        if (modeRatioRadio.checked && ratioReferenceWidthInput.value) { const targetRefWidth = parseInt(ratioReferenceWidthInput.value, 10); const safeTargetRefWidth = Math.min(targetRefWidth, originalWidth); if (safeTargetRefWidth > 0 && safeTargetRefWidth !== outputWidth) { const aspectRatio = cropData.width / cropData.height; if (aspectRatio > 0) { outputWidth = safeTargetRefWidth; outputHeight = Math.round(safeTargetRefWidth / aspectRatio); if (outputHeight > originalHeight) { outputHeight = originalHeight; outputWidth = Math.round(outputHeight * aspectRatio); } } } }
        if (outputWidth > 32000 || outputHeight > 32000 || outputWidth < 1 || outputHeight < 1) { displayError('Output dimensions invalid or too large (max 32000px).'); return; }

        // **MODIFICATION HERE**: Removed `fillColor: '#fff'` to preserve transparency
        const croppedCanvas = cropper.getCroppedCanvas({
            width: outputWidth,
            height: outputHeight,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });

        if (!croppedCanvas) { displayError('Could not generate cropped image.'); return; }
        let downloadMimeType = uploadedImageFile.type; if (downloadMimeType === 'image/gif' || downloadMimeType === 'image/bmp' || !['image/png', 'image/jpeg', 'image/webp'].includes(downloadMimeType)) { downloadMimeType = 'image/png'; }
        let quality = (downloadMimeType === 'image/jpeg' || downloadMimeType === 'image/webp') ? 0.92 : undefined;
        try {
            const dataUrl = croppedCanvas.toDataURL(downloadMimeType, quality); const link = document.createElement('a'); const originalBaseName = uploadedImageFile.name.substring(0, uploadedImageFile.name.lastIndexOf('.')) || 'image'; const extension = downloadMimeType.split('/')[1] || 'png'; link.download = `${originalBaseName}_cropped_${outputWidth}x${outputHeight}.${extension}`; link.href = dataUrl; document.body.appendChild(link); link.click(); document.body.removeChild(link); newDimensionsDisplay.textContent = `Cropped: ${outputWidth}px x ${outputHeight}px (Downloaded)`;
        } catch (e) { displayError(`Error generating image: ${e.message}. Try PNG format.`); console.error("Canvas error:", e); }
    });

    resetCropperUI(true); // Initial call
    updateModeUI(); // Ensure UI consistency on load
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initImageResizer); }
else { initImageResizer(); }