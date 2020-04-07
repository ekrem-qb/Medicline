const formEditData = document.getElementById('formEditData')

const inputSearch = document.getElementById('inputSearch')

const inputName = document.getElementById('inputName')
const inputSurname = document.getElementById('inputSurname')
const inputBirthDate = document.getElementById('inputBirthDate')
const inputPhone = document.getElementById('inputPhone')
const inputPhone2 = document.getElementById('inputPhone2')
const inputPhone3 = document.getElementById('inputPhone3')
const inputCountry = document.getElementById('inputCountry')
const inputDescription = document.getElementById('inputDescription')

const inputCreateUser = document.getElementById('inputCreateUser')
const inputCreateDate = document.getElementById('inputCreateDate')
const inputCreateTime = document.getElementById('inputCreateTime')
const inputUpdateUser = document.getElementById('inputUpdateUser')
const inputUpdateDate = document.getElementById('inputUpdateDate')
const inputUpdateTime = document.getElementById('inputUpdateTime')

const buttonDelete = document.getElementById('buttonDelete')

const personsList = document.getElementById('personsList')
const rowPersons = document.getElementsByClassName('rowPerson')

const persons = firebase.database().ref('persons')
var personId, person, exists

function pageLoaded() {
    firebase.auth().signInWithEmailAndPassword(localStorage.getItem("email"), localStorage.getItem("password")).then(function () {

    }).catch(function (error) {
        if (error != null) {
            alert(error.message)
            return
        }
    })

    sortPersons('createDate')
    $('#formEditData').fadeOut()
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
    inputCountry.value = null
    inputDescription.value = null
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
    $('#formEditData').fadeOut()
    buttonDelete.parentElement.hidden = true
}

function buttonCreateClick() {
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

    $('#formEditData').fadeIn()
}

inputSearch.onchange = function () {
    var searchQuery = String(inputSearch.value).trim()
    inputSearch.value = searchQuery
    listPersons.mark(searchQuery)
    /* personsList.innerHTML = null
    persons.orderByChild('name')
        .startAt(searchQuery)
        .endAt(searchQuery + '\uf8ff')
        .once('value', function (snapshot) {
            listPersons(snapshot, false)
        }) */
}

function buttonSaveClick() {
    if (exists) {
        person.update({
            name: inputName.value,
            surname: inputSurname.value,
            birthDate: inputBirthDate.value,
            phone: inputPhone.value,
            phone2: inputPhone2.value,
            phone3: inputPhone3.value,
            country: inputCountry.value,
            description: inputDescription.value,
            updateUser: firebase.auth().currentUser.email,
            updateDate: new Date().toISOString()
        })
    } else {
        person.set({
            name: inputName.value,
            surname: inputSurname.value,
            birthDate: inputBirthDate.value,
            phone: inputPhone.value,
            phone2: inputPhone2.value,
            phone3: inputPhone3.value,
            country: inputCountry.value,
            description: inputDescription.value,
            createUser: firebase.auth().currentUser.email,
            createDate: new Date().toISOString()
        })
    }

    clearPerson()
}

function buttonDeleteClick() {
    person.remove()

    clearPerson()
}

function sortPersons(clickedID) {
    persons.orderByChild(clickedID).on('value', function (snapshot) {
        listPersons(snapshot)
    })

    Array.from(document.getElementsByClassName('tableHeader')).forEach(element => {
        if (element.id != clickedID) {
            if (element.textContent.includes('∧')) {
                element.textContent = element.textContent.replace('∧', '')
            }
            if (element.textContent.includes('∨')) {
                element.textContent = element.textContent.replace('∨', '')
            }
        }
    })

    var clickedHeader = document.getElementById(clickedID)

    if (clickedHeader.textContent.includes('∧')) {
        $('tbody').each(function () {
            var list = $(this).children('tr')
            $(this).html(list.get().reverse())
        })
        clickedHeader.textContent = clickedHeader.textContent.replace('∧', '∨')
    }
    else if (clickedHeader.textContent.includes('∨')) {
        clickedHeader.textContent = clickedHeader.textContent.replace('∨', '∧')
    }
    else {
        $('tbody').each(function () {
            var list = $(this).children('tr')
            $(this).html(list.get().reverse())
        })
        clickedHeader.textContent += ' ∨'
    }
}

function listPersons(snap, clean) {
    if (clean == undefined) {
        clean = true
    }
    if (clean) {
        personsList.innerHTML = null
    }

    snap.forEach(p => {
        var tr = document.createElement('tr')
        tr.id = p.key
        tr.className = 'rowPerson'
        personsList.appendChild(tr)

        var td_ID = document.createElement('td')
        tr.appendChild(td_ID)
        td_ID.textContent = p.key

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

        var td_Country = document.createElement('td')
        tr.appendChild(td_Country)
        td_Country.textContent = p.child('country').val()

        var td_Description = document.createElement('td')
        tr.appendChild(td_Description)
        td_Description.textContent = p.child('description').val()

        var td_CreateDate = document.createElement('td')
        tr.appendChild(td_CreateDate)
        td_CreateDate.textContent = new Date(p.child('createDate').val()).toISOString().substr(0, 10)
    })

    Array.from(rowPersons).forEach(rowPerson => {
        rowPerson.ondblclick = function () {
            clearPerson()

            personId = rowPerson.id
            person = snap.child(personId)

            $('#formEditData').fadeIn()
            buttonDelete.parentElement.hidden = false

            inputName.value = person.child('name').val()
            inputSurname.value = person.child('surname').val()
            inputBirthDate.value = person.child('birthDate').val()
            inputPhone.value = person.child('phone').val()
            inputPhone2.value = person.child('phone2').val()
            inputPhone3.value = person.child('phone3').val()
            inputCountry.value = person.child('country').val()
            inputDescription.value = person.child('description').val()
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

            person.once('value', function (snap) {
                exists = snap.exists()
            })
            console.log(personId + ' ' + exists)
        }
    })
}