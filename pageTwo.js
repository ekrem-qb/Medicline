var today = new Date()

var createBtn = document.getElementById('createBtn')

var editForm = document.getElementById('editForm')

var nameInput = document.getElementById('nameInput')
var surnameInput = document.getElementById('surnameInput')
var dateInput = document.getElementById('dateInput')

var saveBtn = document.getElementById('saveBtn')
var cancelBtn = document.getElementById('cancelBtn')

var personId = today.getFullYear().toString().substr(-2) + (Math.floor(Math.random() * (9999 - 1000)) + 1000).toString()
var person = firebase.database().ref().child(personId)

createBtn.addEventListener('click', function () {
    editForm.style.display = "block"
})

saveBtn.addEventListener('click', function () {
    person.set({
        name: nameInput.value,
        surname: surnameInput.value,
        birthDate: dateInput.value,
        createDate: today.toString()
    })
    editForm.style.display = "none"
})

cancelBtn.addEventListener('click', function () {
    editForm.style.display = "none"
})

// loadBtn.addEventListener('click', function () {
//     person.on('value', function (snapshot) {
//         nameInput.value = snapshot.val().name
//         surnameInput.value = snapshot.val().surname
//     })
// })