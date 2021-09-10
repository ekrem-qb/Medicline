const db = firebase.firestore()
db.enablePersistence({ synchronizeTabs: true })
const allCases = db.collection("cases")
const allUsers = db.collection("users")