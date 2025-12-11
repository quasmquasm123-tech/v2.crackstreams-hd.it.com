// ===== MAIN JAVASCRIPT =====

// Global Variables
let allMatches = [];
let currentFilter = 'all';

// DOM Elements
const matchesGrid = document.getElementById('matches-grid');
const filterButtons = document.querySelectorAll('.filter-btn');
const mobileToggle = document.querySelector('.mobile-toggle');
const navMenu = document.querySelector('.nav-menu');
const liveCountElement = document.getElementById('live-count');

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('LiveSports website loaded');
    
    // Load matches from API
    loadMatches();
    
    // Setup event listeners
    setupEventListeners();
    
    // Update live count every minute
    setInterval(updateLiveCount, 60000);
});

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Mobile menu toggle
    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            this.innerHTML = navMenu.classList.contains('active') 
                ? '<i class="fas fa-times"></i>' 
                : '<i class="fas fa-bars"></i>';
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (mobileToggle && navMenu && 
                !mobileToggle.contains(event.target) && 
                !navMenu.contains(event.target)) {
                navMenu.classList.remove('active');
                mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });
    }
    
    // Filter buttons
    if (filterButtons.length > 0) {
        filterButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                // Remove active class from all buttons
                filterButtons.forEach(b => b.classList.remove('active'));
                
                // Add active class to clicked button
                this.classList.add('active');
                
                // Update current filter
                currentFilter = this.getAttribute('data-filter');
                
                // Filter matches
                filterMatches();
            });
        });
    }
}

// ===== LOAD MATCHES FROM API =====
async function loadMatches() {
    try {
        // Show loading state if matchesGrid exists
        if (matchesGrid) {
            matchesGrid.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading live matches...</p>
                </div>
            `;
        }
        
        // Fetch data from TopEmbed API
        const response = await fetch('https://topembed.pw/api.php?format=json');
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Process the data
        processMatches(data.events);
        
    } catch (error) {
        console.error('Error loading matches:', error);
        showError();
    }
}

// ===== PROCESS MATCHES DATA =====
function processMatches(eventsData) {
    allMatches = [];
    
    // Convert object to array and add date property
    for (const date in eventsData) {
        const dayEvents = eventsData[date];
        
        dayEvents.forEach(event => {
            // Filter out Cricket if present
            if (event.sport === 'Cricket') return;
            
            // Create match object with all necessary properties
            const match = {
                id: generateMatchId(event),
                date: date,
                timestamp: event.unix_timestamp,
                sport: event.sport,
                tournament: event.tournament,
                match: event.match,
                channels: event.channels || [],
                isLive: checkIfLive(event.unix_timestamp)
            };
            
            allMatches.push(match);
        });
    }
    
    // Sort matches by timestamp (soonest first)
    allMatches.sort((a, b) => a.timestamp - b.timestamp);
    
    // Display matches
    if (matchesGrid) {
        displayMatches(allMatches);
    }
    
    // Update live count
    updateLiveCount();
}

// ===== DISPLAY MATCHES =====
function displayMatches(matches) {
    if (!matchesGrid) return;
    
    // Clear the grid
    matchesGrid.innerHTML = '';
    
    if (matches.length === 0) {
        matchesGrid.innerHTML = `
            <div class="no-matches">
                <i class="fas fa-calendar-times"></i>
                <h3>No Matches Found</h3>
                <p>Try selecting a different sport or check back later.</p>
            </div>
        `;
        return;
    }
    
    // Create match cards
    matches.forEach(match => {
        const matchCard = createMatchCard(match);
        matchesGrid.appendChild(matchCard);
    });
}

// ===== CREATE MATCH CARD =====
function createMatchCard(match) {
    const card = document.createElement('div');
    card.className = 'match-card';
    card.setAttribute('data-sport', match.sport);
    
    // Format time
    const matchTime = formatTime(match.timestamp);
    const matchDate = formatDate(match.date);
    
    // Sport icon
    const sportIcon = getSportIcon(match.sport);
    
    // Create stream URL for stream.html page
    const streamUrl = `stream.html?id=${encodeURIComponent(match.id)}&match=${encodeURIComponent(match.match)}`;
    
    card.innerHTML = `
        <div class="match-header">
            <div class="match-sport">
                <i class="${sportIcon}"></i>
                <span>${match.tournament}</span>
            </div>
            ${match.isLive ? '<div class="live-badge">LIVE</div>' : ''}
        </div>
        
        <div class="match-body">
            <h3 class="match-title">${match.match}</h3>
            
            <div class="match-details">
                <div class="match-detail">
                    <i class="far fa-clock"></i>
                    <span>${matchTime} ET</span>
                </div>
                <div class="match-detail">
                    <i class="far fa-calendar"></i>
                    <span>${matchDate}</span>
                </div>
            </div>
            
            ${match.channels.length > 0 ? `
            <div class="stream-count">
                <i class="fas fa-link"></i>
                <span>${match.channels.length} stream${match.channels.length !== 1 ? 's' : ''} available</span>
            </div>
            ` : ''}
        </div>
        
        <div class="match-footer">
            <a href="${streamUrl}" target="_blank" class="btn btn-primary btn-block watch-btn">
                <i class="fas fa-play"></i> Watch Stream
            </a>
        </div>
    `;
    
    return card;
}

// ===== FILTER MATCHES =====
function filterMatches() {
    if (!matchesGrid) return;
    
    if (currentFilter === 'all') {
        displayMatches(allMatches);
        return;
    }
    
    const filtered = allMatches.filter(match => 
        match.sport.toLowerCase().includes(currentFilter.toLowerCase()) ||
        match.tournament.toLowerCase().includes(currentFilter.toLowerCase())
    );
    
    displayMatches(filtered);
}

// ===== HELPER FUNCTIONS =====
function generateMatchId(event) {
    return `${event.sport}-${event.match}-${event.unix_timestamp}`
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-');
}

function checkIfLive(timestamp) {
    const now = Math.floor(Date.now() / 1000);
    const matchTime = timestamp;
    const threeHours = 3 * 3600;
    
    // Consider match live if it started within the last 3 hours
    return matchTime <= now && (now - matchTime) <= threeHours;
}

function formatTime(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

function getSportIcon(sport) {
    const icons = {
        'Basketball': 'fas fa-basketball-ball',
        'Football': 'fas fa-football-ball',
        'Ice Hockey': 'fas fa-hockey-puck',
        'Golf': 'fas fa-golf-ball',
        'Tennis': 'fas fa-tennis-ball',
        'Soccer': 'fas fa-futbol',
        'UFC': 'fas fa-user-ninja',
        'Boxing': 'fas fa-boxing-glove',
        'MMA': 'fas fa-people-arrows',
        'Mixed Martial Arts': 'fas fa-fist-raised'
    };
    return icons[sport] || 'fas fa-trophy';
}

function updateLiveCount() {
    if (!liveCountElement) return;
    
    const liveCount = allMatches.filter(match => match.isLive).length;
    liveCountElement.textContent = liveCount;
}

function showError() {
    if (!matchesGrid) return;
    
    matchesGrid.innerHTML = `
        <div class="loading">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Unable to Load Matches</h3>
            <p>Please check your connection and try again.</p>
            <button class="btn btn-primary mt-2" onclick="loadMatches()">
                <i class="fas fa-redo"></i> Try Again
            </button>
        </div>
    `;
}

// ===== EXPORT FUNCTIONS FOR GLOBAL USE =====
window.loadMatches = loadMatches;
window.filterMatches = filterMatches;