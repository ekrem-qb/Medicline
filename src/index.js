const inputSearch = document.querySelector("input#search")
const buttonClearSearch = document.querySelector("button#clearSearch")

const tableOverlay = document.querySelector("#tableOverlay")
const tableOverlayIcon = tableOverlay.querySelector(".mdi")
const tableOverlayText = tableOverlay.querySelector("h3")
const columnsJSON = require("./columns.json")
const tableColumnsList = document.querySelector("#tableColumnsList")
const kasesList = document.querySelector("#kasesList")
var currentOrder, currentOrderDirection

const hiddenTableColumnsList = document.querySelector("#hiddenTableColumnsList")

const formFilter = document.querySelector("form#filter")
const buttonClearFilter = document.querySelector("button#clearFilter")

const statusBar = document.querySelector("#statusBar").children
var currentStatus

const dialogEditKase = document.querySelector("#dialogEditKase")
dialogEditKase.materialComponent.scrimClickAction = ''
dialogEditKase.materialComponent.escapeKeyAction = ''
dialogEditKase.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == "cancel") {
        clearKase()
    }
})
const buttonLock = dialogEditKase.querySelector("button#lock")
const titleDialogEditKase = dialogEditKase.querySelector("#titleDialogEditKase")
const formEditKase = dialogEditKase.querySelector("form#editKase")
const buttonSave = dialogEditKase.querySelector("button#save")
const currentKaseID = dialogEditKase.querySelector("#currentKaseID")
currentKaseID.parentElement.onclick = () => {
    navigator.clipboard.writeText(currentKaseID.innerText)
    alert(currentKaseID.innerText + translate("COPIED"))
}

const buttonDelete = dialogEditKase.querySelector("button#delete")

const dialogDeleteKase = document.querySelector("#dialogDeleteKase")
dialogDeleteKase.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == "delete") {
        currentKase.delete()
        clearKase()
    }
})

firebase.firestore().enablePersistence()
const allKases = firebase.firestore().collection("kases")
var currentQuery = firebase.firestore().collection("kases")
var currentKasesSnap, currentKaseSnap
var currentKase, kaseExists = false
var stopCurrentQuery = () => { }
const contextMenu = document.querySelector("#contextMenu")
contextMenu.materialComponent.listen("close", () => {
    currentKase = undefined
})


const snackbar = document.querySelector("#snackbar")
function alert(message) {
    snackbar.materialComponent.close()
    snackbar.materialComponent.labelText = message
    snackbar.materialComponent.open()
}

clearKase(true)
loadInputs()
loadColumns()

function pageLoaded() {
    formFilter.querySelector("#createDate-min").materialComponent.value = new Date().toJSON().substr(0, 10)
    applyFilter()
    hideEmptyFilters()
    loadSelectMenus()
}

function loadInputs() {
    formEditKase.querySelectorAll("input, textarea").forEach(
        (inputEdit) => {
            let sideSaveButton = inputEdit.parentElement.querySelector(".button--save_item")
            inputEdit.oninput = () => {
                if (sideSaveButton != null) {
                    sideSaveButton.disabled = inputEdit.materialComponent.value == inputEdit.oldValue || inputEdit.materialComponent.value == ''
                }
                if (inputEdit.required && !buttonLock.unlocked) {
                    inputEdit.materialComponent.valid = String(inputEdit.materialComponent.value).trim() != ''
                }
            }
            inputEdit.onchange = () => {
                if (inputEdit.classList.contains('editable-select')) {
                    let hasMenuItem = false
                    inputEdit.parentElement.querySelectorAll("li").forEach(menuItem => {
                        if (menuItem.innerText.toLowerCase() == inputEdit.value.toLowerCase()) {
                            hasMenuItem = true
                        }
                    })
                    if (!hasMenuItem) {
                        inputEdit.materialComponent.value = ''
                        $(inputEdit).editableSelect("filter")
                    }
                } else {
                    inputEdit.materialComponent.value = String(inputEdit.materialComponent.value).trim()
                    if (inputEdit.required && !buttonLock.unlocked) {
                        inputEdit.materialComponent.valid = inputEdit.materialComponent.value != ''
                    }
                }
            }
        })
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
                    },
                    (err) => {
                        console.error(err)
                    }
                )

                $(select).on("select.editable-select", () => {
                    select.oldValue = select.materialComponent.value
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
                                (snapshot) => {
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
                                },
                                (err) => {
                                    console.error(err)
                                }
                            )
                        }
                    }
                })
            }
            else {
                $(select).on("select.editable-select", () => {
                    select.oldValue = select.materialComponent.value
                })
            }
        })
}

