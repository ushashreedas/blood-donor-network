// ------------------------------------
// REGISTER DONOR
// ------------------------------------

async function registerDonor() {

    const name =
        document.getElementById("donorName").value;

    const bloodGroup =
        document.getElementById("donorBloodGroup").value;

    const location =
        document.getElementById("donorLocation").value;

    const available =
        document.getElementById("donorAvailability").value === "true";

    const result =
        document.getElementById("registrationResult");


    if (name.trim() === "" || location.trim() === "") {

        result.innerHTML =
            "<p>Please enter donor name and location.</p>";

        return;
    }


    try {

        const response = await fetch(
            "/api/donors",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name,
                    bloodGroup,
                    location,
                    available
                })
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            result.innerHTML =
                `<p>${data.message}</p>`;

            return;
        }


        result.innerHTML = `

            <div class="success">

                <strong>
                    Donor registered successfully!
                </strong>

                <br><br>

                Name:
                ${data.donor.name}

                <br>

                Blood Group:
                ${data.donor.bloodGroup}

                <br>

                Location:
                ${data.donor.location}

                <br>

                Status:
                ${data.donor.available
                    ? "Available"
                    : "Not Available"}

            </div>
        `;


        document.getElementById("donorName").value = "";

        document.getElementById("donorLocation").value = "";


    } catch (error) {

        console.error(error);

        result.innerHTML =
            "<p>Unable to connect to the server.</p>";
    }
}


// ------------------------------------
// CREATE EMERGENCY BLOOD REQUEST
// ------------------------------------

async function createBloodRequest() {

    const bloodGroup =
        document.getElementById("bloodGroup").value;

    const hospital =
        document.getElementById("hospital").value;

    const urgency =
        document.getElementById("urgency").value;

    const location =
        document.getElementById("requestLocation").value;

    const results =
        document.getElementById("results");


    if (hospital.trim() === "") {

        results.innerHTML =
            "<p>Please enter the hospital name.</p>";

        return;
    }


    if (location.trim() === "") {

        results.innerHTML =
            "<p>Please enter the location.</p>";

        return;
    }


    results.innerHTML =
        "<p>Creating emergency blood request...</p>";


    try {

        // CREATE REQUEST

        const requestResponse =
            await fetch(
                "/api/requests",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        bloodGroup,
                        hospital,
                        urgency,
                        location
                    })
                }
            );


        const requestData =
            await requestResponse.json();


        if (!requestResponse.ok) {

            results.innerHTML =
                `<p>${requestData.message}</p>`;

            return;
        }


        // FIND MATCHING DONORS

        const matchResponse =
            await fetch(
                `/api/match/${bloodGroup}`
            );


        const matchData =
            await matchResponse.json();


        // IF MATCHES EXIST,
        // REQUEST IS CONSIDERED MATCHED

        let currentStatus =
            requestData.request.status;


        if (matchData.totalMatches > 0) {

            currentStatus = "Matched";

            await updateRequestStatus(
                requestData.request.id,
                "Matched"
            );
        }


        // DISPLAY REQUEST

        results.innerHTML = `

            <div class="success">

                <strong>
                    Blood request created successfully!
                </strong>

                <br><br>

                <strong>
                    Request ID:
                </strong>

                ${requestData.request.id}

                <br>

                <strong>
                    Hospital:
                </strong>

                ${hospital}

                <br>

                <strong>
                    Blood Group:
                </strong>

                ${bloodGroup}

                <br>

                <strong>
                    Urgency:
                </strong>

                ${urgency}

                <br>

                <strong>
                    Location:
                </strong>

                ${location}

                <br>

                <strong>
                    Status:
                </strong>

                <span id="currentStatus">
                    ${currentStatus}
                </span>

            </div>

            <h3>
                Matching Donors
            </h3>
        `;


        // NO MATCHES

        if (matchData.totalMatches === 0) {

            results.innerHTML += `

                <p>
                    No available matching donors found.
                </p>
            `;

            return;
        }


        // DISPLAY MATCH COUNT

        results.innerHTML += `

            <p>

                <strong>
                    Matching donors found:
                </strong>

                ${matchData.totalMatches}

            </p>
        `;


        // DISPLAY DONORS

        matchData.matches.forEach(donor => {

            results.innerHTML += `

                <div class="donor">

                    <strong>
                        ${donor.name}
                    </strong>

                    <br>

                    Blood Group:
                    ${donor.bloodGroup}

                    <br>

                    Location:
                    ${donor.location}

                    <br>

                    Status:
                    Available

                </div>
            `;
        });


        // STATUS BUTTONS

        results.innerHTML += `

            <div class="status-buttons">

                <button
                    onclick="changeStatus(
                        ${requestData.request.id},
                        'Alerted'
                    )"
                >
                    Mark Alerted
                </button>


                <button
                    onclick="changeStatus(
                        ${requestData.request.id},
                        'Confirmed'
                    )"
                >
                    Confirm Donor
                </button>


                <button
                    onclick="changeStatus(
                        ${requestData.request.id},
                        'Fulfilled'
                    )"
                >
                    Mark Fulfilled
                </button>

            </div>
        `;


    } catch (error) {

        console.error(error);

        results.innerHTML =
            "<p>Unable to connect to the server.</p>";
    }
}


