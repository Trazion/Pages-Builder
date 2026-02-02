const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('src/uploads'));
app.use('/generated', express.static('src/pages/generated'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'src/uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|svg|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed'));
    }
});

function loadThemes() {
    const themesPath = path.join(__dirname, 'src/themes/themes.json');
    return JSON.parse(fs.readFileSync(themesPath, 'utf8'));
}

function loadPages() {
    const pagesPath = path.join(__dirname, 'src/pages/pages.json');
    if (!fs.existsSync(pagesPath)) {
        fs.writeFileSync(pagesPath, JSON.stringify({ pages: [] }));
    }
    return JSON.parse(fs.readFileSync(pagesPath, 'utf8'));
}

function savePages(data) {
    const pagesPath = path.join(__dirname, 'src/pages/pages.json');
    fs.writeFileSync(pagesPath, JSON.stringify(data, null, 2));
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

app.get('/api/themes', (req, res) => {
    const data = loadThemes();
    res.json(data.themes);
});

app.get('/api/themes/:id', (req, res) => {
    const data = loadThemes();
    const theme = data.themes.find(t => t.id === req.params.id);
    if (theme) {
        res.json(theme);
    } else {
        res.status(404).json({ error: 'Theme not found' });
    }
});

app.get('/api/pages', (req, res) => {
    const data = loadPages();
    res.json(data.pages);
});

app.get('/api/pages/:id', (req, res) => {
    const data = loadPages();
    const page = data.pages.find(p => p.id === req.params.id);
    if (page) {
        res.json(page);
    } else {
        res.status(404).json({ error: 'Page not found' });
    }
});

app.post('/api/upload-logo', upload.single('logo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({
        success: true,
        filename: req.file.filename,
        path: `/uploads/${req.file.filename}`
    });
});

app.post('/api/pages', (req, res) => {
    const { brandName, themeId, logoPath, tagline, ctaText, perfumeType, aboutText, offerTitle, offerDescription } = req.body;

    if (!brandName || !themeId) {
        return res.status(400).json({ error: 'Brand name and theme are required' });
    }

    const themesData = loadThemes();
    const theme = themesData.themes.find(t => t.id === themeId);
    if (!theme) {
        return res.status(400).json({ error: 'Invalid theme' });
    }

    const pageId = 'page-' + Date.now();
    const createdAt = new Date().toISOString();

    const finalTagline = tagline || 'Luxury Scents. Timeless Elegance.';
    const finalCtaText = ctaText || 'Get Offer';
    const finalAboutText = aboutText || generateAboutText(brandName);
    const finalOfferTitle = offerTitle || 'Exclusive Offer';
    const finalOfferDescription = offerDescription || 'Discover your signature scent with our exclusive collection.';

    const defaultSections = [
        { id: 'hero-' + Date.now(), type: 'hero', data: { tagline: finalTagline, ctaText: finalCtaText } },
        { id: 'about-' + Date.now(), type: 'about', data: { title: 'The Art of Fragrance', text: finalAboutText } },
        { id: 'features-' + Date.now(), type: 'features', data: { items: ['INSTALLMENT', '3 DAYS RETURN', 'CASH ON DELIVERY', 'FAST DELIVERY'] } },
        { id: 'offer-' + Date.now(), type: 'offer', data: { title: finalOfferTitle, description: finalOfferDescription } },
        { id: 'policy-' + Date.now(), type: 'policy', data: { email: `info@${brandName.toLowerCase().replace(/\\s+/g, '')}.com` } },
        { id: 'footer-' + Date.now(), type: 'footer', data: {} }
    ];

    const pageData = {
        id: pageId,
        brandName,
        themeId,
        themeName: theme.name,
        logoPath: logoPath || null,
        tagline: finalTagline,
        ctaText: finalCtaText,
        perfumeType: perfumeType || 'luxury',
        aboutText: finalAboutText,
        offerTitle: finalOfferTitle,
        offerDescription: finalOfferDescription,
        sections: defaultSections,
        createdAt,
        updatedAt: createdAt
    };

    const generatedDir = path.join(__dirname, 'src/pages/generated');
    if (!fs.existsSync(generatedDir)) {
        fs.mkdirSync(generatedDir, { recursive: true });
    }

    const htmlContent = generateLandingPageWithSections(pageData, theme);
    fs.writeFileSync(path.join(generatedDir, `${pageId}.html`), htmlContent);

    const pagesData = loadPages();
    pagesData.pages.push(pageData);
    savePages(pagesData);

    res.json({ success: true, page: pageData });
});

