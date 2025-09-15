// API Configuration
const API_BASE_URL = '/api/v1';

// DOM Helpers
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

// Application State
const state = {
    map: null,
    markers: [],
    activeTab: 'dashboard',
    emergencies: [],
    ambulances: [],
    drivers: []
};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    loadInitialData();
    
    // Initialize map if on the new emergency page
    const mapElement = $('#map');
    if (mapElement) {
        initMap();
    }
});

/**
 * Load initial data for the current view
 */
async function loadInitialData() {
    try {
        // Load data based on current tab
        const tabDataLoaders = {
            'dashboard': [loadDashboardData],
            'active-emergencies': [loadActiveEmergencies],
            'ambulance-list': [loadAmbulances],
            'driver-list': [loadDrivers],
            'reports': [loadReports]
        };

        const currentTabLoaders = tabDataLoaders[state.activeTab] || [];
        await Promise.all(currentTabLoaders.map(loader => loader()));
        
    } catch (error) {
        console.error('Error loading initial data:', error);
        showAlert('Failed to load application data', 'danger');
    }
}

/**
 * Initialize all event listeners
 */
function initEventListeners() {
    // Tab navigation
    $$('[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', (e) => {
            const target = e.target.getAttribute('data-bs-target');
            state.activeTab = target.replace('#', '');
            loadInitialData(); // Load data for the new tab
        });
    });
    
    // Emergency form submission
    const emergencyForm = $('#emergency-form');
    if (emergencyForm) {
        emergencyForm.addEventListener('submit', handleEmergencySubmit);
    }
    
    // Add family member button
    const addFamilyMemberBtn = $('#add-family-member');
    if (addFamilyMemberBtn) {
        addFamilyMemberBtn.addEventListener('click', addFamilyMemberField);
    }
    
    // Get current location button
    const getLocationBtn = $('#get-location-btn');
    if (getLocationBtn) {
        getLocationBtn.addEventListener('click', getCurrentLocation);
    }
    
    // Modal hidden event to clean up
    const modals = $$('.modal');
    modals.forEach(modal => {
        modal.addEventListener('hidden.bs.modal', () => {
            // Clean up modal content when hidden
            const modalBody = modal.querySelector('.modal-body');
            if (modalBody) {
                modalBody.innerHTML = `
                    <div class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>`;
            }
        });
    });
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call($$('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
}

/**
 * Load and display dashboard data
 */
async function loadDashboardData() {
    try {
        showLoading('dashboard-content');
        
        const [emergenciesRes, ambulancesRes, driversRes] = await Promise.all([
            fetch(`${API_BASE_URL}/emergencies/active/list`),
            fetch(`${API_BASE_URL}/ambulances/available/list`),
            fetch(`${API_BASE_URL}/ambulances/drivers/available/list`)
        ]);
        
        if (!emergenciesRes.ok || !ambulancesRes.ok || !driversRes.ok) {
            throw new Error('Failed to fetch dashboard data');
        }
        
        const [emergencies, ambulances, drivers] = await Promise.all([
            emergenciesRes.json(),
            ambulancesRes.json(),
            driversRes.json()
        ]);
        
        // Update state
        state.emergencies = emergencies;
        state.ambulances = ambulances;
        state.drivers = drivers;
        
        // Update UI
        updateDashboardCounts(emergencies, ambulances, drivers);
        updateRecentEmergencies(emergencies);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showAlert('Failed to load dashboard data. Please try again.', 'danger');
    } finally {
        hideLoading('dashboard-content');
    }
}

// Load active emergencies
async function loadActiveEmergencies() {
    try {
        const response = await fetch(`${API_BASE_URL}/emergencies/active/list`);
        const emergencies = await response.json();
        
        updateActiveEmergenciesTable(emergencies);
        
    } catch (error) {
        console.error('Error loading active emergencies:', error);
        showAlert('Failed to load active emergencies', 'danger');
    }
}

// Load ambulances
async function loadAmbulances() {
    try {
        const response = await fetch(`${API_BASE_URL}/ambulances/available/list`);
        const ambulances = await response.json();
        
        updateAmbulancesTable(ambulances);
        updateAvailableAmbulancesCount(ambulances.length);
        
    } catch (error) {
        console.error('Error loading ambulances:', error);
        showAlert('Failed to load ambulances', 'danger');
    }
}

// Load drivers
async function loadDrivers() {
    try {
        const response = await fetch(`${API_BASE_URL}/ambulances/drivers/available/list`);
        const drivers = await response.json();
        
        updateDriversTable(drivers);
        updateAvailableDriversCount(drivers.length);
        
    } catch (error) {
        console.error('Error loading drivers:', error);
        showAlert('Failed to load drivers', 'danger');
    }
}

// Handle emergency form submission
async function handleEmergencySubmit(e) {
    e.preventDefault();
    
    const formData = {
        reporter_name: $('#reporter-name').value,
        reporter_phone: $('#reporter-phone').value,
        location_lat: parseFloat($('#latitude').value),
        location_lng: parseFloat($('#longitude').value),
        address: $('#emergency-address').value,
        description: $('#emergency-description').value,
        family_members: []
    };
    
    // Add family members if any
    $$('.family-member').forEach(member => {
        formData.family_members.push({
            name: member.querySelector('.member-name').value,
            relation: member.querySelector('.member-relation').value,
            phone: member.querySelector('.member-phone').value
        });
    });
    
    try {
        const response = await fetch(`${API_BASE_URL}/emergencies/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to report emergency');
        }
        
        const result = await response.json();
        showAlert('Emergency reported successfully!', 'success');
        
        // Reset form
        e.target.reset();
        
        // Redirect to active emergencies
        const activeEmergenciesTab = document.querySelector('[data-bs-target="#active-emergencies"]');
        if (activeEmergenciesTab) {
            activeEmergenciesTab.click();
        }
        
    } catch (error) {
        console.error('Error reporting emergency:', error);
        showAlert('Failed to report emergency', 'danger');
    }
}

// Add family member field
function addFamilyMemberField() {
    const container = $('#family-members-container');
    const memberId = Date.now();
    
    const memberHtml = `
        <div class="family-member row g-3 mb-3" id="member-${memberId}">
            <div class="col-md-4">
                <input type="text" class="form-control member-name" placeholder="Name" required>
            </div>
            <div class="col-md-3">
                <input type="text" class="form-control member-relation" placeholder="Relation" required>
            </div>
            <div class="col-md-4">
                <input type="tel" class="form-control member-phone" placeholder="Phone" required>
            </div>
            <div class="col-md-1">
                <button type="button" class="btn btn-danger btn-sm w-100" onclick="removeFamilyMember('${memberId}')">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', memberHtml);
}

// Remove family member field
function removeFamilyMember(id) {
    const element = $(`#${id}`);
    if (element) {
        element.remove();
    }
}

// Get current location
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                $('#latitude').value = latitude;
                $('#longitude').value = longitude;
                
                // Update map
                updateMap(latitude, longitude);
                
                // Reverse geocode to get address
                reverseGeocode(latitude, longitude);
            },
            (error) => {
                console.error('Error getting location:', error);
                showAlert('Could not get your location. Please enter it manually.', 'warning');
            }
        );
    } else {
        showAlert('Geolocation is not supported by your browser', 'warning');
    }
}