function selectThisItem(selectMenu, itemString) {
    selectMenu.materialComponent.value = ''
    $(selectMenu).editableSelect("filter")
    selectMenu.parentElement.querySelectorAll("li").forEach(selectItem => {
        if (selectItem.innerText == itemString) {
            $(selectMenu).editableSelect("select", $(selectItem))
            $(selectMenu).editableSelect("hide")
        }
    })
}

function loadColumns() {
    setTableOverlayState("loading")

    let enabledColumns = []
    if (localStorage.getItem("enabledColumns") != null) {
        enabledColumns = localStorage.getItem("enabledColumns").split(',')
    } else {
        enabledColumns.push("insuranceRefNo", "insurance", "callDate", "createTime", "createUser", "surnameName", "address", "phone", "status", "birthDate", "provider", "provider2")
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
    if (enabledColumns.includes("createTime")) {
        headerClick("createTime")
    } else {
        headerClick(enabledColumns[enabledColumns.length - 1])
    }
}

function newColumn(column) {
    let th = document.createElement("th")
    th.id = column
    th.innerHTML = translate(columnsJSON[column])
    th.setAttribute("onclick", "headerClick(this.id)")
    let sortIcon = document.createElement("span")
    sortIcon.className = "mdi mdi-unfold-more-horizontal"
    th.appendChild(sortIcon)
    return th
}

inputSearch.oninput = () => {
    var searchQuery = String(inputSearch.materialComponent.value).trim().toLowerCase()

    if (searchQuery != '') {
        buttonClearSearch.disabled = false
        var foundKases = new Array()

        currentKasesSnap.forEach(
            (kase) => {
                if (!foundKases.includes(kase.id)) {
                    if ((String(kase.id) + Object.values(kase.data()).toString().toLowerCase()).includes(searchQuery)) {
                        foundKases.push(kase.id)
                    }
                }
            }
        )
        if (foundKases.length > 0) {
            listKases(currentKasesSnap, foundKases, searchQuery)
        }
        else {
            setTableOverlayState("empty")
        }
    } else {
        clearSearch()
    }
}

function clearSearch() {
    buttonClearSearch.disabled = true
    inputSearch.materialComponent.value = ''
    listKases(currentKasesSnap)
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
    currentKaseID.innerText = new Date().getFullYear().toString().substr(-2) + (Math.floor(Math.random() * (99999 - 10000)) + 10000).toString()
    checkKaseID()
    timer++
}

function buttonCreateClick() {
    dialogEditKase.materialComponent.open()
    titleDialogEditKase.innerText = translate("NEW_CASE")

    timer = 0
    var repeatRandomKaseID = setInterval(randomKaseID, 50)

    if (currentQuery.bd.filters.length != 0) {
        stopCurrentQuery()
    }
    let stop = allKases.onSnapshot(
        (snapshot) => {
            do {
                randomKaseID()
                kaseExists = snapshot.docs.some((item) => item.id === currentKaseID.innerText)

                console.log(currentKaseID.innerText + ":" + kaseExists + " in " + snapshot.docs.length + " Time: " + timer)
            } while (kaseExists)

            stop()
            currentKase = allKases.doc(currentKaseID.innerText)
            checkKaseID()
            clearInterval(repeatRandomKaseID)
            formEditKase.querySelector("#callDate").materialComponent.value = new Date().toJSON().substr(0, 10)
            formEditKase.querySelector("#callTime").materialComponent.value = new Date().toLocaleTimeString().substr(0, 5)
            formEditKase.querySelector("#appointmentDate").materialComponent.value = new Date().toJSON().substr(0, 10)
            formEditKase.querySelector("#appointmentTime").materialComponent.value = new Date().toLocaleTimeString().substr(0, 5)
        },
        (err) => {
            console.error(err)
        }
    )
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
                    inputEdit.readOnly = true
                }
            }
            if (inputEdit.classList.contains("editable-select")) {
                inputEdit.parentElement.querySelector(".mdc-select__dropdown-icon").hidden = false
                inputEdit.parentElement.querySelector(".es-list").hidden = false
                inputEdit.onchange = () => {
                    let hasMenuItem = false
                    inputEdit.parentElement.querySelectorAll("li").forEach(menuItem => {
                        if (menuItem.innerText.toLowerCase() == inputEdit.value.toLowerCase()) {
                            hasMenuItem = true
                        }
                    })
                    if (!hasMenuItem) {
                        inputEdit.materialComponent.value = ''
                        $(inputEdit).editableSelect("filter")
                    }
                }
            }
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
            sideButton.onclick = () => {
                if (sideButton.classList.contains("button--add_select_item")) {
                    sideButton.classList.remove("button--add_select_item")
                    sideButtonIcon.classList.remove("mdi-plus")
                    sideButtonIcon.classList.remove("mdi-rotate-180")
                    sideButtonIcon.classList.add("mdi-content-save")
                    sideButton.classList.add("button--save_item")

                    inputEdit.parentElement.querySelector(".mdc-select__dropdown-icon").hidden = true
                    inputEdit.parentElement.querySelector(".es-list").hidden = true
                    inputEdit.materialComponent.value = ''
                    inputEdit.materialComponent.valid = true
                    inputEdit.onchange = null

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

                        inputEdit.parentElement.querySelector(".mdc-select__dropdown-icon").hidden = false
                        inputEdit.parentElement.querySelector(".es-list").hidden = false
                        inputEdit.onchange = () => {
                            let hasMenuItem = false
                            inputEdit.parentElement.querySelectorAll("li").forEach(menuItem => {
                                if (menuItem.innerText.toLowerCase() == inputEdit.value.toLowerCase()) {
                                    hasMenuItem = true
                                }
                            })
                            if (!hasMenuItem) {
                                inputEdit.materialComponent.value = ''
                                $(inputEdit).editableSelect("filter")
                            }
                        }
                    }
                }
            }
        })
    }
}

