// Application State
let appState = {
    releases: [],
    selectedUpdates: new Map(), // Map of ID -> { date, type, body, link }
    currentSearch: '',
    currentTypeFilter: 'all',
    isLoading: false
};

// SVG Progress Ring Constants
const PROGRESS_RING_RADIUS = 10;
const PROGRESS_RING_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RING_RADIUS;

// DOM Elements
const elements = {
    refreshBtn: document.getElementById('refresh-button'),
    refreshIcon: document.getElementById('refresh-icon'),
    searchInput: document.getElementById('search-input'),
    typeFiltersContainer: document.getElementById('type-filters-container'),
    batchActionPanel: document.getElementById('batch-action-panel'),
    selectedCountBadge: document.getElementById('selected-count-badge'),
    batchTweetBtn: document.getElementById('batch-tweet-btn'),
    feedUpdatedDate: document.getElementById('feed-updated-date'),
    loadingState: document.getElementById('loading-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    retryButton: document.getElementById('retry-button'),
    emptyState: document.getElementById('empty-state'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    feedContainer: document.getElementById('release-notes-feed'),
    
    // Modal elements
    tweetModal: document.getElementById('tweet-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    cancelTweetBtn: document.getElementById('cancel-tweet-btn'),
    postTweetBtn: document.getElementById('post-tweet-btn'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    tweetCharCount: document.getElementById('tweet-char-count'),
    progressCircle: document.getElementById('progress-circle'),
    tweetPreviewLink: document.getElementById('tweet-preview-link'),
    toastContainer: document.getElementById('toast-container')
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    fetchReleases();
    setupProgressRing();
});

// Event Listeners
function setupEventListeners() {
    // Refresh Button
    elements.refreshBtn.addEventListener('click', fetchReleases);
    elements.retryButton.addEventListener('click', fetchReleases);
    
    // Search input
    elements.searchInput.addEventListener('input', (e) => {
        appState.currentSearch = e.target.value.toLowerCase().trim();
        filterAndRenderFeed();
    });
    
    // Type Filters
    elements.typeFiltersContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        
        // Update active class
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update filter state
        appState.currentTypeFilter = btn.dataset.type;
        filterAndRenderFeed();
    });
    
    // Reset buttons
    elements.resetFiltersBtn.addEventListener('click', resetFilters);
    
    // Batch Tweet Action
    elements.batchTweetBtn.addEventListener('click', openBatchTweetComposer);
    
    // Modal closure
    elements.closeModalBtn.addEventListener('click', closeTweetComposer);
    elements.cancelTweetBtn.addEventListener('click', closeTweetComposer);
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) closeTweetComposer();
    });
    
    // Textarea character count and validation
    elements.tweetTextarea.addEventListener('input', updateTweetCharacterCount);
}

// Setup SVG progress ring properties
function setupProgressRing() {
    if (elements.progressCircle) {
        elements.progressCircle.style.strokeDasharray = `${PROGRESS_RING_CIRCUMFERENCE} ${PROGRESS_RING_CIRCUMFERENCE}`;
        elements.progressCircle.style.strokeDashoffset = PROGRESS_RING_CIRCUMFERENCE;
    }
}

// Reset Search & Filters
function resetFilters() {
    elements.searchInput.value = '';
    appState.currentSearch = '';
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.type === 'all') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    appState.currentTypeFilter = 'all';
    filterAndRenderFeed();
}

// Fetch Release Notes from API
async function fetchReleases() {
    if (appState.isLoading) return;
    
    setLoadingState(true);
    
    try {
        const response = await fetch('/api/releases');
        const data = await response.json();
        
        if (data.success) {
            appState.releases = data.releases;
            
            // Format updated timestamp
            if (data.releases && data.releases.length > 0) {
                // Find latest date
                const latestDate = data.releases[0].date;
                elements.feedUpdatedDate.textContent = `Latest releases: ${latestDate}`;
            } else {
                elements.feedUpdatedDate.textContent = 'No releases found';
            }
            
            // Re-render feed
            filterAndRenderFeed();
            showToast('Release notes loaded successfully', 'success');
        } else {
            showErrorState(data.error || 'Server failed to process feed');
        }
    } catch (err) {
        showErrorState(err.message || 'Network error fetching release notes');
    } finally {
        setLoadingState(false);
    }
}

