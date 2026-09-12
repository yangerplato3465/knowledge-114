import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
const firebaseConfig = {
    apiKey: "AIzaSyBW7V3sXHn8MsaP4KFmHDOHUFXSz3ksRDM",
    authDomain: "classroom-rpg-a931a.firebaseapp.com",
    projectId: "classroom-rpg-a931a",
    storageBucket: "classroom-rpg-a931a.firebasestorage.app",
    messagingSenderId: "548698002427",
    appId: "1:548698002427:web:896b85619015fc9303315e",
    measurementId: "G-9R7TMK6B7T"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