function editKase() {
    clearKase(true)
    dialogEditKase.materialComponent.open()
    titleDialogEditKase.innerText = translate("CASE_EDIT")
    buttonDelete.disabled = false
    currentKase = allKases.doc(currentKaseSnap.id)
    currentKaseID.innerText = currentKaseSnap.id
    checkKaseID()
    kaseExists = true

    formEditKase.querySelectorAll("input, textarea").forEach((inputEdit) => {
        let itemValue = currentKaseSnap.get(inputEdit.id)

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
            kaseData.updateUser = firebase.auth().currentUser.email
            kaseData.updateDate = new Date().toJSON().substr(0, 10)
            kaseData.updateTime = new Date().toLocaleTimeString()
            kaseData.status = "active"
            currentKase.set(kaseData)
        }
        clearKase()
    }
}
buttonSave.onclick = saveKase

function deleteKase() {
    dialogDeleteKase.materialComponent.open()
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
        })

    dialogEditKase.materialComponent.close()
    buttonDelete.disabled = true
    buttonSave.disabled = true
    if (dontReload != true) {
        loadKases()
    }
}

function headerClick(headerID) {
    let clickedHeader = tableColumnsList.querySelector("th#" + headerID)
    if (clickedHeader != null) {
        for (let header of tableColumnsList.children) {
            if (header.id != headerID) {
                let sortIcon = header.querySelector("span")

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
            orderKase(headerID, "asc")
            clickedHeaderSortIcon.classList.remove("mdi-rotate-180")
        } else {
            orderKase(headerID, "desc")
            clickedHeaderSortIcon.classList.add("mdi-rotate-180")
        }
    }
}

function loadKases() {
    stopCurrentQuery()
    stopCurrentQuery = currentQuery.onSnapshot(
        (snapshot) => {
            console.log(snapshot)
            listKases(snapshot)
            currentKasesSnap = snapshot
        },
        (err) => {
            console.error(err)
            setTableOverlayState("empty")
        }
    )
}

function listKases(snap, foundKases, searchQuery) {
    if (snap.docs.length > 0) {
        kasesList.innerHTML = ''
        setTableOverlayState("hide")
        snap.forEach((kaseSnap) => {
            if (foundKases == undefined || foundKases.includes(kaseSnap.id)) {
                let tr = document.createElement("tr")
                tr.id = kaseSnap.id
                tr.dataset.status = kaseSnap.get("status")
                tr.ondblclick = () => {
                    currentKaseSnap = kaseSnap
                    editKase()
                }
                tr.oncontextmenu = (mouseEvent) => {
                    currentKaseSnap = kaseSnap
                    currentKase = allKases.doc(kaseSnap.id)
                    contextMenu.style.left = mouseEvent.clientX + "px"
                    contextMenu.style.top = mouseEvent.clientY + "px"
                    contextMenu.materialComponent.setAbsolutePosition(mouseEvent.clientX, mouseEvent.clientY)
                    contextMenu.materialComponent.open = true
                }
                kasesList.appendChild(tr)

                for (let column of tableColumnsList.children) {
                    let td = document.createElement("td")
                    tr.appendChild(td)
                    td.id = column.id
                    switch (td.id) {
                        case "__name__":
                            td.textContent = kaseSnap.id
                            break
                        case "description":
                        case "complaints":
                            td.textContent = td.title = kaseSnap.get(td.id)
                            break
                        default:
                            if (td.id.includes("Date")) {
                                td.textContent = new Date(kaseSnap.get(td.id)).toLocaleDateString()
                            }
                            else {
                                td.textContent = kaseSnap.get(td.id)
                            }
                            break
                    }
                    if (searchQuery != undefined) {
                        td.classList.toggle("found", td.textContent.toLowerCase().includes(searchQuery))
                    }
                }
            }
        })
        orderKase(currentOrder, currentOrderDirection)
    } else {
        setTableOverlayState("empty")
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

function setTableOverlayState(state) {
    switch (state) {
        case "loading":
            tableOverlay.classList.remove("hide")
            tableOverlay.classList.remove("show-headers")
            tableOverlayIcon.classList.add("mdi-loading", "mdi-spin")
            tableOverlayIcon.classList.remove("mdi-emoticon-sad-outline", "mdi-format-columns")
            tableOverlayText.hidden = true
            break
        case "empty":
            tableOverlay.classList.remove("hide")
            tableOverlay.classList.remove("show-headers")
            tableOverlayIcon.classList.add("mdi-emoticon-sad-outline")
            tableOverlayIcon.classList.remove("mdi-loading", "mdi-spin", "mdi-format-columns")
            tableOverlayText.hidden = false
            tableOverlayText.innerText = translate("CASES_NOT_FOUND")
            break
        case "drag":
            tableOverlay.classList.remove("hide")
            tableOverlay.classList.add("show-headers")
            tableOverlayIcon.classList.add("mdi-format-columns")
            tableOverlayIcon.classList.remove("mdi-loading", "mdi-spin", "mdi-emoticon-sad-outline")
            tableOverlayText.hidden = false
            tableOverlayText.innerText = translate("DRAG_AND_DROP")
            break
        case "hide":
            tableOverlay.classList.add("hide")
            break
        default:
            break
    }
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

//#region SortableJS

const Sortable = require("sortablejs")

Sortable.create(tableColumnsList, {
    group: "TableColumns",
    animation: 150,
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    onChange: () => {
        setTableOverlayState("drag")
    },
    onStart: () => {
        setTableOverlayState("drag")
    },
    onEnd: () => {
        listKases(currentKasesSnap)
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
    onEnd: () => {
        listKases(currentKasesSnap)
        let enabledColumns = []
        for (let column of tableColumnsList.children) {
            enabledColumns.push(column.id)
        }
        localStorage.setItem("enabledColumns", enabledColumns)
    }
})

//#endregion

for (let status of statusBar) {
    status.onmouseover = () => {
        if (currentStatus == undefined) {
            for (let kaseRow of kasesList.children) {
                kaseRow.classList.toggle("dimmed", kaseRow.dataset.status != status.dataset.status)
            }
        }
    }
    status.onmouseleave = () => {
        if (currentStatus == undefined) {
            for (let kaseRow of kasesList.children) {
                kaseRow.classList.remove("dimmed")
            }
        }
    }

    status.onclick = () => {
        for (let kaseRow of kasesList.children) {
            kaseRow.classList.remove("dimmed")
        }
        if (status == currentStatus) {
            listKases(currentKasesSnap)

            for (let otherStatus of statusBar) {
                otherStatus.classList.remove("dimmed")
                otherStatus.classList.remove("selected")
            }
            currentStatus = undefined
        }
        else {
            var foundKases = new Array()

            currentKasesSnap.forEach(
                (kase) => {
                    if (!foundKases.includes(kase.id)) {
                        if (kase.get("status") == status.dataset.status) {
                            foundKases.push(kase.id)
                        }
                    }
                }
            )
            if (foundKases.length > 0) {
                listKases(currentKasesSnap, foundKases)
            }
            else {
                setTableOverlayState("empty")
            }

            for (let otherStatus of statusBar) {
                otherStatus.classList.toggle("dimmed", otherStatus != status)
                otherStatus.classList.toggle("selected", otherStatus == status)
            }
            currentStatus = status
        }
    }
}

//#region Filter

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
                inputFilter.onchange = () => {
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
        setTableOverlayState("loading")
        loadKases()
        buttonClearFilter.disabled = false
    }
    else {
        alert(translate("EMPTY_FILTERS"))
    }
}

buttonClearFilter.onclick = () => {
    formFilter.querySelectorAll("input, textarea").forEach(
        (inputFilter) => {
            inputFilter.materialComponent.value = ''
            inputFilter.onchange = () => {
                inputFilter.materialComponent.value = String(inputFilter.materialComponent.value).trim()
            }
        }
    )
    for (let column of tableColumnsList.children) {
        column.setAttribute("onclick", "headerClick(this.id)")
        column.classList.remove("invalid")
    }
    currentQuery = allKases
    setTableOverlayState("loading")
    loadKases()
    hideEmptyFilters()

    buttonClearFilter.disabled = true
}

//#endregion

//#region Update

const { ipcRenderer } = require("electron")
const dialogUpdate = document.querySelector("#dialogUpdate")
dialogUpdate.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == "install") {
        ipcRenderer.send("install-update")
    }
})

ipcRenderer.on("update-downloaded", (event, updateInfo, currentVersion) => {
    dialogUpdate.querySelector("input#currentVersion").materialComponent.value = currentVersion
    dialogUpdate.querySelector("input#newVersion").materialComponent.value = updateInfo.version
    dialogUpdate.materialComponent.open()
})

//#endregion

//#region Login

firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        loadKases()
    } else {
        dialogLogin.materialComponent.open()
    }
})

