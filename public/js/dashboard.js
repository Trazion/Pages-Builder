let themes = [];
let pages = [];
let selectedTheme = null;
let promptSelectedTheme = null;
let uploadedLogoPath = null;
let promptUploadedLogoPath = null;
let editingPageId = null;
let deletingPageId = null;
let currentMode = 'standard';

document.addEventListener('DOMContentLoaded', init);

async function init() {
    await loadThemes();
    await loadPages();
    setupEventListeners();
    renderThemesGrid();
    renderPromptThemesGrid();
    renderThemesShowcase();
    renderPagesGrid();
}

async function loadThemes() {
    try {
        const response = await fetch('/api/themes');
        themes = await response.json();
    } catch (error) {
        showToast('Failed to load themes', 'error');
    }
}

async function loadPages() {
    try {
        const response = await fetch('/api/pages');
        pages = await response.json();
    } catch (error) {
        showToast('Failed to load pages', 'error');
    }
}

function setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            switchSection(section);
        });
    });

    const createForm = document.getElementById('create-form');
    createForm.addEventListener('submit', handleCreatePage);

    const uploadArea = document.getElementById('upload-area');
    const logoInput = document.getElementById('logo-input');

    uploadArea.addEventListener('click', () => logoInput.click());
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleLogoUpload(e.dataTransfer.files[0]);
        }
    });
    logoInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleLogoUpload(e.target.files[0]);
        }
    });

    document.getElementById('ai-suggest-btn').addEventListener('click', handleAISuggest);
    document.getElementById('ai-copy-btn').addEventListener('click', handleAICopy);

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });

    const promptUploadArea = document.getElementById('prompt-upload-area');
    const promptLogoInput = document.getElementById('prompt-logo-input');

    if (promptUploadArea && promptLogoInput) {
        promptUploadArea.addEventListener('click', () => promptLogoInput.click());
        promptUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            promptUploadArea.classList.add('dragover');
        });
        promptUploadArea.addEventListener('dragleave', () => {
            promptUploadArea.classList.remove('dragover');
        });
        promptUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            promptUploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                handlePromptLogoUpload(e.dataTransfer.files[0]);
            }
        });
        promptLogoInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                handlePromptLogoUpload(e.target.files[0]);
            }
        });
    }

    document.getElementById('close-preview').addEventListener('click', closePreview);
    document.getElementById('cancel-delete').addEventListener('click', () => {
        document.getElementById('confirm-modal').classList.add('hidden');
    });
    document.getElementById('confirm-delete').addEventListener('click', handleConfirmDelete);
}

function switchSection(sectionName) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    document.getElementById(`${sectionName}-section`).classList.add('active');
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

    if (sectionName === 'pages') {
        renderPagesGrid();
    }
}

function switchMode(mode) {
    currentMode = mode;

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    const standardSection = document.getElementById('standard-mode-section');
    const promptSection = document.getElementById('prompt-mode-section');
    const promptEssentials = document.getElementById('prompt-mode-essentials');

    if (mode === 'standard') {
        standardSection.classList.remove('hidden');
        promptSection.classList.add('hidden');
        promptEssentials.classList.add('hidden');
    } else {
        standardSection.classList.add('hidden');
        promptSection.classList.remove('hidden');
        promptEssentials.classList.remove('hidden');
    }
}

function renderThemesGrid() {
    const grid = document.getElementById('themes-grid');
    grid.innerHTML = themes.map(theme => `
        <div class="theme-card ${selectedTheme === theme.id ? 'selected' : ''}" 
             data-theme-id="${theme.id}"
             onclick="selectTheme('${theme.id}')">
            <div class="theme-preview" style="background: ${theme.colors.primary};">
                <span style="color: ${theme.colors.accent};">Aa</span>
            </div>
            <div class="theme-info">
                <h4>${theme.name}</h4>
                <p>${theme.mood.slice(0, 2).join(', ')}</p>
            </div>
            <div class="theme-selected-badge">✓</div>
        </div>
    `).join('');
}

