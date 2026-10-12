// ============================================================
// Blood Donor Matching Network - Frontend JavaScript
// Handles user interaction and calls the REST API
// ============================================================

const API_URL = '/api';

// ---------- Helper functions ----------

// Prevent HTML injection when showing user-entered text
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(isoString) {
    return new Date(isoString).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showMessage(elementId, text, type) {
    const element = document.getElementById(elementId);
    element.textContent = text;
    element.className = 'message ' + type;
}

// Small wrapper around fetch for JSON requests
async function apiCall(path, method, body) {
    const options = { method: method, headers: { 'Content-Type': 'application/json' } };
    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(API_URL + path, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Something went wrong.');
    }
    return data;
}

// ============================================================
// DONOR REGISTRATION
// ============================================================

async function registerDonor(event) {
    event.preventDefault();

    const donor = {
        name: document.getElementById('donorName').value,
        bloodGroup: document.getElementById('donorBloodGroup').value,
        location: document.getElementById('donorLocation').value,
        availability: document.getElementById('donorAvailability').value
    };

    try {
        const saved = await apiCall('/donors', 'POST', donor);
        showMessage('donorMessage', 'Donor registered successfully. ID: ' + saved.id, 'success');
        document.getElementById('donorForm').reset();
        loadDonors();
    } catch (error) {
        showMessage('donorMessage', error.message, 'error');
    }
}

async function loadDonors() {
    const container = document.getElementById('donorList');

    try {
        const donors = await apiCall('/donors', 'GET');

        if (donors.length === 0) {
            container.innerHTML = '<p class="placeholder">No donors registered yet.</p>';
            return;
        }

        let html = '';
        donors.forEach(donor => {
            const badgeClass = donor.availability === 'Available' ? 'Available' : 'NotAvailable';
            const toggleTo = donor.availability === 'Available' ? 'Not Available' : 'Available';

            html += `
                <div class="item">
                    <div class="item-title">
                        ${escapeHtml(donor.name)}
                        <span class="badge">${escapeHtml(donor.bloodGroup)}</span>
                        <span class="badge ${badgeClass}">${escapeHtml(donor.availability)}</span>
                    </div>
                    <div>ID: ${escapeHtml(donor.id)} &nbsp;|&nbsp; Location: ${escapeHtml(donor.location)}</div>
                    <div class="actions">
                        <button class="secondary" onclick="changeAvailability('${donor.id}', '${toggleTo}')">
                            Mark ${toggleTo}
                        </button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = '<p class="message error">' + escapeHtml(error.message) + '</p>';
    }
}

async function changeAvailability(donorId, availability) {
    try {
        await apiCall('/donors/' + donorId + '/availability', 'PUT', { availability: availability });
        loadDonors();
    } catch (error) {
        alert(error.message);
    }
}

// ============================================================
// EMERGENCY REQUEST + MATCHING
// ============================================================

async function submitRequest(event) {
    event.preventDefault();

    const request = {
        bloodGroup: document.getElementById('requestBloodGroup').value,
        hospital: document.getElementById('hospital').value,
        location: document.getElementById('requestLocation').value,
        urgency: document.getElementById('urgency').value
    };

    try {
        const result = await apiCall('/requests', 'POST', request);
        showMessage('requestMessage', 'Request ' + result.request.id + ' posted. Status: ' + result.request.status, 'success');
        displayMatches(result.request, result.matches);
        document.getElementById('requestForm').reset();

        // Refresh the request list if it is already open
        if (document.getElementById('requestList').querySelector('.item')) {
            loadRequests();
        }
    } catch (error) {
        showMessage('requestMessage', error.message, 'error');
    }
}

function displayMatches(request, matches) {
    const container = document.getElementById('results');

    let html = `
        <p><strong>Request ${escapeHtml(request.id)}</strong> &mdash;
        ${escapeHtml(request.bloodGroup)} needed at ${escapeHtml(request.hospital)},
        ${escapeHtml(request.location)}
        <span class="badge ${request.status}">${request.status}</span></p>
    `;

    if (matches.length === 0) {
        html += '<p class="placeholder">No available donors found for this blood group right now. The request stays Posted.</p>';
    } else {
        html += '<p class="placeholder">' + matches.length + ' matching donor(s) found:</p>';
        matches.forEach(donor => {
            html += `
                <div class="item">
                    <div class="item-title">
                        ${escapeHtml(donor.name)}
                        <span class="badge">${escapeHtml(donor.bloodGroup)}</span>
                        <span class="badge Available">Available</span>
                    </div>
                    <div>Location: ${escapeHtml(donor.location)} &nbsp;|&nbsp; Donor ID: ${escapeHtml(donor.id)}</div>
                </div>
            `;
        });
    }

    container.innerHTML = html;
}

// ============================================================
// REQUEST MANAGEMENT (lifecycle tracking)
// Posted -> Matched -> Alerted -> Confirmed -> Fulfilled
// ============================================================

async function loadRequests() {
    const container = document.getElementById('requestList');

    try {
        const requests = await apiCall('/requests', 'GET');

        if (requests.length === 0) {
            container.innerHTML = '<p class="placeholder">No blood requests saved yet.</p>';
            return;
        }

        let html = '';
        requests.forEach(request => {
            html += `
                <div class="item ${request.urgency.toLowerCase()}">
                    <div class="item-title">
                        ${escapeHtml(request.id)} &mdash; ${escapeHtml(request.bloodGroup)}
                        <span class="badge ${request.status}">${request.status}</span>
                    </div>
                    <div>Hospital: ${escapeHtml(request.hospital)} &nbsp;|&nbsp; Location: ${escapeHtml(request.location)}</div>
                    <div>Urgency: <strong>${escapeHtml(request.urgency)}</strong> &nbsp;|&nbsp; Created: ${formatDate(request.createdAt)}</div>
                    <div class="actions">
                        ${statusButtons(request)}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = '<p class="message error">' + escapeHtml(error.message) + '</p>';
    }
}

// Show only the buttons that make sense for the current status
function statusButtons(request) {
    const steps = ['Alerted', 'Confirmed', 'Fulfilled'];
    const order = ['Posted', 'Matched', 'Alerted', 'Confirmed', 'Fulfilled'];
    const currentIndex = order.indexOf(request.status);

    let buttons = '';
    steps.forEach(step => {
        if (order.indexOf(step) > currentIndex) {
            buttons += `
                <button class="secondary" onclick="changeStatus('${request.id}', '${step}')">
                    ${step}
                </button>
            `;
        }
    });

    return buttons || '<em>Request completed</em>';
}

async function changeStatus(id, status) {
    try {
        await apiCall('/requests/' + id + '/status', 'PUT', { status: status });
        loadRequests();
    } catch (error) {
        alert(error.message);
    }
}

// ============================================================
// EVENT LISTENERS
// ============================================================

document.getElementById('donorForm').addEventListener('submit', registerDonor);
document.getElementById('requestForm').addEventListener('submit', submitRequest);
document.getElementById('viewRequestsBtn').addEventListener('click', loadRequests);
document.getElementById('viewDonorsBtn').addEventListener('click', loadDonors);

// ============================================================
// HERO: "Find a donor now" card
// ============================================================

let selectedGroup = '';

// Choose a blood group button
document.getElementById('bgGrid').addEventListener('click', function (event) {
    const button = event.target.closest('button');
    if (!button) return;

    document.querySelectorAll('#bgGrid button').forEach(b => b.classList.remove('selected'));
    button.classList.add('selected');
    selectedGroup = button.dataset.group;
});

// Search available donors by blood group (and city, if entered)
async function searchDonors() {
    if (!selectedGroup) {
        showMessage('searchMessage', 'Please choose a blood group first.', 'error');
        return;
    }

    const city = document.getElementById('searchCity').value.trim().toLowerCase();

    try {
        const donors = await apiCall('/donors', 'GET');

        const matches = donors.filter(donor =>
            donor.bloodGroup === selectedGroup &&
            donor.availability === 'Available' &&
            (city === '' || donor.location.toLowerCase().includes(city))
        );

        showMessage('searchMessage', matches.length + ' donor(s) found.', 'success');
        displaySearchResults(matches, selectedGroup, city);
        document.getElementById('matching').scrollIntoView();
    } catch (error) {
        showMessage('searchMessage', error.message, 'error');
    }
}

function displaySearchResults(matches, bloodGroup, city) {
    const container = document.getElementById('results');

    let html = '<p><strong>Search:</strong> ' + escapeHtml(bloodGroup) +
        (city ? ' in ' + escapeHtml(city) : '') + '</p>';

    if (matches.length === 0) {
        html += '<p class="placeholder">No available donors found. Try another blood group or city, or submit an emergency request.</p>';
    } else {
        matches.forEach(donor => {
            html += `
                <div class="item">
                    <div class="item-title">
                        ${escapeHtml(donor.name)}
                        <span class="badge">${escapeHtml(donor.bloodGroup)}</span>
                        <span class="badge Available">Available</span>
                    </div>
                    <div>Location: ${escapeHtml(donor.location)} &nbsp;|&nbsp; Donor ID: ${escapeHtml(donor.id)}</div>
                </div>
            `;
        });
    }

    container.innerHTML = html;
}

document.getElementById('searchBtn').addEventListener('click', searchDonors);