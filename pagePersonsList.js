const Sortable = require("sortablejs")

const inputSearch = document.getElementById('inputSearch')
const clearSearchIcon = document.getElementById('clearSearchIcon')

const formEditData = document.getElementById('formEditData')

const buttonDelete = document.getElementById('buttonDelete')
const buttonClearFilter = document.getElementById('buttonClearFilter')

const columnsJSON = require('./columns.json')
const tableColumnsList = document.getElementById('tableColumnsList')
const hiddenTableColumnsList = document.getElementById('hiddenTableColumnsList')

const tableColumns = tableColumnsList.getElementsByTagName('th')
const personsList = document.getElementById('personsList')
const rowPersons = document.getElementsByClassName('rowPerson')
var currentOrder, currentOrderDirection

var persons = allPersons = firebase.firestore().collection('persons')
var person, personExists

const formFilter = document.getElementById('formFilter')

function pageLoaded() {
    if (localStorage.getItem("email") != null && localStorage.getItem("password") != null) {
        firebase.auth().signInWithEmailAndPassword(localStorage.getItem("email"), localStorage.getItem("password")).then(function () {

        }).catch(function (error) {
            if (error != null) {
                alert(error.message)
                return
            }
        })
    }
    else {
        document.location.href = "index.html"
    }

    personsList.innerHTML = "<h3>Loading...</h3>"

    let enabledColumns = []
    if (localStorage.getItem('enabledColumns') != null) {
        enabledColumns = localStorage.getItem('enabledColumns').split(',')
    }
    else {
        enabledColumns.push('__name__.id', 'createDate.date')
    }
    enabledColumns.forEach(column => {
        if (columnsJSON.hasOwnProperty(column)) {
            let th = document.createElement('th')
            th.id = column.split('.')[0]
            if (column.split('.')[1] != undefined) {
                th.dataset.type = column.split('.')[1]
            }
            th.innerHTML = columnsJSON[column]
            th.setAttribute('onclick', 'headerClick(this.id)')
            tableColumnsList.appendChild(th)
        }
    })
    for (let column in columnsJSON) {
        if (!enabledColumns.includes(column)) {
            let th = document.createElement('th')
            th.id = column.split('.')[0]
            if (column.split('.')[1] != undefined) {
                th.dataset.type = column.split('.')[1]
            }
            th.innerHTML = columnsJSON[column]
            th.setAttribute('onclick', 'headerClick(this.id)')
            hiddenTableColumnsList.appendChild(th)
        }
    }
    if (enabledColumns.includes('createDate.date')) {
        headerClick('createDate')
    }
    else {
        headerClick(enabledColumns[enabledColumns.length - 1].split('.')[0])
    }
    clearPerson()
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

        console.log(snapshot.docs.length)
        stop()
        formEditData.hidden = false
    })
}

inputSearch.oninput = function () {
    var searchQuery = String(inputSearch.materialComponent.value).trim()
    inputSearch.materialComponent.value = searchQuery

    if (searchQuery != '') {
        clearSearchIcon.hidden = false
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
        clearSearchInput()
    }
}

function clearSearchInput() {
    clearSearchIcon.hidden = true
    inputSearch.materialComponent.value = ''
    orderPersons(currentOrder, currentOrderDirection)
}

function buttonSaveClick() {
    let p = new Object()
    let valid = true

    Array.from(formEditData.querySelectorAll('input, textarea')).forEach(inputEdit => {
        inputEdit.materialComponent.value = String(inputEdit.materialComponent.value).trim()
        if (inputEdit.required && inputEdit.materialComponent.value == '') {
            inputEdit.materialComponent.valid = false
            valid = false
        }
        if (!inputEdit.disabled) {
            p[inputEdit.id.split('.')[0]] = inputEdit.materialComponent.value
        }
    })

    console.log(p)

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
        clearPerson()
    }

}

function buttonDeleteClick() {
    person.delete()

    clearPerson()
}

function clearPerson() {
    personId = undefined
    person = undefined

    Array.from(formEditData.querySelectorAll('input, textarea')).forEach(inputEdit => {
        inputEdit.materialComponent.value = ''
        inputEdit.parentElement.hidden = inputEdit.disabled

        if (inputEdit.required) {
            inputEdit.materialComponent.valid = true

            inputEdit.oninput = function () {
                if (String(inputEdit.materialComponent.value).trim() == '') {
                    inputEdit.materialComponent.valid = false
                }
                else {
                    inputEdit.materialComponent.valid = true
                }
            }

            inputEdit.onchange = function () {
                inputEdit.materialComponent.value = String(inputEdit.materialComponent.value).trim()
                if (inputEdit.materialComponent.value == '') {
                    inputEdit.materialComponent.valid = false
                }
            }
        }
    })

    formEditData.hidden = true
    buttonDelete.hidden = true
}

