/* === Imports === */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';
import { collection, addDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

// Usage example:
// const docRef = await addDoc(collection(db, "cities"), {
//   name: "Tokyo",
//   country: "Japan"
// });

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

/* === GFTS setup === */
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const axios = require('axios');

const FEED_URL = "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw";

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

const textareaEl = document.getElementById("post-input")
const postButtonEl = document.getElementById("post-btn")

/* == UI - Event Listeners == */

signInWithGoogleButtonEl.addEventListener("click", authSignInWithGoogle)

signInButtonEl.addEventListener("click", authSignInWithEmail)
createAccountButtonEl.addEventListener("click", authCreateAccountWithEmail)
postButtonEl.addEventListener("click", postButtonPressed)

/* === Main Code === */
const user = auth.currentUser;

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
    const postBody = textareaEl.value;
    const user = auth.currentUser

    if (postBody) {
        addPostToDB(postBody, user);
        textareaEl.value = "";
    }
}