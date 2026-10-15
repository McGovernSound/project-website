import CONFIG from './config.js?v=1.1.13';

const CACHE_KEY = 'mgs_projects_cache_v1_13';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

function detectClientSystem() {
    const userAgent = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const isWindows = /Win/i.test(userAgent) || /Win/i.test(platform);
    const isMac = /Mac/i.test(userAgent) || /Mac/i.test(platform);

    let macArch = 'arm64'; // Default to modern Apple Silicon

    if (isMac) {
        if (navigator.userAgentData?.architecture) {
            const arch = navigator.userAgentData.architecture.toLowerCase();
            if (arch.includes('arm')) macArch = 'arm64';
            else if (arch.includes('x86') || arch.includes('64')) macArch = 'x64';
        } else {
            try {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                if (gl) {
                    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                    if (debugInfo) {
                        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                        if (/Apple/i.test(renderer) && !/Intel/i.test(renderer)) {
                            macArch = 'arm64';
                        } else if (/Intel/i.test(renderer)) {
                            macArch = 'x64';
                        }
                    }
                }
            } catch (e) {}
        }
    }

    return { isWindows, isMac, macArch };
}

async function fetchProjectData(projectObj) {
    if (projectObj.type === 'webapp') {
        return {
            name: projectObj.displayName || projectObj.id,
            description: projectObj.description || "No description provided.",
            version: "v1.0.0",
            downloadUrl: projectObj.path,
            primaryLabel: 'Launch App',
            alternativeLinks: [],
            releaseNotes: "Initial Release.",
            publishedAt: new Date().toLocaleDateString(),
            isWebApp: true
        };
    }

    const { repo: repoName, displayName } = projectObj;
    try {
        const response = await fetch(`https://api.github.com/repos/${CONFIG.githubUsername}/${repoName}`);
        if (response.status === 403) {
            throw new Error('RATE_LIMIT');
        }
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const repo = await response.json();

        const releasesResponse = await fetch(`https://api.github.com/repos/${CONFIG.githubUsername}/${repoName}/releases/latest`);
        let latestRelease = null;
        if (releasesResponse.ok) {
            latestRelease = await releasesResponse.json();
        } else if (releasesResponse.status === 403) {
            console.warn(`Rate limit hit for ${repoName} releases, falling back to repo data.`);
        }

        // Shorten version: "v1.0.1-2026..." -> "v1.0.1"
        const fullVersion = latestRelease ? latestRelease.tag_name : "v1.0.0";
        const shortVersion = fullVersion.split('-')[0];

        // Intelligent Multi-Platform Download Logic
        let primaryUrl = latestRelease ? latestRelease.html_url : repo.html_url;
        let primaryLabel = 'Download Latest';
        const alternativeLinks = [];

        if (latestRelease && latestRelease.assets && latestRelease.assets.length > 0) {
            const client = detectClientSystem();
            const assets = latestRelease.assets;

            // 1. Identify platform assets
            const winAsset = assets.find(a => a.name.endsWith('.exe'));

            const macArm64Asset = assets.find(a => a.name.endsWith('.dmg') && /arm64/i.test(a.name)) ||
                                  assets.find(a => a.name.endsWith('.zip') && /arm64/i.test(a.name));

            const macX64Asset = assets.find(a => a.name.endsWith('.dmg') && (/x64/i.test(a.name) || /x86/i.test(a.name) || (!/arm64/i.test(a.name) && !/universal/i.test(a.name)))) ||
                                assets.find(a => a.name.endsWith('.zip') && (/x64/i.test(a.name) || /x86/i.test(a.name) || (!/arm64/i.test(a.name) && !/universal/i.test(a.name))));

            const macUniversalAsset = assets.find(a => a.name.endsWith('.dmg') && /universal/i.test(a.name)) ||
                                      assets.find(a => a.name.endsWith('.zip') && /universal/i.test(a.name));

            const fallbackMacAsset = macUniversalAsset || macArm64Asset || macX64Asset ||
                                     assets.find(a => a.name.endsWith('.dmg')) ||
                                     assets.find(a => a.name.endsWith('.zip'));

            // 2. Select primary download based on detected OS & architecture
            if (client.isWindows) {
                if (winAsset) {
                    primaryUrl = winAsset.browser_download_url;
                    primaryLabel = 'Download for Windows (.exe)';
                } else if (fallbackMacAsset) {
                    primaryUrl = fallbackMacAsset.browser_download_url;
                    primaryLabel = 'Download for Mac';
                }
            } else if (client.isMac) {
                if (client.macArch === 'arm64' && macArm64Asset) {
                    primaryUrl = macArm64Asset.browser_download_url;
                    primaryLabel = 'Download for Mac (Apple Silicon)';
                } else if (client.macArch === 'x64' && macX64Asset) {
                    primaryUrl = macX64Asset.browser_download_url;
                    primaryLabel = 'Download for Mac (Intel)';
                } else if (macUniversalAsset) {
                    primaryUrl = macUniversalAsset.browser_download_url;
                    primaryLabel = 'Download for Mac (Universal)';
                } else if (fallbackMacAsset) {
                    primaryUrl = fallbackMacAsset.browser_download_url;
                    primaryLabel = 'Download for Mac';
                }
            } else {
                const defaultAsset = fallbackMacAsset || winAsset;
                if (defaultAsset) {
                    primaryUrl = defaultAsset.browser_download_url;
                }
            }

            // 3. Assemble alternative download links
            const candidateAlts = [];
            if (macArm64Asset) candidateAlts.push({ label: 'Mac (Apple Silicon)', url: macArm64Asset.browser_download_url });
            if (macX64Asset) candidateAlts.push({ label: 'Mac (Intel)', url: macX64Asset.browser_download_url });
            if (macUniversalAsset && !macArm64Asset && !macX64Asset) {
                candidateAlts.push({ label: 'Mac (Universal)', url: macUniversalAsset.browser_download_url });
            }
            if (winAsset) candidateAlts.push({ label: 'Windows', url: winAsset.browser_download_url });

            const seenUrls = new Set([primaryUrl]);
            candidateAlts.forEach(alt => {
                if (!seenUrls.has(alt.url)) {
                    seenUrls.add(alt.url);
                    alternativeLinks.push(alt);
                }
            });
        }

        return {
            name: displayName || repo.name,
            description: projectObj.description || repo.description || "No description provided.",
            version: shortVersion,
            downloadUrl: primaryUrl,
            primaryLabel: primaryLabel,
            alternativeLinks: alternativeLinks,
            releaseNotes: latestRelease ? latestRelease.body : "No release notes available.",
            publishedAt: latestRelease ? new Date(latestRelease.published_at).toLocaleDateString() : new Date(repo.updated_at).toLocaleDateString(),
            isWebApp: false
        };
    } catch (error) {
        if (error.message === 'RATE_LIMIT') {
            console.error(`Rate limit exceeded for GitHub API.`);
            throw error; // Re-throw to handle in init
        }
        console.error(`Error fetching data for ${repoName}:`, error);
        return null;
    }
}

