import CONFIG from './config.js?v=1.1.6';

const CACHE_KEY = 'mgs_projects_cache_v1_3';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

async function fetchProjectData(projectObj) {
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

        // Direct Download Logic: Look for .zip or .dmg in assets
        let downloadUrl = latestRelease ? latestRelease.html_url : repo.html_url;
        if (latestRelease && latestRelease.assets && latestRelease.assets.length > 0) {
            const preferredAsset = latestRelease.assets.find(asset =>
                asset.name.endsWith('.zip') || asset.name.endsWith('.dmg')
            );
            if (preferredAsset) {
                downloadUrl = preferredAsset.browser_download_url;
            }
        }

        return {
            name: displayName || repo.name,
            description: repo.description || "No description provided.",
            version: shortVersion,
            downloadUrl: downloadUrl,
            releaseNotes: latestRelease ? latestRelease.body : "No release notes available.",
            publishedAt: latestRelease ? new Date(latestRelease.published_at).toLocaleDateString() : new Date(repo.updated_at).toLocaleDateString()
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

    card.innerHTML = `
        <div class="project-main-content">
            <div class="project-header">
                <h2 class="project-title">${project.name}</h2>
                <p class="project-description">${project.description}</p>
            </div>
            <div class="project-meta">
                <div class="meta-item">
                    <span class="meta-label">Current Version</span>
                    <span class="meta-value">${project.version}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Release Date</span>
                    <span class="meta-value">${project.publishedAt}</span>
                </div>
            </div>
            <a href="${project.downloadUrl}" class="btn-download" target="_blank">Download Latest</a>
        </div>
        <details class="release-notes-dropdown">
            <summary class="release-notes-summary">Release Notes</summary>
            <div class="release-notes-content">${project.releaseNotes || 'No release notes available.'}</div>
        </details>
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
