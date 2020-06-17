const Sortable = require("sortablejs")

const inputSearch = document.getElementById("inputSearch")
const clearSearchIcon = document.getElementById("clearSearchIcon")

const formEditData = document.getElementById("formEditData")

const buttonDelete = document.getElementById("buttonDelete")
const buttonClearFilter = document.getElementById("buttonClearFilter")

const columnsJSON = require("./columns.json")
const tableColumnsList = document.getElementById("tableColumnsList")
const hiddenTableColumnsList = document.getElementById("hiddenTableColumnsList")

const tableColumns = tableColumnsList.getElementsByTagName("th")
const personsList = document.getElementById("personsList")
const rowPersons = document.getElementsByClassName("rowPerson")
var currentOrder, currentOrderDirection

var persons = firebase.firestore().collection("persons")
var allPersons = firebase.firestore().collection("persons")
var person, personExists

const formFilter = document.getElementById("formFilter")

function pageLoaded() {
    if (localStorage.getItem("email") != null && localStorage.getItem("password") != null) {
        firebase
            .auth()
            .signInWithEmailAndPassword(
                localStorage.getItem("email"),
                localStorage.getItem("password")
            )
            .then(function () { })
            .catch(function (error) {
                if (error != null) {
                    alert(error.message)
                    return
                }
            })
    } else {
        document.location.href = "index.html"
    }
    clearPerson()
    loadColumns()
    loadSelectMenus()
}

function loadSelectMenus() {
    Array.from(document.getElementsByClassName("editable-select")).forEach((select) => {
        let selectID = select.id.replace(/[0-9]/g, '')

        if (selectID.split('_').length == 1) {
            firebase.firestore().collection(selectID).onSnapshot((snapshot) => {
                $(select).editableSelect("clear")
                snapshot.docs.forEach((selectItem) => {
                    $(select).editableSelect("add", selectItem.id)
                })
            })

            $(select).on("select.editable-select", function () {
                let firstSubElement = select.parentNode.parentNode.querySelector("[disabled]")
                if (firstSubElement != null) {
                    firebase.firestore().collection(selectID).doc(select.materialComponent.value).onSnapshot((snapshot => {
                        if (firstSubElement.classList.contains('editable-select')) {
                            $(firstSubElement).editableSelect("clear")
                            for (const key in snapshot.data()) {
                                $(firstSubElement).editableSelect("add", key)
                            }
                        }
                        else {
                            for (const key in snapshot.data()) {
                                firstSubElement.materialComponent.value = key
                            }
                        }
                    }))
                }
                let subElements = select.parentNode.parentNode.querySelectorAll("[disabled]")
                subElements.forEach(subElement => {
                    subElement.materialComponent.disabled = false
                })
            })
        }
    })
}

function loadColumns() {
    personsList.innerHTML = "<h3>Loading...</h3>"

    let enabledColumns = []
    if (localStorage.getItem("enabledColumns") != null) {
        enabledColumns = localStorage.getItem("enabledColumns").split(',')
    } else {
        enabledColumns.push("__name__.id", "createDate.date")
    }
    enabledColumns.forEach((column) => {
        if (columnsJSON.hasOwnProperty(column)) {
            tableColumnsList.appendChild(newColumn(column))
        }
    })
    for (let column in columnsJSON) {
        if (!enabledColumns.includes(column)) {
            hiddenTableColumnsList.appendChild(newColumn(column))
        }
    }
    if (enabledColumns.includes("createDate.date")) {
        headerClick("createDate")
    } else {
        headerClick(enabledColumns[enabledColumns.length - 1])
    }
}

function newColumn(column) {
    let th = document.createElement("th")
    th.id = column
    th.innerHTML = columnsJSON[column]
    th.setAttribute("onclick", "headerClick(this.id)")
    let sortIcon = document.createElement("span")
    sortIcon.className = "mdi mdi-unfold-more-horizontal"
    th.appendChild(sortIcon)
    return th
}

