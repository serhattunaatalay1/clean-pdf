// CleanPDF — Minimalist & Local-First PDF Suite
document.addEventListener('DOMContentLoaded', () => {
  // Initialize PDF.js offline worker
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
  }

  /* ==========================================================================
     Tab Navigation (Segmented Control)
     ========================================================================== */
  const segmentBtns = document.querySelectorAll('.segment-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  segmentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      segmentBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById(`tab-${target}`);
      if (panel) panel.classList.add('active');
    });
  });

  /* ==========================================================================
     UI Notification & Progress
     ========================================================================== */
  const toastEl = document.getElementById('toast');
  let toastTimer = null;

  function showToast(message, type = 'info') {
    if (toastTimer) clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.className = `toast ${type}`;
    toastEl.classList.remove('hidden');
    toastTimer = setTimeout(() => {
      toastEl.classList.add('hidden');
    }, 3200);
  }

  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');

  function showLoading(text = 'İşleniyor...') {
    loadingText.textContent = text;
    loadingOverlay.classList.remove('hidden');
  }

  function hideLoading() {
    loadingOverlay.classList.add('hidden');
  }

  function downloadBlob(uint8Array, filename, mimeType = 'application/pdf') {
    const blob = new Blob([uint8Array], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function setupDropzone(dropzoneId, inputId, onFilesSelected) {
    const dropzone = document.getElementById(dropzoneId);
    const input = document.getElementById(inputId);

    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFilesSelected(e.dataTransfer.files);
      }
    });

    input.addEventListener('change', () => {
      if (input.files && input.files.length > 0) {
        onFilesSelected(input.files);
        input.value = '';
      }
    });
  }

  /* ==========================================================================
     MODULE 1: SAYFA AYIKLA & BÖL (Görsel Sayfa Seçimli + ZIP Desteği)
     ========================================================================== */
  let splitData = null; // { name, bytes, pdfLibDoc, pdfJsDoc, totalPages, selectedIndices: Set<number> }
  const splitDropzone = document.getElementById('split-dropzone');
  const splitWorkspace = document.getElementById('split-workspace');
  const splitFileNameEl = document.getElementById('split-file-name');
  const splitTotalPagesEl = document.getElementById('split-total-pages');
  const splitRangeInput = document.getElementById('split-range-input');
  const splitPagesGrid = document.getElementById('split-pages-grid');
  const splitSelectedSummary = document.getElementById('split-selected-summary');
  const splitActionBtn = document.getElementById('split-action-btn');
  const splitZipBtn = document.getElementById('split-zip-btn');
  const splitFilenameInput = document.getElementById('split-filename');
  const splitResetBtn = document.getElementById('split-reset-btn');

  setupDropzone('split-dropzone', 'split-input', async (files) => {
    const file = files[0];
    if (!file || (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf')) {
      showToast('Lütfen geçerli bir PDF dosyası seçin.', 'error');
      return;
    }

    showLoading('PDF sayfaları yükleniyor...');
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdfLibDoc = await PDFLib.PDFDocument.load(bytes);
      const pdfJsDoc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
      const totalPages = pdfJsDoc.numPages;

      splitData = {
        name: file.name,
        bytes,
        pdfLibDoc,
        pdfJsDoc,
        totalPages,
        selectedIndices: new Set([0]) // Varsayılan olarak 1. sayfa seçili
      };

      splitFileNameEl.textContent = file.name;
      splitTotalPagesEl.textContent = `${totalPages} SAYFA`;
      splitDropzone.classList.add('hidden');
      splitWorkspace.classList.remove('hidden');

      renderSplitGrid();
      syncRangeInputFromSelection();
      showToast(`${totalPages} sayfalık belge hazır.`, 'success');
    } catch (err) {
      console.error(err);
      showToast('PDF okunamadı: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  });

  splitResetBtn.addEventListener('click', () => {
    splitData = null;
    splitWorkspace.classList.add('hidden');
    splitDropzone.classList.remove('hidden');
  });

  function renderSplitGrid() {
    splitPagesGrid.innerHTML = '';

    for (let i = 0; i < splitData.totalPages; i++) {
      const isSelected = splitData.selectedIndices.has(i);
      const card = document.createElement('div');
      card.className = `page-thumb-card ${isSelected ? 'selected' : ''}`;
      card.id = `split-card-${i}`;

      card.innerHTML = `
        <div class="card-check">${isSelected ? '✓' : ''}</div>
        <div class="thumb-preview-box">
          <canvas id="split-canvas-${i}"></canvas>
        </div>
        <div class="card-footer">
          <span>Sayfa ${i + 1}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        if (splitData.selectedIndices.has(i)) {
          splitData.selectedIndices.delete(i);
        } else {
          splitData.selectedIndices.add(i);
        }
        updateCardSelectionState(i);
        syncRangeInputFromSelection();
      });

      splitPagesGrid.appendChild(card);
      renderPageThumbnail(splitData.pdfJsDoc, i + 1, document.getElementById(`split-canvas-${i}`));
    }

    updateSelectedSummary();
  }

  function updateCardSelectionState(index) {
    const card = document.getElementById(`split-card-${index}`);
    if (!card) return;
    const isSelected = splitData.selectedIndices.has(index);
    card.classList.toggle('selected', isSelected);
    const check = card.querySelector('.card-check');
    if (check) check.textContent = isSelected ? '✓' : '';
    updateSelectedSummary();
  }

  function updateSelectedSummary() {
    const count = splitData ? splitData.selectedIndices.size : 0;
    splitSelectedSummary.textContent = `${count} sayfa seçildi`;
    const label = document.getElementById('split-action-label');
    if (label) {
      label.textContent = count > 0 ? `Seçilen Sayfaları İndir (${count})` : 'Sayfa Seçin';
    }
  }

  // Set -> Range String (örn: "1-3, 5")
  function syncRangeInputFromSelection() {
    if (!splitData) return;
    const sorted = Array.from(splitData.selectedIndices).sort((a, b) => a - b).map(x => x + 1);
    if (sorted.length === 0) {
      splitRangeInput.value = '';
      return;
    }

    const ranges = [];
    let start = sorted[0];
    let end = start;

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = sorted[i];
        end = start;
      }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    splitRangeInput.value = ranges.join(', ');
  }

  // Range String -> Set
  splitRangeInput.addEventListener('input', () => {
    if (!splitData) return;
    const val = splitRangeInput.value.trim();
    if (!val) {
      splitData.selectedIndices.clear();
      for (let i = 0; i < splitData.totalPages; i++) {
        updateCardSelectionState(i);
      }
      return;
    }

    try {
      const parts = val.split(',');
      const newIndices = new Set();
      for (let part of parts) {
        part = part.trim();
        if (!part) continue;
        if (part.includes('-')) {
          const [s, e] = part.split('-').map(x => parseInt(x.trim(), 10));
          if (!isNaN(s) && !isNaN(e)) {
            const min = Math.max(1, Math.min(s, e));
            const max = Math.min(splitData.totalPages, Math.max(s, e));
            for (let k = min; k <= max; k++) newIndices.add(k - 1);
          }
        } else {
          const num = parseInt(part, 10);
          if (!isNaN(num) && num >= 1 && num <= splitData.totalPages) {
            newIndices.add(num - 1);
          }
        }
      }
      splitData.selectedIndices = newIndices;
      for (let i = 0; i < splitData.totalPages; i++) {
        updateCardSelectionState(i);
      }
    } catch (e) {
      // Input typing parse error tolerated
    }
  });

  // Hızlı Seçim Butonları
  document.getElementById('split-select-all').addEventListener('click', () => {
    if (!splitData) return;
    for (let i = 0; i < splitData.totalPages; i++) splitData.selectedIndices.add(i);
    for (let i = 0; i < splitData.totalPages; i++) updateCardSelectionState(i);
    syncRangeInputFromSelection();
  });

  document.getElementById('split-clear-selection').addEventListener('click', () => {
    if (!splitData) return;
    splitData.selectedIndices.clear();
    for (let i = 0; i < splitData.totalPages; i++) updateCardSelectionState(i);
    syncRangeInputFromSelection();
  });

  document.getElementById('split-select-odd').addEventListener('click', () => {
    if (!splitData) return;
    splitData.selectedIndices.clear();
    for (let i = 0; i < splitData.totalPages; i++) {
      if ((i + 1) % 2 !== 0) splitData.selectedIndices.add(i);
    }
    for (let i = 0; i < splitData.totalPages; i++) updateCardSelectionState(i);
    syncRangeInputFromSelection();
  });

  document.getElementById('split-select-even').addEventListener('click', () => {
    if (!splitData) return;
    splitData.selectedIndices.clear();
    for (let i = 0; i < splitData.totalPages; i++) {
      if ((i + 1) % 2 === 0) splitData.selectedIndices.add(i);
    }
    for (let i = 0; i < splitData.totalPages; i++) updateCardSelectionState(i);
    syncRangeInputFromSelection();
  });

  // Seçilenleri Tek PDF Olarak İndir
  splitActionBtn.addEventListener('click', async () => {
    if (!splitData || splitData.selectedIndices.size === 0) {
      showToast('Lütfen ayıklanacak en az 1 sayfa seçin.', 'error');
      return;
    }

    showLoading('Sayfalar ayıklanıyor...');
    try {
      const sortedIndices = Array.from(splitData.selectedIndices).sort((a, b) => a - b);
      const newPdf = await PDFLib.PDFDocument.create();
      const copied = await newPdf.copyPages(splitData.pdfLibDoc, sortedIndices);
      copied.forEach(p => newPdf.addPage(p));

      const outBytes = await newPdf.save();
      const filename = splitFilenameInput.value.trim() || 'ayiklanmis.pdf';
      downloadBlob(outBytes, filename.endsWith('.pdf') ? filename : filename + '.pdf');
      showToast(`${sortedIndices.length} sayfa PDF olarak indirildi.`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Ayıklama hatası: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  });

  // Her Sayfayı Ayrı PDF Olarak ZIP İndir
  splitZipBtn.addEventListener('click', async () => {
    if (!splitData || splitData.selectedIndices.size === 0) {
      showToast('Lütfen dışa aktarılacak en az 1 sayfa seçin.', 'error');
      return;
    }
    if (!window.JSZip) {
      showToast('ZIP kütüphanesi yüklenemedi.', 'error');
      return;
    }

    showLoading('Sayfalar tek tek ZIP arşivine paketleniyor...');
    try {
      const zip = new JSZip();
      const sortedIndices = Array.from(splitData.selectedIndices).sort((a, b) => a - b);
      const baseName = splitData.name.replace(/\.[^/.]+$/, '');

      for (const idx of sortedIndices) {
        const singlePdf = await PDFLib.PDFDocument.create();
        const [p] = await singlePdf.copyPages(splitData.pdfLibDoc, [idx]);
        singlePdf.addPage(p);
        const bytes = await singlePdf.save();
        zip.file(`${baseName}-sayfa-${idx + 1}.pdf`, bytes);
      }

      const zipBlob = await zip.generateAsync({ type: 'uint8array' });
      downloadBlob(zipBlob, `${baseName}-ayiklanmis-sayfalar.zip`, 'application/zip');
      showToast(`${sortedIndices.length} sayfa ayrı ayrı ZIP olarak indirildi.`, 'success');
    } catch (err) {
      console.error(err);
      showToast('ZIP oluşturma hatası: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  });

  async function renderPageThumbnail(pdfJsDoc, pageNum, canvas) {
    try {
      const page = await pdfJsDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 0.32 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (e) {
      console.warn(`Thumbnail render error on page ${pageNum}:`, e);
    }
  }

  /* ==========================================================================
     MODULE 2: PDF BİRLEŞTİR (Merge)
     ========================================================================== */
  let mergeList = []; // { file, name, size, bytes }
  const mergeDropzone = document.getElementById('merge-dropzone');
  const mergeWorkspace = document.getElementById('merge-workspace');
  const mergeCountLabel = document.getElementById('merge-count-label');
  const mergeFileList = document.getElementById('merge-file-list');
  const mergeClearBtn = document.getElementById('merge-clear-btn');
  const mergeActionBtn = document.getElementById('merge-action-btn');
  const mergeFilenameInput = document.getElementById('merge-filename');

  setupDropzone('merge-dropzone', 'merge-input', async (files) => {
    showLoading('PDF dosyaları yükleniyor...');
    try {
      for (const file of Array.from(files)) {
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          const bytes = new Uint8Array(await file.arrayBuffer());
          mergeList.push({
            file,
            name: file.name,
            size: file.size,
            bytes
          });
        }
      }
      renderMergeStack();
      showToast(`${mergeList.length} dosya eklendi.`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Dosya yükleme hatası: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  });

  function renderMergeStack() {
    if (mergeList.length === 0) {
      mergeWorkspace.classList.add('hidden');
      return;
    }
    mergeWorkspace.classList.remove('hidden');
    mergeCountLabel.textContent = `${mergeList.length} DOSYA SEÇİLDİ`;
    mergeFileList.innerHTML = '';

    mergeList.forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = 'stack-item';
      li.innerHTML = `
        <div class="stack-item-left">
          <span class="stack-index">${idx + 1}.</span>
          <span class="stack-name" title="${item.name}">${item.name}</span>
          <span class="stack-size">${formatBytes(item.size)}</span>
        </div>
        <div class="stack-actions">
          <button class="micro-btn up-btn" title="Yukarı" ${idx === 0 ? 'disabled' : ''}>↑</button>
          <button class="micro-btn down-btn" title="Aşağı" ${idx === mergeList.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="micro-btn remove-btn" title="Kaldır">✕</button>
        </div>
      `;

      li.querySelector('.up-btn').addEventListener('click', () => {
        if (idx > 0) {
          const temp = mergeList[idx];
          mergeList[idx] = mergeList[idx - 1];
          mergeList[idx - 1] = temp;
          renderMergeStack();
        }
      });

      li.querySelector('.down-btn').addEventListener('click', () => {
        if (idx < mergeList.length - 1) {
          const temp = mergeList[idx];
          mergeList[idx] = mergeList[idx + 1];
          mergeList[idx + 1] = temp;
          renderMergeStack();
        }
      });

      li.querySelector('.remove-btn').addEventListener('click', () => {
        mergeList.splice(idx, 1);
        renderMergeStack();
      });

      mergeFileList.appendChild(li);
    });
  }

  mergeClearBtn.addEventListener('click', () => {
    mergeList = [];
    renderMergeStack();
  });

  mergeActionBtn.addEventListener('click', async () => {
    if (mergeList.length < 2) {
      showToast('Birleştirmek için en az 2 PDF ekleyin.', 'error');
      return;
    }

    showLoading('PDF belgeleri birleştiriliyor...');
    try {
      const mergedPdf = await PDFLib.PDFDocument.create();
      for (const item of mergeList) {
        const src = await PDFLib.PDFDocument.load(item.bytes);
        const copied = await mergedPdf.copyPages(src, src.getPageIndices());
        copied.forEach(p => mergedPdf.addPage(p));
      }

      const outBytes = await mergedPdf.save();
      const fn = mergeFilenameInput.value.trim() || 'birlestirilmis.pdf';
      downloadBlob(outBytes, fn.endsWith('.pdf') ? fn : fn + '.pdf');
      showToast('Belgeler birleştirildi ve indirildi.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Birleştirme hatası: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  });

  /* ==========================================================================
     MODULE 3: DÜZENLE & ÇEVİR (Organize & Rotate)
     ========================================================================== */
  let organizeData = null; // { name, bytes, pdfLibDoc, pdfJsDoc, pages: [{ pageIndex, rotation, isDeleted }] }
  const organizeWorkspace = document.getElementById('organize-workspace');
  const organizeFilenameEl = document.getElementById('organize-filename');
  const organizePageCountEl = document.getElementById('organize-page-count');
  const pagesGrid = document.getElementById('pages-grid');
  const rotateAllBtn = document.getElementById('rotate-all-btn');
  const resetOrganizeBtn = document.getElementById('reset-organize-btn');
  const organizeActionBtn = document.getElementById('organize-action-btn');
  const organizeOutFilenameInput = document.getElementById('organize-out-filename');

  setupDropzone('organize-dropzone', 'organize-input', async (files) => {
    const file = files[0];
    if (!file || (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf')) {
      showToast('Lütfen geçerli bir PDF dosyası seçin.', 'error');
      return;
    }

    showLoading('PDF sayfaları hazırlanıyor...');
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdfLibDoc = await PDFLib.PDFDocument.load(bytes);
      const pdfJsDoc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
      const count = pdfJsDoc.numPages;

      const pages = [];
      for (let i = 0; i < count; i++) {
        pages.push({ pageIndex: i, rotation: 0, isDeleted: false });
      }

      organizeData = { name: file.name, bytes, pdfLibDoc, pdfJsDoc, pages };
      organizeFilenameEl.textContent = file.name;
      organizePageCountEl.textContent = `${count} SAYFA`;
      organizeWorkspace.classList.remove('hidden');

      renderOrganizeGrid();
      showToast(`${count} sayfa yüklendi.`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Hata: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  });

  function renderOrganizeGrid() {
    pagesGrid.innerHTML = '';

    organizeData.pages.forEach((pageInfo, i) => {
      const card = document.createElement('div');
      card.className = `page-thumb-card ${pageInfo.isDeleted ? 'deleted' : ''}`;
      card.id = `org-card-${i}`;

      card.innerHTML = `
        <div class="thumb-preview-box">
          <canvas id="org-canvas-${i}"></canvas>
        </div>
        <div class="card-footer">
          <span>Sayfa ${pageInfo.pageIndex + 1}</span>
          <div class="card-actions">
            <button class="micro-btn rotate-single" title="90° Çevir">↻</button>
            <button class="micro-btn delete-single" title="${pageInfo.isDeleted ? 'Geri Al' : 'Sil'}">${pageInfo.isDeleted ? '↩' : '✕'}</button>
          </div>
        </div>
      `;

      card.querySelector('.rotate-single').addEventListener('click', (e) => {
        e.stopPropagation();
        pageInfo.rotation = (pageInfo.rotation + 90) % 360;
        const cvs = document.getElementById(`org-canvas-${i}`);
        if (cvs) cvs.style.transform = `rotate(${pageInfo.rotation}deg)`;
      });

      card.querySelector('.delete-single').addEventListener('click', (e) => {
        e.stopPropagation();
        pageInfo.isDeleted = !pageInfo.isDeleted;
        card.classList.toggle('deleted', pageInfo.isDeleted);
        card.querySelector('.delete-single').textContent = pageInfo.isDeleted ? '↩' : '✕';
      });

      pagesGrid.appendChild(card);
      renderPageThumbnail(organizeData.pdfJsDoc, pageInfo.pageIndex + 1, document.getElementById(`org-canvas-${i}`));
    });
  }

  rotateAllBtn.addEventListener('click', () => {
    if (!organizeData) return;
    organizeData.pages.forEach((p, idx) => {
      p.rotation = (p.rotation + 90) % 360;
      const cvs = document.getElementById(`org-canvas-${idx}`);
      if (cvs) cvs.style.transform = `rotate(${p.rotation}deg)`;
    });
  });

  resetOrganizeBtn.addEventListener('click', () => {
    if (!organizeData) return;
    organizeData.pages.forEach((p, idx) => {
      p.rotation = 0;
      p.isDeleted = false;
      const card = document.getElementById(`org-card-${idx}`);
      if (card) {
        card.classList.remove('deleted');
        const delBtn = card.querySelector('.delete-single');
        if (delBtn) delBtn.textContent = '✕';
      }
      const cvs = document.getElementById(`org-canvas-${idx}`);
      if (cvs) cvs.style.transform = 'rotate(0deg)';
    });
  });

  organizeActionBtn.addEventListener('click', async () => {
    if (!organizeData) return;
    const active = organizeData.pages.filter(p => !p.isDeleted);
    if (active.length === 0) {
      showToast('En az bir sayfa kalmalıdır.', 'error');
      return;
    }

    showLoading('Düzenlenmiş PDF oluşturuluyor...');
    try {
      const newPdf = await PDFLib.PDFDocument.create();
      const indices = active.map(p => p.pageIndex);
      const copied = await newPdf.copyPages(organizeData.pdfLibDoc, indices);

      copied.forEach((cp, i) => {
        const rot = active[i].rotation;
        if (rot !== 0) {
          const cur = cp.getRotation().angle;
          cp.setRotation(PDFLib.degrees((cur + rot) % 360));
        }
        newPdf.addPage(cp);
      });

      const outBytes = await newPdf.save();
      const fn = organizeOutFilenameInput.value.trim() || 'duzenlenmis.pdf';
      downloadBlob(outBytes, fn.endsWith('.pdf') ? fn : fn + '.pdf');
      showToast('Düzenlenmiş PDF kaydedildi.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Hata: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  });

  /* ==========================================================================
     MODULE 4: GÖRSELDEN PDF (Image to PDF)
     ========================================================================== */
  let imgList = []; // { file, name, dataUrl, width, height }
  const imgWorkspace = document.getElementById('img-workspace');
  const imgCountLabel = document.getElementById('img-count-label');
  const imgGrid = document.getElementById('img-grid');
  const imgClearBtn = document.getElementById('img-clear-btn');
  const imgActionBtn = document.getElementById('img-action-btn');
  const imgPageSizeSelect = document.getElementById('img-page-size');
  const imgFilenameInput = document.getElementById('img-filename');

  setupDropzone('img-dropzone', 'img-input', async (files) => {
    showLoading('Görseller işleniyor...');
    try {
      for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
          const dataUrl = await readFileAsDataUrl(file);
          const { width, height } = await getImageDimensions(dataUrl);
          imgList.push({ file, name: file.name, dataUrl, width, height });
        }
      }
      renderGallery();
      showToast(`${imgList.length} görsel eklendi.`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Görsel yükleme hatası: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  });

  function readFileAsDataUrl(file) {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
  }

  function getImageDimensions(dataUrl) {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => res({ width: img.naturalWidth, height: img.naturalHeight });
      img.src = dataUrl;
    });
  }

  function renderGallery() {
    if (imgList.length === 0) {
      imgWorkspace.classList.add('hidden');
      return;
    }
    imgWorkspace.classList.remove('hidden');
    imgCountLabel.textContent = `${imgList.length} GÖRSEL EKLENDİ`;
    imgGrid.innerHTML = '';

    imgList.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'gallery-card';
      card.innerHTML = `
        <img src="${item.dataUrl}" alt="${item.name}">
        <div class="gallery-footer">
          <span>#${idx + 1}</span>
          <button class="micro-btn remove-img" style="border:none;">✕</button>
        </div>
      `;

      card.querySelector('.remove-img').addEventListener('click', () => {
        imgList.splice(idx, 1);
        renderGallery();
      });

      imgGrid.appendChild(card);
    });
  }

  imgClearBtn.addEventListener('click', () => {
    imgList = [];
    renderGallery();
  });

  imgActionBtn.addEventListener('click', async () => {
    if (imgList.length === 0) {
      showToast('En az 1 görsel ekleyin.', 'error');
      return;
    }

    showLoading('PDF oluşturuluyor...');
    try {
      const pdfDoc = await PDFLib.PDFDocument.create();
      const mode = imgPageSizeSelect.value;
      const A4_W = 595.28;
      const A4_H = 841.89;

      for (const item of imgList) {
        let embedded;
        const isPng = item.file.type === 'image/png' || item.name.toLowerCase().endsWith('.png');

        if (isPng) {
          const bytes = await item.file.arrayBuffer();
          embedded = await pdfDoc.embedPng(bytes);
        } else {
          // Normalize to JPEG
          const canvas = document.createElement('canvas');
          canvas.width = item.width;
          canvas.height = item.height;
          const ctx = canvas.getContext('2d');
          const img = new Image();
          await new Promise(r => { img.onload = r; img.src = item.dataUrl; });
          ctx.drawImage(img, 0, 0);
          const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
          const base64 = jpegDataUrl.split(',')[1];
          const bin = atob(base64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          embedded = await pdfDoc.embedJpg(bytes);
        }

        if (mode === 'a4') {
          const page = pdfDoc.addPage([A4_W, A4_H]);
          const scale = Math.min(A4_W / embedded.width, A4_H / embedded.height) * 0.92;
          const dw = embedded.width * scale;
          const dh = embedded.height * scale;
          page.drawImage(embedded, {
            x: (A4_W - dw) / 2,
            y: (A4_H - dh) / 2,
            width: dw,
            height: dh
          });
        } else {
          const page = pdfDoc.addPage([embedded.width, embedded.height]);
          page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
        }
      }

      const outBytes = await pdfDoc.save();
      const fn = imgFilenameInput.value.trim() || 'belge.pdf';
      downloadBlob(outBytes, fn.endsWith('.pdf') ? fn : fn + '.pdf');
      showToast('PDF başarıyla oluşturuldu ve indirildi.', 'success');
    } catch (err) {
      console.error(err);
      showToast('PDF oluşturma hatası: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  });

  // ==========================================
  // TAB 5: PDF TO IMAGE (.JPG / .PNG / .ZIP)
  // ==========================================
  const pdf2imgDropzone = document.getElementById('pdf2img-dropzone');
  const pdf2imgInput = document.getElementById('pdf2img-input');
  const pdf2imgWorkspace = document.getElementById('pdf2img-workspace');
  const pdf2imgFileName = document.getElementById('pdf2img-file-name');
  const pdf2imgTotalPages = document.getElementById('pdf2img-total-pages');
  const pdf2imgResetBtn = document.getElementById('pdf2img-reset-btn');
  const pdf2imgPagesGrid = document.getElementById('pdf2img-pages-grid');
  const pdf2imgStatusLabel = document.getElementById('pdf2img-status-label');
  const pdf2imgFormat = document.getElementById('pdf2img-format');
  const pdf2imgScale = document.getElementById('pdf2img-scale');
  const pdf2imgZipname = document.getElementById('pdf2img-zipname');
  const pdf2imgDownloadAllBtn = document.getElementById('pdf2img-download-all-btn');

  let pdf2imgDoc = null;
  let pdf2imgRawBytes = null;
  let pdf2imgOriginalName = '';
  let pdf2imgRenderedImages = []; // Array of { pageNum, dataUrl, blob, ext }

  setupDropzone('pdf2img-dropzone', 'pdf2img-input', (files) => {
    if (files && files[0]) loadPdfForImages(files[0]);
  });

  pdf2imgResetBtn.addEventListener('click', () => {
    pdf2imgDoc = null;
    pdf2imgRawBytes = null;
    pdf2imgRenderedImages = [];
    pdf2imgWorkspace.classList.add('hidden');
    pdf2imgDropzone.classList.remove('hidden');
    pdf2imgPagesGrid.innerHTML = '';
    pdf2imgInput.value = '';
  });

  pdf2imgFormat.addEventListener('change', () => {
    if (pdf2imgDoc) renderAllPagesAsImages();
  });

  pdf2imgScale.addEventListener('change', () => {
    if (pdf2imgDoc) renderAllPagesAsImages();
  });

  async function loadPdfForImages(file) {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      showToast('Lütfen geçerli bir PDF dosyası seçin.', 'error');
      return;
    }
    showLoading('PDF taranıyor ve sayfalar yükleniyor...');
    try {
      pdf2imgOriginalName = file.name;
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      pdf2imgZipname.value = `${baseName}-gorseller.zip`;

      const arrayBuffer = await file.arrayBuffer();
      pdf2imgRawBytes = new Uint8Array(arrayBuffer);

      pdf2imgDoc = await pdfjsLib.getDocument({ data: pdf2imgRawBytes }).promise;
      pdf2imgFileName.textContent = file.name;
      pdf2imgTotalPages.textContent = `${pdf2imgDoc.numPages} SAYFA`;

      pdf2imgDropzone.classList.add('hidden');
      pdf2imgWorkspace.classList.remove('hidden');

      await renderAllPagesAsImages();
      showToast('Tüm sayfalar başarıyla görsele çevrildi.', 'success');
    } catch (err) {
      console.error(err);
      showToast('PDF okunamadı: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  }

  async function renderAllPagesAsImages() {
    if (!pdf2imgDoc) return;
    showLoading('Sayfalar yüksek çözünürlükte görsele dönüştürülüyor...');
    pdf2imgPagesGrid.innerHTML = '';
    pdf2imgRenderedImages = [];

    const format = pdf2imgFormat.value; // 'image/jpeg' or 'image/png'
    const ext = format === 'image/jpeg' ? 'jpg' : 'png';
    const scaleFactor = parseFloat(pdf2imgScale.value) || 2.0;

    const numPages = pdf2imgDoc.numPages;
    pdf2imgStatusLabel.textContent = `0 / ${numPages} işlendi`;

    try {
      for (let i = 1; i <= numPages; i++) {
        pdf2imgStatusLabel.textContent = `${i} / ${numPages} dönüştürülüyor...`;
        const page = await pdf2imgDoc.getPage(i);
        const viewport = page.getViewport({ scale: scaleFactor });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;

        const dataUrl = canvas.toDataURL(format, 0.92);
        
        // Convert dataUrl to blob for fast zipping
        const base64 = dataUrl.split(',')[1];
        const bin = atob(base64);
        const u8 = new Uint8Array(bin.length);
        for (let j = 0; j < bin.length; j++) u8[j] = bin.charCodeAt(j);

        const item = {
          pageNum: i,
          dataUrl,
          bytes: u8,
          ext,
          width: canvas.width,
          height: canvas.height
        };
        pdf2imgRenderedImages.push(item);

        // Add to UI Grid
        const card = document.createElement('div');
        card.className = 'page-thumb-card';
        card.style.cursor = 'default';
        card.innerHTML = `
          <div class="card-footer" style="margin-bottom: 6px;">
            <span>SAYFA ${i}</span>
            <span style="font-size:10px; color:var(--text-muted);">${canvas.width}x${canvas.height}</span>
          </div>
          <div class="thumb-preview-box" style="height:190px;">
            <img src="${dataUrl}" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:2px;">
          </div>
          <div style="width:100%; margin-top:8px;">
            <button class="chip-btn download-single-img-btn" data-page="${i}" style="width:100%; padding:6px; font-size:11px; justify-content:center;">
              Kaydet (.${ext})
            </button>
          </div>
        `;
        pdf2imgPagesGrid.appendChild(card);
      }

      // Tekil indirme butonları
      pdf2imgPagesGrid.querySelectorAll('.download-single-img-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const pageNum = parseInt(btn.getAttribute('data-page'), 10);
          const found = pdf2imgRenderedImages.find(img => img.pageNum === pageNum);
          if (found) {
            const baseName = pdf2imgOriginalName.replace(/\.[^/.]+$/, '');
            downloadBlob(found.bytes, `${baseName}-sayfa-${found.pageNum}.${found.ext}`, format);
            showToast(`Sayfa ${found.pageNum} indirildi.`, 'success');
          }
        });
      });

      pdf2imgStatusLabel.textContent = `${numPages} sayfa hazır`;
    } catch (err) {
      console.error(err);
      showToast('Görsel render hatası: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  }

  // Topluca ZIP indirme
  pdf2imgDownloadAllBtn.addEventListener('click', async () => {
    if (pdf2imgRenderedImages.length === 0) {
      showToast('Dönüştürülmüş görsel bulunamadı.', 'error');
      return;
    }

    showLoading('Görseller ZIP arşivine paketleniyor...');
    try {
      const zip = new JSZip();
      const baseName = pdf2imgOriginalName.replace(/\.[^/.]+$/, '');

      pdf2imgRenderedImages.forEach(img => {
        const fileName = `${baseName}-sayfa-${String(img.pageNum).padStart(3, '0')}.${img.ext}`;
        zip.file(fileName, img.bytes);
      });

      const zipBlob = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
      let zipName = pdf2imgZipname.value.trim() || 'sayfalar.zip';
      if (!zipName.endsWith('.zip')) zipName += '.zip';

      downloadBlob(zipBlob, zipName, 'application/zip');
      showToast(`${pdf2imgRenderedImages.length} sayfa içeren ZIP indirildi!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('ZIP oluşturulurken hata: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  });

});