// UI State Toggles
function setLoadingState(loading) {
    appState.isLoading = loading;
    if (loading) {
        elements.refreshIcon.classList.add('spinning');
        elements.refreshBtn.disabled = true;
        elements.loadingState.classList.remove('hidden');
        elements.errorState.classList.add('hidden');
        elements.emptyState.classList.add('hidden');
        elements.feedContainer.classList.add('hidden');
    } else {
        elements.refreshIcon.classList.remove('spinning');
        elements.refreshBtn.disabled = false;
        elements.loadingState.classList.add('hidden');
    }
}

function showErrorState(errorMsg) {
    elements.errorMessage.textContent = errorMsg;
    elements.errorState.classList.remove('hidden');
    elements.loadingState.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
    elements.feedContainer.classList.add('hidden');
    showToast('Failed to load release notes', 'error');
}

// Strip HTML tags helper
function stripHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || doc.body.innerText || "";
}

// Filter and Render Release Notes
function filterAndRenderFeed() {
    // Clear feed container
    elements.feedContainer.innerHTML = '';
    
    let totalVisibleUpdates = 0;
    
    appState.releases.forEach((release, releaseIdx) => {
        // Filter updates inside this release entry
        const visibleUpdates = release.updates.filter(update => {
            // Type matching
            const typeMatch = appState.currentTypeFilter === 'all' || 
                              update.type.toLowerCase() === appState.currentTypeFilter;
            
            // Search text matching
            const cleanBody = stripHtml(update.body).toLowerCase();
            const cleanType = update.type.toLowerCase();
            const searchMatch = !appState.currentSearch || 
                                cleanBody.includes(appState.currentSearch) || 
                                cleanType.includes(appState.currentSearch);
                                
            return typeMatch && searchMatch;
        });
        
        if (visibleUpdates.length > 0) {
            totalVisibleUpdates += visibleUpdates.length;
            
            // Create Date Group Container
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';
            
            // Date Header
            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-header';
            
            const h3 = document.createElement('h3');
            h3.textContent = release.date;
            
            const line = document.createElement('div');
            line.className = 'date-line';
            
            dateHeader.appendChild(h3);
            dateHeader.appendChild(line);
            dateGroup.appendChild(dateHeader);
            
            // Add Update Cards
            visibleUpdates.forEach((update, updateIdx) => {
                const updateId = `update-${releaseIdx}-${updateIdx}`;
                const isSelected = appState.selectedUpdates.has(updateId);
                
                const card = document.createElement('div');
                card.className = `update-card ${isSelected ? 'selected' : ''}`;
                card.id = updateId;
                
                // Card Selection Checkbox
                const selector = document.createElement('div');
                selector.className = 'card-selector';
                
                const checkbox = document.createElement('div');
                checkbox.className = 'custom-checkbox';
                checkbox.innerHTML = '<i class="fa-solid fa-check"></i>';
                
                selector.appendChild(checkbox);
                card.appendChild(selector);
                
                // Card details container
                const details = document.createElement('div');
                details.className = 'card-details';
                
                // Card Header
                const cardHeader = document.createElement('div');
                cardHeader.className = 'card-header';
                
                // Badge
                const typeClass = `badge-${update.type.toLowerCase()}`;
                const badge = document.createElement('span');
                badge.className = `badge ${elements.typeFiltersContainer.querySelector(`[data-type="${update.type.toLowerCase()}"]`) ? typeClass : 'badge-default'}`;
                badge.textContent = update.type;
                
                cardHeader.appendChild(badge);
                details.appendChild(cardHeader);
                
                // Card Body
                const cardBody = document.createElement('div');
                cardBody.className = 'card-body';
                cardBody.innerHTML = update.body;
                details.appendChild(cardBody);
                
                // Card Actions Footer
                const cardActions = document.createElement('div');
                cardActions.className = 'card-actions';
                
                const copyBtn = document.createElement('button');
                copyBtn.className = 'card-btn';
                copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy Text';
                copyBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    copyUpdateText(update);
                });
                
                const tweetBtn = document.createElement('button');
                tweetBtn.className = 'card-btn card-btn-tweet';
                tweetBtn.innerHTML = '<i class="fa-brands fa-x-twitter"></i> Tweet';
                tweetBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openTweetComposer(release.date, update, release.link);
                });
                
                cardActions.appendChild(copyBtn);
                cardActions.appendChild(tweetBtn);
                details.appendChild(cardActions);
                
                card.appendChild(details);
                
                // Toggle card selection on click
                card.addEventListener('click', () => {
                    toggleCardSelection(updateId, {
                        date: release.date,
                        type: update.type,
                        body: update.body,
                        link: release.link
                    });
                });
                
                dateGroup.appendChild(card);
            });
            
            elements.feedContainer.appendChild(dateGroup);
        }
    });
    
    // Viewport State Switcher
    if (totalVisibleUpdates === 0 && appState.releases.length > 0) {
        elements.emptyState.classList.remove('hidden');
        elements.feedContainer.classList.add('hidden');
    } else if (appState.releases.length === 0) {
        elements.emptyState.classList.add('hidden');
        elements.feedContainer.classList.add('hidden');
    } else {
        elements.emptyState.classList.add('hidden');
        elements.feedContainer.classList.remove('hidden');
    }
}

