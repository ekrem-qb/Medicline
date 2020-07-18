const { remote } = require("electron")
const { Menu, MenuItem } = remote

const menu = new Menu()
menu.append(new MenuItem({ icon: "icons/sentDocs.png", label: "SENT DOCUMENTS", click() { changeKaseStatus("sentDocs") } }))
menu.append(new MenuItem({ icon: "icons/invoiced.png", label: "INVOICED", click() { changeKaseStatus("invoiced") } }))
menu.append(new MenuItem({ icon: "icons/dropped.png", label: "DROPPED", click() { changeKaseStatus("dropped") } }))
menu.append(new MenuItem({ icon: "icons/gop.png", label: "GOP RECEIVED/SENT", click() { changeKaseStatus("gop") } }))
menu.append(new MenuItem({ icon: "icons/payIssued.png", label: "PAYMENT ISSUED", click() { changeKaseStatus("payIssued") } }))
menu.append(new MenuItem({ icon: "icons/payReceived.png", label: "PAYMENT RECEIVED", click() { changeKaseStatus("payReceived") } }))
menu.append(new MenuItem({ icon: "icons/multi.png", label: "MULTI PROVIDER", click() { changeKaseStatus("multi") } }))
menu.append(new MenuItem({ icon: "icons/payNclaim.png", label: "PAY AND CLAIM", click() { changeKaseStatus("payNclaim") } }))
menu.append(new MenuItem({ icon: "icons/active.png", label: "ACTIVE", click() { changeKaseStatus("active") } }))
menu.append(new MenuItem({ icon: "icons/receivedDocs.png", label: "RECEIVED DOCUMENTS", click() { changeKaseStatus("receivedDocs") } }))
menu.append(new MenuItem({ type: "separator" }))
menu.append(new MenuItem({ icon: "icons/delete.png", label: "Delete", click() { deleteKase() } }))
menu.on("menu-will-close", event => {
    currentKase = undefined
})

const Sortable = require("sortablejs")

const inputSearch = document.querySelector("input#search")
const buttonClearSearch = document.querySelector("button#clearSearch")

const columnsJSON = require("./columns.json")
const tableColumnsList = document.querySelector("#tableColumnsList")
const kasesList = document.querySelector("#kasesList")
var currentOrder, currentOrderDirection

const hiddenTableColumnsList = document.querySelector("#hiddenTableColumnsList")

const formFilter = document.querySelector("form#filter")
const buttonClearFilter = document.querySelector("button#clearFilter")

const statuses = document.querySelector("#statuses").children

const editKaseWindow = document.querySelector("#editKaseWindow")
const formEditKase = document.querySelector("form#editKase")
const currentKaseID = document.querySelector("#currentKaseID")
const buttonLock = document.querySelector("button#lock")
const buttonSave = document.querySelector("button#save")
const buttonDelete = document.querySelector("button#delete")

const allKases = firebase.firestore().collection("kases")
var currentQuery = firebase.firestore().collection("kases")
var currentKasesSnapshot
var currentKase, kaseExists = false
var stopCurrentQuery = function () { }

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
    clearKase(true)
    loadColumns()
    formFilter.querySelector("#createDate-min").materialComponent.value = new Date().toJSON().substr(0, 10)
    applyFilter()
    hideEmptyFilters()
    loadSelectMenus()
}

