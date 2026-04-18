/* === Imports === */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';
import { collection, addDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';
import GtfsRealtimeBindings from 'https://esm.sh/gtfs-realtime-bindings';


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
const walkTimeAreaEl = document.getElementById("walkingTime-input")
const getTrainButtonEl = document.getElementById("getTrain-btn")

/* == UI - Event Listeners == */

signInWithGoogleButtonEl.addEventListener("click", authSignInWithGoogle)
signInButtonEl.addEventListener("click", authSignInWithEmail)
createAccountButtonEl.addEventListener("click", authCreateAccountWithEmail)
getTrainButtonEl.addEventListener("click", postButtonPressed)
window.selectGroup = selectGroup;
/* === Main Code === */
const user = auth.currentUser;
let trainGroup = "";
onAuthStateChanged(auth, (user) => {
    if (user) {
        showLoggedInView();
        showProfilePicture(userProfilePictureEl, user);
        showUserGreeting(userGreetingEl, user);
        // getMtaData("Jay St-MetroTech");
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
            imgElement.src = 'assets/images/defaultPic.jpg';
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
            element.textContent = "Hey friend, how are you?";
        }
    }
}

async function addPostToDB(postBody, user) {
    try {

        const docRef = await addDoc(collection(db, "posts"), {
            body: postBody,
            uid: user.uid,
            createdAt: serverTimestamp()
        });

        console.log("Document written with ID: ", docRef.id);
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}


async function getMtaData(stationName, targetRoutes, walkTime) {
    const endpoint = targetRoutes;
    const FEED_URL = `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-${endpoint}`;
    const TARGET_STATION = await getStationId(stationName); // Times Sq-42 St
    // const TARGET_ROUTES = ['N', 'Q', 'R', 'W'];

    try {
        const response = await fetch(FEED_URL);
        const buffer = await response.arrayBuffer();
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

        const arrivals = [];

        feed.entity.forEach((entity) => {
            if (entity.tripUpdate && targetRoutes.includes(entity.tripUpdate.trip.routeId.toLowerCase())) {
                console.log(entity.tripUpdate.trip.routeId.toLowerCase());
                entity.tripUpdate.stopTimeUpdate.forEach((stop) => {
                    // Check if this stop matches our target station (ignoring direction N/S for now)
                    if (stop.stopId.startsWith(TARGET_STATION)) {
                        const arrivalTime = stop.arrival.time;
                        if (arrivalTime) {
                            const minutesAway = Math.round((arrivalTime - Math.floor(Date.now() / 1000)) / 60);

                            if (minutesAway >= 0) {
                                arrivals.push({
                                    route: entity.tripUpdate.trip.routeId,
                                    direction: stop.stopId.endsWith('N') ? 'Northbound' : 'Southbound',
                                    time: minutesAway
                                });
                            }
                        }
                    }
                });
            }
        });

        // Sort by arrival time (soonest first)
        arrivals.sort((a, b) => a.time - b.time);

        // console.clear();
        console.log(`-- - Live Board: ${stationName}-- - `);
        arrivals.forEach(a => {
            console.log(`${a.direction === 'Northbound' ? '▲' : '▼'}[${a.route}] ${a.time} min `);
        });

    } catch (error) {
        console.error("Error fetching station data:", error);
    }
};

async function getStationId(stationName, targetRoutes) {
    try {
        console.log(stationName);
        const response = await fetch('stations.json');
        const data = await response.json();
        for (const station of Object.values(data)) {
            if (station.name == stationName) {
                for (let stop in station.stops) {
                    console.log(stop.substring(0, 1) == 'R');
                    if (stop.substring(0, 1) == 'R') {
                        return stop
                    }
                }

            }
        }
    } catch (error) {
        console.error('Error loading JSON:', error);
    }
};


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

function postButtonPressed() {
    const destination = stationAreaEl.value;
    const walkTime = walkTimeAreaEl.value;

    if (destination && walkTime && trainGroup) {
        getMtaData(destination, trainGroup, walkTime);
    }
}


function selectGroup(group) {
    trainGroup = group;
}