// Toggle Selection State of Update Card
function toggleCardSelection(id, updateInfo) {
    const card = document.getElementById(id);
    if (!card) return;
    
    if (appState.selectedUpdates.has(id)) {
        appState.selectedUpdates.delete(id);
        card.classList.remove('selected');
    } else {
        appState.selectedUpdates.set(id, updateInfo);
        card.classList.add('selected');
    }
    
    updateBatchPanel();
}

// Update Batch Action Panel visibility and count
function updateBatchPanel() {
    const count = appState.selectedUpdates.size;
    if (count > 0) {
        elements.selectedCountBadge.textContent = count;
        elements.batchActionPanel.classList.remove('hidden');
    } else {
        elements.batchActionPanel.classList.add('hidden');
    }
}

// Copy update text to Clipboard
function copyUpdateText(update) {
    const rawText = stripHtml(update.body);
    const textToCopy = `[BigQuery ${update.type}] ${rawText}`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        showToast('Text copied to clipboard', 'success');
    }).catch(err => {
        showToast('Failed to copy text', 'error');
    });
}

// Open Tweet Composer modal for a Single Update
function openTweetComposer(date, update, link) {
    const rawText = stripHtml(update.body);
    const hashtags = ' #BigQuery #GoogleCloud';
    
    // Limit snippet to ~200 characters to leave room for date, type, link and hashtags
    const headerPrefix = `[BigQuery - ${update.type}] (${date}): `;
    const linkLength = 23; // Twitter counts all links as 23 chars
    const maxTextLength = 280 - linkLength - hashtags.length - headerPrefix.length - 2;
    
    let snippet = rawText;
    if (rawText.length > maxTextLength) {
        snippet = rawText.substring(0, maxTextLength - 3) + '...';
    }
    
    const draftText = `${headerPrefix}${snippet}${hashtags}`;
    
    elements.tweetTextarea.value = draftText;
    elements.tweetPreviewLink.textContent = link || 'https://docs.cloud.google.com/bigquery/docs/release-notes';
    
    updateTweetCharacterCount();
    
    // Action when posting this tweet
    elements.postTweetBtn.onclick = () => {
        triggerTweetPost(elements.tweetTextarea.value, link);
    };
    
    elements.tweetModal.classList.remove('hidden');
    elements.tweetTextarea.focus();
}

