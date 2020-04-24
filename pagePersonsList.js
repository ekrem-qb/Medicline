const inputSearch = document.getElementById('inputSearch')

const formEditData = document.getElementById('formEditData')

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
    firebase.auth().signInWithEmailAndPassword(localStorage.getItem("email"), localStorage.getItem("password")).then(function () {

    }).catch(function (error) {
        if (error != null) {
            alert(error.message)
            return
        }
    })

    headerClick('createDate')
    clearPerson()

    Array.from(formEditData.getElementsByClassName('form-control')).forEach(inputEdit => {
        if (inputEdit.required) {
            inputEdit.oninput = function () {
                if (String(inputEdit.value).trim() == '') {
                    inputEdit.classList.add('is-invalid')
                    inputEdit.classList.remove('is-valid')
                }
                else {
                    inputEdit.classList.remove('is-invalid')
                    inputEdit.classList.add('is-valid')
                }
            }
        }
    })
}

function buttonCreateClick() {
    // clearPerson()

    let stop = allPersons.onSnapshot(snapshot => {
        do {
            personId = new Date().getFullYear().toString().substr(-2) + (Math.floor(Math.random() * (99999 - 10000)) + 10000).toString()
            person = allPersons.doc(personId)
            personExists = snapshot.docs.some(item => item.id === personId)

            console.log(personId + ': ' + personExists)
        } while (personExists)

        stop()
        formEditData.hidden = false

        console.log(snapshot.docs.length);

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
    let p = new Object()
    let valid = true

    Array.from(formEditData.getElementsByClassName('form-control')).forEach(inputEdit => {
        inputEdit.value = String(inputEdit.value).trim()
        if (inputEdit.required && inputEdit.value == '') {
            inputEdit.classList.add('is-invalid')
            inputEdit.classList.remove('is-valid')
            valid = false
        }
        if (!inputEdit.disabled) {
            p[inputEdit.id.split('.')[0]] = inputEdit.value
        }
    })

    if (valid) {
        if (personExists) {
            p.updateUser = firebase.auth().currentUser.email
            p.updateDate = new Date().toJSON()
            person.update(p)
        }
        else {
            p.createUser = firebase.auth().currentUser.email
            p.createDate = new Date().toJSON()
            p.updateUser = ''
            p.updateDate = ''
            person.set(p)
        }
        // clearPerson()
    }
}

function buttonDeleteClick() {
    person.delete()

    clearPerson()
}

function clearPerson() {
    personId = undefined
    person = undefined

    Array.from(formEditData.getElementsByClassName('form-control')).forEach(inputEdit => {
        inputEdit.value = ''
        inputEdit.parentElement.hidden = inputEdit.disabled

        if (inputEdit.required) {
            inputEdit.classList.remove('is-valid')
            inputEdit.classList.remove('is-invalid')
        }
    })

    formEditData.hidden = true
    buttonDelete.parentElement.hidden = true
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

                    Array.from(formEditData.getElementsByClassName('form-control')).forEach(inputEdit => {
                        if (inputEdit.disabled) {
                            if (element.get(inputEdit.id.split('.')[0]) != '') {
                                inputEdit.parentElement.hidden = false
                            }
                        }
                        else {
                            inputEdit.parentElement.hidden = false
                        }

                        if (!inputEdit.parentElement.hidden) {
                            switch (inputEdit.id.split('.')[1]) {
                                case 'date':
                                    inputEdit.value = new Date(element.get(inputEdit.id.split('.')[0])).toJSON().substr(0, 10)
                                    break
                                case 'time':
                                    inputEdit.value = new Date(element.get(inputEdit.id.split('.')[0])).toLocaleTimeString()
                                    break
                                default:
                                    inputEdit.value = element.get(inputEdit.id.split('.')[0])
                                    break
                            }
                        }
                    })
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
    Array.from(tableHeaders).forEach(th => {
        th.setAttribute('onclick', 'headerClick(this.id)')
    })
    persons = allPersons
    orderPersons(currentOrder, currentOrderDirection)

    buttonClearFilter.disabled = true
}