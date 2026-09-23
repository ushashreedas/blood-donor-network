const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// File locations
const donorsFile = path.join(__dirname, "donors.json");
const requestsFile = path.join(__dirname, "requests.json");

// ------------------------------------
// DONOR DATA FUNCTIONS
// ------------------------------------

function getDonors() {
    const data = fs.readFileSync(donorsFile, "utf8");
    return JSON.parse(data);
}

function saveDonors(donors) {
    fs.writeFileSync(
        donorsFile,
        JSON.stringify(donors, null, 4)
    );
}

// ------------------------------------
// REQUEST DATA FUNCTIONS
// ------------------------------------

function getRequests() {
    const data = fs.readFileSync(requestsFile, "utf8");
    return JSON.parse(data);
}

function saveRequests(requests) {
    fs.writeFileSync(
        requestsFile,
        JSON.stringify(requests, null, 4)
    );
}

// ------------------------------------
// GET ALL DONORS
// ------------------------------------

app.get("/api/donors", (req, res) => {

    const donors = getDonors();

    res.json(donors);
});

// ------------------------------------
// REGISTER NEW DONOR
// ------------------------------------

app.post("/api/donors", (req, res) => {

    const { name, bloodGroup, location, available } = req.body;

    if (!name || !bloodGroup || !location) {

        return res.status(400).json({
            message: "Please provide name, blood group and location."
        });
    }

    const donors = getDonors();

    const newDonor = {
        id: donors.length + 1,
        name: name,
        bloodGroup: bloodGroup,
        location: location,
        available: available === true
    };

    donors.push(newDonor);

    saveDonors(donors);

    res.status(201).json({
        message: "Donor registered successfully",
        donor: newDonor
    });
});

// ------------------------------------
// FIND MATCHING DONORS
// ------------------------------------

app.get("/api/match/:bloodGroup", (req, res) => {

    const requiredBloodGroup = req.params.bloodGroup;

    const donors = getDonors();

    const matches = donors.filter(
        donor =>
            donor.bloodGroup === requiredBloodGroup &&
            donor.available === true
    );

    res.json({
        requiredBloodGroup: requiredBloodGroup,
        totalMatches: matches.length,
        matches: matches
    });
});

// ------------------------------------
// CREATE BLOOD REQUEST
// ------------------------------------

app.post("/api/requests", (req, res) => {

    const {
        bloodGroup,
        hospital,
        urgency,
        location
    } = req.body;

    if (!bloodGroup || !hospital || !urgency || !location) {

        return res.status(400).json({
            message:
                "Please provide blood group, hospital, urgency and location."
        });
    }

    const requests = getRequests();

    const newRequest = {
        id: requests.length + 1,
        bloodGroup: bloodGroup,
        hospital: hospital,
        urgency: urgency,
        location: location,
        status: "Posted",
        createdAt: new Date().toISOString()
    };

    requests.push(newRequest);

    saveRequests(requests);

    res.status(201).json({
        message: "Blood request created successfully",
        request: newRequest
    });
});

// ------------------------------------
// GET ALL BLOOD REQUESTS
// ------------------------------------

app.get("/api/requests", (req, res) => {

    const requests = getRequests();

    res.json(requests);
});

// ------------------------------------
// UPDATE REQUEST STATUS
// ------------------------------------

app.put("/api/requests/:id/status", (req, res) => {

    const requestId = Number(req.params.id);
    const { status } = req.body;

    const allowedStatuses = [
        "Posted",
        "Matched",
        "Alerted",
        "Confirmed",
        "Fulfilled"
    ];

    if (!allowedStatuses.includes(status)) {

        return res.status(400).json({
            message: "Invalid request status."
        });
    }

    const requests = getRequests();

    const request = requests.find(
        item => item.id === requestId
    );

    if (!request) {

        return res.status(404).json({
            message: "Blood request not found."
        });
    }

    request.status = status;

    saveRequests(requests);

    res.json({
        message: "Request status updated successfully",
        request: request
    });
});

// ------------------------------------
// START SERVER
// ------------------------------------

app.listen(PORT, () => {

    console.log(
        `Blood Donor Matching Network server running on http://localhost:${PORT}`
    );

});