function orderPersons(orderBy, orderDirection, clean) {
    if (orderDirection == undefined) {
        orderDirection = 'asc'
    }
    if (clean == undefined) {
        clean = false
    }

    if (clean) {
        personsList.innerHTML = 'Persons not found...'
    }

    let query = persons.orderBy(orderBy, orderDirection)

    query.onSnapshot(
        snapshot => {
            listPersons(snapshot)
        },
        err => {
            console.log(err)
        })

    currentOrder = orderBy
    currentOrderDirection = orderDirection
}

function headerClick(headerID) {
    let clickedHeader = document.querySelector('th#' + headerID)

    Array.from(tableColumns).forEach(element => {
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

                Array.from(tableColumns).forEach(column => {
                    let td = document.createElement('td')
                    tr.appendChild(td)
                    switch (column.dataset.type) {
                        case 'id':
                            td.textContent = p.id
                            break
                        case 'long':
                            td.textContent = td.title = p.get(column.id)
                            break
                        case 'date':
                            td.textContent = p.get(column.id) == "" ? "" : new Date(p.get(column.id)).toJSON().substr(0, 10)
                            break
                        case 'time':
                            td.textContent = p.get(column.id) == "" ? "" : new Date(p.get(column.id)).toLocaleTimeString()
                            break
                        default:
                            td.textContent = p.get(column.id)
                            break
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
                    buttonDelete.hidden = false

                    Array.from(formEditData.querySelectorAll('input, textarea')).forEach(inputEdit => {
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
                                    inputEdit.materialComponent.value = new Date(element.get(inputEdit.id.split('.')[0])).toJSON().substr(0, 10)
                                    break
                                case 'time':
                                    inputEdit.materialComponent.value = new Date(element.get(inputEdit.id.split('.')[0])).toLocaleTimeString()
                                    break
                                default:
                                    inputEdit.materialComponent.value = element.get(inputEdit.id.split('.')[0])
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

function buttonAddColumnClick() {
    hiddenTableColumnsList.materialComponent.open = true
}

Sortable.create(tableColumnsList, {
    group: 'TableColumns',
    animation: 150,
    easing: "ease-in-out",
    chosenClass: 'sortable-choosen',
    onMove: function () {
        orderPersons(currentOrder, currentOrderDirection)
    },
    onEnd: function (event) {
        let enabledColumns = []
        Array.from(tableColumns).forEach(column => {
            if (column.dataset.type != undefined) {
                enabledColumns.push(column.id + '.' + column.dataset.type)
            }
            else {
                enabledColumns.push(column.id)
            }
        })
        localStorage.setItem("enabledColumns", enabledColumns)
    }
})
Sortable.create(hiddenTableColumnsList, {
    group: 'TableColumns',
    animation: 150,
    easing: "ease-in-out",
    sort: false,
    onMove: function () {
        orderPersons(currentOrder, currentOrderDirection)
    },
    onEnd: function (event) {
        let enabledColumns = []
        Array.from(tableColumns).forEach(column => {
            if (column.dataset.type != undefined) {
                enabledColumns.push(column.id + '.' + column.dataset.type)
            }
            else {
                enabledColumns.push(column.id)
            }
        })
        localStorage.setItem("enabledColumns", enabledColumns)
    }
})

function buttonApplyFilterClick() {
    let blockOrder, emptyFilter = true
    persons = allPersons

    Array.from(formFilter.querySelectorAll('input, textarea')).forEach(inputFilter => {
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

            Array.from(tableColumns).forEach(th => {
                if (th.id != blockOrder) {
                    th.setAttribute('onclick', '')
                }
            })
        }
        else {
            orderPersons(currentOrder, currentOrderDirection, true)

            Array.from(tableColumns).forEach(th => {
                th.setAttribute('onclick', 'headerClick(this.id)')
            })
        }
    }
}

function buttonClearFilterClick() {
    Array.from(formFilter.querySelectorAll('input, textarea')).forEach(inputFilter => {
        inputFilter.value = ''
    })
    Array.from(tableColumns).forEach(th => {
        th.setAttribute('onclick', 'headerClick(this.id)')
    })
    persons = allPersons
    orderPersons(currentOrder, currentOrderDirection)

    buttonClearFilter.disabled = true
}