app.put('/api/pages/:id', (req, res) => {
    const { brandName, themeId, logoPath, tagline, ctaText, perfumeType, aboutText, offerTitle, offerDescription, sections } = req.body;

    const pagesData = loadPages();
    const pageIndex = pagesData.pages.findIndex(p => p.id === req.params.id);

    if (pageIndex === -1) {
        return res.status(404).json({ error: 'Page not found' });
    }

    const themesData = loadThemes();
    const effectiveThemeId = themeId || pagesData.pages[pageIndex].themeId;
    const theme = themesData.themes.find(t => t.id === effectiveThemeId);

    if (!theme) {
        return res.status(400).json({ error: 'Invalid theme' });
    }

    pagesData.pages[pageIndex] = {
        ...pagesData.pages[pageIndex],
        brandName: brandName || pagesData.pages[pageIndex].brandName,
        themeId: themeId || pagesData.pages[pageIndex].themeId,
        themeName: theme.name,
        logoPath: logoPath !== undefined ? logoPath : pagesData.pages[pageIndex].logoPath,
        tagline: tagline || pagesData.pages[pageIndex].tagline,
        ctaText: ctaText || pagesData.pages[pageIndex].ctaText,
        perfumeType: perfumeType || pagesData.pages[pageIndex].perfumeType,
        aboutText: aboutText || pagesData.pages[pageIndex].aboutText,
        offerTitle: offerTitle || pagesData.pages[pageIndex].offerTitle,
        offerDescription: offerDescription || pagesData.pages[pageIndex].offerDescription,
        sections: sections || pagesData.pages[pageIndex].sections,
        updatedAt: new Date().toISOString()
    };

    const generatedDir = path.join(__dirname, 'src/pages/generated');
    const htmlContent = generateLandingPageWithSections(pagesData.pages[pageIndex], theme);
    fs.writeFileSync(path.join(generatedDir, `${req.params.id}.html`), htmlContent);

    savePages(pagesData);
    res.json({ success: true, page: pagesData.pages[pageIndex] });
});