// Initialize map
function initMap() {
    map = L.map('map').setView([33.6844, 73.0479], 12); // Default to Islamabad
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Add click event to update location
    map.on('click', function(e) {
        const { lat, lng } = e.latlng;
        $('#latitude').value = lat;
        $('#longitude').value = lng;
        
        // Update map marker
        updateMap(lat, lng);
        
        // Reverse geocode to get address
        reverseGeocode(lat, lng);
    });
}

// Update map with marker at given coordinates
function updateMap(lat, lng) {
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // Add new marker
    const marker = L.marker([lat, lng]).addTo(map);
    markers.push(marker);
    
    // Center map on marker
    map.setView([lat, lng], 15);
}

// Reverse geocode coordinates to get address
async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        
        if (data.display_name) {
            $('#emergency-address').value = data.display_name;
        }
    } catch (error) {
        console.error('Error reverse geocoding:', error);
    }
}

// Update dashboard counts
function updateDashboardCounts(emergencies) {
    const activeCount = emergencies.length;
    
    // Update active emergencies count
    $('#active-emergencies-count').textContent = activeCount;
    $('#active-emergencies-count-card').textContent = activeCount;
    
    // Update today's emergencies count (simplified)
    const todayCount = emergencies.filter(e => {
        const emergencyDate = new Date(e.created_at);
        const today = new Date();
        return emergencyDate.toDateString() === today.toDateString();
    }).length;
    
    $('#todays-emergencies-count').textContent = todayCount;
}

