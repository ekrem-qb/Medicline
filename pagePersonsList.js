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

const tableHeaders = document.getElementsByClassName('tableHeader')
var clickedHeader
const personsList = document.getElementById('personsList')
const rowPersons = document.getElementsByClassName('rowPerson')

const persons = firebase.database().ref('persons')
var personId, person, exists
var personsLimit = 10

function pageLoaded() {
    firebase.auth().signInWithEmailAndPassword(localStorage.getItem("email"), localStorage.getItem("password")).then(function () {

    }).catch(function (error) {
        if (error != null) {
            alert(error.message)
            return
        }
    })

    sortPersons('id')
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

inputSearch.oninput = function () {
    var searchQuery = String(inputSearch.value).trim()
    inputSearch.value = searchQuery

    if (searchQuery != '') {
        var foundPersons = new Array()
        persons.once('value', function (snapshot) {
            snapshot.forEach(p => {
                if (!foundPersons.includes(p.key)) {
                    if (String(p.key).includes(searchQuery)) {
                        foundPersons.push(p.key)
                    }
                    else {
                        p.forEach(element => {
                            if (String(element.val()).toLowerCase().includes(searchQuery.toLowerCase())) {
                                foundPersons.push(p.key)
                            }
                        })
                    }
                }
            })
            listPersons(snapshot, true, foundPersons, searchQuery)
        })
    }
    else {
        sortPersons('createDate')
    }
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

function loadPersons(startID) {
    if (clickedHeader.id == 'id') {
        persons.orderByKey().startAt(String(startID)).limitToFirst(personsLimit).on('value', function (snapshot) {
            listPersons(snapshot)
        })
    }
    else {
        persons.orderByChild(clickedHeader.id).startAt(String(startID)).limitToFirst(personsLimit).on('value', function (snapshot) {
            listPersons(snapshot)
        })
    }

}
function loadPersonsReverse(endID) {
    if (clickedHeader.id == 'id') {
        persons.orderByKey().endAt(String(endID)).limitToLast(personsLimit).on('value', function (snapshot) {
            listPersons(snapshot)
            console.log(snapshot.exportVal())

            $('tbody').each(function () {
                var list = $(this).children('tr')
                $(this).html(list.get().reverse())
            })
        })
    }
    else {
        persons.orderByChild(clickedHeader.id).endAt(String(endID)).limitToLast(personsLimit).on('value', function (snapshot) {
            listPersons(snapshot)
            console.log(snapshot.exportVal())

            $('tbody').each(function () {
                var list = $(this).children('tr')
                $(this).html(list.get().reverse())
            })
        })
    }
}

function sortPersons(clickedID) {
    clickedHeader = document.getElementById(clickedID)

    Array.from(tableHeaders).forEach(element => {
        if (element.id != clickedID) {
            if (element.textContent.includes('∧')) {
                element.textContent = element.textContent.replace('∧', '')
            }
            if (element.textContent.includes('∨')) {
                element.textContent = element.textContent.replace('∨', '')
            }
        }
    })

    if (clickedHeader.textContent.includes('∨')) {
        loadPersons()
        clickedHeader.textContent = clickedHeader.textContent.replace('∨', '∧')
    }
    else {
        loadPersonsReverse()
        if (clickedHeader.textContent.includes('∧')) {
            clickedHeader.textContent = clickedHeader.textContent.replace('∧', '∨')
        }
        else {
            clickedHeader.textContent += ' ∨'
        }
    }
}

function listPersons(snap, clean, foundPersons, searchQuery) {
    if (clean || clean == undefined) {
        personsList.innerHTML = null
    }

    snap.forEach(p => {
        if (foundPersons == undefined || foundPersons.includes(p.key)) {
            var tr = document.createElement('tr')
            tr.id = p.key
            tr.className = 'rowPerson'
            personsList.appendChild(tr)

            Array.from(tableHeaders).forEach(element => {
                var td = document.createElement('td')
                tr.appendChild(td)
                switch (element.id) {
                    case 'id':
                        td.textContent = p.key
                        break;
                    case 'createDate':
                        td.textContent = new Date(p.child(element.id).val()).toISOString().substr(0, 10)
                        break;
                    case 'description':
                        td.textContent = td.title = p.child(element.id).val()
                        break;
                    default:
                        td.textContent = p.child(element.id).val()
                        break;
                }
                if (searchQuery != undefined) {
                    if (td.textContent.toLowerCase().includes(searchQuery.toLowerCase())) {
                        td.classList.add('bg-warning')
                    }
                }
            })
        }
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

function tableScroll() {
    //personsLimit++
    if (clickedHeader.textContent.includes('∧')) {
        loadPersons(Array.from(rowPersons)[1].id)
    }
    if (clickedHeader.textContent.includes('∨')) {
        loadPersonsReverse(Array.from(rowPersons)[1].id)
    }
}