function renderPromptThemesGrid() {
    const grid = document.getElementById('prompt-themes-grid');
    if (!grid) return;
    grid.innerHTML = themes.map(theme => `
        <div class="theme-card ${promptSelectedTheme === theme.id ? 'selected' : ''}" 
             data-theme-id="${theme.id}"
             onclick="selectPromptTheme('${theme.id}')">
            <div class="theme-preview" style="background: ${theme.colors.primary};">
                <span style="color: ${theme.colors.accent};">Aa</span>
            </div>
            <div class="theme-info">
                <h4>${theme.name}</h4>
                <p>${theme.mood.slice(0, 2).join(', ')}</p>
            </div>
            <div class="theme-selected-badge">✓</div>
        </div>
    `).join('');
}

function selectPromptTheme(themeId) {
    promptSelectedTheme = themeId;
    document.querySelectorAll('#prompt-themes-grid .theme-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.themeId === themeId);
    });
}

async function handlePromptLogoUpload(file) {
    if (!file.type.match(/image.*/)) {
        showToast('Please upload an image file', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    try {
        const response = await fetch('/api/upload-logo', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            promptUploadedLogoPath = data.path;
            const preview = document.getElementById('prompt-logo-preview');
            const placeholder = document.querySelector('#prompt-upload-area .upload-placeholder');
            preview.src = data.path;
            preview.classList.remove('hidden');
            placeholder.classList.add('hidden');
            showToast('Logo uploaded successfully', 'success');
        }
    } catch (error) {
        showToast('Failed to upload logo', 'error');
    }
}

function renderThemesShowcase() {
    const showcase = document.getElementById('themes-showcase');
    showcase.innerHTML = themes.map(theme => `
        <div class="theme-showcase-card">
            <div class="theme-showcase-preview" style="background: linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%);">
                <span style="color: ${theme.colors.accent}; font-family: '${theme.font}', serif;">PERFUME</span>
            </div>
            <div class="theme-showcase-content">
                <h3>${theme.name}</h3>
                <div class="mood-tags">
                    ${theme.mood.map(m => `<span class="mood-tag">${m}</span>`).join('')}
                </div>
                <div class="color-palette">
                    <div class="color-swatch" style="background: ${theme.colors.primary};" title="Primary"></div>
                    <div class="color-swatch" style="background: ${theme.colors.secondary};" title="Secondary"></div>
                    <div class="color-swatch" style="background: ${theme.colors.accent};" title="Accent"></div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderPagesGrid() {
    const grid = document.getElementById('pages-grid');
    const emptyState = document.getElementById('no-pages');

    if (pages.length === 0) {
        grid.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    grid.classList.remove('hidden');
    emptyState.classList.add('hidden');

    grid.innerHTML = pages.map(page => {
        const theme = themes.find(t => t.id === page.themeId) || themes[0];
        return `
            <div class="page-card">
                <div class="page-card-preview" style="background: linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%);">
                    ${page.logoPath 
                        ? `<img src="${page.logoPath}" alt="${page.brandName}">`
                        : `<span class="brand-initial" style="color: ${theme.colors.accent};">${page.brandName.charAt(0)}</span>`
                    }
                </div>
                <div class="page-card-content">
                    <h3>${page.brandName}</h3>
                    <p class="theme-label">${page.themeName}</p>
                    <p class="date">Created: ${new Date(page.createdAt).toLocaleDateString()}</p>
                    <div class="page-card-actions">
                        <button class="btn-secondary" onclick="previewPage('${page.id}')">Preview</button>
                        <button class="btn-secondary" onclick="editPage('${page.id}')">Edit</button>
                        <button class="btn-secondary" onclick="duplicatePage('${page.id}')">Duplicate</button>
                        <button class="btn-danger" onclick="deletePage('${page.id}')">Delete</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function selectTheme(themeId) {
    selectedTheme = themeId;
    document.querySelectorAll('.theme-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.themeId === themeId);
    });
}

async function handleLogoUpload(file) {
    if (!file.type.match(/image.*/)) {
        showToast('Please upload an image file', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    try {
        const response = await fetch('/api/upload-logo', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            uploadedLogoPath = data.path;
            const preview = document.getElementById('logo-preview');
            const placeholder = document.querySelector('.upload-placeholder');
            preview.src = data.path;
            preview.classList.remove('hidden');
            placeholder.classList.add('hidden');
            showToast('Logo uploaded successfully', 'success');
        }
    } catch (error) {
        showToast('Failed to upload logo', 'error');
    }
}

async function handleAISuggest() {
    const perfumeType = document.getElementById('perfume-type').value;
    if (!perfumeType) {
        showToast('Please enter a perfume type or mood first', 'error');
        return;
    }

    try {
        const response = await fetch('/api/ai/suggest-theme', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ perfumeType, mood: perfumeType })
        });
        const data = await response.json();

        if (data.theme) {
            selectTheme(data.theme.id);
            showToast(`Suggested theme: ${data.theme.name}`, 'success');
            document.querySelector(`[data-theme-id="${data.theme.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    } catch (error) {
        showToast('AI suggestion failed', 'error');
    }
}

async function handleAICopy() {
    const brandName = document.getElementById('brand-name').value || 'Your Brand';
    const perfumeType = document.getElementById('perfume-type').value;

    try {
        const response = await fetch('/api/ai/generate-copy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brandName, perfumeType, mood: perfumeType })
        });
        const data = await response.json();

        if (data.tagline) {
            document.getElementById('tagline').value = data.tagline;
        }
        if (data.aboutText) {
            document.getElementById('about-text').value = data.aboutText;
        }
        showToast('Copy generated successfully', 'success');
    } catch (error) {
        showToast('Failed to generate copy', 'error');
    }
}

async function handleCreatePage(e) {
    e.preventDefault();

    if (currentMode === 'prompt') {
        await handlePromptModeCreate();
    } else {
        await handleStandardModeCreate();
    }
}

async function handleStandardModeCreate() {
    const brandName = document.getElementById('brand-name').value;
    if (!brandName) {
        showToast('Please enter a brand name', 'error');
        return;
    }
    if (!selectedTheme) {
        showToast('Please select a theme', 'error');
        return;
    }

    const pageData = {
        brandName,
        themeId: selectedTheme,
        logoPath: uploadedLogoPath,
        tagline: document.getElementById('tagline').value,
        ctaText: document.getElementById('cta-text').value || 'Get Offer',
        perfumeType: document.getElementById('perfume-type').value,
        aboutText: document.getElementById('about-text').value
    };

    try {
        const response = await fetch('/api/pages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pageData)
        });
        const data = await response.json();

        if (data.success) {
            pages.push(data.page);
            showToast('Landing page created successfully!', 'success');
            resetForm();
            previewPage(data.page.id);
        }
    } catch (error) {
        showToast('Failed to create page', 'error');
    }
}

async function handlePromptModeCreate() {
    const brandName = document.getElementById('prompt-brand-name').value.trim();
    const prompt = document.getElementById('creative-prompt').value.trim();

    console.log('Prompt mode create:', { brandName, prompt, promptSelectedTheme });

    if (!brandName) {
        showToast('Please enter a brand name', 'error');
        console.log('Validation failed: no brand name');
        return;
    }
    if (!promptSelectedTheme) {
        showToast('Please select a theme below', 'error');
        console.log('Validation failed: no theme selected');
        return;
    }
    if (!prompt) {
        showToast('Please describe your landing page vision', 'error');
        console.log('Validation failed: no prompt');
        return;
    }

    const createBtn = document.getElementById('create-btn');
    const indicator = document.getElementById('generating-indicator');
    createBtn.classList.add('hidden');
    indicator.classList.remove('hidden');

    try {
        const aiResponse = await fetch('/api/ai/generate-from-prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brandName, prompt, themeId: promptSelectedTheme })
        });
        const aiData = await aiResponse.json();

        const pageData = {
            brandName,
            themeId: promptSelectedTheme,
            logoPath: promptUploadedLogoPath,
            tagline: aiData.tagline || 'Luxury Scents. Timeless Elegance.',
            ctaText: aiData.ctaText || 'Get Offer',
            aboutText: aiData.aboutText,
            offerTitle: aiData.offerTitle,
            offerDescription: aiData.offerDescription,
            creativePrompt: prompt,
            creationMode: 'prompt'
        };

        const response = await fetch('/api/pages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pageData)
        });
        const data = await response.json();

        if (data.success) {
            pages.push(data.page);
            showToast('AI-powered landing page created!', 'success');
            resetForm();
            previewPage(data.page.id);
        }
    } catch (error) {
        showToast('Failed to create page', 'error');
    } finally {
        createBtn.classList.remove('hidden');
        indicator.classList.add('hidden');
    }
}

function resetForm() {
    document.getElementById('create-form').reset();
    selectedTheme = null;
    promptSelectedTheme = null;
    uploadedLogoPath = null;
    promptUploadedLogoPath = null;
    document.getElementById('logo-preview').classList.add('hidden');
    document.querySelector('#upload-area .upload-placeholder').classList.remove('hidden');
    const promptPreview = document.getElementById('prompt-logo-preview');
    if (promptPreview) {
        promptPreview.classList.add('hidden');
        document.querySelector('#prompt-upload-area .upload-placeholder')?.classList.remove('hidden');
    }
    renderThemesGrid();
    renderPromptThemesGrid();
}

function previewPage(pageId) {
    const panel = document.getElementById('preview-panel');
    const frame = document.getElementById('preview-frame');
    frame.src = `/generated/${pageId}.html`;
    panel.classList.remove('hidden');
}

function closePreview() {
    document.getElementById('preview-panel').classList.add('hidden');
}

function editPage(pageId) {
    window.location.href = `/editor.html?id=${pageId}`;
}

async function handleUpdatePage(e) {
    e.preventDefault();

    const pageData = {
        brandName: document.getElementById('brand-name').value,
        themeId: selectedTheme,
        logoPath: uploadedLogoPath,
        tagline: document.getElementById('tagline').value,
        ctaText: document.getElementById('cta-text').value || 'Get Offer',
        perfumeType: document.getElementById('perfume-type').value,
        aboutText: document.getElementById('about-text').value
    };

    try {
        const response = await fetch(`/api/pages/${editingPageId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pageData)
        });
        const data = await response.json();

        if (data.success) {
            const index = pages.findIndex(p => p.id === editingPageId);
            if (index !== -1) {
                pages[index] = data.page;
            }
            showToast('Page updated successfully!', 'success');
            resetEditMode();
            switchSection('pages');
        }
    } catch (error) {
        showToast('Failed to update page', 'error');
    }
}

function resetEditMode() {
    editingPageId = null;
    const submitBtn = document.querySelector('#create-form .btn-primary');
    submitBtn.textContent = 'Generate Landing Page';
    document.getElementById('create-form').removeEventListener('submit', handleUpdatePage);
    document.getElementById('create-form').addEventListener('submit', handleCreatePage);
    resetForm();
}

async function duplicatePage(pageId) {
    try {
        const response = await fetch(`/api/pages/${pageId}/duplicate`, {
            method: 'POST'
        });
        const data = await response.json();

        if (data.success) {
            pages.push(data.page);
            renderPagesGrid();
            showToast('Page duplicated successfully!', 'success');
        }
    } catch (error) {
        showToast('Failed to duplicate page', 'error');
    }
}

function deletePage(pageId) {
    deletingPageId = pageId;
    document.getElementById('confirm-modal').classList.remove('hidden');
}

async function handleConfirmDelete() {
    if (!deletingPageId) return;

    try {
        const response = await fetch(`/api/pages/${deletingPageId}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (data.success) {
            pages = pages.filter(p => p.id !== deletingPageId);
            renderPagesGrid();
            showToast('Page deleted successfully!', 'success');
        }
    } catch (error) {
        showToast('Failed to delete page', 'error');
    }

    deletingPageId = null;
    document.getElementById('confirm-modal').classList.add('hidden');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

window.switchSection = switchSection;
window.selectTheme = selectTheme;
window.selectPromptTheme = selectPromptTheme;
window.previewPage = previewPage;
window.editPage = editPage;
window.duplicatePage = duplicatePage;
window.deletePage = deletePage;