function loadSelectMenus() {
    document.querySelectorAll(".editable-select").forEach(
        (select) => {
            let selectID = select.id.replace(/[0-9]/g, '')

            if (!selectID.includes('_')) {
                firebase.firestore().collection(selectID).onSnapshot(
                    (snapshot) => {
                        $(select).editableSelect("clear")
                        snapshot.docs.forEach(
                            (selectItem) => {
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
                            firebase.firestore().collection(selectID).doc(select.materialComponent.value).onSnapshot(
                                (snapshot => {
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

function selectThisItem(selectMenu, itemString) {
    selectMenu.parentElement.querySelectorAll("li").forEach(selectItem => {
        if (selectItem.innerText == itemString) {
            $(selectMenu).editableSelect("select", $(selectItem))
            $(selectMenu).editableSelect("hide")
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
    enabledColumns.forEach(
        (column) => {
            if (columnsJSON.hasOwnProperty(column)) {
                tableColumnsList.appendChild(newColumn(column))
            }
        })
    for (let column in columnsJSON) {
        if (!enabledColumns.includes(column)) {
            hiddenTableColumnsList.appendChild(newColumn(column))
        }
    }
    if (enabledColumns.includes("createDate")) {
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
        currentKasesSnapshot.forEach(
            (kase) => {
                if (!foundKases.includes(kase.id)) {
                    if ((String(kase.id) + Object.values(kase.data()).toString().toLowerCase()).includes(searchQuery.toLowerCase())) {
                        foundKases.push(kase.id)
                    }
                }
            }
        )
        if (foundKases.length > 0) {
            listKases(currentKasesSnapshot, foundKases, searchQuery)
        }
        else {
            kasesList.innerHTML = "<h3>Cases not found...</h3>"
        }
    } else {
        clearSearch()
    }
}

function clearSearch() {
    buttonClearSearch.disabled = true
    inputSearch.materialComponent.value = ''
    listKases(currentKasesSnapshot)
}

function checkKaseID() {
    if (!buttonLock.unlocked)
        buttonSave.disabled = currentKase == undefined

    currentKaseID.parentElement.disabled = currentKase == undefined
    let idIcon = currentKaseID.parentElement.querySelector(".mdi")
    idIcon.classList.toggle("mdi-pound", currentKase != undefined)
    idIcon.classList.toggle("mdi-loading", currentKase == undefined)
    idIcon.classList.toggle("mdi-spin", currentKase == undefined)

    if (currentKase == undefined)
        currentKaseID.parentElement.parentElement.title = "Generating available ID..."
    else
        currentKaseID.parentElement.parentElement.title = ''
}

var timer = 0

function randomKaseID() {
    currentKaseID.innerHTML = new Date().getFullYear().toString().substr(-2) + (Math.floor(Math.random() * (99999 - 10000)) + 10000).toString()
    checkKaseID()
    timer++
}

function buttonCreateClick() {
    editKaseWindow.hidden = false

    timer = 0
    var repeatRandomKaseID = setInterval(randomKaseID, 50)

    stopCurrentQuery()
    let stop = allKases.onSnapshot(
        (snapshot) => {
            do {
                randomKaseID()
                kaseExists = snapshot.docs.some((item) => item.id === currentKaseID.innerHTML)

                console.log(currentKaseID.innerHTML + ":" + kaseExists + " in " + snapshot.docs.length + " Time: " + timer)
            } while (kaseExists)

            stop()
            currentKase = allKases.doc(currentKaseID.innerHTML)
            checkKaseID()
            clearInterval(repeatRandomKaseID)
            formEditKase.querySelector("#callDate").materialComponent.value = new Date().toJSON().substr(0, 10)
            formEditKase.querySelector("#callTime").materialComponent.value = new Date().toLocaleTimeString().substr(0, 5)
            formEditKase.querySelector("#appointmentDate").materialComponent.value = new Date().toJSON().substr(0, 10)
            formEditKase.querySelector("#appointmentTime").materialComponent.value = new Date().toLocaleTimeString().substr(0, 5)
        })
}

function buttonLockClick() {
    buttonLock.classList.toggle("mdc-button--green", !buttonLock.unlocked)
    buttonLock.querySelector(".mdc-fab__icon").classList.toggle("mdi-lock", buttonLock.unlocked)
    buttonLock.querySelector(".mdc-fab__icon").classList.toggle("mdi-lock-open-variant", !buttonLock.unlocked)
    buttonLock.querySelector(".mdc-fab__icon").classList.toggle("mdi-flip-h", !buttonLock.unlocked)

    if (buttonLock.unlocked) {
        buttonLock.unlocked = false

        if (currentKase != undefined)
            buttonSave.disabled = false

        formEditKase.querySelectorAll(".button--add_select_item, .button--save_item").forEach(sideButton => {
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
                    if (inputEdit.oldValue != undefined) {
                        selectThisItem(inputEdit, inputEdit.oldValue)
                    }
                } else {
                    inputEdit.materialComponent.disabled = true
                }
            }
            if (inputEdit.classList.contains("editable-select")) {
                inputEdit.parentElement.querySelector(".mdc-select__dropdown-icon").hidden = false
                inputEdit.parentElement.querySelector(".es-list").hidden = false
            }
            inputEdit.readOnly = true
        })
    } else {
        buttonLock.unlocked = true

        buttonSave.disabled = true

        formEditKase.querySelectorAll(".button--add_select_item, .button--save_item").forEach(sideButton => {
            sideButton.hidden = false

            let inputEdit = sideButton.parentElement.querySelector("input")
            let inputEditID = inputEdit.id.replace(/[0-9]/g, '')

            if (sideButton.classList.contains("button--save_item")) {
                if (inputEdit.oldValue != undefined) {
                    inputEdit.materialComponent.disabled = false
                    inputEdit.readOnly = false
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

document.onkeydown = function (event) {
    if (!editKaseWindow.hidden) {
        if (event.key == "Escape") {
            clearKase()
        }
        if (!buttonSave.disabled) {
            if (event.key == "Enter") {
                saveKase()
            }
        }
    }
}

function saveKase() {
    let kaseData = new Object()
    let valid = true

    formEditKase.querySelectorAll("input, textarea").forEach(
        (inputEdit) => {
            if (inputEdit.materialComponent != undefined) {
                if (inputEdit.required && inputEdit.materialComponent.value == '') {
                    inputEdit.materialComponent.valid = false
                    valid = false
                }
                if (!inputEdit.materialComponent.disabled || inputEdit.id.includes('_')) {
                    kaseData[inputEdit.id] = inputEdit.materialComponent.value
                }
            }
        })

    console.log(kaseData)

    if (valid) {
        if (kaseExists) {
            kaseData.updateUser = firebase.auth().currentUser.email
            kaseData.updateDate = new Date().toJSON().substr(0, 10)
            kaseData.updateTime = new Date().toLocaleTimeString()
            currentKase.update(kaseData)
        } else {
            kaseData.createUser = firebase.auth().currentUser.email
            kaseData.createDate = new Date().toJSON().substr(0, 10)
            kaseData.createTime = new Date().toLocaleTimeString()
            kaseData.updateUser = ''
            kaseData.updateDate = ''
            kaseData.status = "active"
            currentKase.set(kaseData)
        }
        clearKase()
    }
}
buttonSave.onclick = saveKase

function deleteKase() {
    currentKase.delete()
    clearKase()
}
buttonDelete.onclick = deleteKase

function clearKase(dontReload) {
    currentKase = undefined
    buttonLock.unlocked = true
    buttonLockClick()

    formEditKase.querySelectorAll("input, textarea").forEach(
        (inputEdit) => {
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

    editKaseWindow.hidden = true
    buttonDelete.disabled = true
    buttonSave.disabled = true
    if (dontReload != true) {
        loadKases()
    }
}

function headerClick(headerID) {
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

    let clickedHeader = tableColumnsList.querySelector("th#" + headerID)
    let clickedHeaderSortIcon = clickedHeader.querySelector("span")

    if (clickedHeaderSortIcon.classList.contains("mdi-unfold-more-horizontal")) {
        clickedHeaderSortIcon.classList.remove("mdi-unfold-more-horizontal")
        clickedHeaderSortIcon.classList.add("mdi-chevron-up")
    }

    if (clickedHeaderSortIcon.classList.contains("mdi-rotate-180")) {
        orderKase(headerID, "asc")
        clickedHeaderSortIcon.classList.remove("mdi-rotate-180")
    } else {
        orderKase(headerID, "desc")
        clickedHeaderSortIcon.classList.add("mdi-rotate-180")
    }
}

function loadKases() {
    stopCurrentQuery()
    stopCurrentQuery = currentQuery.onSnapshot(
        (snapshot) => {
            console.log(snapshot)
            listKases(snapshot)
            currentKasesSnapshot = snapshot
        },
        (err) => {
            console.log(err)
            kasesList.innerHTML = "<h3>Cases not found...</h3>"
        }
    )
}

function listKases(snap, foundKases, searchQuery) {
    if (snap.docs.length > 0) {
        kasesList.innerHTML = ''
        snap.forEach(
            (kase) => {
                if (foundKases == undefined || foundKases.includes(kase.id)) {
                    let tr = document.createElement("tr")
                    tr.id = kase.id
                    tr.dataset.status = kase.get("status")
                    tr.ondblclick = function () {
                        clearKase(true)
                        editKaseWindow.hidden = false
                        buttonDelete.disabled = false
                        currentKase = allKases.doc(tr.id)
                        currentKaseID.innerHTML = tr.id
                        checkKaseID()
                        kaseExists = true

                        formEditKase.querySelectorAll("input, textarea").forEach(
                            (inputEdit) => {
                                let itemValue = kase.get(inputEdit.id)

                                if (itemValue != undefined) {
                                    if (inputEdit.materialComponent.disabled) {
                                        if (itemValue != '') {
                                            inputEdit.parentElement.parentElement.hidden = false
                                        }
                                    } else {
                                        inputEdit.parentElement.parentElement.hidden = false
                                    }

                                    if (!inputEdit.parentElement.parentElement.hidden) {
                                        if (inputEdit.classList.contains("editable-select")) {
                                            if (inputEdit.id.includes('_')) {
                                                setTimeout(() => selectThisItem(inputEdit, itemValue), 10)
                                            }
                                            else {
                                                selectThisItem(inputEdit, itemValue)
                                            }
                                        }
                                        else {
                                            inputEdit.materialComponent.value = itemValue
                                        }
                                    }

                                    if (inputEdit.id.includes('_') && inputEdit.parentElement.parentElement.querySelectorAll("input").length > 2) {
                                        inputEdit.materialComponent.disabled = false
                                    }
                                }
                            })
                    }
                    tr.oncontextmenu = function (mouseEvent) {
                        currentKase = allKases.doc(tr.id)
                        menu.popup({ window: remote.getCurrentWindow() })
                    }

                    kasesList.appendChild(tr)

                    for (let column of tableColumnsList.children) {
                        let td = document.createElement("td")
                        tr.appendChild(td)
                        td.id = column.id
                        switch (td.id) {
                            case "__name__":
                                td.textContent = kase.id
                                break
                            case "description":
                            case "complaints":
                                td.textContent = td.title = kase.get(td.id)
                                break
                            default:
                                td.textContent = kase.get(td.id)
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
        orderKase(currentOrder, currentOrderDirection)
    } else {
        kasesList.innerHTML = "<h3>Cases not found...</h3>"
    }
}

function orderKase(orderBy, orderDirection) {
    let switching, i, shouldSwitch, switchcount = 0
    do {

        switching = false
        let rows = kasesList.children

        for (i = 0; i < rows.length - 1; i++) {

            shouldSwitch = false

            let x = rows[i].querySelector("td#" + orderBy)
            let y = rows[i + 1].querySelector("td#" + orderBy)

            if (orderDirection == "asc") {
                if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {

                    shouldSwitch = true
                    break
                }
            } else if (orderDirection == "desc") {
                if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {

                    shouldSwitch = true
                    break
                }
            }
        }
        if (shouldSwitch) {

            rows[i].parentNode.insertBefore(rows[i + 1], rows[i])
            switching = true

            switchcount++
        } else {

            if (switchcount == 0 && orderDirection == "asc") {
                orderDirection = "desc"
                switching = true
            }
        }
    }
    while (switching)

    currentOrder = orderBy
    currentOrderDirection = orderDirection
}

function changeKaseStatus(newStatus) {
    let kaseData = new Object()
    kaseData.status = newStatus
    currentKase.update(kaseData)

    currentKase = undefined
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
    let otherExpandIcon = otherModalBody.parentElement.querySelector(".mdc-select__dropdown-icon")

    if (currentModalBody.classList.contains("collapsed")) {
        otherModalBody.classList.add("collapsed")
        otherExpandIcon.classList.remove("mdi-rotate-180")
    }

    currentExpandIcon.classList.toggle("mdi-rotate-180", currentModalBody.classList.contains("collapsed"))
    currentModalBody.classList.toggle("collapsed", !currentModalBody.classList.contains("collapsed"))
    hideEmptyFilters()
}

Sortable.create(tableColumnsList, {
    group: "TableColumns",
    animation: 150,
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    onChange: function () {
        kasesList.innerHTML = ''
    },
    onStart: function () {
        kasesList.innerHTML = ''
    },
    onEnd: function () {
        listKases(currentKasesSnapshot)
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
    onEnd: function () {
        listKases(currentKasesSnapshot)
        let enabledColumns = []
        for (let column of tableColumnsList.children) {
            enabledColumns.push(column.id)
        }
        localStorage.setItem("enabledColumns", enabledColumns)
    }
})

for (const currentStatus of statuses) {
    currentStatus.onmouseover = function () {
        for (const kaseRow of kasesList.children) {
            kaseRow.classList.toggle("other-hide", kaseRow.dataset.status != currentStatus.dataset.status)
        }
    }
    currentStatus.onmouseleave = function () {
        for (const kaseRow of kasesList.children) {
            kaseRow.classList.remove("other-hide")
        }
    }
}

function hideEmptyFilters() {
    let hide = true
    formFilter.querySelectorAll("input, textarea").forEach(
        (inputFilter) => {
            if (String(inputFilter.materialComponent.value).trim() == '') {
                inputFilter.materialComponent.root.classList.toggle("collapsed", formFilter.classList.contains("collapsed"))
            }
            else {
                hide = false
            }
        }
    )
    if (formFilter.classList.contains("collapsed")) {
        formFilter.classList.toggle("hide", hide)
    }
    else {
        formFilter.classList.remove("hide")
    }

}

function applyFilter() {
    let emptyFilter = true
    currentQuery = allKases

    formFilter.querySelectorAll("input, textarea").forEach(
        (inputFilter) => {
            if (inputFilter.materialComponent.value != '') {
                inputFilter.onchange = function () {
                    inputFilter.materialComponent.value = String(inputFilter.materialComponent.value).trim()
                }
                emptyFilter = false
                switch (inputFilter.id.split('-')[1]) {
                    case "min":
                        currentQuery = currentQuery.where(inputFilter.id.split('-')[0], ">=", inputFilter.materialComponent.value)
                        break
                    case "max":
                        currentQuery = currentQuery.where(inputFilter.id.split('-')[0], "<=", inputFilter.materialComponent.value)
                        break
                    default:
                        currentQuery = currentQuery.where(inputFilter.id, "==", inputFilter.materialComponent.value)
                        break
                }
            }
        })
    if (!emptyFilter) {
        kasesList.innerHTML = "<h3>Loading...</h3>"
        loadKases()
    }
    else {
        alert("Filters are empty!")
    }
    buttonClearFilter.disabled = emptyFilter
}

buttonClearFilter.onclick = function () {
    formFilter.querySelectorAll("input, textarea").forEach(
        (inputFilter) => {
            inputFilter.materialComponent.value = ''
            inputFilter.onchange = function () {
                inputFilter.materialComponent.value = String(inputFilter.materialComponent.value).trim()
            }
        }
    )
    for (let column of tableColumnsList.children) {
        column.setAttribute("onclick", "headerClick(this.id)")
        column.classList.remove("invalid")
    }
    currentQuery = allKases
    kasesList.innerHTML = "<h3>Loading...</h3>"
    loadKases()
    hideEmptyFilters()

    buttonClearFilter.disabled = true
}