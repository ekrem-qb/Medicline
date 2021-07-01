const inputSearch = document.querySelector("input#search")
const buttonClearSearch = document.querySelector("button#clearSearch")

const tableOverlay = document.querySelector("#tableOverlay")
const tableOverlayIcon = tableOverlay.querySelector(".mdi")
const tableOverlayText = tableOverlay.querySelector("h3")
const columnsJSON = require("./columns.json")
const tableColumnsList = document.querySelector("#tableColumnsList")
const casesList = document.querySelector("#casesList")
var currentOrder, currentOrderDirection

const hiddenTableColumnsList = document.querySelector("#hiddenTableColumnsList")

const formFilter = document.querySelector("form#filter")
const buttonClearFilter = document.querySelector("button#clearFilter")

const statusBar = document.querySelector("#statusBar").children
var currentStatus

const dialogEditCase = document.querySelector("#dialogEditCase")
dialogEditCase.materialComponent.scrimClickAction = ''
dialogEditCase.materialComponent.escapeKeyAction = ''
dialogEditCase.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == "cancel") {
        clearCase()
    }
})
const buttonLock = dialogEditCase.querySelector("button#lock")
const titleDialogEditCase = dialogEditCase.querySelector("#titleDialogEditCase")
const formEditCase = dialogEditCase.querySelector("form#editCase")
const buttonSave = dialogEditCase.querySelector("button#save")
const currentCaseID = dialogEditCase.querySelector("#currentCaseID")
currentCaseID.parentElement.onclick = () => {
    navigator.clipboard.writeText(currentCaseID.innerText)
    alert(currentCaseID.innerText + translate("COPIED"))
}

const buttonDelete = dialogEditCase.querySelector("button#delete")

const dialogDeleteCase = document.querySelector("#dialogDeleteCase")
dialogDeleteCase.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == "delete") {
        currentCase.delete()
        clearCase()
    }
})

const allCases = db.collection("cases")
var currentQuery = db.collection("cases")
var searchQuery
var foundCases
var currentCasesSnap, currentCaseSnap
var currentCase, caseExists = false
var stopCurrentQuery = () => { }
var stopAvailableIDSearch = () => { }
const contextMenu = document.querySelector("#contextMenu")
contextMenu.materialComponent.listen("close", () => {
    currentCase = undefined
})


const snackbar = document.querySelector("#snackbar")
function alert(message) {
    snackbar.materialComponent.close()
    snackbar.materialComponent.labelText = message
    snackbar.materialComponent.open()
}

clearCase()
loadInputs()
loadColumns()

function pageLoaded() {
    formFilter.querySelector("#createDate-min").value = new Date().toLocaleDateString("tr")
    applyFilter()
    hideEmptyFilters()
}

