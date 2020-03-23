var nameInput = document.getElementById('nameInput')
var surnameInput = document.getElementById('surnameInput')

var saveBtn = document.getElementById('saveBtn')
var clearBtn = document.getElementById('clearBtn')
var loadBtn = document.getElementById('loadBtn')

var rootRef = firebase.database().ref().child('Person1')

saveBtn.addEventListener('click', function () {
    rootRef.set({
        name: nameInput.value,
        surname: surnameInput.value
    })
})

clearBtn.addEventListener('click', function () {
    nameInput.value = ""
    surnameInput.value = ""
})

loadBtn.addEventListener('click', function () {
    rootRef.on('value', function (snapshot) {
        nameInput.value = snapshot.ref.key
        surnameInput.value = snapshot.ref.key
    })
})