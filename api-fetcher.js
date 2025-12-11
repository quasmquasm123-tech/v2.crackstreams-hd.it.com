// ===== API FETCHER FOR TOPEMBED =====

class SportsAPI {
    constructor() {
        this.baseURL = 'https://topembed.pw/api.php';
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes cache
        this.cache = {};
    }
    
    // Fetch events from API
    async fetchEvents(format = 'json') {
        const cacheKey = `events_${format}`;
        const now = Date.now();
        
        // Check cache
        if (this.cache[cacheKey] && (now - this.cache[cacheKey].timestamp) < this.cacheDuration) {
            console.log('Returning cached events');
            return this.cache[cacheKey].data;
        }
        
        try {
            const url = `${this.baseURL}?format=${format}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }
            
            let data;
            
            if (format === 'json') {
                data = await response.json();
            } else if (format === 'xml') {
                const text = await response.text();
                data = this.parseXML(text);
            }
            
            // Cache the data
            this.cache[cacheKey] = {
                data: data,
                timestamp: now
            };
            
            return data;
            
        } catch (error) {
            console.error('API Fetch Error:', error);
            throw error;
        }
    }
    
    // Parse XML response
    parseXML(xmlText) {
        // Simple XML parser for this specific API
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        const events = {};
        const days = xmlDoc.getElementsByTagName('day');
        
        Array.from(days).forEach(day => {
            const date = day.getAttribute('date');
            const eventElements = day.getElementsByTagName('event');
            const dayEvents = [];
            
            Array.from(eventElements).forEach(eventEl => {
                const event = {
                    unix_timestamp: parseInt(this.getText(eventEl, 'unixTimestamp')),
                    sport: this.getText(eventEl, 'sport'),
                    tournament: this.getText(eventEl, 'tournament'),
                    match: this.getText(eventEl, 'match'),
                    channels: []
                };
                
                // Get channels
                const channelElements = eventEl.getElementsByTagName('channel');
                Array.from(channelElements).forEach(channelEl => {
                    event.channels.push(channelEl.textContent);
                });
                
                dayEvents.push(event);
            });
            
            events[date] = dayEvents;
        });
        
        return { events };
    }
    
    // Helper to get text from XML element
    getText(parent, tagName) {
        const element = parent.getElementsByTagName(tagName)[0];
        return element ? element.textContent : '';
    }
    
    // Get events by sport
    async getEventsBySport(sport) {
        const data = await this.fetchEvents('json');
        const filtered = {};
        
        for (const date in data.events) {
            const dayEvents = data.events[date].filter(event => 
                event.sport.toLowerCase() === sport.toLowerCase() ||
                event.tournament.toLowerCase().includes(sport.toLowerCase())
            );
            
            if (dayEvents.length > 0) {
                filtered[date] = dayEvents;
            }
        }
        
        return filtered;
    }
    
    // Get live events (happening now)
    getLiveEvents(events) {
        const now = Math.floor(Date.now() / 1000);
        const live = {};
        
        for (const date in events) {
            const dayEvents = events[date].filter(event => {
                const eventTime = event.unix_timestamp;
                const threeHours = 3 * 3600;
                return eventTime <= now && (now - eventTime) <= threeHours;
            });
            
            if (dayEvents.length > 0) {
                live[date] = dayEvents;
            }
        }
        
        return live;
    }
    
    // Clear cache
    clearCache() {
        this.cache = {};
        console.log('API cache cleared');
    }
}

// Create global instance
window.SportsAPI = new SportsAPI();