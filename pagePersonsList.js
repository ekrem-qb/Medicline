const inputSearch = document.getElementById('inputSearch')

const formEditData = document.getElementById('formEditData')

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

const persons = firebase.firestore().collection('persons')
var person, personExists
var personsLimit = 20

const formFilter = document.getElementById('formFilter')

function pageLoaded() {
    /* firebase.auth().signInWithEmailAndPassword(localStorage.getItem("email"), localStorage.getItem("password")).then(function () {

    }).catch(function (error) {
        if (error != null) {
            alert(error.message)
            return
        }
    }) */

    sortPersons('createDate')
    clearPerson()
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

    let stop = persons.onSnapshot(snapshot => {
        do {
            personId = new Date().getFullYear().toString().substr(-2) + (Math.floor(Math.random() * (99999 - 10000)) + 10000).toString()
            person = persons.doc(personId)
            personExists = snapshot.docs.some(item => item.id === personId)

            console.log(personId + ': ' + personExists)
        } while (personExists)

        stop()
        $('#formEditData').fadeIn()
    })
}

inputSearch.oninput = function () {
    var searchQuery = String(inputSearch.value).trim()
    inputSearch.value = searchQuery

    if (searchQuery != '') {
        var foundPersons = new Array()
        persons.onSnapshot(snapshot => {
            snapshot.forEach(p => {
                if (!foundPersons.includes(p.id)) {
                    if ((String(p.id) + JSON.stringify(p.data()).toLowerCase()).includes(searchQuery.toLowerCase()))
                        foundPersons.push(p.id)
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
    if (personExists) {
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
            updateDate: new Date().toJSON()
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
            createDate: new Date().toJSON()
        })
    }
    clearPerson()
}

function buttonDeleteClick() {
    person.delete()

    clearPerson()
}

function loadPersons(startID) {
    if (clickedHeader.id == 'id') {
        persons.onSnapshot(snapshot => {
            listPersons(snapshot.docs)
        })
    }
    else {
        persons.orderBy(clickedHeader.id).limit(personsLimit).onSnapshot(snapshot => {
            listPersons(snapshot)
        })
    }

}
function loadPersonsReverse(endID) {
    if (clickedHeader.id == 'id') {
        persons.onSnapshot(snapshot => {
            listPersons(snapshot.docs.reverse())
        })
    }
    else {
        persons.orderBy(clickedHeader.id, 'desc').limit(personsLimit).onSnapshot(snapshot => {
            listPersons(snapshot)
        })
    }
}

function sortPersons(clickHeader) {
    clickedHeader = document.querySelector('th#' + clickHeader)

    Array.from(tableHeaders).forEach(element => {
        if (element.id != clickedHeader.id) {
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
        if (foundPersons == undefined || foundPersons.includes(p.id)) {
            let tr = document.createElement('tr')
            tr.id = p.id
            tr.className = 'rowPerson'
            personsList.appendChild(tr)

            Array.from(tableHeaders).forEach(element => {
                let elementID = element.id
                let td = document.createElement('td')
                tr.appendChild(td)
                switch (elementID) {
                    case 'id':
                        td.textContent = p.id
                        break;
                    case 'createDate':
                        td.textContent = new Date(p.get(elementID)).toJSON().substr(0, 10)
                        break;
                    case 'description':
                        td.textContent = td.title = p.get(elementID)
                        break;
                    default:
                        td.textContent = p.get(elementID)
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

            snap.forEach(element => {
                if (element.id == rowPerson.id) {
                    $('#formEditData').fadeIn()
                    buttonDelete.parentElement.hidden = false

                    inputName.value = element.get('name')
                    inputSurname.value = element.get('surname')
                    inputBirthDate.value = element.get('birthDate')
                    inputPhone.value = element.get('phone')
                    inputPhone2.value = element.get('phone2')
                    inputPhone3.value = element.get('phone3')
                    inputCountry.value = element.get('country')
                    inputDescription.value = element.get('description')
                    inputCreateUser.parentElement.hidden = false
                    inputCreateUser.value = element.get('createUser')
                    inputCreateDate.parentElement.hidden = false
                    inputCreateDate.value = new Date(element.get('createDate')).toJSON().substr(0, 10)
                    inputCreateTime.parentElement.hidden = false
                    inputCreateTime.value = new Date(element.get('createDate')).toLocaleTimeString()
                    if (element.get('updateUser') != undefined) {
                        inputUpdateUser.parentElement.hidden = false
                        inputUpdateUser.value = element.get('updateUser')
                    }
                    if (element.get('updateDate') != undefined) {
                        inputUpdateDate.parentElement.hidden = false
                        inputUpdateDate.value = new Date(element.get('updateDate')).toJSON().substr(0, 10)
                    }
                    if (element.get('updateDate') != undefined) {
                        inputUpdateTime.parentElement.hidden = false
                        inputUpdateTime.value = new Date(element.get('updateDate')).toLocaleTimeString()
                    }
                }
            })
            person = persons.doc(rowPerson.id)
            personExists = true
        }
    })
}

function tableScroll() {
    if (personsList.getBoundingClientRect().bottom < document.documentElement.clientHeight + 100) {
        personsLimit++
        if (clickedHeader.textContent.includes('∧'))
            loadPersons()
        if (clickedHeader.textContent.includes('∨'))
            loadPersonsReverse()
    }
}

function buttonApplyClick() {
    Array.from(formFilter.getElementsByClassName('form-control')).forEach(element => {
        if (element.id == 'country') {
            persons.equalTo(element.value).once('value', function (snapshot) {
                listPersons(snapshot)
            })
        }
    })
}