function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card glass';

    const metaHtml = project.isWebApp ? '' : `
            <div class="project-meta">
                <div class="meta-item">
                    <span class="meta-label">Current Version</span>
                    <span class="meta-value">${project.version}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Release Date</span>
                    <span class="meta-value">${project.publishedAt}</span>
                </div>
            </div>`;

    const releaseNotesHtml = project.isWebApp ? '' : `
        <details class="release-notes-dropdown">
            <summary class="release-notes-summary">Release Notes</summary>
            <div class="release-notes-content">${project.releaseNotes || 'No release notes available.'}</div>
        </details>`;

    const otherLinksHtml = (!project.isWebApp && project.alternativeLinks && project.alternativeLinks.length > 0)
        ? `<div class="other-downloads">
            <span>Also for:</span>
            ${project.alternativeLinks.map(a => `<a href="${a.url}" target="_blank">${a.label}</a>`).join('<span class="sep">•</span>')}
           </div>`
        : '';

    card.innerHTML = `
        <div class="project-main-content">
            <div class="project-header">
                <h2 class="project-title">${project.name}</h2>
                <p class="project-description">${project.description}</p>
            </div>
            ${metaHtml}
            <div class="download-action-group">
                <a href="${project.downloadUrl}" class="btn-download" target="_blank">${project.isWebApp ? 'Launch App' : project.primaryLabel}</a>
                ${otherLinksHtml}
            </div>
        </div>
        ${releaseNotesHtml}
    `;

    return card;
}

function getCachedData() {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    try {
        const { timestamp, data } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
            console.log('Using cached project data');
            return data;
        }
    } catch (e) {
        console.error('Error parsing cache:', e);
    }
    return null;
}

function setCachedData(data) {
    const cacheObject = {
        timestamp: Date.now(),
        data: data
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject));
}

async function init() {
    const grid = document.getElementById('projects-grid');
    const titleEl = document.getElementById('site-title');
    const subtitleEl = document.getElementById('site-subtitle');

    // Set site identity
    titleEl.textContent = CONFIG.siteTitle;
    subtitleEl.textContent = CONFIG.siteSubtitle;

    // Try to load from cache first
    const cachedProjects = getCachedData();
    if (cachedProjects) {
        renderProjects(grid, cachedProjects);
        return;
    }

    try {
        const projectDataPromises = CONFIG.repositories.map(projectObj => fetchProjectData(projectObj));
        const projects = await Promise.all(projectDataPromises);

        const validProjects = projects
            .filter(p => p !== null)
            .sort((a, b) => a.name.localeCompare(b.name));

        if (validProjects.length > 0) {
            setCachedData(validProjects);
            renderProjects(grid, validProjects);
        } else {
            showError(grid, 'Could not load projects. Check your configuration.');
        }
    } catch (error) {
        if (error.message === 'RATE_LIMIT') {
            showError(grid, 'GitHub API rate limit exceeded. Please try again in an hour or check back later.');
        } else {
            showError(grid, 'An error occurred while fetching projects.');
        }
    }
}

function renderProjects(grid, projects) {
    grid.innerHTML = '';
    projects.forEach(project => {
        grid.appendChild(createProjectCard(project));
    });
}

function showError(grid, message) {
    grid.innerHTML = `
        <div class="error-state">
            <p>${message}</p>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', init);
