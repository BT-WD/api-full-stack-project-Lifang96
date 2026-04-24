/* === Imports === */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';
import { collection, addDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';
import GtfsRealtimeBindings from 'https://esm.sh/gtfs-realtime-bindings';
// import { db } from './firebase-config.js';
import { doc, setDoc, query, getDocs, where } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';
/* === Firebase Setup === */
const firebaseConfig = {
    apiKey: "AIzaSyBbeI1pjhIaXk7kmfIK4fRGshhppPJbtAE",
    authDomain: "hot-and-cold-29a1c.firebaseapp.com",
    projectId: "hot-and-cold-29a1c",
    storageBucket: "hot-and-cold-29a1c.firebasestorage.app",
    messagingSenderId: "545364825547",
    appId: "1:545364825547:web:bd4c815ca43c366e87524e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* === UI === */
const signOutButtonEl = document.getElementById("sign-out-btn")

/* == UI - Elements == */
signOutButtonEl.addEventListener("click", authSignOut)

const viewLoggedOut = document.getElementById("logged-out-view")
const viewLoggedIn = document.getElementById("logged-in-view")

const signInWithGoogleButtonEl = document.getElementById("sign-in-with-google-btn")

const emailInputEl = document.getElementById("email-input")
const passwordInputEl = document.getElementById("password-input")

const signInButtonEl = document.getElementById("sign-in-btn")
const createAccountButtonEl = document.getElementById("create-account-btn")

const userProfilePictureEl = document.getElementById("user-profile-picture")

const userGreetingEl = document.getElementById("user-greeting")

const stationAreaEl = document.getElementById("station-input")
const walkTimeHHAreaEl = document.getElementById("hh")
const walkTimeMMAreaEl = document.getElementById("mm")
const walkTimeSSAreaEl = document.getElementById("ss")
const getTrainButtonEl = document.getElementById("getTrain-btn")

/* == UI - Event Listeners == */

signInWithGoogleButtonEl.addEventListener("click", authSignInWithGoogle);
signInButtonEl.addEventListener("click", authSignInWithEmail);
createAccountButtonEl.addEventListener("click", authCreateAccountWithEmail);
getTrainButtonEl.addEventListener("click", postButtonPressed);
window.selectGroup = selectGroup;
/* === Main Code === */
let user = auth.currentUser;
let trainGroup = "";
let prevDestination = '';
let prevWalkTime = '';

const input = document.getElementById('station-input');
const listContainer = document.getElementById('autocomplete-list');
const suggestionsBody = document.getElementById('suggestions-body');

const stationIdStart = {
    'nqrw': ['R', 'N', 'Q', 'W'],
    'ace': ['A', 'C', 'E'],
    'bdfm': ['B', 'D', 'F'],
    'jz': ['M'],
    'g': ['G'],
    'numbered': ["1", "2", "3", "4", "5", '6', '7']
}
onAuthStateChanged(auth, (user) => {
    if (user) {
        showLoggedInView();
        showProfilePicture(userProfilePictureEl, user);
        showUserGreeting(userGreetingEl, user);
    } else {
        showLoggedOutView();
    }
});


/* === Functions === */

/* = Functions - Firebase - Authentication = */

function authSignInWithGoogle() {
    console.log("Sign in with Google")
}

function authSignInWithEmail() {
    console.log("Sign in with email and password");
    const email = emailInputEl.value;
    const password = passwordInputEl.value;
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed in 
            showLoggedInView();
            user = auth.currentUser;
            console.log(userCredential)
            console.log(user)
        })
        .catch((error) => {
            const errorMessage = error.message;
            console.log(errorMessage);
        });
}

function authCreateAccountWithEmail() {
    console.log("Sign up with email and password");
    const email = emailInputEl.value;
    const password = passwordInputEl.value;
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed up 
            showLoggedInView();
            user = auth.currentUser;
        })
        .catch((error) => {
            const errorMessage = error.message;
            console.log(errorMessage);

        });

}