app.post('/api/pages/:id/duplicate', (req, res) => {
    const pagesData = loadPages();
    const originalPage = pagesData.pages.find(p => p.id === req.params.id);

    if (!originalPage) {
        return res.status(404).json({ error: 'Page not found' });
    }

    const newPageId = 'page-' + Date.now();
    const copiedSections = originalPage.sections ? JSON.parse(JSON.stringify(originalPage.sections)) : null;

    const newPage = {
        ...originalPage,
        id: newPageId,
        brandName: originalPage.brandName + ' (Copy)',
        sections: copiedSections,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const themesData = loadThemes();
    const theme = themesData.themes.find(t => t.id === newPage.themeId);

    const generatedDir = path.join(__dirname, 'src/pages/generated');
    const htmlContent = generateLandingPageWithSections(newPage, theme);
    fs.writeFileSync(path.join(generatedDir, `${newPageId}.html`), htmlContent);

    pagesData.pages.push(newPage);
    savePages(pagesData);

    res.json({ success: true, page: newPage });
});

app.delete('/api/pages/:id', (req, res) => {
    const pagesData = loadPages();
    const pageIndex = pagesData.pages.findIndex(p => p.id === req.params.id);

    if (pageIndex === -1) {
        return res.status(404).json({ error: 'Page not found' });
    }

    const generatedDir = path.join(__dirname, 'src/pages/generated');
    const filePath = path.join(generatedDir, `${req.params.id}.html`);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    pagesData.pages.splice(pageIndex, 1);
    savePages(pagesData);

    res.json({ success: true });
});

app.post('/api/ai/suggest-theme', (req, res) => {
    const { perfumeType, mood } = req.body;
    const themesData = loadThemes();

    const keywords = (perfumeType + ' ' + (mood || '')).toLowerCase().split(/\s+/);

    let bestMatch = null;
    let bestScore = 0;

    themesData.themes.forEach(theme => {
        let score = 0;
        keywords.forEach(keyword => {
            if (theme.mood.some(m => m.includes(keyword) || keyword.includes(m))) {
                score += 2;
            }
            if (theme.name.toLowerCase().includes(keyword)) {
                score += 1;
            }
        });
        if (score > bestScore) {
            bestScore = score;
            bestMatch = theme;
        }
    });

    if (!bestMatch) {
        bestMatch = themesData.themes[Math.floor(Math.random() * themesData.themes.length)];
    }

    res.json({ theme: bestMatch, score: bestScore });
});

app.post('/api/ai/generate-copy', (req, res) => {
    const { brandName, perfumeType, mood } = req.body;

    const taglines = {
        luxury: [
            'Luxury Scents. Timeless Elegance.',
            'Where Luxury Meets Essence.',
            'The Art of Refined Fragrance.'
        ],
        fresh: [
            'Fresh. Pure. Unforgettable.',
            'Embrace the Freshness Within.',
            'A Breath of Pure Elegance.'
        ],
        oriental: [
            'Exotic Essence. Eternal Allure.',
            'The Mystery of the Orient.',
            'Ancient Secrets. Modern Luxury.'
        ],
        floral: [
            'Blooming Elegance.',
            'The Essence of Petals.',
            'Where Flowers Meet Luxury.'
        ],
        masculine: [
            'Bold. Powerful. Unforgettable.',
            'The Scent of Strength.',
            'Confidence in Every Note.'
        ],
        feminine: [
            'Grace. Beauty. Sophistication.',
            'The Essence of Femininity.',
            'Elegance Redefined.'
        ]
    };

    const aboutTexts = {
        luxury: `${brandName} represents the pinnacle of luxury perfumery. Each fragrance is meticulously crafted using the finest ingredients sourced from around the world, blending tradition with modern sophistication.`,
        fresh: `${brandName} captures the essence of nature's purest elements. Our fragrances are designed to invigorate your senses and leave a lasting impression of freshness and vitality.`,
        oriental: `${brandName} draws inspiration from ancient Eastern traditions. Our exotic blends combine rare ingredients to create fragrances that are mysterious, captivating, and unforgettable.`,
        floral: `${brandName} celebrates the timeless beauty of flowers. Each fragrance captures the delicate essence of nature's most precious blooms, creating scents that are romantic and enchanting.`,
        masculine: `${brandName} crafts bold fragrances for the modern man. Our scents embody strength, confidence, and sophistication, leaving a powerful impression wherever you go.`,
        feminine: `${brandName} creates elegant fragrances that celebrate femininity. Our scents are designed to empower and enchant, reflecting the grace and beauty of the modern woman.`
    };

    const type = perfumeType?.toLowerCase() || mood?.toLowerCase() || 'luxury';
    const matchedType = Object.keys(taglines).find(k => type.includes(k)) || 'luxury';

    const taglineOptions = taglines[matchedType];
    const tagline = taglineOptions[Math.floor(Math.random() * taglineOptions.length)];
    const aboutText = aboutTexts[matchedType];

    res.json({ tagline, aboutText });
});

function generateAboutText(brandName) {
    return `${brandName} represents the pinnacle of luxury perfumery. Each fragrance is meticulously crafted using the finest ingredients sourced from around the world, blending tradition with modern sophistication. Our master perfumers dedicate themselves to creating scents that transcend time, leaving an unforgettable impression wherever you go.`;
}

function generateLandingPage(pageData, theme) {
    const isDark = ['luxury-oud', 'sensual-night', 'dark-masculine', 'modern-luxury', 'oriental-gold'].includes(theme.id);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageData.brandName} | Luxury Perfumes</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(theme.font)}:wght@300;400;500;600;700&family=${encodeURIComponent(theme.fontBody)}:wght@300;400;500&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
            --primary: ${theme.colors.primary};
            --secondary: ${theme.colors.secondary};
            --accent: ${theme.colors.accent};
            --text: ${theme.colors.text};
            --text-dark: ${theme.colors.textDark};
            --background: ${theme.colors.background};
        }
        html { scroll-behavior: smooth; }
        body {
            font-family: '${theme.fontBody}', sans-serif;
            color: var(--text);
            line-height: 1.6;
            overflow-x: hidden;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }

        .hero {
            min-height: 100vh;
            background: ${isDark ? `linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)` : `var(--background)`};
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            position: relative;
        }
        .hero-content { z-index: 1; animation: fadeInUp 1.2s ease-out; }
        .logo { max-width: 350px; width: 80%; height: auto; margin-bottom: 30px; border-radius: 8px; }
        .brand-name {
            font-family: '${theme.font}', serif;
            font-size: 4rem;
            font-weight: 400;
            letter-spacing: 8px;
            margin-bottom: 20px;
            color: ${isDark ? 'var(--text)' : 'var(--text-dark)'};
        }
        .tagline {
            font-family: '${theme.font}', serif;
            font-size: 1.5rem;
            font-weight: 300;
            letter-spacing: 4px;
            margin-bottom: 50px;
            opacity: 0.9;
            color: ${isDark ? 'var(--text)' : 'var(--text-dark)'};
        }
        .btn-primary {
            display: inline-block;
            padding: 18px 50px;
            background: ${isDark ? 'var(--accent)' : 'var(--accent)'};
            color: ${isDark ? 'var(--primary)' : '#ffffff'};
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 500;
            letter-spacing: 2px;
            text-transform: uppercase;
            border-radius: ${theme.buttonStyle === 'pill' ? '50px' : theme.buttonStyle === 'sharp' ? '0' : '8px'};
            transition: all 0.4s ease;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .btn-primary:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0,0,0,0.25); }

        .about {
            background: ${isDark ? 'var(--background)' : '#ffffff'};
            color: ${isDark ? 'var(--text)' : 'var(--text-dark)'};
            padding: 120px 0;
        }
        .about-content { max-width: 800px; margin: 0 auto; text-align: center; }
        .section-title {
            font-family: '${theme.font}', serif;
            font-size: 2.8rem;
            font-weight: 400;
            letter-spacing: 3px;
            margin-bottom: 20px;
        }
        .divider { width: 60px; height: 1px; background: ${isDark ? 'var(--accent)' : 'var(--accent)'}; margin: 30px auto; opacity: 0.6; }
        .about-text { font-size: 1.1rem; font-weight: 300; line-height: 2; opacity: 0.85; }

        .features-bar {
            background: ${isDark ? 'var(--secondary)' : 'var(--primary)'};
            padding: 60px 0;
        }
        .features-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 30px; text-align: center; }
        .feature-item { display: flex; flex-direction: column; align-items: center; gap: 15px; color: ${isDark ? 'var(--text)' : '#ffffff'}; }
        .feature-icon { width: 50px; height: 50px; }
        .feature-icon svg { width: 100%; height: 100%; }
        .feature-item span { font-size: 0.85rem; font-weight: 500; letter-spacing: 2px; }

        .offer {
            background: ${isDark ? `linear-gradient(180deg, var(--secondary) 0%, var(--primary) 100%)` : `var(--primary)`};
            padding: 120px 0;
            text-align: center;
            color: ${isDark ? 'var(--text)' : '#ffffff'};
        }
        .offer-content h2 { font-family: '${theme.font}', serif; font-size: 2.8rem; font-weight: 400; letter-spacing: 3px; margin-bottom: 20px; }
        .offer .divider { background: ${isDark ? 'var(--accent)' : '#ffffff'}; }
        .offer-tagline { font-size: 1.2rem; font-weight: 300; letter-spacing: 2px; opacity: 0.9; margin-bottom: 60px; }
        .offer-details { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px; margin-bottom: 60px; }
        .offer-card {
            background: rgba(255,255,255,0.08);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 16px;
            padding: 50px 30px;
            transition: all 0.4s ease;
        }
        .offer-card:hover { transform: translateY(-8px); background: rgba(255,255,255,0.12); }
        .offer-label { display: inline-block; font-size: 0.7rem; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; background: rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 20px; margin-bottom: 25px; }
        .offer-card h3 { font-family: '${theme.font}', serif; font-size: 2.2rem; font-weight: 400; margin-bottom: 10px; }
        .offer-card p { font-weight: 300; opacity: 0.85; letter-spacing: 1px; }

        .policy {
            background: ${isDark ? 'var(--background)' : '#ffffff'};
            color: ${isDark ? 'var(--text)' : 'var(--text-dark)'};
            padding: 100px 0;
        }
        .policy-content { max-width: 900px; margin: 0 auto; }
        .policy-content h2 { font-family: '${theme.font}', serif; font-size: 2.5rem; font-weight: 400; letter-spacing: 2px; text-align: center; margin-bottom: 20px; }
        .policy .divider { background: var(--accent); margin-bottom: 40px; }
        .policy-intro { font-size: 1rem; font-weight: 300; line-height: 1.9; margin-bottom: 40px; text-align: center; opacity: 0.85; }
        .policy-section { margin-bottom: 40px; }
        .policy-section h3 { font-family: '${theme.font}', serif; font-size: 1.5rem; font-weight: 500; margin-bottom: 20px; }
        .policy-section ul { list-style: none; padding: 0; }
        .policy-section li { position: relative; padding-left: 20px; margin-bottom: 12px; font-size: 1rem; font-weight: 300; line-height: 1.8; opacity: 0.85; }
        .policy-section li::before { content: '•'; position: absolute; left: 0; color: var(--accent); font-weight: bold; }
        .policy-note { font-size: 1rem; font-weight: 300; line-height: 1.8; margin-bottom: 30px; padding: 20px; background: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}; border-radius: 8px; border-left: 3px solid var(--accent); }
        .contact-email { display: flex; align-items: center; gap: 10px; font-size: 1rem; }
        .contact-email a { color: var(--accent); text-decoration: none; font-weight: 400; }

        .footer {
            background: var(--primary);
            padding: 60px 0;
            text-align: center;
            color: ${isDark ? 'var(--text)' : '#ffffff'};
        }
        .footer-brand { font-family: '${theme.font}', serif; font-size: 1.8rem; font-weight: 400; letter-spacing: 8px; margin-bottom: 10px; }
        .footer-tagline { font-size: 0.85rem; font-weight: 300; letter-spacing: 3px; opacity: 0.7; margin-bottom: 30px; }
        .footer-copyright { font-size: 0.75rem; font-weight: 300; opacity: 0.5; letter-spacing: 1px; }

        @keyframes fadeInUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { opacity: 0; transform: translateY(30px); transition: opacity 0.8s ease, transform 0.8s ease; }
        .fade-in.visible { opacity: 1; transform: translateY(0); }

        @media (max-width: 768px) {
            .brand-name { font-size: 2.5rem; letter-spacing: 4px; }
            .tagline { font-size: 1.1rem; letter-spacing: 2px; }
            .section-title, .offer-content h2 { font-size: 2rem; }
            .features-grid { grid-template-columns: repeat(2, 1fr); gap: 40px 20px; }
            .about, .offer, .policy { padding: 80px 0; }
        }
        @media (max-width: 480px) {
            .brand-name { font-size: 2rem; }
            .logo { max-width: 250px; }
        }
    </style>
