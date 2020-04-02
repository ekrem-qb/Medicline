const buttonCreate = document.getElementById('buttonCreate')

const formEditData = document.getElementById('formEditData')

const inputName = document.getElementById('inputName')
const inputSurname = document.getElementById('inputSurname')
const inputBirthDate = document.getElementById('inputBirthDate')
const inputPhone = document.getElementById('inputPhone')
const inputPhone2 = document.getElementById('inputPhone2')
const inputPhone3 = document.getElementById('inputPhone3')
const inputCreateUser = document.getElementById('inputCreateUser')
const inputCreateDate = document.getElementById('inputCreateDate')
const inputCreateTime = document.getElementById('inputCreateTime')
const inputUpdateUser = document.getElementById('inputUpdateUser')
const inputUpdateDate = document.getElementById('inputUpdateDate')
const inputUpdateTime = document.getElementById('inputUpdateTime')

const buttonSave = document.getElementById('buttonSave')
const buttonCancel = document.getElementById('buttonCancel')
const buttonDelete = document.getElementById('buttonDelete')

const personsList = document.getElementById('personsList')
const rowPersons = document.getElementsByClassName('rowPerson')

const persons = firebase.database().ref().child("persons")
var personId, person
var exists

function pageLoaded() {
    firebase.auth().signInWithEmailAndPassword(localStorage.getItem("email"), localStorage.getItem("password")).then(function () {

    }).catch(function (error) {
        if (error != null) {
            alert(error.message)
            return
        }
    })
}

buttonCreate.onclick = function () {
    clearPerson()

    exists = true
    while (exists) {
        personId = new Date().getFullYear().toString().substr(-2) + (Math.floor(Math.random() * (99999 - 10000)) + 10000).toString()
        person = persons.child(personId)
        person.once('value', function (snapshot) {
            exists = snapshot.exists()
        })
        console.log(personId + ' ' + exists)
    }

    formEditData.hidden = false
}

inputBirthDate.onchange = function () {
    console.log(inputBirthDate.value)
}

function clearPerson() {
    personId = null
    person = null
    inputName.value = null
    inputSurname.value = null
    inputBirthDate.value = null
    inputPhone.value = null
    inputPhone2.value = null
    inputPhone3.value = null
    inputCreateUser.parentElement.hidden = true
    inputCreateUser.value = null
    inputCreateDate.parentElement.hidden = true
    inputCreateDate.value = null
    inputCreateTime.parentElement.hidden = true
    inputCreateTime.value = null
    inputUpdateUser.parentElement.hidden = true
    inputUpdateUser.value = null
    inputUpdateDate.parentElement.hidden = true
    inputUpdateDate.value = null
    inputUpdateTime.parentElement.hidden = true
    inputUpdateTime.value = null
    formEditData.hidden = true
    buttonDelete.parentElement.hidden = true
}

buttonSave.onclick = function () {
    if (exists) {
        person.update({
            name: inputName.value,
            surname: inputSurname.value,
            birthDate: inputBirthDate.value,
            phone: inputPhone.value,
            phone2: inputPhone2.value,
            phone3: inputPhone3.value,
            updateUser: firebase.auth().currentUser.email,
            updateDate: new Date().toUTCString()
        })
    } else {
        person.set({
            name: inputName.value,
            surname: inputSurname.value,
            birthDate: inputBirthDate.value,
            phone: inputPhone.value,
            phone2: inputPhone2.value,
            phone3: inputPhone3.value,
            createUser: firebase.auth().currentUser.email,
            createDate: new Date().toUTCString()
        })
    }

    clearPerson()
}

buttonCancel.onclick = function () {
    clearPerson()
}

buttonDelete.onclick = function () {
    person.remove()

    clearPerson()
}

persons.on('value', function (snapshot) {
    personsList.innerHTML = null

    snapshot.forEach(p => {
        var tr = document.createElement('tr')
        tr.id = p.key
        tr.className = 'rowPerson'
        personsList.appendChild(tr)

        var td_Name = document.createElement('td')
        tr.appendChild(td_Name)
        td_Name.textContent = p.child('name').val()

        var td_Surname = document.createElement('td')
        tr.appendChild(td_Surname)
        td_Surname.textContent = p.child('surname').val()

        var td_BirthDate = document.createElement('td')
        tr.appendChild(td_BirthDate)
        td_BirthDate.textContent = p.child('birthDate').val()

        var td_Phone = document.createElement('td')
        tr.appendChild(td_Phone)
        td_Phone.textContent = p.child('phone').val()

        var td_Phone2 = document.createElement('td')
        tr.appendChild(td_Phone2)
        td_Phone2.textContent = p.child('phone2').val()

        var td_Phone3 = document.createElement('td')
        tr.appendChild(td_Phone3)
        td_Phone3.textContent = p.child('phone3').val()
    })

    Array.from(rowPersons).forEach(rowPerson => {
        rowPerson.ondblclick = function () {
            clearPerson()

            personId = rowPerson.id
            person = snapshot.child(personId)

            formEditData.hidden = false
            buttonDelete.parentElement.hidden = false

            inputName.value = person.child('name').val()
            inputSurname.value = person.child('surname').val()
            inputBirthDate.value = person.child('birthDate').val()
            inputPhone.value = person.child('phone').val()
            inputPhone2.value = person.child('phone2').val()
            inputPhone3.value = person.child('phone3').val()
            inputCreateUser.parentElement.hidden = false
            inputCreateUser.value = person.child('createUser').val()
            inputCreateDate.parentElement.hidden = false
            inputCreateDate.value = new Date(person.child('createDate').val()).toISOString().substr(0, 10)
            inputCreateTime.parentElement.hidden = false
            inputCreateTime.value = new Date(person.child('createDate').val()).toLocaleTimeString()
            if (person.hasChild('updateUser')) {
                inputUpdateUser.parentElement.hidden = false
                inputUpdateUser.value = person.child('updateUser').val()
            }
            if (person.hasChild('updateDate')) {
                inputUpdateDate.parentElement.hidden = false
                inputUpdateDate.value = new Date(person.child('updateDate').val()).toISOString().substr(0, 10)
            }
            if (person.hasChild('updateDate')) {
                inputUpdateTime.parentElement.hidden = false
                inputUpdateTime.value = new Date(person.child('updateDate').val()).toLocaleTimeString()
            }

            person = persons.child(personId)

            person.once('value', function (snapshot) {
                exists = snapshot.exists()
            })
            console.log(personId + ' ' + exists)
        }
    })
})