function authSignOut() {
    console.log('Sign out');
    signOut(auth).then(() => {
        showLoggedOutView();
    }).catch((error) => {
        console.log(error.message);
    });
}

function showProfilePicture(imgElement, user) {
    if (user !== null) {
        // The user object has basic properties such as display name, email, etc.
        const displayName = user.displayName;
        const email = user.email;
        const photoURL = user.photoURL;
        if (photoURL) {
            imgElement.src = photoURL;
        } else {
            imgElement.src = 'assets/images/travel.png';
        }
    }
}

function showUserGreeting(element, user) {
    if (user !== null) {
        // The user object has basic properties such as display name, email, etc.
        const displayName = user.displayName;
        if (displayName) {
            element.textContent = `Hi ${displayName}`;
        } else {
            element.textContent = "Personal Travel App";
        }
    }
}

async function addPostToDB(destination, user) {
    try {
        const docRef = await addDoc(collection(db, "stations"), {
            body: destination,
            uid: user.uid,
            createdAt: serverTimestamp()
        });

        console.log("Document written with ID: ", docRef.id);
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}


async function getMtaData(stationName, targetRoutes, walkTime) {
    let endpoint = targetRoutes;
    const prevRoute = targetRoutes;
    let feed_url = "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs"
    const TARGET_STATION = await getStationId(stationName, targetRoutes); // Times Sq-42 St
    targetRoutes = stationIdStart[targetRoutes]
    if (endpoint != 'numbered') {
        endpoint = prevRoute
        feed_url = `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-${endpoint}`;
        targetRoutes = prevRoute;
    }

    try {
        const response = await fetch(feed_url);
        const buffer = await response.arrayBuffer();
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

        const arrivals = [];
        const matchArrivals = [];

        feed.entity.forEach((entity) => {
            if (entity.tripUpdate && targetRoutes.includes(entity.tripUpdate.trip.routeId.toLowerCase())) {

                entity.tripUpdate.stopTimeUpdate.forEach((stop) => {
                    // Check if this stop matches our target station (ignoring direction N/S for now)
                    if (stop.stopId.startsWith(TARGET_STATION)) {

                        try {
                            const arrivalTime = stop.arrival.time;

                            if (arrivalTime) {
                                const minutesAway = Math.round((arrivalTime - Math.floor(Date.now() / 1000)) / 60);

                                if (minutesAway >= 0) {
                                    arrivals.push({
                                        route: entity.tripUpdate.trip.routeId,
                                        direction: stop.stopId.endsWith('N') ? 'Northbound' : 'Southbound',
                                        time: minutesAway
                                    });
                                };
                                if (walkTime + 10 >= minutesAway && walkTime - 4 <= minutesAway) {
                                    matchArrivals.push({
                                        route: entity.tripUpdate.trip.routeId,
                                        direction: stop.stopId.endsWith('N') ? 'Northbound' : 'Southbound',
                                        time: minutesAway
                                    });
                                };
                            }
                        } catch { console.log("arrival error") }
                    }
                });
            }
        });

        // Sort by arrival time (soonest first)
        arrivals.sort((a, b) => a.time - b.time);
        matchArrivals.sort((a, b) => a.time - b.time);

        if (prevDestination != stationName) {
            prevDestination = stationName;
            prevWalkTime = walkTime
            document.getElementById('station-title').textContent = `Live Board: ${stationName}`;
            document.getElementById('north-train-list').innerHTML = '';
            document.getElementById('south-train-list').innerHTML = '';
        } else if (prevWalkTime != walkTime) {
            prevWalkTime = walkTime
            document.getElementById('station-title').textContent = `Live Board: ${stationName}`;
            document.getElementById('north-train-list').innerHTML = '';
            document.getElementById('south-train-list').innerHTML = '';
        }

        updateMatchArrival(matchArrivals, targetRoutes);


    } catch (error) {
        console.error("Error fetching station data:", error);
    }
};

async function getStationId(stationName, targetRoutes) {

    try {

        const response = await fetch('stations.json');
        const data = await response.json();
        for (const station of Object.values(data)) {
            if (stationName.toLowerCase().includes(station.name.toLowerCase())) {
                console.log(station.name);
                for (let stop in station.stops) {
                    if (stationIdStart[targetRoutes].includes(stop.substring(0, 1))) {
                        return stop
                    }
                }

            }
        }
    } catch (error) {
        console.error('Error loading JSON:', error);
    }
};
let items = [];
input.addEventListener('input', async() => {
    const val = input.value.toLowerCase();
    user = auth.currentUser;
    suggestionsBody.innerHTML = ''; // Clear previous

    if (!val || val.length < 1) {
        listContainer.style.display = 'none';
        return;
    }

    // 1. Get the user's saved stations from Firestore
    // Replace YOUR_USER_ID with your actual auth variable
    const q = query(collection(db, "stations"), where("uid", "==", `${user.uid}`));
    const querySnapshot = await getDocs(q);

    let hasResults = false;
    items = [];
    querySnapshot.forEach((doc) => {
        const stationName = doc.data().body; // e.g. "Atlantic Av-Barclays Ctr"
        // 2. Simple word-match logic
        if (stationName.toLowerCase().includes(val) && (items.indexOf(stationName) == -1)) {
            items.push(stationName);
            hasResults = true;
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = stationName;
            item.style.backgroundColor = 'white';
            item.style.margin = '15px';

            // Handle clicking a suggestion
            item.addEventListener('click', () => {
                input.value = stationName;
                listContainer.style.display = 'none';
                suggestionsBody.innerHTML = '';
                // Trigger your train search logic here
                console.log("Searching for:", stationName);
            });

            suggestionsBody.appendChild(item);
        }
    });

    listContainer.style.display = hasResults ? 'block' : 'none';
});

// Close when clicking outside
document.addEventListener('click', (e) => {
    if (e.target !== input) listContainer.style.display = 'none';
});

/* == Functions - UI Functions == */

function showLoggedOutView() {
    hideView(viewLoggedIn);
    showView(viewLoggedOut);
}

function showLoggedInView() {
    hideView(viewLoggedOut);
    showView(viewLoggedIn);
}

function showView(view) {
    view.style.display = "flex";
}

function hideView(view) {
    view.style.display = "none";
}

function updateMatchArrival(matchArrivals, targetRoutes) {

    if (matchArrivals.length != 0) {

        document.getElementById("live-board").style.display = "block";
        matchArrivals.forEach(a => {
            const direction = a.direction === 'Northbound' ? '▲' : '▼';
            const route = a.route;
            const time = a.time;
            if (direction == '▲') {
                document.getElementById('north-train-list').innerHTML += `<li id='trains-bullet'>${direction} ${route} ${time} min</li>`
            } else {
                document.getElementById('south-train-list').innerHTML += `<li id='trains-bullet'>${direction} ${route} ${time} min</li>`
            }
        });
    } else {
        console.log(`No data trains: ${targetRoutes}`);
    }
}


function postButtonPressed() {
    const destination = stationAreaEl.value;
    const walkTimeHH = parseInt(walkTimeHHAreaEl.value || '00', 10);
    const walkTimeMM = parseInt(walkTimeMMAreaEl.value || '00', 10);
    const walkTimeSS = parseInt(walkTimeSSAreaEl.value || '00', 10);
    const walkTime = (walkTimeHH * 60) + (walkTimeMM);
    user = auth.currentUser;

    if (destination && trainGroup && walkTime) {
        getMtaData(destination, trainGroup, walkTime);
        addPostToDB(destination, user);
    }
}


function selectGroup(group) {
    trainGroup = group;
}