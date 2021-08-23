const selectInstitutionType = document.getElementById('institutionType')
selectInstitutionType.materialComponent.listen('MDCSelect:change', () => {
    labelButtonNew.textContent = translate('NEW#' + selectInstitutionType.materialComponent.value.toUpperCase())
})
const buttonNew = document.querySelector('button#new')
buttonNew.onclick = () => {
    ipcRenderer.send('new-window', 'institution')
}
const labelButtonNew = buttonNew.querySelector('.mdc-button__label')

const inputSearch = document.querySelector("input#search")
const buttonClearSearch = document.querySelector("button#clearSearch")

const tableOverlay = document.querySelector("#tableOverlay")
const tableOverlayIcon = tableOverlay.querySelector(".mdi")
const tableOverlayText = tableOverlay.querySelector("h3")

const institutionsTable = document.querySelector("table#institutions")
const institutionsList = institutionsTable.querySelector("tbody#institutionsList")
let currentOrder, currentOrderDirection

const columnsJSON = require("./institutionColumns.json")
const tableColumnsList = institutionsTable.querySelector("#tableColumnsList")
const hiddenTableColumnsList = document.querySelector("#hiddenTableColumnsList")

const formFilter = document.querySelector("form#filter")
const buttonClearFilter = document.querySelector("button#clearFilter")

const statusBar = document.querySelector("#statusBar")
let selectedStatus

let currentQuery = db.collection("institutions")
let searchQuery
let foundinstitutions
let currentinstitutionsSnap
let stopCurrentQuery = () => { }
let currentRefQueries = []
let selectedCase, selectedCaseRow, selectedCaseID
let filters = {}

const contextMenu = document.getElementById('contextMenu')
const copyOption = document.getElementById('copy')

const dialogDeleteCase = document.querySelector("#dialogDeleteCase")
dialogDeleteCase.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == "delete") {
        selectedCase.delete().then(() => {
            selectedCase = undefined
            selectedCaseID = undefined
        }).catch(error => {
            console.error("Error removing case: ", error)
        })
    }
})

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        loadSelectMenus()
        if (Object.entries(filters).length == 0) {
            formFilter.querySelector("#createDate-min").value = new Date().toLocaleDateString('tr')
            applyFilter()
            hideEmptyFilters()
        }
    }
    else {
        stopCurrentQuery()
        currentRefQueries.forEach(stopRefQuery => stopRefQuery())
        selectMenuQueries.forEach(stopQuery => stopQuery())
    }
})

function newColumn(column) {
    const th = document.createElement('th')
    th.classList.add('mdc-ripple-surface')
    th.materialRipple = new MDCRipple(th)
    th.id = column
    th.innerHTML = translate(columnsJSON[column])
    th.onmousedown = mouseEvent => {
        if (mouseEvent.button == 0) {
            if (th.parentElement != tableColumnsList) {
                setTableOverlayState('drag')
            }
        }
    }
    th.onmouseup = () => {
        if (th.parentElement != tableColumnsList) {
            if (institutionsList.childElementCount > 0) {
                setTableOverlayState('hide')
            }
            else {
                setTableOverlayState("empty")
            }
        }
    }
    th.onclick = () => {
        if (th.parentElement != hiddenTableColumnsList) {
            headerClick(column)
        }
    }

    const sortIcon = document.createElement('i')
    sortIcon.classList.add('mdi', 'mdi-unfold-more-horizontal')
    th.appendChild(sortIcon)
    th.sortIcon = sortIcon

    return th
}

