let pageId = null;
let pageData = null;
let themes = [];
let sections = [];
let hasChanges = false;

document.addEventListener('DOMContentLoaded', init);

async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    pageId = urlParams.get('id');

    if (!pageId) {
        showToast('No page ID provided', 'error');
        return;
    }

    await Promise.all([loadThemes(), loadPage()]);
    setupEventListeners();
    renderCanvas();
    renderSectionsList();
    populateSettings();
}

async function loadThemes() {
    try {
        const response = await fetch('/api/themes');
        themes = await response.json();
    } catch (error) {
        showToast('Failed to load themes', 'error');
    }
}

async function loadPage() {
    try {
        const response = await fetch(`/api/pages/${pageId}`);
        pageData = await response.json();

        if (pageData.error) {
            showToast('Page not found', 'error');
            return;
        }

        document.getElementById('page-title').textContent = `Edit: ${pageData.brandName}`;

        sections = pageData.sections || getDefaultSections();
    } catch (error) {
        showToast('Failed to load page', 'error');
    }
}

function getDefaultSections() {
    return [
        { id: 'hero', type: 'hero', data: { tagline: pageData.tagline, ctaText: pageData.ctaText } },
        { id: 'about', type: 'about', data: { title: 'The Art of Fragrance', text: pageData.aboutText } },
        { id: 'features', type: 'features', data: { items: ['INSTALLMENT', '3 DAYS RETURN', 'CASH ON DELIVERY', 'FAST DELIVERY'] } },
        { id: 'offer', type: 'offer', data: { title: pageData.offerTitle || 'Exclusive Offer', description: pageData.offerDescription || 'Discover your signature scent' } },
        { id: 'policy', type: 'policy', data: { email: `info@${pageData.brandName.toLowerCase().replace(/\s+/g, '')}.com` } },
        { id: 'footer', type: 'footer', data: {} }
    ];
}

