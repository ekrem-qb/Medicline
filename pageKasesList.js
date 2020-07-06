const Sortable = require("sortablejs")

const inputSearch = document.querySelector("#inputSearch")
const buttonClearSearch = document.querySelector("#buttonClearSearch")

const kaseEditWindow = document.querySelector("#kaseEditWindow")
const currentKaseID = document.querySelector("#currentKaseID")
const buttonLock = document.querySelector("#buttonLock")

const kaseEditForm = document.querySelector("#kaseEditForm")

const buttonSave = document.querySelector("#buttonSave")
const buttonDelete = document.querySelector("#buttonDelete")
const buttonClearFilter = document.querySelector("#buttonClearFilter")

const columnsJSON = require("./columns.json")
const tableColumnsList = document.querySelector("#tableColumnsList")
const hiddenTableColumnsList = document.querySelector("#hiddenTableColumnsList")

const kasesList = document.querySelector("#kasesList")
var currentOrder, currentOrderDirection

var currentKases = firebase.firestore().collection("kases")
var allKases = firebase.firestore().collection("kases")
var currentKase, kaseExists

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
    clearKase()
    loadColumns()
    loadSelectMenus()
    formFilter.querySelector("#createDate-min").materialComponent.value = new Date().toJSON().substr(0, 10)
    buttonApplyFilterClick()
}

function loadSelectMenus() {
    document.querySelectorAll(".editable-select").forEach((select) => {
        let selectID = select.id.replace(/[0-9]/g, '')

        if (!selectID.includes('_')) {
            firebase.firestore().collection(selectID).onSnapshot((snapshot) => {
                $(select).editableSelect("clear")
                snapshot.docs.forEach((selectItem) => {
                    $(select).editableSelect("add", selectItem.id)
                })
            })

            $(select).on("select.editable-select", function () {
                let subElements = select.parentElement.parentElement.querySelectorAll("input")
                subElements.forEach(subElement => {
                    if (subElement != select && subElement.id.split('_')[0] == select.id) {
                        subElement.materialComponent.disabled = false
                        subElement.materialComponent.value = ''
                    }
                })
                let firstSubElement = subElements[1]
                if (firstSubElement != null) {
                    let sideSaveButton = firstSubElement.querySelector(".button--save_item")
                    if (firstSubElement != select && firstSubElement.id.split('_')[0] == select.id) {
                        firebase.firestore().collection(selectID).doc(select.materialComponent.value).onSnapshot((snapshot => {
                            if (firstSubElement.classList.contains('editable-select')) {
                                $(firstSubElement).editableSelect("clear")
                                for (const key in snapshot.data()) {
                                    $(firstSubElement).editableSelect("add", key)
                                }
                            } else {
                                for (const key in snapshot.data()) {
                                    firstSubElement.materialComponent.value = key
                                }
                                firstSubElement.oldValue = firstSubElement.materialComponent.value
                                if (sideSaveButton != null) {
                                    sideSaveButton.disabled = true
                                }
                                firstSubElement.materialComponent.disabled = !buttonLock.unlocked
                            }
                        }))
                    }
                }
            })
        }
    })
}