const dialogLogin = document.querySelector("#dialogLogin")
dialogLogin.materialComponent.scrimClickAction = ''
dialogLogin.materialComponent.escapeKeyAction = ''

const inputEmail = dialogLogin.querySelector("input#email")
const inputPassword = dialogLogin.querySelector("input#password")
const buttonPasswordVisibility = dialogLogin.querySelector("button#passwordVisibility")
const iconPasswordVisibility = dialogLogin.querySelector("button#passwordVisibility>.mdi")

function signIn() {
    firebase.auth().signInWithEmailAndPassword(inputEmail.materialComponent.value, inputPassword.materialComponent.value)
        .then(() => {
            dialogLogin.materialComponent.close()
        }).catch((error) => {
            if (error != null) {
                alert(error.message)
                return
            }
        })
}

buttonPasswordVisibility.onclick = () => {
    if (inputPassword.type == "password") {
        inputPassword.type = "text"
        iconPasswordVisibility.classList.add("mdi-eye-outline")
        iconPasswordVisibility.classList.remove("mdi-eye-off-outline")
    }
    else {
        inputPassword.type = "password"
        iconPasswordVisibility.classList.remove("mdi-eye-outline")
        iconPasswordVisibility.classList.add("mdi-eye-off-outline")
    }
}

//#endregion

//#region Window Maximize

const maximizeIcon = document.querySelector(".window-action>.mdi-window-maximize")

ipcRenderer.on("window-action", (event, action) => {
    switch (action) {
        case "maximize":
            maximizeIcon.classList.remove("mdi-window-maximize")
            maximizeIcon.classList.add("mdi-window-restore")
            break
        case "unmaximize":
            maximizeIcon.classList.add("mdi-window-maximize")
            maximizeIcon.classList.remove("mdi-window-restore")
            break
        default:
            break
    }
})

//#endregion