// Update recent emergencies table
function updateRecentEmergencies(emergencies) {
    const tbody = $('#recent-emergencies-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const recentEmergencies = emergencies.slice(0, 5); // Get 5 most recent
    
    if (recentEmergencies.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No recent emergencies</td></tr>';
        return;
    }
    
    recentEmergencies.forEach(emergency => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${emergency.id}</td>
            <td>${escapeHtml(emergency.reporter_name)}</td>
            <td>${escapeHtml(emergency.reporter_phone)}</td>
            <td>${truncateText(emergency.address || 'N/A', 20)}</td>
            <td><span class="badge bg-${getStatusBadgeClass(emergency.status)}">${formatStatus(emergency.status)}</span></td>
            <td>${formatDateTime(emergency.created_at)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewEmergency(${emergency.id})">
                    <i class="bi bi-eye"></i> View
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Update active emergencies table
function updateActiveEmergenciesTable(emergencies) {
    const tbody = $('#active-emergencies-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (emergencies.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No active emergencies</td></tr>';
        return;
    }
    
    emergencies.forEach(emergency => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${emergency.id}</td>
            <td>${escapeHtml(emergency.reporter_name)}</td>
            <td>${escapeHtml(emergency.reporter_phone)}</td>
            <td>${truncateText(emergency.address || 'N/A', 20)}</td>
            <td><span class="badge bg-${getStatusBadgeClass(emergency.status)}">${formatStatus(emergency.status)}</span></td>
            <td>${formatDateTime(emergency.created_at)}</td>
            <td>${emergency.assigned_ambulance_id ? `Ambulance #${emergency.assigned_ambulance_id}` : 'Not assigned'}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="viewEmergency(${emergency.id})">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-success" onclick="assignAmbulance(${emergency.id})" ${emergency.assigned_ambulance_id ? 'disabled' : ''}>
                        <i class="bi bi-ambulance"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="updateEmergencyStatus(${emergency.id}, 'completed')">
                        <i class="bi bi-check-circle"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Update ambulances table
function updateAmbulancesTable(ambulances) {
    const tbody = $('#ambulances-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (ambulances.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No ambulances found</td></tr>';
        return;
    }
    
    ambulances.forEach(ambulance => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${ambulance.id}</td>
            <td>${escapeHtml(ambulance.vehicle_number)}</td>
            <td>${ambulance.model || 'N/A'}</td>
            <td>${ambulance.capacity}</td>
            <td><span class="badge bg-${getAmbulanceStatusBadgeClass(ambulance.status)}">${formatAmbulanceStatus(ambulance.status)}</span></td>
            <td>${ambulance.current_location_lat && ambulance.current_location_lng 
                ? `${ambulance.current_location_lat.toFixed(4)}, ${ambulance.current_location_lng.toFixed(4)}` 
                : 'N/A'}</td>
            <td>${ambulance.drivers && ambulance.drivers.length > 0 
                ? ambulance.drivers[0].name 
                : 'No driver assigned'}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="viewAmbulance(${ambulance.id})">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-secondary" onclick="editAmbulance(${ambulance.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Update drivers table
function updateDriversTable(drivers) {
    const tbody = $('#drivers-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (drivers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No drivers found</td></tr>';
        return;
    }
    
    drivers.forEach(driver => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${driver.id}</td>
            <td>${escapeHtml(driver.name)}</td>
            <td>${escapeHtml(driver.phone)}</td>
            <td>${driver.license_number}</td>
            <td><span class="badge bg-${driver.is_available ? 'success' : 'secondary'}">${driver.is_available ? 'Available' : 'Unavailable'}</span></td>
            <td>${driver.ambulance_id ? `Ambulance #${driver.ambulance_id}` : 'Not assigned'}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="viewDriver(${driver.id})">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-secondary" onclick="editDriver(${driver.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-info" onclick="assignAmbulanceToDriver(${driver.id})">
                        <i class="bi bi-truck"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Update available ambulances count
function updateAvailableAmbulancesCount(count) {
    const elements = $$('.available-ambulances-count');
    elements.forEach(el => {
        el.textContent = count;
    });
}

// Update available drivers count
function updateAvailableDriversCount(count) {
    const elements = $$('.available-drivers-count');
    elements.forEach(el => {
        el.textContent = count;
    });
}

// Format status for display
function formatStatus(status) {
    if (!status) return 'Unknown';
    
    const statusMap = {
        'pending': 'Pending',
        'in_progress': 'In Progress',
        'resolved': 'Resolved',
        'cancelled': 'Cancelled',
        'assigned': 'Assigned',
        'dispatched': 'Dispatched',
        'on_scene': 'On Scene',
        'transporting': 'Transporting',
        'at_hospital': 'At Hospital',
        'completed': 'Completed'
    };
    
    return statusMap[status] || status.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Get appropriate badge class for a status
function getStatusBadgeClass(status) {
    const statusClasses = {
        'pending': 'bg-warning',
        'in_progress': 'bg-primary',
        'resolved': 'bg-success',
        'cancelled': 'bg-secondary',
        'assigned': 'bg-info',
        'dispatched': 'bg-info',
        'on_scene': 'bg-primary',
        'transporting': 'bg-primary',
        'at_hospital': 'bg-info',
        'completed': 'bg-success'
    };
    
    return statusClasses[status] || 'bg-secondary';
}

// Format a date string for display
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    
    return new Date(dateString).toLocaleString(undefined, options);
}

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Format ambulance status for display
function formatAmbulanceStatus(status) {
    return status
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Get badge class based on status
function getStatusBadgeClass(status) {
    const statusClasses = {
        'reported': 'warning',
        'assigned': 'info',
        'in_progress': 'primary',
        'completed': 'success',
        'cancelled': 'secondary'
    };
    
    return statusClasses[status] || 'secondary';
}

// Get badge class for ambulance status
function getAmbulanceStatusBadgeClass(status) {
    const statusClasses = {
        'available': 'success',
        'on_duty': 'primary',
        'maintenance': 'warning',
        'out_of_service': 'danger'
    };
    
    return statusClasses[status] || 'secondary';
}

// Format date and time
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleString();
}

// Truncate text with ellipsis
function truncateText(text, maxLength) {
    if (!text) return 'N/A';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Placeholder functions for UI actions
function viewEmergency(id) {
    // Implementation for viewing emergency details
    console.log('View emergency:', id);
    // In a real app, this would open a modal or navigate to a detail page
    showAlert(`Viewing emergency #${id}`, 'info');
}

function assignAmbulance(emergencyId) {
    // Implementation for assigning an ambulance to an emergency
    console.log('Assign ambulance to emergency:', emergencyId);
    // In a real app, this would open a modal to select an available ambulance
    showAlert(`Assigning ambulance to emergency #${emergencyId}`, 'info');
}

function updateEmergencyStatus(emergencyId, status) {
    // Implementation for updating emergency status
    console.log(`Update emergency #${emergencyId} status to:`, status);
    // In a real app, this would make an API call to update the status
    showAlert(`Updating emergency #${emergencyId} status to ${status}`, 'info');
}

function viewAmbulance(id) {
    // Implementation for viewing ambulance details
    console.log('View ambulance:', id);
    // In a real app, this would open a modal or navigate to a detail page
    showAlert(`Viewing ambulance #${id}`, 'info');
}

function editAmbulance(id) {
    // Implementation for editing ambulance details
    console.log('Edit ambulance:', id);
    // In a real app, this would open a form to edit the ambulance
    showAlert(`Editing ambulance #${id}`, 'info');
}

function viewDriver(id) {
    // Implementation for viewing driver details
    console.log('View driver:', id);
    // In a real app, this would open a modal or navigate to a detail page
    showAlert(`Viewing driver #${id}`, 'info');
}

function editDriver(id) {
    // Implementation for editing driver details
    console.log('Edit driver:', id);
    // In a real app, this would open a form to edit the driver
    showAlert(`Editing driver #${id}`, 'info');
}

function assignAmbulanceToDriver(driverId) {
    // Implementation for assigning an ambulance to a driver
    console.log('Assign ambulance to driver:', driverId);
    // In a real app, this would open a modal to select an available ambulance
    showAlert(`Assigning ambulance to driver #${driverId}`, 'info');
}

// Make utility functions available globally
window.formatStatus = formatStatus;
window.formatDate = formatDate;
window.getStatusBadgeClass = getStatusBadgeClass;

// Initialize the application when the script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Already handled by the main event listener
    });
} else {
    // DOM already loaded, initialize immediately
    document.dispatchEvent(new Event('DOMContentLoaded'));
}