// ------------------------------------
// FIND DONORS
// ------------------------------------

function findDonors() {

    createBloodRequest();

}


// ------------------------------------
// UPDATE REQUEST STATUS
// ------------------------------------

async function updateRequestStatus(
    requestId,
    status
) {

    try {

        const response =
            await fetch(
                `/api/requests/${requestId}/status`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        status
                    })
                }
            );


        const data =
            await response.json();


        return data;


    } catch (error) {

        console.error(error);

        return null;
    }
}


// ------------------------------------
// CHANGE REQUEST STATUS
// ------------------------------------

async function changeStatus(
    requestId,
    status
) {

    const data =
        await updateRequestStatus(
            requestId,
            status
        );


    if (!data) {

        alert(
            "Unable to update request status."
        );

        return;
    }


    const statusElement =
        document.getElementById(
            "currentStatus"
        );


    if (statusElement) {

        statusElement.textContent =
            status;
    }


    alert(
        `Request #${requestId} status updated to ${status}`
    );


    // Refresh request list if visible

    loadRequests();
}


// ------------------------------------
// LOAD ALL REQUESTS
// ------------------------------------

async function loadRequests() {

    const requestList =
        document.getElementById("requestList");


    requestList.innerHTML =
        "<p>Loading requests...</p>";


    try {

        const response =
            await fetch(
                "/api/requests"
            );


        const requests =
            await response.json();


        if (requests.length === 0) {

            requestList.innerHTML =
                "<p>No blood requests found.</p>";

            return;
        }


        requestList.innerHTML = "";


        requests.forEach(request => {

            requestList.innerHTML += `

                <div class="donor">

                    <strong>
                        Request #${request.id}
                    </strong>

                    <br>

                    Blood Group:
                    ${request.bloodGroup}

                    <br>

                    Hospital:
                    ${request.hospital}

                    <br>

                    Location:
                    ${request.location}

                    <br>

                    Urgency:
                    ${request.urgency}

                    <br>

                    Status:
                    <strong>
                        ${request.status}
                    </strong>

                    <br><br>

                    <button
                        onclick="changeStatus(
                            ${request.id},
                            'Alerted'
                        )"
                    >
                        Alerted
                    </button>


                    <button
                        onclick="changeStatus(
                            ${request.id},
                            'Confirmed'
                        )"
                    >
                        Confirmed
                    </button>


                    <button
                        onclick="changeStatus(
                            ${request.id},
                            'Fulfilled'
                        )"
                    >
                        Fulfilled
                    </button>

                </div>
            `;
        });


    } catch (error) {

        console.error(error);

        requestList.innerHTML =
            "<p>Unable to load requests.</p>";
    }
}