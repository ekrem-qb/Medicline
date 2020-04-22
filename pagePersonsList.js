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

const buttonAddRow = document.getElementById('buttonAddRow')
const buttonDelete = document.getElementById('buttonDelete')
const buttonClearFilter = document.getElementById('buttonClearFilter')

const tableHeaders = document.getElementsByClassName('tableHeader')
const personsList = document.getElementById('personsList')
const rowPersons = document.getElementsByClassName('rowPerson')
var currentOrder, currentOrderDirection

var persons = allPersons = firebase.firestore().collection('persons')
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

    headerClick('createDate')
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
    formEditData.hidden = true
    buttonDelete.parentElement.hidden = true
}

function buttonCreateClick() {
    clearPerson()

    let stop = allPersons.onSnapshot(snapshot => {
        do {
            personId = new Date().getFullYear().toString().substr(-2) + (Math.floor(Math.random() * (99999 - 10000)) + 10000).toString()
            person = allPersons.doc(personId)
            personExists = snapshot.docs.some(item => item.id === personId)

            console.log(personId + ': ' + personExists)
        } while (personExists)

        stop()
        formEditData.hidden = false
    })
}

inputSearch.oninput = function () {
    var searchQuery = String(inputSearch.value).trim()
    inputSearch.value = searchQuery

    if (searchQuery != '') {
        var foundPersons = new Array()
        allPersons.onSnapshot(snapshot => {
            snapshot.forEach(p => {
                if (!foundPersons.includes(p.id)) {
                    if ((String(p.id) + JSON.stringify(p.data()).toLowerCase()).includes(searchQuery.toLowerCase()))
                        foundPersons.push(p.id)
                }
            })
            if (foundPersons.length > 0) {
                listPersons(snapshot, true, foundPersons, searchQuery)
            }
            else {
                personsList.innerHTML = 'Persons not found...'
            }
        })
    }
    else {
        orderPersons(currentOrder, currentOrderDirection)
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
            createDate: new Date().toJSON(),
            updateUser: '',
            updateDate: ''
        })
    }
    clearPerson()
}

function buttonDeleteClick() {
    person.delete()

    clearPerson()
}

function orderPersons(orderBy, orderDirection) {
    if (orderDirection == undefined) {
        orderDirection = 'asc'
    }

    personsList.innerHTML = 'Persons not found...'
    persons.orderBy(orderBy, orderDirection).limit(personsLimit).onSnapshot(
        snapshot => {
            listPersons(snapshot)
            console.log(snapshot)
        },
        err => {
            console.log(err)
        })

    currentOrder = orderBy
    currentOrderDirection = orderDirection
}

function headerClick(headerID) {
    let clickedHeader = document.querySelector('th#' + headerID)

    Array.from(tableHeaders).forEach(element => {
        if (element.id != headerID) {
            if (element.textContent.includes('∧')) {
                element.textContent = element.textContent.replace('∧', '')
            }
            if (element.textContent.includes('∨')) {
                element.textContent = element.textContent.replace('∨', '')
            }
        }
    })

    if (clickedHeader.textContent.includes('∨')) {
        orderPersons(headerID, 'asc')
        clickedHeader.textContent = clickedHeader.textContent.replace('∨', '∧')
    }
    else {
        orderPersons(headerID, 'desc')
        if (clickedHeader.textContent.includes('∧')) {
            clickedHeader.textContent = clickedHeader.textContent.replace('∧', '∨')
        }
        else {
            clickedHeader.textContent += ' ∨'
        }
    }
}

function headerHover(headerID) {
    buttonAddRow.hidden = false
    buttonAddRow.style.position = 'absolute'
}

function listPersons(snap, clean, foundPersons, searchQuery) {
    if (snap.docs.length > 0) {
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
                        case '__name__':
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
    }

    Array.from(rowPersons).forEach(rowPerson => {
        rowPerson.ondblclick = function () {
            clearPerson()

            snap.forEach(element => {
                if (element.id == rowPerson.id) {
                    formEditData.hidden = false
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

                        inputUpdateTime.parentElement.hidden = false
                        inputUpdateTime.value = new Date(element.get('updateDate')).toLocaleTimeString()
                    }
                }
            })
            person = allPersons.doc(rowPerson.id)
            personExists = true
        }
    })
}

/* function tableScroll() {
    if (personsList.getBoundingClientRect().bottom < document.documentElement.clientHeight + 100) {
        personsLimit++
        if (clickedHeader.textContent.includes('∧'))
            sortPersons()
        if (clickedHeader.textContent.includes('∨'))
            loadPersonsReverse()
    }
} */

function buttonApplyFilterClick() {
    let blockOrder, emptyFilter = true
    persons = allPersons

    Array.from(formFilter.getElementsByClassName('form-control')).forEach(inputFilter => {
        inputFilter.value = String(inputFilter.value).trim()
        if (inputFilter.value != '') {
            emptyFilter = false
            switch (inputFilter.id.split('.')[1]) {
                case 'min':
                    persons = persons.where("" + inputFilter.id.split('.')[0] + "", ">=", "" + inputFilter.value + "")
                    blockOrder = inputFilter.id.split('.')[0]
                    break
                case 'max':
                    persons = persons.where("" + inputFilter.id.split('.')[0] + "", "<=", "" + inputFilter.value + "")
                    blockOrder = inputFilter.id.split('.')[0]
                    break
                default:
                    persons = persons.where("" + inputFilter.id + "", "==", "" + inputFilter.value + "")
                    break
            }
        }
    })
    if (emptyFilter) {
        alert('Filters are empty!')
        buttonClearFilter.disabled = true
    }
    else {
        buttonClearFilter.disabled = false

        if (blockOrder != undefined) {
            headerClick(blockOrder)

            Array.from(tableHeaders).forEach(th => {
                if (th.id != blockOrder) {
                    th.setAttribute('onclick', '')
                }
            })
        }
        else {
            orderPersons(currentOrder, currentOrderDirection)

            Array.from(tableHeaders).forEach(th => {
                th.setAttribute('onclick', 'headerClick(this.id)')
            })
        }
    }
}

function buttonClearFilterClick() {
    Array.from(formFilter.getElementsByClassName('form-control')).forEach(inputFilter => {
        inputFilter.value = ''
    })
    Array.from(tableHeaders).forEach(th => {
        th.setAttribute('onclick', 'headerClick(this.id)')
    })
    persons = allPersons
    orderPersons(currentOrder, currentOrderDirection)

    buttonClearFilter.disabled = true
}