</head>
<body>
    <section class="hero">
        <div class="hero-content">
            ${pageData.logoPath ? `<img src="${pageData.logoPath}" alt="${pageData.brandName} Logo" class="logo">` : `<h1 class="brand-name">${pageData.brandName.toUpperCase()}</h1>`}
            <p class="tagline">${pageData.tagline}</p>
            <a href="#offer" class="btn-primary">${pageData.ctaText}</a>
        </div>
    </section>

    <section class="about">
        <div class="container">
            <div class="about-content fade-in">
                <h2 class="section-title">The Art of Fragrance</h2>
                <div class="divider"></div>
                <p class="about-text">${pageData.aboutText}</p>
            </div>
        </div>
    </section>

    <section class="features-bar">
        <div class="container">
            <div class="features-grid">
                <div class="feature-item fade-in">
                    <div class="feature-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="8" y="12" width="32" height="40" rx="2"/>
                            <line x1="12" y1="20" x2="36" y2="20"/>
                            <line x1="12" y1="28" x2="36" y2="28"/>
                            <circle cx="48" cy="36" r="12"/>
                        </svg>
                    </div>
                    <span>INSTALLMENT</span>
                </div>
                <div class="feature-item fade-in">
                    <div class="feature-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M16 24 L32 8 L48 24 L48 52 L16 52 Z"/>
                            <circle cx="32" cy="36" r="8"/>
                            <path d="M28 36 L30 38 L36 32"/>
                        </svg>
                    </div>
                    <span>3 DAYS RETURN</span>
                </div>
                <div class="feature-item fade-in">
                    <div class="feature-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="8" y="20" width="28" height="24" rx="2"/>
                            <circle cx="22" cy="32" r="6"/>
                            <path d="M40 28 L56 28 L56 44 L40 44"/>
                        </svg>
                    </div>
                    <span>CASH ON DELIVERY</span>
                </div>
                <div class="feature-item fade-in">
                    <div class="feature-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="8" y="28" width="36" height="20" rx="2"/>
                            <circle cx="20" cy="48" r="6"/>
                            <circle cx="38" cy="48" r="6"/>
                            <path d="M44 28 L44 20 L56 20 L56 42 L44 42"/>
                        </svg>
                    </div>
                    <span>FAST DELIVERY</span>
                </div>
            </div>
        </div>
    </section>

    <section class="offer" id="offer">
        <div class="container">
            <div class="offer-content fade-in">
                <h2>${pageData.offerTitle}</h2>
                <div class="divider"></div>
                <p class="offer-tagline">${pageData.offerDescription}</p>
                <div class="offer-details">
                    <div class="offer-card fade-in">
                        <span class="offer-label">Limited Time</span>
                        <h3>20% Off</h3>
                        <p>On your first purchase</p>
                    </div>
                    <div class="offer-card fade-in">
                        <span class="offer-label">Exclusive</span>
                        <h3>Free Gift</h3>
                        <p>With orders over $150</p>
                    </div>
                    <div class="offer-card fade-in">
                        <span class="offer-label">Members Only</span>
                        <h3>VIP Access</h3>
                        <p>Early collection previews</p>
                    </div>
                </div>
                <a href="#" class="btn-primary">${pageData.ctaText}</a>
            </div>
        </div>
    </section>

    <section class="policy">
        <div class="container">
            <div class="policy-content fade-in">
                <h2>Exchange & Return Policy</h2>
                <div class="divider"></div>
                <p class="policy-intro">At <strong>${pageData.brandName}</strong>, your satisfaction is our top priority. We allow our customers to <strong>open and inspect</strong> their orders upon delivery.</p>
                <div class="policy-section">
                    <h3>Conditions for Exchange or Return</h3>
                    <ul>
                        <li>The <strong>original box and packaging must be kept</strong>, even if the product has been opened.</li>
                        <li>The item must be in <strong>good condition</strong>, with all accessories and packaging included.</li>
                        <li>Returns are accepted within <strong>3 days</strong> of receiving your order.</li>
                    </ul>
                </div>
                <div class="policy-section">
                    <h3>Return & Refund Process</h3>
                    <ul>
                        <li>Our <strong>courier</strong> will collect the return directly from your address.</li>
                        <li>Once the item is checked, your <strong>refund will be processed</strong>.</li>
                        <li><strong>Cairo and Giza:</strong> Refund <strong>in cash on the spot</strong> when collecting the returned order.</li>
                        <li><strong>Other governorates:</strong> Refund processed <strong>through shipping company</strong>.</li>
                    </ul>
                </div>
                <p class="policy-note">If you receive a <strong>wrong or damaged product</strong>, please contact our customer service immediately.</p>
                <div class="contact-email">
                    <span>✉</span>
                    <a href="mailto:info@${pageData.brandName.toLowerCase().replace(/\s+/g, '')}.com">info@${pageData.brandName.toLowerCase().replace(/\s+/g, '')}.com</a>
                </div>
            </div>
        </div>
    </section>

    <footer class="footer">
        <div class="container">
            <p class="footer-brand">${pageData.brandName.toUpperCase()}</p>
            <p class="footer-tagline">Luxury Perfumes</p>
            <p class="footer-copyright">&copy; ${new Date().getFullYear()} ${pageData.brandName}. All rights reserved.</p>
        </div>
    </footer>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const fadeElements = document.querySelectorAll('.fade-in');
            const observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.15 });
            fadeElements.forEach(function(el) { observer.observe(el); });
        });
    </script>
