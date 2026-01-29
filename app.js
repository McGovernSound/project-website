import CONFIG from './config.js';

async function fetchProjectData(projectObj) {
    const { repo: repoName, displayName } = projectObj;
    try {
        const response = await fetch(`https://api.github.com/repos/${CONFIG.githubUsername}/${repoName}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const repo = await response.json();

        const releasesResponse = await fetch(`https://api.github.com/repos/${CONFIG.githubUsername}/${repoName}/releases/latest`);
        let latestRelease = null;
        if (releasesResponse.ok) {
            latestRelease = await releasesResponse.json();
        }

        return {
            name: displayName || repo.name,
            description: repo.description || "No description provided.",
            stars: repo.stargazers_count,
            language: repo.language,
            version: latestRelease ? latestRelease.tag_name : "v1.0.0",
            downloadUrl: latestRelease ? latestRelease.html_url : repo.html_url,
            updatedAt: new Date(repo.updated_at).toLocaleDateString()
        };
    } catch (error) {
        console.error(`Error fetching data for ${repoName}:`, error);
        return null;
    }
}

function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card glass';

    card.innerHTML = `
        <div class="project-header">
            <h2 class="project-title">${project.name}</h2>
            <p class="project-description">${project.description}</p>
        </div>
        <div class="project-meta">
            <div class="meta-item">
                <span>⭐</span> ${project.stars}
            </div>
            <div class="meta-item">
                <span>📦</span> ${project.version}
            </div>
            <div class="meta-item">
                <span>📅</span> ${project.updatedAt}
            </div>
        </div>
        <a href="${project.downloadUrl}" class="btn-download" target="_blank">Download Latest</a>
    `;

    return card;
}

async function init() {
    const grid = document.getElementById('projects-grid');
    const titleEl = document.getElementById('site-title');
    const subtitleEl = document.getElementById('site-subtitle');

    // Set site identity
    titleEl.textContent = CONFIG.siteTitle;
    subtitleEl.textContent = CONFIG.siteSubtitle;

    const projectDataPromises = CONFIG.repositories.map(projectObj => fetchProjectData(projectObj));
    const projects = await Promise.all(projectDataPromises);

    grid.innerHTML = ''; // Clear loading state

    const validProjects = projects.filter(p => p !== null);

    if (validProjects.length === 0) {
        grid.innerHTML = `
            <div class="error-state">
                <p>Could not load projects. Check your configuration or GitHub API limits.</p>
            </div>
        `;
        return;
    }

    validProjects.forEach(project => {
        grid.appendChild(createProjectCard(project));
    });
}

document.addEventListener('DOMContentLoaded', init);
