/*!
 * Non-Commercial Software License
 * 
 * Copyright (c) 2025 Amos Weiskopf
 * 
 * This file is licensed for non-commercial use only. Use, modification, and distribution 
 * are permitted for non-commercial purposes provided that this notice and a link to 
 * https://safe2pdf.com are included in all copies or substantial portions of the Software.
 * 
 * For any commercial use, please contact the copyright holder to obtain a commercial license.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
 */
document.addEventListener("DOMContentLoaded", () => {
  const dropArea                = document.getElementById('drop-area');
  const fileInput               = document.getElementById('file-upload');
  const uploadedImagesContainer = document.getElementById('uploaded-images');
  const generatePdfButton       = document.getElementById('generate-pdf');
  const pdfPreviewIframe        = document.getElementById('pdf-preview-iframe');
  let uploadedFiles = new Map();
  
  const sortable = new Sortable(uploadedImagesContainer, {
	animation: 150,
	onEnd: () => {
	  rebuildFileOrder();
	  updatePdfPreview();
	},
  });
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
	dropArea.addEventListener(eventName, preventDefaults);
  });
  function preventDefaults(e) {
	e.preventDefault();
	e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
	dropArea.addEventListener(eventName, () => {
	  dropArea.classList.add('border-[#10B981]', 'bg-[#3B82F6]/20');
	});
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
	dropArea.addEventListener(eventName, () => {
	  dropArea.classList.remove('border-[#10B981]', 'bg-[#3B82F6]/20');
	});
  });
  
  dropArea.addEventListener('drop', e => {
	const files = e.dataTransfer.files;
	handleFiles(files);
  });
  
  fileInput.addEventListener('change', () => {
	handleFiles(fileInput.files);
  });
  function handleFiles(files) {
	Array.from(files).forEach(file => {
	  const isImage = file.type.startsWith('image/');
	  const isPdf   = file.type === 'application/pdf';
	  if (!isImage && !isPdf) {
		console.warn(`${file.name} is not an image or PDF.`);
		return;
	  }
	  
	  if (uploadedFiles.size >= 10) {
		console.warn('You can upload up to 10 files in Free Mode.');
		return;
	  }
	  if (!uploadedFiles.has(file.name)) {
		uploadedFiles.set(file.name, { file, type: isImage ? 'image' : 'pdf' });
		previewFile(file, isImage, isPdf);
	  }
	});
	toggleGenerateButton();
	updatePdfPreview();
  }
  async function previewFile(file, isImage, isPdf) {
	const div = document.createElement('div');
	div.classList.add('relative', 'group', 'draggable-item', 'flex', 'flex-col', 'items-center');
	div.dataset.fileName = file.name;
	
	const nameLabel = document.createElement('div');
	nameLabel.classList.add('text-sm', 'mb-2', 'max-w-[150px]', 'overflow-hidden', 'overflow-ellipsis', 'whitespace-nowrap');
	nameLabel.textContent = file.name;
	div.appendChild(nameLabel);
	let previewEl;
	if (isImage) {
	  previewEl = document.createElement('img');
	  previewEl.alt = file.name;
	  previewEl.classList.add('w-[150px]', 'h-[150px]', 'object-cover', 'rounded-md', 'shadow-md');
	  const reader = new FileReader();
	  reader.onloadend = () => {
		previewEl.src = reader.result;
	  };
	  reader.readAsDataURL(file);
	} else if (isPdf) {
	  
	  previewEl = document.createElement('img');
	  previewEl.alt = file.name;
	  previewEl.classList.add('w-[150px]', 'h-[150px]', 'object-cover', 'rounded-md', 'shadow-md');
	  const thumb = await renderPdfFirstPage(file);
	  previewEl.src = thumb || 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
		<svg width="150" height="150" viewBox="0 0 24 24" fill="#999" xmlns="http://www.w3.org/2000/svg">
		  <path d="M4 2h10l6 6v14H4V2zm10 1.5V9h4.5L14 3.5zM6 12h12v2H6v-2zm0 4h12v2H6v-2zM6 8h5v2H6V8z" />
		</svg>
	  `);
	}
	div.appendChild(previewEl);
	
	const removeButton = document.createElement('button');
	removeButton.innerHTML = '&times;';
	removeButton.classList.add(
	  'absolute', 'top-1', 'right-1', 'bg-red-500', 'text-white', 'rounded-full',
	  'px-2', 'py-0', 'opacity-0', 'group-hover:opacity-100', 'transition-opacity', 'duration-300'
	);
	removeButton.addEventListener('click', () => {
	  uploadedFiles.delete(file.name);
	  div.remove();
	  toggleGenerateButton();
	  updatePdfPreview();
	});
	div.appendChild(removeButton);
	uploadedImagesContainer.appendChild(div);
  }
  
  async function renderPdfFirstPage(file) {
	try {
	  const arrayBuffer = await file.arrayBuffer();
	  const pdfDoc      = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
	  const page        = await pdfDoc.getPage(1);
	  const scale       = 1.0;
	  const viewport    = page.getViewport({ scale });
	  const canvas  = document.createElement('canvas');
	  const context = canvas.getContext('2d');
	  canvas.width  = viewport.width;
	  canvas.height = viewport.height;
	  const renderTask = page.render({ canvasContext: context, viewport });
	  await renderTask.promise;
	  return canvas.toDataURL();
	} catch (err) {
	  console.warn('Error rendering PDF thumbnail:', err);
	  return null;
	}
  }
  function toggleGenerateButton() {
	generatePdfButton.disabled = (uploadedFiles.size === 0);
  }
  
  function rebuildFileOrder() {
	const items = document.querySelectorAll('.draggable-item');
	const newFiles = new Map();
	items.forEach(item => {
	  const fileName = item.dataset.fileName;
	  if (uploadedFiles.has(fileName)) {
		newFiles.set(fileName, uploadedFiles.get(fileName));
	  }
	});
	uploadedFiles = newFiles;
  }
  
  const pageSizeSelect    = document.getElementById('page-size');
  const orientationInputs = document.querySelectorAll('input[name="orientation"]');
  const marginTopInput    = document.getElementById('margin-top');
  const marginRightInput  = document.getElementById('margin-right');
  const marginBottomInput = document.getElementById('margin-bottom');
  const marginLeftInput   = document.getElementById('margin-left');
  const enablePasswordCheckbox   = document.getElementById('enable-password');
  const passwordFieldsContainer  = document.getElementById('password-fields');
  const pdfPasswordInput         = document.getElementById('pdf-password');
  const pdfPasswordConfirmInput  = document.getElementById('pdf-password-confirm');
  const enablePageNumbersCheckbox = document.getElementById('enable-page-numbers');
  const pageNumbersPositionDiv    = document.getElementById('page-numbers-position');
  const pageNumberPositionInputs  = document.querySelectorAll('input[name="page-number-position"]');
  const docTitleInput   = document.getElementById('doc-title');
  const docAuthorInput  = document.getElementById('doc-author');
  const docSubjectInput = document.getElementById('doc-subject');
  const docDateInput    = document.getElementById('doc-date');
  const configInputs = [
	pageSizeSelect, marginTopInput, marginRightInput, marginBottomInput, marginLeftInput,
	docTitleInput, docAuthorInput, docSubjectInput, docDateInput
  ];
  orientationInputs.forEach(input => {
	input.addEventListener('change', updatePdfPreview);
  });
  pageNumberPositionInputs.forEach(input => {
	input.addEventListener('change', updatePdfPreview);
  });
  configInputs.forEach(elem => {
	if (!elem) return;
	elem.addEventListener('change', updatePdfPreview);
	elem.addEventListener('input', updatePdfPreview);
  });
  
  if (docDateInput) {
	const today = new Date().toISOString().substring(0, 10);
	docDateInput.value = today;
  }
  
  if (enablePasswordCheckbox && passwordFieldsContainer) {
	enablePasswordCheckbox.addEventListener('change', () => {
	  passwordFieldsContainer.classList.toggle('hidden', !enablePasswordCheckbox.checked);
	  [pdfPasswordInput, pdfPasswordConfirmInput].forEach(inp => {
		inp.disabled = !enablePasswordCheckbox.checked;
	  });
	  updatePdfPreview();
	});
  }
  
  if (enablePageNumbersCheckbox && pageNumbersPositionDiv) {
	enablePageNumbersCheckbox.addEventListener('change', () => {
	  pageNumbersPositionDiv.classList.toggle('hidden', !enablePageNumbersCheckbox.checked);
	  updatePdfPreview();
	});
  }
  
  async function buildPdfBytes() {
	const { PDFDocument, rgb } = PDFLib;
	const pdfDoc = await PDFDocument.create();
	
	if (docTitleInput?.value)   pdfDoc.setTitle(docTitleInput.value);
	if (docAuthorInput?.value)  pdfDoc.setAuthor(docAuthorInput.value);
	if (docSubjectInput?.value) pdfDoc.setSubject(docSubjectInput.value);
	if (docDateInput?.value) {
	  try {
		const chosenDate = new Date(docDateInput.value);
		if (!isNaN(chosenDate.getTime())) {
		  pdfDoc.setCreationDate(chosenDate);
		}
	  } catch {}
	}
	
	const pageSizeChoice  = pageSizeSelect?.value || 'letter';
	const orientation     = [...orientationInputs].find(r => r.checked)?.value || 'portrait';
	const marginTop       = parseFloat(marginTopInput?.value) || 0.5;
	const marginRight     = parseFloat(marginRightInput?.value) || 0.5;
	const marginBottom    = parseFloat(marginBottomInput?.value) || 0.5;
	const marginLeft      = parseFloat(marginLeftInput?.value) || 0.5;
	const inToPt = inches => inches * 72;
	const sizeMap = {
	  letter: { width: 612, height: 792 },
	  legal:  { width: 612, height: 1008 },
	  a4:     { width: 595, height: 842 },
	};
	let { width: baseW, height: baseH } = sizeMap[pageSizeChoice] || sizeMap.letter;
	if (orientation === 'landscape') {
	  [baseW, baseH] = [baseH, baseW];
	}
	const contentW = baseW - inToPt(marginLeft) - inToPt(marginRight);
	const contentH = baseH - inToPt(marginTop)  - inToPt(marginBottom);
	
	const addPageNumbers = enablePageNumbersCheckbox?.checked;
	let pageNumberPosition = 'bottom-left';
	if (addPageNumbers) {
	  pageNumberPosition = [...pageNumberPositionInputs].find(r => r.checked)?.value || 'bottom-left';
	}
	
	let pageIndex = 1;
	for (const { file, type } of uploadedFiles.values()) {
	  const fileBytes = await file.arrayBuffer();
	  if (type === 'pdf') {
		
		try {
		  const srcPdf = await PDFDocument.load(fileBytes);
		  const copiedPages = await pdfDoc.copyPages(srcPdf, srcPdf.getPageIndices());
		  for (const newPage of copiedPages) {
			pdfDoc.addPage(newPage);
			if (addPageNumbers) {
			  const pageRef = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
			  const text = `${pageIndex}`;
			  const fontSize = 12;
			  const { width, height } = pageRef.getSize();
			  let xPos = inToPt(marginLeft) + 10;
			  let yPos = inToPt(marginBottom) + 10;
			  if (pageNumberPosition === 'bottom-right') {
				xPos = width - inToPt(marginRight) - 20;
			  }
			  pageRef.drawText(text, {
				x: xPos,
				y: yPos,
				size: fontSize,
				color: rgb(0, 0, 0),
			  });
			}
			pageIndex++;
		  }
		} catch (err) {
		  console.warn(`Could not merge PDF ${file.name}:`, err);
		}
	  } else {
		
		let image;
		if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
		  image = await pdfDoc.embedJpg(fileBytes);
		} else if (file.type === 'image/png') {
		  image = await pdfDoc.embedPng(fileBytes);
		} else {
		  console.warn(`${file.name} is not a supported image type.`);
		  continue;
		}
		const _wm = "\u200B\u200D";
		const dims = image.scale(1);
		let imgW = dims.width;
		let imgH = dims.height;
		const wRatio = contentW / imgW;
		const hRatio = contentH / imgH;
		const scaleFactor = Math.min(wRatio, hRatio, 1);
		imgW *= scaleFactor;
		imgH *= scaleFactor;
		const page = pdfDoc.addPage([baseW, baseH]);
		page.drawImage(image, {
		  x: inToPt(marginLeft) + (contentW - imgW) / 2,
		  y: inToPt(marginBottom) + (contentH - imgH) / 2,
		  width: imgW,
		  height: imgH,
		});
		if (addPageNumbers) {
		  const text = `${pageIndex}`;
		  const fontSize = 12;
		  let xPos = inToPt(marginLeft) + 10;
		  let yPos = inToPt(marginBottom) + 10;
		  if (pageNumberPosition === 'bottom-right') {
			xPos = baseW - inToPt(marginRight) - 20;
		  }
		  page.drawText(text, {
			x: xPos,
			y: yPos,
			size: fontSize,
			color: rgb(0, 0, 0),
		  });
		}
		pageIndex++;
	  }
	}
	
	if (enablePasswordCheckbox?.checked) {
	  const userPassword = pdfPasswordInput.value;
	  const confirmPass  = pdfPasswordConfirmInput.value;
	  if (userPassword && userPassword === confirmPass) {
		console.warn('pdf-lib does not currently support encryption. (Placeholder only)');
	  } else if (userPassword !== confirmPass && userPassword) {
		console.warn('Passwords do not match; skipping password protection.');
	  }
	}
	return await pdfDoc.save();
  }
  
  async function updatePdfPreview() {
	if (!pdfPreviewIframe || uploadedFiles.size === 0) return;
	try {
	  const pdfBytes = await buildPdfBytes();
	  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
	  const url = URL.createObjectURL(blob);
	  pdfPreviewIframe.src = url;
	  
	  setTimeout(() => URL.revokeObjectURL(url), 2000);
	} catch (error) {
	  console.error('Error updating PDF preview:', error);
	}
  }
  
  generatePdfButton.addEventListener('click', async () => {
	if (uploadedFiles.size === 0) return;
	try {
	  const pdfBytes = await buildPdfBytes();
	  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
	  const url = URL.createObjectURL(blob);
	  
	  if (pdfPreviewIframe) {
		pdfPreviewIframe.src = url;
	  }
	  
	  const a = document.createElement('a');
	  a.href = url;
	  a.download = 'merged.pdf';
	  document.body.appendChild(a);
	  a.click();
	  document.body.removeChild(a);
	  setTimeout(() => URL.revokeObjectURL(url), 1500);
	  console.log('PDF generated successfully!');
	} catch (err) {
	  console.error('Failed to generate PDF:', err);
	}
  });
});