</body>
</html>`;
}

function generateLandingPageWithSections(pageData, theme) {
    const isDark = ['luxury-oud', 'sensual-night', 'dark-masculine', 'modern-luxury', 'oriental-gold'].includes(theme.id);
    const sections = pageData.sections || [];

    if (sections.length === 0) {
        return generateLandingPage(pageData, theme);
    }

    let sectionsHtml = '';
    sections.forEach(section => {
        sectionsHtml += generateSectionHtml(section, pageData, theme, isDark);
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageData.brandName} | Luxury Perfumes</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(theme.font)}:wght@300;400;500;600;700&family=${encodeURIComponent(theme.fontBody)}:wght@300;400;500&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
            --primary: ${theme.colors.primary};
            --secondary: ${theme.colors.secondary};
            --accent: ${theme.colors.accent};
            --text: ${theme.colors.text};
            --text-dark: ${theme.colors.textDark};
            --background: ${theme.colors.background};
        }
        html { scroll-behavior: smooth; }
        body {
            font-family: '${theme.fontBody}', sans-serif;
            color: var(--text);
            line-height: 1.6;
            overflow-x: hidden;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        h1, h2, h3 { font-family: '${theme.font}', serif; }
        .btn-primary {
            display: inline-block;
            padding: 18px 50px;
            background: ${isDark ? 'var(--accent)' : 'var(--accent)'};
            color: ${isDark ? 'var(--primary)' : '#ffffff'};
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 500;
            letter-spacing: 2px;
            text-transform: uppercase;
            border-radius: ${theme.buttonStyle === 'pill' ? '50px' : theme.buttonStyle === 'sharp' ? '0' : '8px'};
            transition: all 0.4s ease;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .btn-primary:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0,0,0,0.25); }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { opacity: 0; transform: translateY(30px); transition: opacity 0.8s ease, transform 0.8s ease; }
        .fade-in.visible { opacity: 1; transform: translateY(0); }
        @media (max-width: 768px) {
            .features-grid { grid-template-columns: repeat(2, 1fr) !important; }
            .offer-grid { grid-template-columns: 1fr !important; }
        }
    </style>
</head>
<body>
${sectionsHtml}
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const fadeElements = document.querySelectorAll('.fade-in');
            const observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.15 });
            fadeElements.forEach(function(el) { observer.observe(el); });
        });
    </script>
</body>
</html>`;
}