// Open Tweet Composer for multiple selected updates
function openBatchTweetComposer() {
    if (appState.selectedUpdates.size === 0) return;
    
    const selectedList = Array.from(appState.selectedUpdates.values());
    const hashtags = ' #BigQuery #GoogleCloud';
    const link = selectedList[0].link; // Use first link
    
    let draftText = `Checking out the latest BigQuery updates:\n`;
    
    selectedList.forEach(item => {
        const bodySnippet = stripHtml(item.body).substring(0, 40) + '...';
        draftText += `• [${item.type}] ${bodySnippet}\n`;
    });
    
    draftText += hashtags;
    
    // Truncate whole tweet if it exceeds
    const linkLength = 23;
    const maxTotalLength = 280 - linkLength - 1;
    if (draftText.length > maxTotalLength) {
        draftText = draftText.substring(0, maxTotalLength - 3) + '...';
    }
    
    elements.tweetTextarea.value = draftText;
    elements.tweetPreviewLink.textContent = link || 'https://docs.cloud.google.com/bigquery/docs/release-notes';
    
    updateTweetCharacterCount();
    
    // Action when posting batch tweet
    elements.postTweetBtn.onclick = () => {
        triggerTweetPost(elements.tweetTextarea.value, link);
    };
    
    elements.tweetModal.classList.remove('hidden');
    elements.tweetTextarea.focus();
}

// Close Modal
function closeTweetComposer() {
    elements.tweetModal.classList.add('hidden');
}

// Trigger X Web Intent redirect
function triggerTweetPost(text, url) {
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
    closeTweetComposer();
    
    // Clear selection on success
    if (appState.selectedUpdates.size > 0) {
        appState.selectedUpdates.clear();
        document.querySelectorAll('.update-card').forEach(c => c.classList.remove('selected'));
        updateBatchPanel();
    }
    
    showToast('Redirected to share on X!', 'success');
}

// Character Limit Checker and Ring Animation
function updateTweetCharacterCount() {
    const text = elements.tweetTextarea.value;
    const count = text.length;
    
    // X character limit is 280.
    elements.tweetCharCount.textContent = `${count} / 280`;
    
    // Ring progress calculation
    const progress = Math.min(count / 280, 1);
    const offset = PROGRESS_RING_CIRCUMFERENCE - (progress * PROGRESS_RING_CIRCUMFERENCE);
    elements.progressCircle.style.strokeDashoffset = offset;
    
    // Style adjustments based on limits
    elements.tweetCharCount.classList.remove('warning', 'danger');
    if (count > 280) {
        elements.tweetCharCount.classList.add('danger');
        elements.progressCircle.style.stroke = 'var(--badge-issue)';
        elements.postTweetBtn.disabled = true;
    } else if (count >= 260) {
        elements.tweetCharCount.classList.add('warning');
        elements.progressCircle.style.stroke = 'var(--badge-changed)';
        elements.postTweetBtn.disabled = false;
    } else {
        elements.progressCircle.style.stroke = 'var(--primary)';
        elements.postTweetBtn.disabled = false;
    }
}

// Toast System
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const iconClass = type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation';
    
    toast.innerHTML = `
        <i class="${iconClass} toast-icon"></i>
        <div class="toast-message">${message}</div>
        <button class="toast-close">&times;</button>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Trigger slide-in
    setTimeout(() => {
        toast.classList.add('show');
    }, 50);
    
    // Dismiss listener
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        dismissToast(toast);
    });
    
    // Auto dismiss after 3.5s
    setTimeout(() => {
        dismissToast(toast);
    }, 3500);
}

function dismissToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.remove('show');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}