function loadColumns() {
    kasesList.innerHTML = "<h3>Loading...</h3>"

    let enabledColumns = []
    if (localStorage.getItem("enabledColumns") != null) {
        enabledColumns = localStorage.getItem("enabledColumns").split(',')
    } else {
        enabledColumns.push("__name__", "createDate")
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
}

function newColumn(column) {
    let th = document.createElement("th")
    th.id = column
    th.innerHTML = columnsJSON[column]
    th.setAttribute("onclick", "headerClick(this.id)")
    th.classList.add("mdc-elevation--z6")
    let sortIcon = document.createElement("span")
    sortIcon.className = "mdi mdi-unfold-more-horizontal"
    th.appendChild(sortIcon)
    return th
}

inputSearch.oninput = function () {
    var searchQuery = String(inputSearch.materialComponent.value).trim()

    if (searchQuery != '') {
        buttonClearSearch.disabled = false
        var foundKases = new Array()
        kasesList.innerHTML = "<h3>Loading...</h3>"
        currentKases.onSnapshot((snapshot) => {
            snapshot.forEach((kase) => {
                if (!foundKases.includes(kase.id)) {
                    if ((String(kase.id) + Object.values(kase.data()).toString().toLowerCase()).includes(searchQuery.toLowerCase())) {
                        foundKases.push(kase.id)
                    }
                }
            })
            if (foundKases.length > 0) {
                listKases(snapshot, foundKases, searchQuery)
            }
            else {
                kasesList.innerHTML = "<h3>Kases not found...</h3>"
            }
        })
    } else {
        clearSearch()
    }
}

function clearSearch() {
    buttonClearSearch.disabled = true
    inputSearch.materialComponent.value = ''
    orderKases(currentOrder, currentOrderDirection)
}

function buttonCreateClick() {
    let stop = allKases.orderBy(currentOrder, currentOrderDirection).onSnapshot((snapshot) => {
        do {
            var kaseID = new Date().getFullYear().toString().substr(-2) + (Math.floor(Math.random() * (99999 - 10000)) + 10000).toString()
            kaseExists = snapshot.docs.some((item) => item.id === kaseID)

            console.log(kaseID + ":" + kaseExists + " in " + snapshot.docs.length)
        } while (kaseExists)

        stop()
        kaseEditWindow.hidden = false
        currentKase = allKases.doc(kaseID)
        currentKaseID.innerText = kaseID
        kaseEditForm.querySelector("#callDate").materialComponent.value = new Date().toJSON().substr(0, 10)
        kaseEditForm.querySelector("#callTime").materialComponent.value = new Date().toLocaleTimeString().substr(0, 5)
        kaseEditForm.querySelector("#appointmentDate").materialComponent.value = new Date().toJSON().substr(0, 10)
        kaseEditForm.querySelector("#appointmentTime").materialComponent.value = new Date().toLocaleTimeString().substr(0, 5)
    })
}

function buttonLockClick() {
    if (buttonLock.unlocked) {
        buttonLock.classList.remove("mdc-button--green")
        buttonLock.querySelector(".mdc-fab__icon").classList.remove("mdi-lock-open-variant", "mdi-flip-h")
        buttonLock.querySelector(".mdc-fab__icon").classList.add("mdi-lock")
        buttonLock.unlocked = false

        buttonSave.disabled = false

        kaseEditForm.querySelectorAll(".button--add_select_item, .button--save_item").forEach(sideButton => {
            sideButton.hidden = true
            let sideButtonIcon = sideButton.querySelector(".mdi")

            let inputEdit = sideButton.parentElement.querySelector("input")
            if (sideButton.classList.contains("button--save_item")) {
                if (inputEdit.classList.contains("editable-select")) {
                    sideButton.classList.add("button--add_select_item")
                    sideButtonIcon.classList.add("mdi-plus")
                    sideButtonIcon.classList.add("mdi-rotate-180")
                    sideButtonIcon.classList.remove("mdi-content-save")
                    sideButton.classList.remove("button--save_item")
                } else {
                    inputEdit.materialComponent.disabled = true
                }
                if (inputEdit.oldValue != undefined) {
                    inputEdit.materialComponent.value = inputEdit.oldValue
                }
            }
            if (inputEdit.classList.contains("editable-select")) {
                inputEdit.parentElement.querySelector(".mdc-select__dropdown-icon").hidden = false
                inputEdit.parentElement.querySelector(".es-list").hidden = false
            }
            inputEdit.readOnly = true
        })
    } else {
        buttonLock.classList.add("mdc-button--green")
        buttonLock.querySelector(".mdc-fab__icon").classList.remove("mdi-lock")
        buttonLock.querySelector(".mdc-fab__icon").classList.add("mdi-lock-open-variant", "mdi-flip-h")
        buttonLock.unlocked = true

        buttonSave.disabled = true

        kaseEditForm.querySelectorAll(".button--add_select_item, .button--save_item").forEach(sideButton => {
            sideButton.hidden = false

            let inputEdit = sideButton.parentElement.querySelector("input")
            let inputEditID = inputEdit.id.replace(/[0-9]/g, '')

            if (sideButton.classList.contains("button--save_item")) {
                inputEdit.readOnly = false
                if (inputEdit.oldValue != undefined) {
                    inputEdit.materialComponent.disabled = false
                }
            }

            let sideButtonIcon = sideButton.querySelector(".mdi")
            sideButton.onclick = function () {
                if (sideButton.classList.contains("button--add_select_item")) {
                    sideButton.classList.remove("button--add_select_item")
                    sideButtonIcon.classList.remove("mdi-plus")
                    sideButtonIcon.classList.remove("mdi-rotate-180")
                    sideButtonIcon.classList.add("mdi-content-save")
                    sideButton.classList.add("button--save_item")

                    inputEdit.readOnly = false
                    inputEdit.parentElement.querySelector(".mdc-select__dropdown-icon").hidden = true
                    inputEdit.parentElement.querySelector(".es-list").hidden = true
                    inputEdit.oldValue = inputEdit.materialComponent.value
                    inputEdit.materialComponent.value = ''
                    inputEdit.materialComponent.valid = true

                    let subElements = inputEdit.parentElement.parentElement.querySelectorAll("input")
                    subElements.forEach(subElement => {
                        subElementID = subElement.id.replace(/[0-9]/g, '')
                        if (subElement != inputEdit && subElementID.split('_')[0] == inputEditID) {
                            subElement.materialComponent.disabled = true
                            subElement.materialComponent.value = ''
                        }
                    })
                } else {
                    if (inputEditID.includes('_')) {
                        let parentSelect = inputEdit.parentElement.parentElement.querySelector("input")
                        let data = new Object()
                        data[inputEdit.materialComponent.value] = ''
                        if (inputEdit.classList.contains("editable-select")) {
                            firebase.firestore().collection(inputEditID.split('_')[0]).doc(parentSelect.materialComponent.value).update(data)
                        } else {
                            firebase.firestore().collection(inputEditID.split('_')[0]).doc(parentSelect.materialComponent.value).set(data)
                        }
                    } else {
                        firebase.firestore().collection(inputEditID).doc(inputEdit.materialComponent.value).set({})
                    }

                    if (inputEdit.classList.contains("editable-select")) {
                        sideButton.classList.add("button--add_select_item")
                        sideButtonIcon.classList.add("mdi-plus")
                        sideButtonIcon.classList.add("mdi-rotate-180")
                        sideButtonIcon.classList.remove("mdi-content-save")
                        sideButton.classList.remove("button--save_item")

                        inputEdit.readOnly = true
                        inputEdit.parentElement.querySelector(".mdc-select__dropdown-icon").hidden = false
                        inputEdit.parentElement.querySelector(".es-list").hidden = false
                    }
                }
            }
        })
    }
}

buttonSave.onclick = function () {
    let kase = new Object()
    let valid = true

    kaseEditForm.querySelectorAll("input, textarea").forEach((inputEdit) => {
        if (inputEdit.materialComponent != undefined) {
            inputEdit.materialComponent.value = String(inputEdit.materialComponent.value).trim()
            if (inputEdit.required && inputEdit.materialComponent.value == '') {
                inputEdit.materialComponent.valid = false
                valid = false
            }
            if (!inputEdit.materialComponent.disabled) {
                kase[inputEdit.id] = inputEdit.materialComponent.value
            }
            inputEdit.materialComponent.value = String(inputEdit.materialComponent.value).trim()
            if (inputEdit.required && inputEdit.materialComponent.value == '') {
                inputEdit.materialComponent.valid = false
                valid = false
            }
            if (!inputEdit.materialComponent.disabled) {
                kase[inputEdit.id] = inputEdit.materialComponent.value
            }
        }
    })

    console.log(kase)

    if (valid) {
        if (kaseExists) {
            kase.updateUser = firebase.auth().currentUser.email
            kase.updateDate = new Date().toJSON().substr(0, 10)
            kase.updateTime = new Date().toLocaleTimeString()
            currentKase.update(kase)
        } else {
            kase.createUser = firebase.auth().currentUser.email
            kase.createDate = new Date().toJSON().substr(0, 10)
            kase.createTime = new Date().toLocaleTimeString()
            kase.updateUser = ''
            kase.updateDate = ''
            currentKase.set(kase)
        }
        clearKase()
    }
}

buttonDelete.onclick = function () {
    currentKase.delete()

    clearKase()
}

function clearKase() {
    currentKase = undefined
    buttonLock.unlocked = true
    buttonLockClick()

    document.querySelectorAll("input:not(#inputSearch), textarea").forEach((inputEdit) => {
        let sideSaveButton = inputEdit.parentElement.querySelector(".button--save_item")
        if (sideSaveButton != null) {
            sideSaveButton.disabled = true
        }

        inputEdit.materialComponent.value = ''
        inputEdit.materialComponent.valid = true

        if (inputEdit.id.includes('_')) {
            inputEdit.materialComponent.disabled = true
        }
        else {
            inputEdit.parentElement.parentElement.hidden = inputEdit.materialComponent.disabled
        }

        inputEdit.onchange = function () {
            inputEdit.materialComponent.value = String(inputEdit.materialComponent.value).trim()
            if (inputEdit.required && !buttonLock.unlocked) {
                inputEdit.materialComponent.valid = inputEdit.materialComponent.value != ''
            }
        }
        inputEdit.oninput = function () {
            if (sideSaveButton != null) {
                sideSaveButton.disabled = inputEdit.materialComponent.value == inputEdit.oldValue || inputEdit.materialComponent.value == ''
            }
            if (inputEdit.required && !buttonLock.unlocked) {
                inputEdit.materialComponent.valid = String(inputEdit.materialComponent.value).trim() != ''
            }
        }
    })

    kaseEditWindow.hidden = true
    buttonDelete.disabled = true
}

function orderKases(orderBy, orderDirection) {
    if (orderDirection == undefined) {
        orderDirection = "asc"
    }

    let query = currentKases.orderBy(orderBy, orderDirection)

    kasesList.innerHTML = "<h3>Loading...</h3>"
    query.onSnapshot(
        (snapshot) => {
            console.log(snapshot)
            listKases(snapshot)
        },
        (err) => {
            console.log(err)
            kasesList.innerHTML = "<h3>Kases not found...</h3>"
        }
    )

    currentOrder = orderBy
    currentOrderDirection = orderDirection
}

function headerClick(headerID) {
    let clickedHeader = tableColumnsList.querySelector("th#" + headerID)

    for (let column of tableColumnsList.children) {
        if (column.id != headerID) {
            let sortIcon = column.querySelector("span")

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
    }

    let clickedHeaderSortIcon = clickedHeader.querySelector("span")

    if (clickedHeaderSortIcon.classList.contains("mdi-unfold-more-horizontal")) {
        clickedHeaderSortIcon.classList.remove("mdi-unfold-more-horizontal")
        clickedHeaderSortIcon.classList.add("mdi-chevron-up")
    }

    if (clickedHeaderSortIcon.classList.contains("mdi-rotate-180")) {
        orderKases(headerID, "asc")

        clickedHeaderSortIcon.classList.remove("mdi-rotate-180")
    } else {
        orderKases(headerID, "desc")

        clickedHeaderSortIcon.classList.add("mdi-rotate-180")
    }
}

function listKases(snap, foundKases, searchQuery) {
    if (snap.docs.length > 0) {
        kasesList.innerHTML = ''
        snap.forEach((kase) => {
            if (foundKases == undefined || foundKases.includes(kase.id)) {
                let tr = document.createElement("tr")
                tr.id = kase.id
                tr.ondblclick = function () {
                    clearKase()
                    kaseEditWindow.hidden = false
                    buttonDelete.disabled = false

                    currentKaseID.innerText = kase.id
                    kaseEditForm.querySelectorAll("input, textarea").forEach((inputEdit) => {
                        if (kase.get(inputEdit.id) != undefined) {
                            if (inputEdit.materialComponent.disabled) {
                                if (kase.get(inputEdit.id) != '') {
                                    inputEdit.parentElement.parentElement.hidden = false
                                }
                            } else {
                                inputEdit.parentElement.parentElement.hidden = false
                            }

                            if (!inputEdit.parentElement.parentElement.hidden) {
                                inputEdit.materialComponent.value = kase.get(inputEdit.id)
                            }

                            if (inputEdit.id.includes('_') && inputEdit.parentElement.parentElement.querySelectorAll("input").length > 2) {
                                inputEdit.materialComponent.disabled = false
                            }
                        }
                    })
                    currentKase = allKases.doc(tr.id)
                    kaseExists = true
                }
                kasesList.appendChild(tr)

                for (let column of tableColumnsList.children) {
                    let td = document.createElement("td")
                    tr.appendChild(td)
                    td.id = column.id
                    switch (column.id) {
                        case "__name__":
                            td.textContent = kase.id
                            break
                        case "description":
                        case "complaints":
                            td.textContent = td.title = kase.get(column.id)
                            break
                        default:
                            td.textContent = kase.get(column.id)
                            break
                    }
                    if (searchQuery != undefined) {
                        if (td.textContent.toLowerCase().includes(searchQuery.toLowerCase())) {
                            td.classList.add("bg-warning")
                        }
                    }
                }
            }
        })
    } else {
        kasesList.innerHTML = "<h3>Kases not found...</h3>"
    }
}

function modalExpand(header) {
    let currentModalBody = header.parentElement.querySelector(".modal-body")
    let currentExpandIcon = currentModalBody.parentElement.querySelector(".mdc-select__dropdown-icon")

    let otherModalBody
    header.parentElement.parentElement.querySelectorAll(".modal-body").forEach(modalBody => {
        if (modalBody != currentModalBody) {
            otherModalBody = modalBody
        }
    })
    let otherxpandIcon = otherModalBody.parentElement.querySelector(".mdc-select__dropdown-icon")

    if (currentModalBody.classList.contains("collapsed")) {
        currentModalBody.classList.remove("collapsed")
        currentExpandIcon.classList.add("mdi-rotate-180")

        otherModalBody.classList.add("collapsed")
        otherxpandIcon.classList.remove("mdi-rotate-180")
    }
    else {
        currentModalBody.classList.add("collapsed")
        currentExpandIcon.classList.remove("mdi-rotate-180")
    }
}

Sortable.create(tableColumnsList, {
    group: "TableColumns",
    animation: 150,
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    onMove: function () {
        orderKases(currentOrder, currentOrderDirection)
    },
    onEnd: function () {
        let enabledColumns = []
        for (let column of tableColumnsList.children) {
            enabledColumns.push(column.id)
        }
        localStorage.setItem("enabledColumns", enabledColumns)
    }
})
Sortable.create(hiddenTableColumnsList, {
    group: "TableColumns",
    animation: 150,
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    onMove: function () {
        orderKases(currentOrder, currentOrderDirection)
    },
    onEnd: function () {
        let enabledColumns = []
        for (let column of tableColumnsList.children) {
            enabledColumns.push(column.id)
        }
        localStorage.setItem("enabledColumns", enabledColumns)
    }
})

function buttonApplyFilterClick() {
    let blockOrder, emptyFilter = true
    currentKases = allKases

    formFilter.querySelectorAll("input, textarea").forEach((inputFilter) => {
        if (inputFilter.materialComponent.value != '') {
            emptyFilter = false
            switch (inputFilter.id.split('-')[1]) {
                case "min":
                    currentKases = currentKases.where(inputFilter.id.split('-')[0], ">=", inputFilter.materialComponent.value)
                    blockOrder = inputFilter.id.split('-')[0]
                    break
                case "max":
                    currentKases = currentKases.where(inputFilter.id.split('-')[0], "<=", inputFilter.materialComponent.value)
                    blockOrder = inputFilter.id.split('-')[0]
                    break
                default:
                    currentKases = currentKases.where(inputFilter.id, "==", inputFilter.materialComponent.value)
                    break
            }
        }
    })
    if (!emptyFilter) {
        if (blockOrder != undefined) {
            if (tableColumnsList.querySelector("th#" + blockOrder) == undefined) {
                orderKases(blockOrder, currentOrderDirection)
            }
            else {
                headerClick(blockOrder)
                headerClick(blockOrder)
            }

            for (let column of tableColumnsList.children) {
                if (column.id != blockOrder) {
                    column.removeAttribute("onclick")
                    column.classList.add("invalid")
                }
            }
        }
        else {
            orderKases(currentOrder, currentOrderDirection)

            for (let column of tableColumnsList.children) {
                column.setAttribute("onclick", "headerClick(this.id)")
                column.classList.remove("invalid")
            }
        }
    }
    else {
        alert("Filters are empty!")
    }
    buttonClearFilter.disabled = emptyFilter
}

function buttonClearFilterClick() {
    formFilter.querySelectorAll("input, textarea").forEach(
        (inputFilter) => {
            inputFilter.materialComponent.value = ''
        }
    )
    for (let column of tableColumnsList.children) {
        column.setAttribute("onclick", "headerClick(this.id)")
        column.classList.remove("invalid")
    }
    currentKases = allKases
    orderKases(currentOrder, currentOrderDirection)

    buttonClearFilter.disabled = true
}