function setupEventListeners() {
    document.getElementById('save-btn').addEventListener('click', savePage);
    document.getElementById('preview-btn').addEventListener('click', previewPage);

    document.querySelectorAll('.add-section-btn').forEach(btn => {
        btn.addEventListener('click', () => addSection(btn.dataset.type));
    });

    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-save').addEventListener('click', saveModal);

    document.getElementById('setting-brand-name').addEventListener('input', handleSettingsChange);
    document.getElementById('setting-tagline').addEventListener('input', handleSettingsChange);
    document.getElementById('setting-cta').addEventListener('input', handleSettingsChange);
    document.getElementById('setting-theme').addEventListener('change', handleSettingsChange);

    window.addEventListener('beforeunload', (e) => {
        if (hasChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

function populateSettings() {
    document.getElementById('setting-brand-name').value = pageData.brandName || '';
    document.getElementById('setting-tagline').value = pageData.tagline || '';
    document.getElementById('setting-cta').value = pageData.ctaText || 'Get Offer';

    const themeSelect = document.getElementById('setting-theme');
    themeSelect.innerHTML = themes.map(t =>
        `<option value="${t.id}" ${t.id === pageData.themeId ? 'selected' : ''}>${t.name}</option>`
    ).join('');
}

function handleSettingsChange() {
    pageData.brandName = document.getElementById('setting-brand-name').value;
    pageData.tagline = document.getElementById('setting-tagline').value;
    pageData.ctaText = document.getElementById('setting-cta').value;
    pageData.themeId = document.getElementById('setting-theme').value;
    hasChanges = true;
    renderCanvas();
}

function getTheme() {
    return themes.find(t => t.id === pageData.themeId) || themes[0];
}

function renderCanvas() {
    const canvas = document.getElementById('canvas-content');
    const theme = getTheme();
    const isDark = ['luxury-oud', 'sensual-night', 'dark-masculine', 'modern-luxury', 'oriental-gold'].includes(theme.id);

    let html = `<style>
        .preview-section { font-family: '${theme.fontBody}', sans-serif; }
        .preview-section h1, .preview-section h2, .preview-section h3 { font-family: '${theme.font}', serif; }
    </style>`;

    sections.forEach((section, index) => {
        html += renderSection(section, theme, isDark, index);
    });

    canvas.innerHTML = html;
    attachEditableListeners();
}

function renderSection(section, theme, isDark, index) {
    const controls = `
        <div class="section-controls">
            <button onclick="moveSection(${index}, -1)" ${index === 0 ? 'disabled' : ''} title="Move Up">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
            </button>
            <button onclick="moveSection(${index}, 1)" ${index === sections.length - 1 ? 'disabled' : ''} title="Move Down">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <button onclick="editSection(${index})" title="Edit Section">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit
            </button>
            <button class="delete-btn" onclick="deleteSection(${index})" title="Delete Section">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
        </div>
    `;

    switch (section.type) {
        case 'hero':
            return `
                <div class="section-wrapper" data-index="${index}">
                    ${controls}
                    <section class="preview-section" style="min-height: 60vh; background: linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%); display: flex; align-items: center; justify-content: center; text-align: center; padding: 60px 20px;">
                        <div>
                            ${pageData.logoPath ? `<img src="${pageData.logoPath}" style="max-width: 300px; margin-bottom: 20px; border-radius: 8px;">` : `<h1 style="color: ${theme.colors.accent}; font-size: 3rem; letter-spacing: 6px; margin-bottom: 20px;">${pageData.brandName.toUpperCase()}</h1>`}
                            <p class="editable" data-field="tagline" data-section="${index}" style="color: ${isDark ? theme.colors.text : theme.colors.textDark}; font-size: 1.3rem; letter-spacing: 3px; margin-bottom: 40px;">${section.data.tagline || pageData.tagline}</p>
                            <a href="#" style="display: inline-block; padding: 16px 40px; background: ${isDark ? theme.colors.accent : theme.colors.accent}; color: ${isDark ? theme.colors.primary : '#fff'}; text-decoration: none; border-radius: 8px; font-weight: 500; letter-spacing: 2px;">${section.data.ctaText || pageData.ctaText}</a>
                        </div>
                    </section>
                </div>`;

        case 'about':
            return `
                <div class="section-wrapper" data-index="${index}">
                    ${controls}
                    <section class="preview-section" style="background: ${isDark ? theme.colors.background : '#ffffff'}; color: ${isDark ? theme.colors.text : theme.colors.textDark}; padding: 80px 20px; text-align: center;">
                        <div style="max-width: 800px; margin: 0 auto;">
                            <h2 class="editable" data-field="title" data-section="${index}" style="font-size: 2.2rem; margin-bottom: 20px; letter-spacing: 2px;">${section.data.title || 'The Art of Fragrance'}</h2>
                            <div style="width: 60px; height: 1px; background: ${theme.colors.accent}; margin: 20px auto;"></div>
                            <p class="editable" data-field="text" data-section="${index}" style="font-size: 1rem; line-height: 2; opacity: 0.85;">${section.data.text || pageData.aboutText}</p>
                        </div>
                    </section>
                </div>`;

        case 'features':
            return `
                <div class="section-wrapper" data-index="${index}">
                    ${controls}
                    <section class="preview-section" style="background: linear-gradient(135deg, ${theme.colors.secondary} 0%, ${theme.colors.primary} 100%); padding: 50px 20px;">
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; max-width: 1000px; margin: 0 auto; text-align: center; color: ${isDark ? theme.colors.text : '#ffffff'};">
                            ${(section.data.items || ['INSTALLMENT', '3 DAYS RETURN', 'CASH ON DELIVERY', 'FAST DELIVERY']).map(item => `
                                <div style="padding: 20px;">
                                    <div style="font-size: 0.85rem; font-weight: 500; letter-spacing: 2px;">${item}</div>
                                </div>
                            `).join('')}
                        </div>
                    </section>
                </div>`;

        case 'offer':
            return `
                <div class="section-wrapper" data-index="${index}">
                    ${controls}
                    <section class="preview-section" style="background: linear-gradient(180deg, ${theme.colors.secondary} 0%, ${theme.colors.primary} 100%); padding: 80px 20px; text-align: center; color: ${isDark ? theme.colors.text : '#ffffff'};">
                        <h2 class="editable" data-field="title" data-section="${index}" style="font-size: 2.2rem; margin-bottom: 20px; letter-spacing: 2px;">${section.data.title || 'Exclusive Offer'}</h2>
                        <div style="width: 60px; height: 1px; background: ${isDark ? theme.colors.accent : '#ffffff'}; margin: 20px auto;"></div>
                        <p class="editable" data-field="description" data-section="${index}" style="font-size: 1.1rem; opacity: 0.9; margin-bottom: 40px;">${section.data.description || 'Discover your signature scent'}</p>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; max-width: 900px; margin: 0 auto 40px;">
                            <div style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 40px 20px;">
                                <span style="display: inline-block; font-size: 0.7rem; background: rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 20px; margin-bottom: 20px;">Limited Time</span>
                                <h3 style="font-size: 2rem; margin-bottom: 8px;">20% Off</h3>
                                <p style="opacity: 0.85;">On your first purchase</p>
                            </div>
                            <div style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 40px 20px;">
                                <span style="display: inline-block; font-size: 0.7rem; background: rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 20px; margin-bottom: 20px;">Exclusive</span>
                                <h3 style="font-size: 2rem; margin-bottom: 8px;">Free Gift</h3>
                                <p style="opacity: 0.85;">With orders over $150</p>
                            </div>
                            <div style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 40px 20px;">
                                <span style="display: inline-block; font-size: 0.7rem; background: rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 20px; margin-bottom: 20px;">Members Only</span>
                                <h3 style="font-size: 2rem; margin-bottom: 8px;">VIP Access</h3>
                                <p style="opacity: 0.85;">Early collection previews</p>
                            </div>
                        </div>
                        <a href="#" style="display: inline-block; padding: 16px 40px; background: ${isDark ? theme.colors.accent : '#ffffff'}; color: ${isDark ? theme.colors.primary : theme.colors.primary}; text-decoration: none; border-radius: 8px; font-weight: 500; letter-spacing: 2px;">${pageData.ctaText}</a>
                    </section>
                </div>`;

        case 'policy':
            const policyBg = section.data.bgColor || (isDark ? theme.colors.background : '#ffffff');
            const policyText = section.data.textColor || (isDark ? theme.colors.text : theme.colors.textDark);
            const policyTitle = section.data.title || 'Exchange & Return Policy';
            const policyIntro = section.data.intro || `At ${pageData.brandName}, your satisfaction is our top priority. We allow our customers to open and inspect their orders upon delivery.`;
            const policyConditions = section.data.conditions || ['The original box and packaging must be kept, even if the product has been opened.', 'The item must be in good condition, with all accessories and packaging included.', 'Returns are accepted within 3 days of receiving your order.'];
            const policyRefund = section.data.refundProcess || ['Our courier will collect the return directly from your address.', 'Once the item is checked, your refund will be processed.', 'Cairo and Giza: Refund in cash on the spot when collecting the returned order.', 'Other governorates: Refund processed through shipping company.'];
            const policyNotice = section.data.notice || 'If you receive a wrong or damaged product, please contact our customer service immediately.';
            return `
                <div class="section-wrapper" data-index="${index}">
                    ${controls}
                    <section class="preview-section" style="background: ${policyBg}; color: ${policyText}; padding: 80px 20px;">
                        <div style="max-width: 800px; margin: 0 auto;">
                            <h2 class="editable" data-field="title" data-section="${index}" style="font-size: 2rem; text-align: center; margin-bottom: 20px;">${policyTitle}</h2>
                            <div style="width: 60px; height: 1px; background: ${theme.colors.accent}; margin: 20px auto 40px;"></div>
                            <p style="text-align: center; margin-bottom: 40px; opacity: 0.9; line-height: 1.8;">${policyIntro}</p>
                            <div style="margin-bottom: 40px;">
                                <h3 style="font-size: 1.3rem; margin-bottom: 20px;">Conditions for Exchange or Return</h3>
                                <ul style="padding-left: 20px; line-height: 2.2; opacity: 0.9;">
                                    ${policyConditions.map(c => `<li>${c}</li>`).join('')}
                                </ul>
                            </div>
                            <div style="margin-bottom: 40px;">
                                <h3 style="font-size: 1.3rem; margin-bottom: 20px;">Return & Refund Process</h3>
                                <ul style="padding-left: 20px; line-height: 2.2; opacity: 0.9;">
                                    ${policyRefund.map(r => `<li>${r}</li>`).join('')}
                                </ul>
                            </div>
                            <div style="background: rgba(128,128,128,0.1); border: 1px solid rgba(128,128,128,0.2); border-radius: 8px; padding: 20px; margin-bottom: 30px; text-align: center;">
                                <p style="opacity: 0.9;">${policyNotice}</p>
                            </div>
                            <p style="font-size: 0.95rem; text-align: center;">📧 <a href="mailto:${section.data.email}" style="color: ${theme.colors.accent};">${section.data.email}</a></p>
                        </div>
                    </section>
                </div>`;

        case 'footer':
            return `
                <div class="section-wrapper" data-index="${index}">
                    ${controls}
                    <section class="preview-section" style="background: ${theme.colors.primary}; color: ${isDark ? theme.colors.text : '#ffffff'}; padding: 50px 20px; text-align: center;">
                        <p style="font-size: 1.5rem; letter-spacing: 6px; margin-bottom: 8px;">${pageData.brandName.toUpperCase()}</p>
                        <p style="font-size: 0.85rem; opacity: 0.7; letter-spacing: 2px; margin-bottom: 20px;">Luxury Perfumes</p>
                        <p style="font-size: 0.75rem; opacity: 0.5;">© ${new Date().getFullYear()} ${pageData.brandName}. All rights reserved.</p>
                    </section>
                </div>`;

        case 'gallery':
            return `
                <div class="section-wrapper" data-index="${index}">
                    ${controls}
                    <section class="preview-section" style="background: ${isDark ? theme.colors.background : '#ffffff'}; padding: 80px 20px; text-align: center;">
                        <h2 style="color: ${isDark ? theme.colors.text : theme.colors.textDark}; font-size: 2rem; margin-bottom: 40px;">Gallery</h2>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; max-width: 900px; margin: 0 auto;">
                            <div style="background: ${theme.colors.secondary}; height: 200px; border-radius: 8px;"></div>
                            <div style="background: ${theme.colors.secondary}; height: 200px; border-radius: 8px;"></div>
                            <div style="background: ${theme.colors.secondary}; height: 200px; border-radius: 8px;"></div>
                        </div>
                    </section>
                </div>`;

        case 'testimonials':
            return `
                <div class="section-wrapper" data-index="${index}">
                    ${controls}
                    <section class="preview-section" style="background: ${isDark ? theme.colors.secondary : '#f9f9f9'}; padding: 80px 20px; text-align: center;">
                        <h2 style="color: ${isDark ? theme.colors.text : theme.colors.textDark}; font-size: 2rem; margin-bottom: 40px;">What Our Customers Say</h2>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px; max-width: 800px; margin: 0 auto;">
                            <div style="background: ${isDark ? 'rgba(255,255,255,0.05)' : '#ffffff'}; padding: 30px; border-radius: 12px; text-align: left;">
                                <p style="color: ${isDark ? theme.colors.text : theme.colors.textDark}; font-style: italic; margin-bottom: 15px;">"Absolutely stunning fragrance. I get compliments everywhere I go!"</p>
                                <p style="color: ${theme.colors.accent}; font-weight: 500;">— Sarah M.</p>
                            </div>
                            <div style="background: ${isDark ? 'rgba(255,255,255,0.05)' : '#ffffff'}; padding: 30px; border-radius: 12px; text-align: left;">
                                <p style="color: ${isDark ? theme.colors.text : theme.colors.textDark}; font-style: italic; margin-bottom: 15px;">"The quality is exceptional. Worth every penny!"</p>
                                <p style="color: ${theme.colors.accent}; font-weight: 500;">— Ahmed K.</p>
                            </div>
                        </div>
                    </section>
                </div>`;

        case 'contact':
            return `
                <div class="section-wrapper" data-index="${index}">
                    ${controls}
                    <section class="preview-section" style="background: ${isDark ? theme.colors.background : '#ffffff'}; padding: 80px 20px; text-align: center;">
                        <h2 style="color: ${isDark ? theme.colors.text : theme.colors.textDark}; font-size: 2rem; margin-bottom: 40px;">Contact Us</h2>
                        <div style="max-width: 500px; margin: 0 auto;">
                            <p style="color: ${isDark ? theme.colors.text : theme.colors.textDark}; margin-bottom: 20px; opacity: 0.85;">Have questions? We'd love to hear from you.</p>
                            <p style="font-size: 1.1rem;">📧 <a href="mailto:info@${pageData.brandName.toLowerCase().replace(/\s+/g, '')}.com" style="color: ${theme.colors.accent};">info@${pageData.brandName.toLowerCase().replace(/\s+/g, '')}.com</a></p>
                        </div>
                    </section>
                </div>`;

        case 'cta':
            return `
                <div class="section-wrapper" data-index="${index}">
                    ${controls}
                    <section class="preview-section" style="background: ${theme.colors.accent}; padding: 60px 20px; text-align: center;">
                        <h2 class="editable" data-field="title" data-section="${index}" style="color: ${theme.colors.primary}; font-size: 2rem; margin-bottom: 20px;">${section.data.title || 'Ready to Experience Luxury?'}</h2>
                        <a href="#" style="display: inline-block; padding: 16px 40px; background: ${theme.colors.primary}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500; letter-spacing: 2px;">${pageData.ctaText}</a>
                    </section>
                </div>`;

        case 'text':
            return `
                <div class="section-wrapper" data-index="${index}">
                    ${controls}
                    <section class="preview-section" style="background: ${isDark ? theme.colors.background : '#ffffff'}; padding: 60px 20px;">
                        <div style="max-width: 800px; margin: 0 auto;">
                            <p class="editable" data-field="text" data-section="${index}" style="color: ${isDark ? theme.colors.text : theme.colors.textDark}; font-size: 1.1rem; line-height: 1.8;">${section.data.text || 'Add your custom text here...'}</p>
                        </div>
                    </section>
                </div>`;

        default:
            return '';
    }
}

function attachEditableListeners() {
    document.querySelectorAll('.editable').forEach(el => {
        el.setAttribute('contenteditable', 'true');
        el.addEventListener('blur', (e) => {
            const sectionIndex = parseInt(e.target.dataset.section);
            const field = e.target.dataset.field;
            sections[sectionIndex].data[field] = e.target.textContent;
            hasChanges = true;
        });
    });
}

function renderSectionsList() {
    const list = document.getElementById('sections-list');
    list.innerHTML = sections.map((section, index) => `
        <div class="section-item" data-index="${index}">
            <span class="section-item-name">${section.type.charAt(0).toUpperCase() + section.type.slice(1)}</span>
            <div class="section-item-actions">
                <button onclick="moveSection(${index}, -1)" title="Move Up">↑</button>
                <button onclick="moveSection(${index}, 1)" title="Move Down">↓</button>
                <button onclick="deleteSection(${index})" title="Delete">×</button>
            </div>
        </div>
    `).join('');
}

function addSection(type) {
    const newSection = {
        id: type + '-' + Date.now(),
        type: type,
        data: getDefaultSectionData(type)
    };
    sections.push(newSection);
    hasChanges = true;
    renderCanvas();
    renderSectionsList();
    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} section added`);
}

function getDefaultSectionData(type) {
    switch (type) {
        case 'hero': return { tagline: pageData.tagline, ctaText: pageData.ctaText };
        case 'about': return { title: 'About Us', text: 'Tell your brand story here...' };
        case 'features': return { items: ['Feature 1', 'Feature 2', 'Feature 3', 'Feature 4'] };
        case 'offer': return { title: 'Special Offer', description: 'Limited time offer for our valued customers' };
        case 'policy': return { email: `info@${pageData.brandName.toLowerCase().replace(/\s+/g, '')}.com` };
        case 'gallery': return { images: [] };
        case 'testimonials': return { items: [] };
        case 'contact': return { email: `info@${pageData.brandName.toLowerCase().replace(/\s+/g, '')}.com` };
        case 'cta': return { title: 'Ready to Experience Luxury?' };
        case 'text': return { text: 'Add your custom text here...' };
        case 'footer': return {};
        default: return {};
    }
}

function moveSection(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sections.length) return;

    const temp = sections[index];
    sections[index] = sections[newIndex];
    sections[newIndex] = temp;

    hasChanges = true;
    renderCanvas();
    renderSectionsList();
}

function deleteSection(index) {
    if (confirm('Are you sure you want to delete this section?')) {
        sections.splice(index, 1);
        hasChanges = true;
        renderCanvas();
        renderSectionsList();
        showToast('Section deleted');
    }
}

let currentEditingSection = null;

function editSection(index) {
    currentEditingSection = index;
    const section = sections[index];

    document.getElementById('modal-title').textContent = `Edit ${section.type.charAt(0).toUpperCase() + section.type.slice(1)} Section`;

    let formHtml = '<div class="edit-form">';

    switch (section.type) {
        case 'hero':
            formHtml += `
                <div class="form-group">
                    <label>Tagline</label>
                    <input type="text" id="edit-tagline" value="${section.data.tagline || ''}">
                </div>
                <div class="form-group">
                    <label>CTA Button Text</label>
                    <input type="text" id="edit-cta" value="${section.data.ctaText || ''}">
                </div>
            `;
            break;

        case 'about':
            formHtml += `
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" id="edit-title" value="${section.data.title || ''}">
                </div>
                <div class="form-group">
                    <label>Text</label>
                    <textarea id="edit-text">${section.data.text || ''}</textarea>
                </div>
            `;
            break;

        case 'offer':
            formHtml += `
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" id="edit-title" value="${section.data.title || ''}">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="edit-description">${section.data.description || ''}</textarea>
                </div>
            `;
            break;

        case 'features':
            formHtml += `
                <div class="form-group">
                    <label>Features (one per line)</label>
                    <textarea id="edit-items">${(section.data.items || []).join('\n')}</textarea>
                </div>
            `;
            break;

        case 'policy':
            formHtml += `
                <div class="form-group">
                    <label>Section Title</label>
                    <input type="text" id="edit-title" value="${section.data.title || 'Exchange & Return Policy'}">
                </div>
                <div class="form-group">
                    <label>Intro Text</label>
                    <textarea id="edit-intro">${section.data.intro || `At ${pageData.brandName}, your satisfaction is our top priority. We allow our customers to open and inspect their orders upon delivery.`}</textarea>
                </div>
                <div class="form-group">
                    <label>Conditions (one per line)</label>
                    <textarea id="edit-conditions">${(section.data.conditions || ['The original box and packaging must be kept, even if the product has been opened.', 'The item must be in good condition, with all accessories and packaging included.', 'Returns are accepted within 3 days of receiving your order.']).join('\n')}</textarea>
                </div>
                <div class="form-group">
                    <label>Refund Process (one per line)</label>
                    <textarea id="edit-refund">${(section.data.refundProcess || ['Our courier will collect the return directly from your address.', 'Once the item is checked, your refund will be processed.', 'Cairo and Giza: Refund in cash on the spot when collecting the returned order.', 'Other governorates: Refund processed through shipping company.']).join('\n')}</textarea>
                </div>
                <div class="form-group">
                    <label>Notice Text</label>
                    <input type="text" id="edit-notice" value="${section.data.notice || 'If you receive a wrong or damaged product, please contact our customer service immediately.'}">
                </div>
                <div class="form-group">
                    <label>Contact Email</label>
                    <input type="email" id="edit-email" value="${section.data.email || ''}">
                </div>
                <div class="form-group">
                    <label>Background Color</label>
                    <div class="color-picker-row">
                        <input type="color" id="edit-bgcolor" value="${section.data.bgColor || '#0a1628'}">
                        <select id="edit-bgcolor-preset">
                            <option value="">Custom</option>
                            <option value="#0a1628" ${section.data.bgColor === '#0a1628' ? 'selected' : ''}>Navy Dark</option>
                            <option value="#ffffff" ${section.data.bgColor === '#ffffff' ? 'selected' : ''}>White</option>
                            <option value="#f8f4ef" ${section.data.bgColor === '#f8f4ef' ? 'selected' : ''}>Cream</option>
                            <option value="#1a1a2e" ${section.data.bgColor === '#1a1a2e' ? 'selected' : ''}>Deep Purple</option>
                            <option value="#2d2d2d" ${section.data.bgColor === '#2d2d2d' ? 'selected' : ''}>Dark Gray</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Text Color</label>
                    <div class="color-picker-row">
                        <input type="color" id="edit-textcolor" value="${section.data.textColor || '#f8f4ef'}">
                        <select id="edit-textcolor-preset">
                            <option value="">Custom</option>
                            <option value="#f8f4ef" ${section.data.textColor === '#f8f4ef' ? 'selected' : ''}>Light</option>
                            <option value="#1a1a2e" ${section.data.textColor === '#1a1a2e' ? 'selected' : ''}>Dark</option>
                            <option value="#333333" ${section.data.textColor === '#333333' ? 'selected' : ''}>Charcoal</option>
                        </select>
                    </div>
                </div>
            `;
            break;

        case 'cta':
        case 'text':
            formHtml += `
                <div class="form-group">
                    <label>${section.type === 'cta' ? 'Title' : 'Text'}</label>
                    <textarea id="edit-text">${section.data.title || section.data.text || ''}</textarea>
                </div>
            `;
            break;

        default:
            formHtml += '<p>No editable options for this section.</p>';
    }

    formHtml += '</div>';

    document.getElementById('modal-body').innerHTML = formHtml;
    document.getElementById('edit-modal').classList.remove('hidden');

    setupColorPickerSync();
}

function setupColorPickerSync() {
    const bgPreset = document.getElementById('edit-bgcolor-preset');
    const bgColor = document.getElementById('edit-bgcolor');
    const textPreset = document.getElementById('edit-textcolor-preset');
    const textColor = document.getElementById('edit-textcolor');

    if (bgPreset && bgColor) {
        bgPreset.addEventListener('change', function() {
            if (this.value) {
                bgColor.value = this.value;
            }
        });
        bgColor.addEventListener('input', function() {
            bgPreset.value = '';
        });
    }

    if (textPreset && textColor) {
        textPreset.addEventListener('change', function() {
            if (this.value) {
                textColor.value = this.value;
            }
        });
        textColor.addEventListener('input', function() {
            textPreset.value = '';
        });
    }
}

function closeModal() {
    document.getElementById('edit-modal').classList.add('hidden');
    currentEditingSection = null;
}

function saveModal() {
    if (currentEditingSection === null) return;

    const section = sections[currentEditingSection];

    switch (section.type) {
        case 'hero':
            section.data.tagline = document.getElementById('edit-tagline')?.value || '';
            section.data.ctaText = document.getElementById('edit-cta')?.value || '';
            break;

        case 'about':
            section.data.title = document.getElementById('edit-title')?.value || '';
            section.data.text = document.getElementById('edit-text')?.value || '';
            break;

        case 'offer':
            section.data.title = document.getElementById('edit-title')?.value || '';
            section.data.description = document.getElementById('edit-description')?.value || '';
            break;

        case 'features':
            const items = document.getElementById('edit-items')?.value || '';
            section.data.items = items.split('\n').filter(i => i.trim());
            break;

        case 'policy':
            section.data.title = document.getElementById('edit-title')?.value || 'Exchange & Return Policy';
            section.data.intro = document.getElementById('edit-intro')?.value || '';
            const conditions = document.getElementById('edit-conditions')?.value || '';
            section.data.conditions = conditions.split('\n').filter(i => i.trim());
            const refund = document.getElementById('edit-refund')?.value || '';
            section.data.refundProcess = refund.split('\n').filter(i => i.trim());
            section.data.notice = document.getElementById('edit-notice')?.value || '';
            section.data.email = document.getElementById('edit-email')?.value || '';
            section.data.bgColor = document.getElementById('edit-bgcolor')?.value || '';
            section.data.textColor = document.getElementById('edit-textcolor')?.value || '';
            break;

        case 'cta':
            section.data.title = document.getElementById('edit-text')?.value || '';
            break;

        case 'text':
            section.data.text = document.getElementById('edit-text')?.value || '';
            break;
    }

    hasChanges = true;
    renderCanvas();
    closeModal();
    showToast('Section updated');
}

async function savePage() {
    try {
        const updateData = {
            brandName: pageData.brandName,
            themeId: pageData.themeId,
            tagline: pageData.tagline,
            ctaText: pageData.ctaText,
            sections: sections
        };

        const response = await fetch(`/api/pages/${pageId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        const data = await response.json();

        if (data.success) {
            hasChanges = false;
            showToast('Page saved successfully!');
        } else {
            showToast('Failed to save page', 'error');
        }
    } catch (error) {
        showToast('Failed to save page', 'error');
    }
}

function previewPage() {
    window.open(`/generated/${pageId}.html`, '_blank');
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

window.moveSection = moveSection;
window.deleteSection = deleteSection;
window.editSection = editSection;