function loadInputs() {
    formEditCase.querySelectorAll('input, textarea').forEach(
        (inputEdit) => {
            let sideSaveButton = inputEdit.parentElement.querySelector(".button--save_item")
            inputEdit.oninput = () => {
                if (sideSaveButton != null) {
                    sideSaveButton.disabled = inputEdit.value == inputEdit.oldValue || inputEdit.value == ''
                }
                if (inputEdit.required && !buttonLock.unlocked) {
                    inputEdit.valid = String(inputEdit.value).trim() != ''
                }
            }
            inputEdit.onchange = () => {
                inputEdit.value = String(inputEdit.value).trim()
                if (inputEdit.required && !buttonLock.unlocked) {
                    inputEdit.valid = inputEdit.value != ''
                }
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

function refreshSearch() {
    searchQuery = String(inputSearch.materialComponent.value).trim().toLowerCase()

    if (searchQuery != '') {
        buttonClearSearch.disabled = false
        foundCases = new Array()

        currentCasesSnap.forEach(
            (_case) => {
                if (!foundCases.includes(_case.id)) {
                    if ((String(_case.id) + Object.values(_case.data()).toString().toLowerCase()).includes(searchQuery)) {
                        foundCases.push(_case.id)
                    }
                }
            }
        )
        if (foundCases.length > 0) {
            listCases(currentCasesSnap, foundCases, searchQuery)
        }
        else {
            setTableOverlayState("empty")
        }
    } else {
        clearSearch()
    }
}

inputSearch.oninput = refreshSearch

function clearSearch() {
    buttonClearSearch.disabled = true
    inputSearch.materialComponent.value = ''
    listCases(currentCasesSnap)
}

function checkCaseID() {
    // if (!buttonLock.unlocked)
    buttonSave.disabled = currentCase == undefined

    currentCaseID.parentElement.disabled = currentCase == undefined
    let idIcon = currentCaseID.parentElement.querySelector(".mdi")
    idIcon.classList.toggle("mdi-pound", currentCase != undefined)
    idIcon.classList.toggle("mdi-loading", currentCase == undefined)
    idIcon.classList.toggle("mdi-spin", currentCase == undefined)

    if (currentCase == undefined)
        currentCaseID.parentElement.parentElement.title = "Generating available ID..."
    else
        currentCaseID.parentElement.parentElement.title = ''
}

var timer = 0

function randomCaseID() {
    currentCaseID.innerText = new Date().getFullYear().toString().substr(-2) + (Math.floor(Math.random() * (99999 - 10000)) + 10000).toString()
    checkCaseID()
    timer++
}

function buttonCreateClick() {
    dialogEditCase.materialComponent.open()
    titleDialogEditCase.innerText = translate("NEW_CASE")

    timer = 0
    var repeatRandomCaseID = setInterval(randomCaseID, 50)

    stopAvailableIDSearch = allCases.onSnapshot(
        (snapshot) => {
            do {
                randomCaseID()
                caseExists = snapshot.docs.some((item) => item.id === currentCaseID.innerText)

                console.log(currentCaseID.innerText + ":" + caseExists + " in " + snapshot.docs.length + " Time: " + timer)
            } while (caseExists)

            currentCase = allCases.doc(currentCaseID.innerText)
            checkCaseID()
            clearInterval(repeatRandomCaseID)
            formEditCase.querySelector("#callDate").value = new Date().toLocaleDateString("tr")
            formEditCase.querySelector("#callTime").value = new Date().toLocaleTimeString().substr(0, 5)
            formEditCase.querySelector("#appointmentDate").value = new Date().toLocaleDateString("tr")
            formEditCase.querySelector("#appointmentTime").value = new Date().toLocaleTimeString().substr(0, 5)
        },
        (err) => {
            console.error(err)
        }
    )
}

function buttonLockClick() {
    //     buttonLock.classList.toggle("mdc-button--green", !buttonLock.unlocked)
    //     buttonLock.querySelector(".mdc-fab__icon").classList.toggle("mdi-lock", buttonLock.unlocked)
    //     buttonLock.querySelector(".mdc-fab__icon").classList.toggle("mdi-lock-open-variant", !buttonLock.unlocked)
    //     buttonLock.querySelector(".mdc-fab__icon").classList.toggle("mdi-flip-h", !buttonLock.unlocked)

    //     if (buttonLock.unlocked) {
    //         buttonLock.unlocked = false

    //         if (currentCase != undefined)
    //             buttonSave.disabled = false

    //         formEditCase.querySelectorAll(".button--add_select_item, .button--save_item").forEach(sideButton => {
    //             sideButton.hidden = true
    //             let sideButtonIcon = sideButton.querySelector(".mdi")

    //             let inputEdit = sideButton.parentElement.querySelector("input")
    //             if (sideButton.classList.contains("button--save_item")) {
    //                 if (inputEdit.classList.contains("editable-select")) {
    //                     sideButton.classList.add("button--add_select_item")
    //                     sideButtonIcon.classList.add("mdi-plus")
    //                     sideButtonIcon.classList.add("mdi-rotate-180")
    //                     sideButtonIcon.classList.remove("mdi-content-save")
    //                     sideButton.classList.remove("button--save_item")
    //                     if (inputEdit.oldValue != undefined) {
    //                         selectThisItem(inputEdit, inputEdit.oldValue)
    //                     }
    //                 } else {
    //                     inputEdit.disabled = true
    //                     inputEdit.readOnly = true
    //                 }
    //             }
    //             if (inputEdit.classList.contains("editable-select")) {
    //                 inputEdit.parentElement.querySelector(".mdc-select__dropdown-icon").hidden = false
    //                 inputEdit.parentElement.querySelector(".es-list").hidden = false
    //                 inputEdit.onchange = () => {
    //                     let hasMenuItem = false
    //                     inputEdit.parentElement.querySelectorAll("li").forEach(menuItem => {
    //                         if (menuItem.innerText.toLowerCase() == inputEdit.value.toLowerCase()) {
    //                             hasMenuItem = true
    //                         }
    //                     })
    //                     if (!hasMenuItem) {
    //                         inputEdit.value = ''
    //                         $(inputEdit).editableSelect("filter")
    //                     }
    //                 }
    //             }
    //         })
    //     } else {
    //         buttonLock.unlocked = true

    //         buttonSave.disabled = true

    //         formEditCase.querySelectorAll(".button--add_select_item, .button--save_item").forEach(sideButton => {
    //             sideButton.hidden = false

    //             let inputEdit = sideButton.parentElement.querySelector("input")
    //             let inputEditID = inputEdit.id.replace(/[0-9]/g, '')

    //             if (sideButton.classList.contains("button--save_item")) {
    //                 if (inputEdit.oldValue != undefined) {
    //                     inputEdit.disabled = false
    //                     inputEdit.readOnly = false
    //                 }
    //             }

    //             let sideButtonIcon = sideButton.querySelector(".mdi")
    //             sideButton.onclick = () => {
    //                 if (sideButton.classList.contains("button--add_select_item")) {
    //                     sideButton.classList.remove("button--add_select_item")
    //                     sideButtonIcon.classList.remove("mdi-plus")
    //                     sideButtonIcon.classList.remove("mdi-rotate-180")
    //                     sideButtonIcon.classList.add("mdi-content-save")
    //                     sideButton.classList.add("button--save_item")

    //                     inputEdit.parentElement.querySelector(".mdc-select__dropdown-icon").hidden = true
    //                     inputEdit.parentElement.querySelector(".es-list").hidden = true
    //                     inputEdit.value = ''
    //                     inputEdit.valid = true
    //                     inputEdit.onchange = null

    //                     let subElements = inputEdit.parentElement.parentElement.querySelectorAll("input")
    //                     subElements.forEach(subElement => {
    //                         subElementID = subElement.id.replace(/[0-9]/g, '')
    //                         if (subElement != inputEdit && subElementID.split('_')[0] == inputEditID) {
    //                             subElement.disabled = true
    //                             subElement.value = ''
    //                         }
    //                     })
    //                 } else {
    //                     if (inputEditID.includes('_')) {
    //                         let parentSelect = inputEdit.parentElement.parentElement.querySelector("input")
    //                         let data = new Object()
    //                         data[inputEdit.value] = ''
    //                         if (inputEdit.classList.contains("editable-select")) {
    //                             db.collection(inputEditID.split('_')[0]).doc(parentSelect.value).update(data)
    //                         } else {
    //                             db.collection(inputEditID.split('_')[0]).doc(parentSelect.value).set(data)
    //                         }
    //                     } else {
    //                         db.collection(inputEditID).doc(inputEdit.value).set({})
    //                     }

    //                     if (inputEdit.classList.contains("editable-select")) {
    //                         sideButton.classList.add("button--add_select_item")
    //                         sideButtonIcon.classList.add("mdi-plus")
    //                         sideButtonIcon.classList.add("mdi-rotate-180")
    //                         sideButtonIcon.classList.remove("mdi-content-save")
    //                         sideButton.classList.remove("button--save_item")

    //                         inputEdit.parentElement.querySelector(".mdc-select__dropdown-icon").hidden = false
    //                         inputEdit.parentElement.querySelector(".es-list").hidden = false
    //                         inputEdit.onchange = () => {
    //                             let hasMenuItem = false
    //                             inputEdit.parentElement.querySelectorAll("li").forEach(menuItem => {
    //                                 if (menuItem.innerText.toLowerCase() == inputEdit.value.toLowerCase()) {
    //                                     hasMenuItem = true
    //                                 }
    //                             })
    //                             if (!hasMenuItem) {
    //                                 inputEdit.value = ''
    //                                 $(inputEdit).editableSelect("filter")
    //                             }
    //                         }
    //                     }
    //                 }
    //             }
    //         })
    //     }
}

function editCase() {
    clearCase()
    dialogEditCase.materialComponent.open()
    titleDialogEditCase.innerText = translate("CASE_EDIT")
    buttonDelete.disabled = false
    currentCase = allCases.doc(currentCaseSnap.id)
    currentCaseID.innerText = currentCaseSnap.id
    checkCaseID()
    caseExists = true

    formEditCase.querySelectorAll('input, textarea').forEach(inputEdit => {
        let itemValue = currentCaseSnap.get(inputEdit.id)

        if (itemValue != undefined) {
            if (inputEdit.disabled) {
                if (itemValue != '') {
                    inputEdit.parentElement.parentElement.hidden = false
                }
            } else {
                inputEdit.parentElement.parentElement.hidden = false
            }

            if (!inputEdit.parentElement.parentElement.hidden) {
                if (inputEdit.getAttribute("mask") == "date") {
                    inputEdit.value = new Date(itemValue).toLocaleDateString("tr")
                }
                else {
                    inputEdit.value = itemValue
                }
            }
        }
    })

    formEditCase.querySelectorAll('select').forEach(select => {
        if (currentCaseSnap.get(select.id) != undefined) {
            let itemValue = currentCaseSnap.get(select.id).path

            if (itemValue != undefined) {
                if (select.id.includes('_')) {
                    setTimeout(() => select.tomSelect.addItem(itemValue), 50)
                }
                else {
                    select.tomSelect.addItem(itemValue)
                }
            }
        }
    })
}

function saveCase() {
    let caseData = new Object()
    let valid = true

    formEditCase.querySelectorAll('input, textarea').forEach(inputEdit => {
        if (inputEdit != undefined) {
            if (inputEdit.value == '') {
                if (inputEdit.required) {
                    inputEdit.valid = false
                    valid = false
                }
            }
            else if (!inputEdit.disabled && !inputEdit.readOnly) {
                if (inputEdit.mask != undefined) {
                    caseData[inputEdit.id] = inputEdit.mask.unmaskedvalue()
                }
                else {
                    caseData[inputEdit.id] = inputEdit.value
                }
            }
        }
    })

    formEditCase.querySelectorAll('select').forEach(select => {
        if (select != undefined) {
            if (select.tomSelect.getValue() == '') {
                if (select.required) {
                    select.valid = false
                    valid = false
                }
            }
            else {
                caseData[select.id] = db.doc(select.tomSelect.getValue())
            }
        }
    })

    console.log(caseData)

    if (valid) {
        if (caseExists) {
            caseData.updateUser = firebase.auth().currentUser.email
            caseData.updateDate = new Date().toJSON().substr(0, 10)
            caseData.updateTime = new Date().toLocaleTimeString().substr(0, 5)
            currentCase.update(caseData)
        } else {
            caseData.createUser = firebase.auth().currentUser.email
            caseData.createDate = new Date().toJSON().substr(0, 10)
            caseData.createTime = new Date().toLocaleTimeString().substr(0, 5)
            caseData.status = "active"
            currentCase.set(caseData)
        }
        clearCase()
    }
}
buttonSave.onclick = saveCase

function deleteCase() {
    dialogDeleteCase.materialComponent.open()
}
buttonDelete.onclick = deleteCase

function clearCase() {
    stopAvailableIDSearch()
    currentCase = undefined
    // buttonLock.unlocked = true
    // buttonLockClick()

    formEditCase.querySelectorAll('input, textarea').forEach(inputEdit => {
        // let sideSaveButton = inputEdit.parentElement.querySelector(".button--save_item")
        // if (sideSaveButton != null) {
        //     sideSaveButton.disabled = true
        // }

        inputEdit.value = ''
        inputEdit.valid = true

        if (inputEdit.id.includes('_')) {
            inputEdit.disabled = true
        }
        else {
            inputEdit.parentElement.parentElement.hidden = inputEdit.disabled
        }
    })

    formEditCase.querySelectorAll('select').forEach(select => {
        if (!select.id.includes('_')) {
            select.tomSelect.removeItem(select.tomSelect.getValue())
        }
    })

    dialogEditCase.materialComponent.close()
    buttonDelete.disabled = true
    buttonSave.disabled = true
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
            orderCase(headerID, "asc")
            clickedHeaderSortIcon.classList.remove("mdi-rotate-180")
        } else {
            orderCase(headerID, "desc")
            clickedHeaderSortIcon.classList.add("mdi-rotate-180")
        }
    }
}

function loadCases() {
    stopCurrentQuery()
    stopCurrentQuery = currentQuery.onSnapshot(
        (snapshot) => {
            console.log(snapshot)
            listCases(snapshot)
            currentCasesSnap = snapshot
        },
        (err) => {
            console.error(err)
            setTableOverlayState("empty")
        }
    )
}

function listCases(snap, foundCases, searchQuery) {
    if (snap.docs.length > 0) {
        casesList.innerHTML = ''
        setTableOverlayState("hide")
        snap.forEach((caseSnap) => {
            if (foundCases == undefined || foundCases.includes(caseSnap.id)) {
                let tr = document.createElement("tr")
                tr.id = caseSnap.id
                tr.dataset.status = caseSnap.get("status")
                tr.ondblclick = () => {
                    currentCaseSnap = caseSnap
                    editCase()
                }
                tr.oncontextmenu = (mouseEvent) => {
                    currentCaseSnap = caseSnap
                    currentCase = allCases.doc(caseSnap.id)
                    contextMenu.style.left = mouseEvent.clientX + "px"
                    contextMenu.style.top = mouseEvent.clientY + "px"
                    contextMenu.materialComponent.setAbsolutePosition(mouseEvent.clientX, mouseEvent.clientY)
                    contextMenu.materialComponent.open = true
                }
                casesList.appendChild(tr)

                for (let column of tableColumnsList.children) {
                    let td = document.createElement("td")
                    tr.appendChild(td)
                    td.id = column.id

                    if (td.id == "__name__") {
                        td.textContent = caseSnap.id
                    }
                    else {
                        let value = caseSnap.get(td.id)
                        if (value != undefined) {
                            if (typeof value === "object" && value !== null) {
                                value.onSnapshot(
                                    (snapshot) => {
                                        td.textContent = snapshot.get('name')
                                    },
                                    (err) => {
                                        console.error(err)
                                    }
                                )
                            } else {
                                switch (td.id) {
                                    case "description":
                                    case "complaints":
                                        td.textContent = td.title = value
                                        break
                                    default:
                                        if (td.id.includes("Date")) {
                                            td.textContent = new Date(value).toLocaleDateString("tr")
                                        }
                                        else {
                                            td.textContent = value
                                        }
                                        break
                                }
                            }
                        }
                    }

                    if (searchQuery != undefined) {
                        td.classList.toggle("found", td.textContent.toLowerCase().includes(searchQuery))
                    }
                }
            }
        })
    } else {
        setTableOverlayState("empty")
    }
}

function orderCase(orderBy, orderDirection) {
    let switching, i, shouldSwitch, switchcount = 0
    do {
        switching = false
        let rows = casesList.children
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
            tableOverlayIcon.classList.remove("mdi-emoticon-sad-outline", "mdi-archive-arrow-up-outline")
            tableOverlayText.hidden = true
            break
        case "empty":
            tableOverlay.classList.remove("hide")
            tableOverlay.classList.remove("show-headers")
            tableOverlayIcon.classList.add("mdi-emoticon-sad-outline")
            tableOverlayIcon.classList.remove("mdi-loading", "mdi-spin", "mdi-archive-arrow-up-outline")
            tableOverlayText.hidden = false
            tableOverlayText.innerText = translate("CASES_NOT_FOUND")
            break
        case "drag":
            tableOverlay.classList.remove("hide")
            tableOverlay.classList.add("show-headers")
            tableOverlayIcon.classList.add("mdi-archive-arrow-up-outline")
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

function changeCaseStatus(newStatus) {
    let caseData = new Object()
    caseData.status = newStatus
    currentCase.update(caseData)

    currentCase = undefined
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

for (let status of statusBar) {
    status.onmouseover = () => {
        if (currentStatus == undefined) {
            for (let caseRow of casesList.children) {
                caseRow.classList.toggle("dimmed", caseRow.dataset.status != status.dataset.status)
            }
        }
    }
    status.onmouseleave = () => {
        if (currentStatus == undefined) {
            for (let caseRow of casesList.children) {
                caseRow.classList.remove("dimmed")
            }
        }
    }

    status.onclick = () => {
        for (let caseRow of casesList.children) {
            caseRow.classList.remove("dimmed")
        }
        if (status == currentStatus) {
            listCases(currentCasesSnap)

            for (let otherStatus of statusBar) {
                otherStatus.classList.remove("dimmed")
                otherStatus.classList.remove("selected")
            }
            currentStatus = undefined
        }
        else {
            var foundCases = new Array()

            currentCasesSnap.forEach(
                (_case) => {
                    if (!foundCases.includes(_case.id)) {
                        if (_case.get("status") == status.dataset.status) {
                            foundCases.push(_case.id)
                        }
                    }
                }
            )
            if (foundCases.length > 0) {
                listCases(currentCasesSnap, foundCases)
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
    for (let filter of formFilter.children) {
        let collapsed = true
        filter.querySelectorAll('input, textarea').forEach(inputFilter => {
            inputFilter.onchange = () => {
                inputFilter.value = String(inputFilter.value).trim()
            }
            if (String(inputFilter.value).trim() != '') {
                collapsed = false
                hide = false
                return
            }
        })
        filter.querySelectorAll('select').forEach(select => {
            if (select.tomSelect.getValue() != '') {
                collapsed = false
                hide = false
                return
            }
        })
        filter.classList.toggle("collapsed", collapsed && formFilter.classList.contains("collapsed"))
    }
    if (formFilter.classList.contains("collapsed")) {
        formFilter.classList.toggle("hide", hide)
    }
    else {
        formFilter.classList.remove("hide")
    }

}

function applyFilter() {
    let emptyFilter = true
    currentQuery = allCases

    formFilter.querySelectorAll('input, textarea').forEach(inputFilter => {
        if (inputFilter.value != '') {
            if (inputFilter.id.split('-')[0] == 'createDate') {
                emptyFilter = false

                let value = inputFilter.value

                if (inputFilter.mask != undefined) {
                    value = inputFilter.mask.unmaskedvalue();
                }

                switch (inputFilter.id.split('-')[1]) {
                    case "min":
                        currentQuery = currentQuery.where(inputFilter.id.split('-')[0], ">=", value)
                        break
                    case "max":
                        currentQuery = currentQuery.where(inputFilter.id.split('-')[0], "<=", value)
                        break
                    default:
                        currentQuery = currentQuery.where(inputFilter.id, "==", value)
                        break
                }
            }
        }
    })
    formFilter.querySelectorAll('select').forEach(select => {
        if (select.tomSelect.getValue() != '') {
            emptyFilter = false

            // currentQuery = currentQuery.where(select.id, "==", db.doc(select.tomSelect.getValue()))
        }
    })
    if (!emptyFilter) {
        buttonClearFilter.disabled = false
        setTableOverlayState("loading")
        loadCases()
    }
    else {
        alert(translate("EMPTY_FILTERS"))
    }
}

buttonClearFilter.onclick = () => {
    formFilter.querySelectorAll('input, textarea').forEach(inputFilter => {
        if (inputFilter.value != '') {
            inputFilter.value = ''
        }
    })
    formFilter.querySelectorAll('select').forEach(select => {
        if (!select.id.includes('_')) {
            if (select.tomSelect.getValue() != '') {
                select.tomSelect.removeItem(select.tomSelect.getValue())
            }
        }
    })
    buttonClearFilter.disabled = true
    hideEmptyFilters()
    currentQuery = allCases
    setTableOverlayState("loading")
    loadCases()
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
        loadCases()
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

const maximizeIcon = document.querySelector(".window-action>svg.maximize")
const dragArea = document.querySelector(".drag-area")

ipcRenderer.on("window-action", (event, action) => {
    switch (action) {
        case "maximize":
            maximizeIcon.classList.remove("maximize")
            maximizeIcon.classList.add("restore")
            dragArea.classList.remove("ms-1", "mt-1")
            break
        case "unmaximize":
            maximizeIcon.classList.add("maximize")
            maximizeIcon.classList.remove("restore")
            dragArea.classList.add("ms-1", "mt-1")
            break
    }
})

//#endregion