function loadColumns() {
    setTableOverlayState("loading")

    let enabledColumns = []
    if (localStorage.getItem("enabledColumns") != null) {
        enabledColumns = localStorage.getItem("enabledColumns").split(',')
    }
    else {
        enabledColumns.push("insuranceRefNo", "insurance", "callDate", "createTime", "createUser", "surnameName", "address", "phone", "status", "birthDate", "provider", "provider2")
    }
    enabledColumns.forEach(
        column => {
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
    }
    else {
        headerClick(enabledColumns[enabledColumns.length - 1])
    }
}

loadColumns()

function refreshSearch() {
    setTableOverlayState("loading")
    searchQuery = String(inputSearch.materialComponent.value).trim().toLowerCase()

    if (searchQuery != '') {
        buttonClearSearch.disabled = false
        foundinstitutions = new Array()
        let casePromises = []

        currentinstitutionsSnap.forEach(_case => {
            if (!foundinstitutions.includes(_case.id)) {
                let data = String(_case.id)
                let valuePromises = []
                Object.values(_case.data()).forEach(value => {
                    if (typeof value === "object" && value !== null) {
                        valuePromises.push(value.get())
                    }
                    else {
                        data += " -- " + value.toString().toLowerCase()
                    }
                })
                if (valuePromises.length > 0) {
                    casePromises.push(
                        Promise.all(valuePromises).then(values => {
                            values.forEach(snaphot => {
                                data += " -- " + snaphot.get('name').toString().toLowerCase()
                            })
                            if (data.includes(searchQuery)) {
                                foundinstitutions.push(_case.id)
                            }
                        })
                    )
                }
                else {
                    if (data.includes(searchQuery)) {
                        foundinstitutions.push(_case.id)
                    }
                }
            }
        })

        if (casePromises.length > 0) {
            Promise.all(casePromises).then(institutions => {
                if (foundinstitutions.length > 0) {
                    listinstitutions(currentinstitutionsSnap)
                }
                else {
                    setTableOverlayState("empty")
                }
            })
        }
        else {
            if (foundinstitutions.length > 0) {
                listinstitutions(currentinstitutionsSnap)
            }
            else {
                setTableOverlayState("empty")
            }
        }
    }
    else {
        clearSearch()
    }
}

inputSearch.oninput = refreshSearch

function clearSearch() {
    buttonClearSearch.disabled = true
    inputSearch.materialComponent.value = ''
    searchQuery = undefined
    foundinstitutions = undefined
    listinstitutions(currentinstitutionsSnap)
}

function headerClick(headerID) {
    const clickedHeader = tableColumnsList.querySelector('th#' + headerID)
    if (clickedHeader) {
        const otherHeaderIcon = tableColumnsList.querySelector('.mdi-chevron-up')
        if (otherHeaderIcon) {
            if (otherHeaderIcon.parentElement != clickedHeader) {
                otherHeaderIcon.classList.remove('mdi-chevron-up')
                otherHeaderIcon.classList.remove('mdi-rotate-180')
                otherHeaderIcon.classList.add('mdi-unfold-more-horizontal')
            }
        }

        if (clickedHeader.sortIcon.classList.contains('mdi-unfold-more-horizontal')) {
            clickedHeader.sortIcon.classList.remove('mdi-unfold-more-horizontal')
            clickedHeader.sortIcon.classList.add('mdi-chevron-up')
        }

        if (clickedHeader.sortIcon.classList.contains('mdi-rotate-180')) {
            orderinstitutions(headerID, 'asc')
        }
        else {
            orderinstitutions(headerID, 'desc')
        }

        clickedHeader.sortIcon.classList.toggle('mdi-rotate-180')
    }
}

function loadinstitutions() {
    stopCurrentQuery()
    stopCurrentQuery = currentQuery.onSnapshot(
        snapshot => {
            console.log(snapshot)
            listinstitutions(snapshot)
            currentinstitutionsSnap = snapshot
        },
        error => {
            console.error("Error getting institutions: " + error)
            setTableOverlayState("empty")
        }
    )
}

function listinstitutions(snap) {
    if (snap.docs.length > 0) {
        let noOneFound = true

        institutionsList.innerHTML = ''
        currentRefQueries.forEach(stopRefQuery => stopRefQuery())
        currentRefQueries = []
        snap.forEach(institutionsnap => {
            if (foundinstitutions == undefined || foundinstitutions.includes(institutionsnap.id)) {
                let doesntMatch = false

                if (selectedStatus != undefined) {
                    if (institutionsnap.get('status') != selectedStatus.dataset.status) {
                        doesntMatch = true
                    }
                }

                Object.entries(filters).forEach(filter => {
                    switch (filter[0].split('-')[1]) {
                        case "min":
                            if (institutionsnap.get(filter[0].split('-')[0]) < filter[1]) {
                                doesntMatch = true
                            }
                            break
                        case "max":
                            if (institutionsnap.get(filter[0].split('-')[0]) > filter[1]) {
                                doesntMatch = true
                            }
                            break
                        default:
                            let value = institutionsnap.get(filter[0].split('-')[0])

                            if (value != undefined) {
                                if (typeof value === "object" && value !== null) {
                                    if (value.path != filter[1].path) {
                                        doesntMatch = true
                                    }
                                }
                                else if (!value.toLowerCase().includes(filter[1].toLowerCase())) {
                                    doesntMatch = true
                                }
                            }
                            else {
                                doesntMatch = true
                            }
                            break
                    }
                })

                if (!doesntMatch) {
                    setTableOverlayState('hide')
                    noOneFound = false

                    let tr = document.createElement('tr')
                    tr.id = institutionsnap.id
                    tr.dataset.status = institutionsnap.get('status')
                    tr.ondblclick = () => {
                        if (getSelectedText() == '') {
                            ipcRenderer.send('new-window', 'case', institutionsnap.id)
                        }
                    }
                    tr.onmousedown = mouseEvent => {
                        if (mouseEvent.button != 1) {
                            if (mouseEvent.button == 2) {
                                contextMenu.materialComponent.open = false
                            }
                            if (selectedCaseRow) {
                                selectedCaseRow.classList.remove('selected')
                            }
                            selectedCase = allinstitutions.doc(institutionsnap.id)
                            selectedCaseID = institutionsnap.id
                            selectedCaseRow = tr
                            selectedCaseRow.classList.add('selected')
                        }
                    }
                    tr.onmouseup = mouseEvent => {
                        const hasSelection = getSelectedText() != ''

                        if (hasSelection || mouseEvent.button == 2) {
                            copyOption.hidden = !hasSelection
                            contextMenu.querySelectorAll('li.mdc-list-item:not(#copy)').forEach(option => {
                                option.hidden = hasSelection
                            })
                            contextMenu.style.left = (mouseEvent.clientX + 2) + 'px'
                            contextMenu.style.top = (mouseEvent.clientY + 2) + 'px'
                            contextMenu.materialComponent.setAbsolutePosition((mouseEvent.clientX + 2), (mouseEvent.clientY + 2))
                            contextMenu.materialComponent.open = true
                        }
                    }
                    if (tr.id == selectedCaseID) {
                        selectedCase = allinstitutions.doc(selectedCaseID)
                        selectedCaseRow = tr
                        selectedCaseRow.classList.add('selected')
                    }
                    institutionsList.appendChild(tr)

                    for (const column of tableColumnsList.children) {
                        const td = document.createElement("td")
                        td.id = column.id
                        tr.appendChild(td)

                        if (td.id == "__name__") {
                            td.textContent = institutionsnap.id
                        }
                        else {
                            const value = institutionsnap.get(td.id)
                            if (value != undefined) {
                                if (typeof value === "object" && value !== null) {
                                    currentRefQueries.push(
                                        value.onSnapshot(
                                            snapshot => {
                                                td.textContent = snapshot.get('name')

                                                if (searchQuery != undefined && searchQuery != "") {
                                                    td.classList.toggle("found", td.textContent.toLowerCase().includes(searchQuery))
                                                }

                                                orderinstitutions(currentOrder, currentOrderDirection)
                                            },
                                            error => {
                                                console.error(error)
                                            }
                                        )
                                    )
                                }
                                else {
                                    switch (td.id) {
                                        case "complaints":
                                            td.textContent = td.title = value
                                            break
                                        default:
                                            if (td.id.includes("Date")) {
                                                td.textContent = new Date(value).toJSON().substr(0, 10)
                                            }
                                            else {
                                                td.textContent = value
                                            }
                                            if (td.id.includes('User')) {
                                                admin.auth().getUserByEmail(value + emailSuffix).then(user => {
                                                    if (user.displayName) {
                                                        td.textContent = user.displayName
                                                    }
                                                }).catch(error => {
                                                    console.error("Error getting user by email: ", error)
                                                })
                                            }
                                            break
                                    }
                                }
                            }
                        }

                        if (searchQuery != undefined && searchQuery != "") {
                            td.classList.toggle("found", td.textContent.toLowerCase().includes(searchQuery))
                        }
                    }
                }
            }
        })
        orderinstitutions(currentOrder, currentOrderDirection)

        if (noOneFound) {
            setTableOverlayState("empty")
        }
    }
    else {
        setTableOverlayState("empty")
    }
}

function orderinstitutions(orderBy, orderDirection) {
    let switching, i, shouldSwitch
    do {
        switching = false
        for (i = 0; i < institutionsList.children.length - 1; i++) {
            shouldSwitch = false

            const x = institutionsList.children[i].querySelector("td#" + orderBy)
            const y = institutionsList.children[i + 1].querySelector("td#" + orderBy)

            if (orderDirection == "asc") {
                if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
                    shouldSwitch = true
                    break
                }
            }
            else if (orderDirection == "desc") {
                if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
                    shouldSwitch = true
                    break
                }
            }
        }
        if (shouldSwitch) {
            institutionsList.children[i].parentElement.insertBefore(institutionsList.children[i + 1], institutionsList.children[i])
            switching = true
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
            tableOverlayText.innerText = translate("institutions_NOT_FOUND")
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

function changeinstitutionstatus(newStatus) {
    selectedCase.update({ status: newStatus }).catch(error => {
        console.error("Error updating case: ", error)
    })
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

for (const status of statusBar.children) {
    status.onmouseover = () => {
        if (selectedStatus == undefined) {
            institutionsList.classList.add('dimmed')
            institutionsList.querySelectorAll('tr[data-status="' + status.dataset.status + '"]').forEach(tr => {
                tr.classList.add('not-dimmed')
            })
        }
    }
    status.onmouseleave = () => {
        if (selectedStatus == undefined) {
            institutionsList.classList.remove('dimmed')
            institutionsList.querySelectorAll('tr[data-status="' + status.dataset.status + '"]').forEach(tr => {
                tr.classList.remove('not-dimmed')
            })
        }
    }

    status.onclick = () => {
        institutionsList.classList.remove('dimmed')
        institutionsList.querySelectorAll('tr[data-status="' + status.dataset.status + '"]').forEach(tr => {
            tr.classList.remove('not-dimmed')
        })

        if (selectedStatus) {
            selectedStatus.classList.remove('selected')
        }

        statusBar.classList.toggle('dimmed', status != selectedStatus)
        status.classList.toggle('selected', status != selectedStatus)

        if (status == selectedStatus) {
            selectedStatus = undefined
        }
        else {
            selectedStatus = status
        }
        listinstitutions(currentinstitutionsSnap)
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
    currentQuery = allinstitutions

    filters = {}

    formFilter.querySelectorAll('input, textarea').forEach(inputFilter => {
        if (inputFilter.value != '') {
            emptyFilter = false

            let value = inputFilter.value

            if (inputFilter.mask != undefined) {
                value = inputFilter.mask.unmaskedvalue();
            }

            if (inputFilter.id.split('-')[0] == 'createDate') {
                setTableOverlayState("loading")
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
                loadinstitutions()
            }
            else {
                filters[inputFilter.id] = value
            }
        }
    })
    formFilter.querySelectorAll('select').forEach(select => {
        if (select.tomSelect.getValue() != '') {
            emptyFilter = false

            filters[select.id] = db.doc(select.tomSelect.getValue())
        }
    })

    if (!emptyFilter) {
        buttonClearFilter.disabled = false
        if (Object.entries(filters).length > 0) {
            listinstitutions(currentinstitutionsSnap)
        }
    }
    else {
        alert(translate("EMPTY_FILTERS"))
    }
}

function clearFilter() {
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
    currentQuery = allinstitutions
    filters = {}
    setTableOverlayState("loading")
    loadinstitutions()
}

buttonClearFilter.onclick = clearFilter

//#endregion

const { writeFile, utils } = require('xlsx')

function exportToExcel() {
    ipcRenderer.send('dialog-save', new Date().toLocaleString().replace(',', '').replaceAll(':', '-') + '.xlsx')
}

ipcRenderer.on('file-save', (event, filePath) => {
    writeFile(utils.table_to_book(institutionsTable), filePath)
})

function getSelectedText() {
    if (getSelection().toString().replaceAll('\n', '').replaceAll('\t', '').trim() != '') {
        return getSelection().toString()
    }
    else {
        return ''
    }
}

function copySelectionToClipboard() {
    const selectedText = getSelectedText()
    if (selectedText != '') {
        navigator.clipboard.writeText(selectedText)
        alert('"' + selectedText + '"' + translate("COPIED"))
    }
}