function generateSectionHtml(section, pageData, theme, isDark) {
    switch (section.type) {
        case 'hero':
            return `
    <section style="min-height: 100vh; background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%); display: flex; align-items: center; justify-content: center; text-align: center; padding: 60px 20px;">
        <div class="fade-in">
            ${pageData.logoPath ? `<img src="${pageData.logoPath}" alt="${pageData.brandName}" style="max-width: 350px; width: 80%; margin-bottom: 30px; border-radius: 8px;">` : `<h1 style="color: var(--accent); font-size: 4rem; letter-spacing: 8px; margin-bottom: 20px;">${pageData.brandName.toUpperCase()}</h1>`}
            <p style="color: ${isDark ? 'var(--text)' : 'var(--text-dark)'}; font-size: 1.5rem; letter-spacing: 4px; margin-bottom: 50px; opacity: 0.9;">${section.data.tagline || pageData.tagline}</p>
            <a href="#offer" class="btn-primary">${section.data.ctaText || pageData.ctaText}</a>
        </div>
    </section>`;

        case 'about':
            return `
    <section style="background: ${isDark ? 'var(--background)' : '#ffffff'}; color: ${isDark ? 'var(--text)' : 'var(--text-dark)'}; padding: 120px 20px;">
        <div class="container fade-in" style="max-width: 800px; text-align: center;">
            <h2 style="font-size: 2.8rem; letter-spacing: 3px; margin-bottom: 20px;">${section.data.title || 'The Art of Fragrance'}</h2>
            <div style="width: 60px; height: 1px; background: var(--accent); margin: 30px auto; opacity: 0.6;"></div>
            <p style="font-size: 1.1rem; line-height: 2; opacity: 0.85;">${section.data.text || pageData.aboutText}</p>
        </div>
    </section>`;

        case 'features':
            const featureItems = section.data.items || ['INSTALLMENT', '3 DAYS RETURN', 'CASH ON DELIVERY', 'FAST DELIVERY'];
            const featureIconsMap = {
                'INSTALLMENT': '💳',
                'INSTALLMENTS': '💳',
                '3 DAYS RETURN': '🔄',
                'RETURN': '🔄',
                'CASH ON DELIVERY': '💵',
                'COD': '💵',
                'FAST DELIVERY': '🚚',
                'DELIVERY': '🚚',
                'FREE SHIPPING': '📦',
                'SHIPPING': '📦',
                'WARRANTY': '🛡️',
                'GUARANTEE': '✅',
                'ORIGINAL': '⭐',
                'AUTHENTIC': '💎',
                '24/7 SUPPORT': '📞',
                'SUPPORT': '📞'
            };
            const getIcon = (item) => {
                const upperItem = item.toUpperCase();
                for (const [key, icon] of Object.entries(featureIconsMap)) {
                    if (upperItem.includes(key)) return icon;
                }
                return '✨';
            };
            return `
    <section style="background: linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%); padding: 60px 20px;">
        <div class="container">
            <div class="features-grid" style="display: grid; grid-template-columns: repeat(${featureItems.length}, 1fr); gap: 30px; text-align: center; color: ${isDark ? 'var(--text)' : '#ffffff'};">
                ${featureItems.map(item => `<div class="fade-in" style="padding: 20px;"><div style="font-size: 2rem; margin-bottom: 15px;">${getIcon(item)}</div><span style="font-size: 0.85rem; font-weight: 500; letter-spacing: 2px;">${item}</span></div>`).join('')}
            </div>
        </div>
    </section>`;

        case 'offer':
            return `
    <section id="offer" style="background: linear-gradient(180deg, var(--secondary) 0%, var(--primary) 100%); padding: 120px 20px; text-align: center; color: ${isDark ? 'var(--text)' : '#ffffff'};">
        <div class="container fade-in">
            <h2 style="font-size: 2.8rem; letter-spacing: 3px; margin-bottom: 20px;">${section.data.title || 'Exclusive Offer'}</h2>
            <div style="width: 60px; height: 1px; background: ${isDark ? 'var(--accent)' : '#ffffff'}; margin: 30px auto;"></div>
            <p style="font-size: 1.2rem; opacity: 0.9; margin-bottom: 60px;">${section.data.description || 'Discover your signature scent'}</p>
            <div class="offer-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; max-width: 900px; margin: 0 auto 60px;">
                <div style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 16px; padding: 50px 30px;">
                    <span style="display: inline-block; font-size: 0.7rem; background: rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 20px; margin-bottom: 25px;">Limited Time</span>
                    <h3 style="font-size: 2.2rem; margin-bottom: 10px;">20% Off</h3>
                    <p style="opacity: 0.85;">On your first purchase</p>
                </div>
                <div style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 16px; padding: 50px 30px;">
                    <span style="display: inline-block; font-size: 0.7rem; background: rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 20px; margin-bottom: 25px;">Exclusive</span>
                    <h3 style="font-size: 2.2rem; margin-bottom: 10px;">Free Gift</h3>
                    <p style="opacity: 0.85;">With orders over $150</p>
                </div>
                <div style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 16px; padding: 50px 30px;">
                    <span style="display: inline-block; font-size: 0.7rem; background: rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 20px; margin-bottom: 25px;">Members Only</span>
                    <h3 style="font-size: 2.2rem; margin-bottom: 10px;">VIP Access</h3>
                    <p style="opacity: 0.85;">Early collection previews</p>
                </div>
            </div>
            <a href="#" class="btn-primary">${pageData.ctaText}</a>
        </div>
    </section>`;

        case 'policy':
            const policyBg = section.data.bgColor || (isDark ? 'var(--background)' : '#ffffff');
            const policyTextColor = section.data.textColor || (isDark ? 'var(--text)' : 'var(--text-dark)');
            const policyTitle = section.data.title || 'Exchange & Return Policy';
            const policyIntro = section.data.intro || `At ${pageData.brandName}, your satisfaction is our top priority. We allow our customers to open and inspect their orders upon delivery.`;
            const policyConditions = section.data.conditions || ['The original box and packaging must be kept, even if the product has been opened.', 'The item must be in good condition, with all accessories and packaging included.', 'Returns are accepted within 3 days of receiving your order.'];
            const policyRefund = section.data.refundProcess || ['Our courier will collect the return directly from your address.', 'Once the item is checked, your refund will be processed.', 'Cairo and Giza: Refund in cash on the spot when collecting the returned order.', 'Other governorates: Refund processed through shipping company.'];
            const policyNotice = section.data.notice || 'If you receive a wrong or damaged product, please contact our customer service immediately.';
            return `
    <section style="background: ${policyBg}; color: ${policyTextColor}; padding: 100px 20px;">
        <div class="container fade-in" style="max-width: 900px;">
            <h2 style="font-size: 2.5rem; text-align: center; margin-bottom: 20px;">${policyTitle}</h2>
            <div style="width: 60px; height: 1px; background: var(--accent); margin: 30px auto 40px;"></div>
            <p style="text-align: center; margin-bottom: 40px; opacity: 0.9; line-height: 1.8;">${policyIntro}</p>
            <div style="margin-bottom: 40px;">
                <h3 style="font-size: 1.5rem; margin-bottom: 20px;">Conditions for Exchange or Return</h3>
                <ul style="padding-left: 20px; line-height: 2.2; opacity: 0.9;">
                    ${policyConditions.map(c => `<li>${c}</li>`).join('')}
                </ul>
            </div>
            <div style="margin-bottom: 40px;">
                <h3 style="font-size: 1.5rem; margin-bottom: 20px;">Return & Refund Process</h3>
                <ul style="padding-left: 20px; line-height: 2.2; opacity: 0.9;">
                    ${policyRefund.map(r => `<li>${r}</li>`).join('')}
                </ul>
            </div>
            <div style="background: rgba(128,128,128,0.1); border: 1px solid rgba(128,128,128,0.2); border-radius: 8px; padding: 20px; margin-bottom: 30px; text-align: center;">
                <p style="opacity: 0.9;">${policyNotice}</p>
            </div>
            <p style="font-size: 1rem; text-align: center;">📧 <a href="mailto:${section.data.email || 'info@' + pageData.brandName.toLowerCase().replace(/\\s+/g, '') + '.com'}" style="color: var(--accent);">${section.data.email || 'info@' + pageData.brandName.toLowerCase().replace(/\\s+/g, '') + '.com'}</a></p>
        </div>
    </section>`;

        case 'footer':
            return `
    <footer style="background: var(--primary); color: ${isDark ? 'var(--text)' : '#ffffff'}; padding: 60px 20px; text-align: center;">
        <p style="font-size: 1.8rem; letter-spacing: 8px; margin-bottom: 10px;">${pageData.brandName.toUpperCase()}</p>
        <p style="font-size: 0.85rem; opacity: 0.7; letter-spacing: 3px; margin-bottom: 30px;">Luxury Perfumes</p>
        <p style="font-size: 0.75rem; opacity: 0.5;">© ${new Date().getFullYear()} ${pageData.brandName}. All rights reserved.</p>
    </footer>`;

        case 'gallery':
            return `
    <section style="background: ${isDark ? 'var(--background)' : '#ffffff'}; padding: 100px 20px; text-align: center;">
        <div class="container fade-in">
            <h2 style="color: ${isDark ? 'var(--text)' : 'var(--text-dark)'}; font-size: 2.5rem; margin-bottom: 40px;">Gallery</h2>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; max-width: 900px; margin: 0 auto;">
                <div style="background: var(--secondary); height: 200px; border-radius: 8px;"></div>
                <div style="background: var(--secondary); height: 200px; border-radius: 8px;"></div>
                <div style="background: var(--secondary); height: 200px; border-radius: 8px;"></div>
            </div>
        </div>
    </section>`;

        case 'testimonials':
            return `
    <section style="background: ${isDark ? 'var(--secondary)' : '#f9f9f9'}; padding: 100px 20px; text-align: center;">
        <div class="container fade-in">
            <h2 style="color: ${isDark ? 'var(--text)' : 'var(--text-dark)'}; font-size: 2.5rem; margin-bottom: 40px;">What Our Customers Say</h2>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px; max-width: 800px; margin: 0 auto;">
                <div style="background: ${isDark ? 'rgba(255,255,255,0.05)' : '#ffffff'}; padding: 30px; border-radius: 12px; text-align: left;">
                    <p style="color: ${isDark ? 'var(--text)' : 'var(--text-dark)'}; font-style: italic; margin-bottom: 15px;">"Absolutely stunning fragrance. I get compliments everywhere I go!"</p>
                    <p style="color: var(--accent); font-weight: 500;">— Sarah M.</p>
                </div>
                <div style="background: ${isDark ? 'rgba(255,255,255,0.05)' : '#ffffff'}; padding: 30px; border-radius: 12px; text-align: left;">
                    <p style="color: ${isDark ? 'var(--text)' : 'var(--text-dark)'}; font-style: italic; margin-bottom: 15px;">"The quality is exceptional. Worth every penny!"</p>
                    <p style="color: var(--accent); font-weight: 500;">— Ahmed K.</p>
                </div>
            </div>
        </div>
    </section>`;

        case 'contact':
            return `
    <section style="background: ${isDark ? 'var(--background)' : '#ffffff'}; padding: 100px 20px; text-align: center;">
        <div class="container fade-in">
            <h2 style="color: ${isDark ? 'var(--text)' : 'var(--text-dark)'}; font-size: 2.5rem; margin-bottom: 40px;">Contact Us</h2>
            <p style="color: ${isDark ? 'var(--text)' : 'var(--text-dark)'}; margin-bottom: 20px; opacity: 0.85;">Have questions? We'd love to hear from you.</p>
            <p style="font-size: 1.1rem;">📧 <a href="mailto:info@${pageData.brandName.toLowerCase().replace(/\\s+/g, '')}.com" style="color: var(--accent);">info@${pageData.brandName.toLowerCase().replace(/\\s+/g, '')}.com</a></p>
        </div>
    </section>`;

        case 'cta':
            return `
    <section style="background: var(--accent); padding: 80px 20px; text-align: center;">
        <div class="container fade-in">
            <h2 style="color: var(--primary); font-size: 2.5rem; margin-bottom: 30px;">${section.data.title || 'Ready to Experience Luxury?'}</h2>
            <a href="#" style="display: inline-block; padding: 18px 50px; background: var(--primary); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500; letter-spacing: 2px;">${pageData.ctaText}</a>
        </div>
    </section>`;

        case 'text':
            return `
    <section style="background: ${isDark ? 'var(--background)' : '#ffffff'}; padding: 80px 20px;">
        <div class="container fade-in" style="max-width: 800px;">
            <p style="color: ${isDark ? 'var(--text)' : 'var(--text-dark)'}; font-size: 1.1rem; line-height: 1.8;">${section.data.text || ''}</p>
        </div>
    </section>`;

        default:
            return '';
    }
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Perfume Landing Page Builder running at http://0.0.0.0:${PORT}`);
});