function buttonCreateClick() {
    clearPerson()

    let stop = allPersons.onSnapshot((snapshot) => {
        do {
            personId =
                new Date().getFullYear().toString().substr(-2) +
                (Math.floor(Math.random() * (99999 - 10000)) + 10000).toString()
            person = allPersons.doc(personId)
            personExists = snapshot.docs.some((item) => item.id === personId)

            console.log(personId + ":" + personExists + " in " + snapshot.docs.length)
        } while (personExists)

        stop()
        formEditData.hidden = false
    })
}

inputSearch.oninput = function () {
    var searchQuery = String(inputSearch.materialComponent.value).trim()
    inputSearch.materialComponent.value = searchQuery

    if (searchQuery != "") {
        clearSearchIcon.hidden = false
        var foundPersons = new Array()
        allPersons.onSnapshot((snapshot) => {
            snapshot.forEach((p) => {
                if (!foundPersons.includes(p.id)) {
                    if (
                        (String(p.id) + JSON.stringify(p.data()).toLowerCase()).includes(
                            searchQuery.toLowerCase()
                        )
                    )
                        foundPersons.push(p.id)
                }
            })
            listPersons(snapshot, true, foundPersons, searchQuery)
        })
    } else {
        clearSearchInput()
    }
}

function clearSearchInput() {
    clearSearchIcon.hidden = true
    inputSearch.materialComponent.value = ""
    orderPersons(currentOrder, currentOrderDirection)
}

