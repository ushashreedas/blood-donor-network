// ============================================================
// Blood Donor Matching Network - Backend
// Node.js + Express REST API with JSON file storage
// ============================================================

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Middleware ----------
app.use(cors());                                   // allow the frontend to call the API
app.use(express.json());                           // parse incoming JSON request bodies
app.use(express.static(path.join(__dirname, 'public')));  // serve index.html, style.css, script.js

// ---------- JSON file storage (fs module) ----------
const DONORS_FILE = path.join(__dirname, 'donors.json');
const REQUESTS_FILE = path.join(__dirname, 'requests.json');

function readData(file) {
    try {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, '[]');
        }
        const raw = fs.readFileSync(file, 'utf8');
        return raw.trim() ? JSON.parse(raw) : [];
    } catch (error) {
        console.error('Error reading ' + file + ':', error.message);
        return [];
    }
}

function writeData(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ---------- Validation rules ----------
const BLOOD_GROUPS = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];
const AVAILABILITY = ['Available', 'Not Available'];
const URGENCY = ['Critical', 'High', 'Normal'];

// Request lifecycle: Posted -> Matched -> Alerted -> Confirmed -> Fulfilled
const STATUSES = ['Posted', 'Matched', 'Alerted', 'Confirmed', 'Fulfilled'];

function isText(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

// ---------- ID generation ----------
function nextId(list, prefix) {
    const numbers = list.map(item => parseInt(item.id.slice(1), 10)).filter(n => !isNaN(n));
    const next = numbers.length ? Math.max(...numbers) + 1 : 1;
    return prefix + String(next).padStart(3, '0');
}

// ---------- Matching logic ----------
// Required blood group -> check donors.json -> same blood group? -> available? -> return donors
function findMatchingDonors(bloodGroup) {
    const donors = readData(DONORS_FILE);
    return donors.filter(donor =>
        donor.bloodGroup === bloodGroup && donor.availability === 'Available'
    );
}

// ============================================================
// DONOR ROUTES
// ============================================================

// GET all donors
app.get('/api/donors', (req, res) => {
    res.json(readData(DONORS_FILE));
});

// POST register a new donor
app.post('/api/donors', (req, res) => {
    const { name, bloodGroup, location, availability } = req.body;

    if (!isText(name) || !isText(location)) {
        return res.status(400).json({ error: 'Name and location are required.' });
    }
    if (!BLOOD_GROUPS.includes(bloodGroup)) {
        return res.status(400).json({ error: 'Invalid blood group.' });
    }
    if (!AVAILABILITY.includes(availability)) {
        return res.status(400).json({ error: 'Availability must be Available or Not Available.' });
    }

    const donors = readData(DONORS_FILE);
    const donor = {
        id: nextId(donors, 'D'),
        name: name.trim(),
        bloodGroup,
        location: location.trim(),
        availability,
        registeredAt: new Date().toISOString()
    };

    donors.push(donor);
    writeData(DONORS_FILE, donors);
    res.status(201).json(donor);
});

// PUT update a donor's availability
app.put('/api/donors/:id/availability', (req, res) => {
    const { availability } = req.body;
    if (!AVAILABILITY.includes(availability)) {
        return res.status(400).json({ error: 'Invalid availability value.' });
    }

    const donors = readData(DONORS_FILE);
    const donor = donors.find(d => d.id === req.params.id);
    if (!donor) {
        return res.status(404).json({ error: 'Donor not found.' });
    }

    donor.availability = availability;
    writeData(DONORS_FILE, donors);
    res.json(donor);
});

// ============================================================
// BLOOD REQUEST ROUTES
// ============================================================

// GET all requests (newest first)
app.get('/api/requests', (req, res) => {
    const requests = readData(REQUESTS_FILE);
    res.json(requests.slice().reverse());
});

// POST create an emergency request and return matching donors
app.post('/api/requests', (req, res) => {
    const { bloodGroup, hospital, location, urgency } = req.body;

    if (!BLOOD_GROUPS.includes(bloodGroup)) {
        return res.status(400).json({ error: 'Invalid blood group.' });
    }
    if (!isText(hospital) || !isText(location)) {
        return res.status(400).json({ error: 'Hospital and location are required.' });
    }
    if (!URGENCY.includes(urgency)) {
        return res.status(400).json({ error: 'Urgency must be Critical, High or Normal.' });
    }

    const matches = findMatchingDonors(bloodGroup);

    const requests = readData(REQUESTS_FILE);
    const request = {
        id: nextId(requests, 'R'),
        bloodGroup,
        hospital: hospital.trim(),
        location: location.trim(),
        urgency,
        status: matches.length > 0 ? 'Matched' : 'Posted',
        createdAt: new Date().toISOString()
    };

    requests.push(request);
    writeData(REQUESTS_FILE, requests);

    res.status(201).json({ request, matches });
});

// GET matching donors for an existing request
app.get('/api/requests/:id/matches', (req, res) => {
    const requests = readData(REQUESTS_FILE);
    const request = requests.find(r => r.id === req.params.id);
    if (!request) {
        return res.status(404).json({ error: 'Request not found.' });
    }
    res.json(findMatchingDonors(request.bloodGroup));
});

// PUT update request status (request lifecycle)
app.put('/api/requests/:id/status', (req, res) => {
    const { status } = req.body;
    if (!STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid status.' });
    }

    const requests = readData(REQUESTS_FILE);
    const request = requests.find(r => r.id === req.params.id);
    if (!request) {
        return res.status(404).json({ error: 'Request not found.' });
    }

    request.status = status;
    writeData(REQUESTS_FILE, requests);
    res.json(request);
});

// ---------- Start server ----------
app.listen(PORT, () => {
    console.log('Blood Donor Network running on http://localhost:' + PORT);
});