const TableExport = require('tableexport')

const firebase = require('firebase/app')
require('firebase/auth')
require('firebase/firestore')

var firebaseConfig = {
    apiKey: "AIzaSyBEMpWUykF8sZB83zlpZZpq5u5QgTID0W8",
    authDomain: "medicline-35e34.firebaseapp.com",
    databaseURL: "https://medicline-35e34.firebaseio.com",
    projectId: "medicline-35e34",
    storageBucket: "medicline-35e34.appspot.com",
    messagingSenderId: "169065015752",
    appId: "1:169065015752:web:efda915944a808ea24f8fd",
    measurementId: "G-K1XPKRC2L6"
}
firebase.initializeApp(firebaseConfig)

firebase.firestore().enablePersistence()
    .catch(function (err) {
        if (err.code == 'failed-precondition') {
            // Multiple tabs open, persistence can only be enabled
            // in one tab at a a time.
            // ...
        } else if (err.code == 'unimplemented') {
            // The current browser does not support all of the
            // features required to enable persistence
            // ...
        }
    });
// Subsequent queries will use persistence, if it was enabled successfully