function buttonSaveClick() {
    let p = new Object()
    let valid = true

    Array.from(formEditData.querySelectorAll("input, textarea")).forEach(
        (inputEdit) => {
            if (inputEdit.materialComponent != undefined) {
                inputEdit.materialComponent.value = String(
                    inputEdit.materialComponent.value
                ).trim()
                if (inputEdit.required && inputEdit.materialComponent.value == "") {
                    inputEdit.materialComponent.valid = false
                    valid = false
                }
                if (!inputEdit.disabled) {
                    p[inputEdit.id] = inputEdit.materialComponent.value
                }
                inputEdit.materialComponent.value = String(
                    inputEdit.materialComponent.value
                ).trim()
                if (inputEdit.required && inputEdit.materialComponent.value == "") {
                    inputEdit.materialComponent.valid = false
                    valid = false
                }
                if (!inputEdit.disabled) {
                    p[inputEdit.id] = inputEdit.materialComponent.value
                }
            }
        }
    )

    console.log(p)

    if (valid) {
        if (personExists) {
            p.updateUser = firebase.auth().currentUser.email
            p.updateDate = new Date().toJSON().substr(0, 10)
            p.updateTime = new Date().toLocaleTimeString()
            person.update(p)
        } else {
            p.createUser = firebase.auth().currentUser.email
            p.createDate = new Date().toJSON().substr(0, 10)
            p.createTime = new Date().toLocaleTimeString()
            p.updateUser = ""
            p.updateDate = ""
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

    Array.from(formEditData.querySelectorAll("input, textarea")).forEach(
        (inputEdit) => {
            inputEdit.materialComponent.value = ""
            if (inputEdit.id.split('_').length == 1) {
                inputEdit.parentElement.hidden = inputEdit.disabled
            }

            if (inputEdit.required) {
                inputEdit.materialComponent.valid = true

                inputEdit.oninput = function () {
                    if (String(inputEdit.materialComponent.value).trim() == "") {
                        inputEdit.materialComponent.valid = false
                    } else {
                        inputEdit.materialComponent.valid = true
                    }
                }

                inputEdit.onchange = function () {
                    inputEdit.materialComponent.value = String(inputEdit.materialComponent.value).trim()
                    if (inputEdit.materialComponent.value == "") {
                        inputEdit.materialComponent.valid = false
                    }
                }
            }
            inputEdit.oninput = function () {
                if (inputEdit.classList.contains("editable-select")) {
                    inputEdit.parentNode.parentNode.querySelectorAll('*').forEach(subElement => {
                        if (subElement.id.split('_')[0] == inputEdit.id && subElement != inputEdit) {
                            subElement.materialComponent.disabled = true
                            subElement.materialComponent.value = ''
                        }
                    })
                }
            }
        }
    )

    formEditData.hidden = true
    buttonDelete.hidden = true
}

function orderPersons(orderBy, orderDirection) {
    if (orderDirection == undefined) {
        orderDirection = "asc"
    }

    let query = persons.orderBy(orderBy, orderDirection)

    query.onSnapshot(
        (snapshot) => {
            listPersons(snapshot)
        },
        (err) => {
            console.log(err)
        }
    )

    currentOrder = orderBy
    currentOrderDirection = orderDirection
}

function headerClick(headerID) {
    let clickedHeader = document.querySelector("th#" + headerID)

    if (clickedHeader.parentElement == tableColumnsList) {
        Array.from(tableColumns).forEach((element) => {
            if (element.id != headerID) {
                let sortIcon = element.querySelector("span")

                if (sortIcon.classList.contains("mdi-chevron-up")) {
                    sortIcon.classList.remove("mdi-chevron-up")
                }
                if (sortIcon.classList.contains("mdi-rotate-180")) {
                    sortIcon.classList.remove("mdi-rotate-180")
                }
                if (!sortIcon.classList.contains("mdi-unfold-more-horizontal")) {
                    sortIcon.classList.add("mdi-unfold-more-horizontal")
                }
            }
        })

        let clickedHeaderSortIcon = clickedHeader.querySelector("span")

        if (clickedHeaderSortIcon.classList.contains("mdi-unfold-more-horizontal")) {
            clickedHeaderSortIcon.classList.remove("mdi-unfold-more-horizontal")
            clickedHeaderSortIcon.classList.add("mdi-chevron-up")
        }

        if (
            clickedHeaderSortIcon.classList.contains(
                "mdi-rotate-180"
            )
        ) {
            orderPersons(headerID, "asc")

            clickedHeaderSortIcon.classList.remove(
                "mdi-rotate-180"
            )
        } else {
            orderPersons(headerID, "desc")

            clickedHeaderSortIcon.classList.add("mdi-rotate-180")
        }
    }
}

function listPersons(snap, clean, foundPersons, searchQuery) {
    if (snap.docs.length > 0) {
        if (clean || clean == undefined) {
            personsList.innerHTML = null
        }

        snap.forEach((p) => {
            if (foundPersons == undefined || foundPersons.includes(p.id)) {
                let tr = document.createElement("tr")
                tr.id = p.id
                tr.className = "rowPerson"
                personsList.appendChild(tr)

                Array.from(tableColumns).forEach((column) => {
                    let td = document.createElement("td")
                    tr.appendChild(td)
                    td.id = column.id
                    switch (column) {
                        case "__name__":
                            td.textContent = p.id
                            break
                        case "description":
                        case "complaints":
                            td.textContent = td.title = p.get(column.id)
                            break
                        default:
                            td.textContent = p.get(column.id)
                            break
                    }
                    if (searchQuery != undefined) {
                        if (
                            td.textContent.toLowerCase().includes(searchQuery.toLowerCase())
                        ) {
                            td.classList.add("bg-warning")
                        }
                    }
                })
            }
        })
    } else {
        personsList.innerHTML = "<h3>Persons not found...</h3>"
    }

    Array.from(rowPersons).forEach((rowPerson) => {
        rowPerson.ondblclick = function () {
            clearPerson()

            snap.forEach((element) => {
                if (element.id == rowPerson.id) {
                    formEditData.hidden = false
                    buttonDelete.hidden = false

                    Array.from(formEditData.querySelectorAll("input, textarea")).forEach(
                        (inputEdit) => {
                            if (element.get(inputEdit.id) != undefined) {
                                if (inputEdit.disabled) {
                                    if (element.get(inputEdit.id) != "") {
                                        inputEdit.parentElement.hidden = false
                                    }
                                } else {
                                    inputEdit.parentElement.hidden = false
                                }

                                if (!inputEdit.parentElement.hidden) {
                                    inputEdit.materialComponent.value = element.get(inputEdit.id)
                                }
                            }
                        }
                    )
                }
            })
            person = allPersons.doc(rowPerson.id)
            personExists = true
        }
    })
}

function modalExpand(header) {
    let modalBody = header.parentElement.querySelector(".modal-body")
    modalBody.hidden = !modalBody.hidden

    let expandIcon = header.querySelector(".mdc-select__dropdown-icon")
    if (expandIcon.classList.contains("mdi-rotate-180")) {
        expandIcon.classList.remove("mdi-rotate-180")
    } else {
        expandIcon.classList.add("mdi-rotate-180")
    }
}

Sortable.create(tableColumnsList, {
    group: "TableColumns",
    animation: 150,
    easing: "ease-in-out",
    chosenClass: "sortable-choosen",
    onMove: function () {
        orderPersons(currentOrder, currentOrderDirection)
    },
    onEnd: function (event) {
        let enabledColumns = []
        Array.from(tableColumns).forEach((column) => {
            enabledColumns.push(column.id)
        })
        localStorage.setItem("enabledColumns", enabledColumns)
        orderPersons(currentOrder, currentOrderDirection)
    },
})
Sortable.create(hiddenTableColumnsList, {
    group: "TableColumns",
    animation: 150,
    easing: "ease-in-out",
    sort: false,
    onMove: function () {
        orderPersons(currentOrder, currentOrderDirection)
    },
    onEnd: function (event) {
        let enabledColumns = []
        Array.from(tableColumns).forEach((column) => {
            enabledColumns.push(column.id)
        })
        localStorage.setItem("enabledColumns", enabledColumns)
        orderPersons(currentOrder, currentOrderDirection)
    },
})

function buttonApplyFilterClick() {
    let blockOrder,
        emptyFilter = true
    persons = allPersons

    Array.from(formFilter.querySelectorAll("input, textarea")).forEach(
        (inputFilter) => {
            inputFilter.materialComponent.value = String(
                inputFilter.materialComponent.value
            ).trim()
            if (inputFilter.materialComponent.value != "") {
                emptyFilter = false
                switch (inputFilter.id.split('.')[1]) {
                    case "min":
                        persons = persons.where("" + inputFilter.id.split('.')[0] + "", ">=", "" + inputFilter.materialComponent.value + "")
                        blockOrder = inputFilter.id.split('.')[0]
                        break
                    case "max":
                        persons = persons.where(
                            "" + inputFilter.id.split('.')[0] + "",
                            "<=",
                            "" + inputFilter.materialComponent.value + ""
                        )
                        blockOrder = inputFilter.id.split('.')[0]
                        break
                    default:
                        persons = persons.where(
                            "" + inputFilter.id + "",
                            "==",
                            "" + inputFilter.materialComponent.value + ""
                        )
                        break
                }
            }
        }
    )
    if (emptyFilter) {
        alert("Filters are empty!")
        buttonClearFilter.disabled = true
    } else {
        buttonClearFilter.disabled = false

        if (blockOrder != undefined) {
            headerClick(blockOrder)

            Array.from(tableColumns).forEach((th) => {
                if (th.id != blockOrder) {
                    th.setAttribute("onclick", "")
                }
            })
        } else {
            orderPersons(currentOrder, currentOrderDirection)

            Array.from(tableColumns).forEach((th) => {
                th.setAttribute("onclick", "headerClick(this.id)")
            })
        }
    }
}

function buttonClearFilterClick() {
    Array.from(formFilter.querySelectorAll("input, textarea")).forEach(
        (inputFilter) => {
            inputFilter.materialComponent.value = ""
        }
    )
    Array.from(tableColumns).forEach((th) => {
        th.setAttribute("onclick", "headerClick(this.id)")
    })
    persons = allPersons
    orderPersons(currentOrder, currentOrderDirection)

    buttonClearFilter.disabled = true
}