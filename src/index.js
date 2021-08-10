const userPanel = document.querySelector("#userPanel")
const username = userPanel.querySelector("#username")
const userMenu = document.querySelector("#userMenu")
const adminOption = userMenu.querySelector("#admin")
const adminOptionDivider = adminOption.previousElementSibling

userPanel.onclick = () => {
    checkAdminRights()
    userMenu.materialComponent.open = true
}

const inputSearch = document.querySelector("input#search")
const buttonClearSearch = document.querySelector("button#clearSearch")

const tableOverlay = document.querySelector("#tableOverlay")
const tableOverlayIcon = tableOverlay.querySelector(".mdi")
const tableOverlayText = tableOverlay.querySelector("h3")
const columnsJSON = require("./columns.json")
const tableColumnsList = document.querySelector("#tableColumnsList")
const casesList = document.querySelector("#casesList")

const hiddenTableColumnsList = document.querySelector("#hiddenTableColumnsList")

const formFilter = document.querySelector("form#filter")
const buttonClearFilter = document.querySelector("button#clearFilter")

const statusBar = document.querySelector("#statusBar")
let selectedStatus

let currentQuery = db.collection("cases")
let searchQuery
let foundCases
let currentCasesSnap
let stopCurrentQuery = () => { }
let currentRefQueries = []
let selectedCase, selectedCaseRow, selectedCaseID
let filters = {}

const contextMenu = document.querySelector('#contextMenu')
const copyOption = contextMenu.querySelector('#copy')

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

function checkAdminRights() {
    admin.auth().getUser(firebase.auth().currentUser.uid).then(user => {
        adminOption.hidden = !user.customClaims.admin
        adminOptionDivider.hidden = !user.customClaims.admin
    }).catch(error => {
        console.error("Error getting user: ", error)
    })
}

//#region Login

const dialogLogin = document.querySelector('#dialogLogin')
dialogLogin.materialComponent.scrimClickAction = ''
dialogLogin.materialComponent.escapeKeyAction = ''

const inputUsername = dialogLogin.querySelector('input#username')
const inputPassword = dialogLogin.querySelector('input#password')
const buttonPasswordVisibility = dialogLogin.querySelector('button#passwordVisibility')
const iconPasswordVisibility = buttonPasswordVisibility.querySelector('.mdi')
const buttonSignIn = dialogLogin.querySelector('button#signIn')
const iconSignIn = buttonSignIn.querySelector('.mdi')

function signIn() {
    const signInIconClass = iconSignIn.classList.item(iconSignIn.classList.length - 1)
    iconSignIn.classList.remove(signInIconClass)
    iconSignIn.classList.add('mdi-loading', 'mdi-spin')

    firebase.auth().signInWithEmailAndPassword(inputUsername.materialComponent.value + emailSuffix, inputPassword.materialComponent.value)
        .then(() => {
            dialogLogin.materialComponent.close()
            iconSignIn.classList.add(signInIconClass)
            iconSignIn.classList.remove('mdi-loading', 'mdi-spin')
            inputUsername.materialComponent.value = ''
            inputPassword.materialComponent.value = ''
            if (inputPassword.type != 'password') {
                buttonPasswordVisibility.click()
            }
            loadCases()
        }).catch(error => {
            if (error != null) {
                iconSignIn.classList.remove('mdi-loading', 'mdi-spin')
                iconSignIn.classList.add(signInIconClass)
                alert(error.message)
                return
            }
        })
}

buttonPasswordVisibility.onclick = () => {
    if (inputPassword.type == 'password') {
        inputPassword.type = 'text'
        iconPasswordVisibility.classList.add('mdi-eye-outline')
        iconPasswordVisibility.classList.remove('mdi-eye-off-outline')
    }
    else {
        inputPassword.type = 'password'
        iconPasswordVisibility.classList.remove('mdi-eye-outline')
        iconPasswordVisibility.classList.add('mdi-eye-off-outline')
    }
}

ipcRenderer.on('user-update', (event, uid, data) => {
    if (firebase.auth().currentUser.uid == uid) {
        if (data.displayName != '') {
            if (data.displayName) {
                username.textContent = data.displayName
            }
        }
        else {
            username.textContent = firebase.auth().currentUser.email.replace(emailSuffix, '')
        }

        if (data.password != undefined) {
            firebase.auth().signOut()
            firebase.auth().signInWithEmailAndPassword(firebase.auth().currentUser.email, data.password).then(() => {
                dialogLogin.materialComponent.close()
                loadCases()
            }).catch(error => {
                console.error("Error sign in: ", error)
            })
        }
    }
})

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        dialogLogin.materialComponent.close()
        userPanel.hidden = false
        if (user.displayName != null) {
            username.textContent = user.displayName
        }
        else {
            username.textContent = user.email.replace(emailSuffix, '')
        }
        checkAdminRights()
        loadSelectMenus()
        formFilter.querySelector("#createDate-min").value = new Date().toLocaleDateString("tr")
        applyFilter()
        hideEmptyFilters()
    }
    else {
        userPanel.hidden = true
        buttonSignIn.onclick = () => signIn(false)
        dialogLogin.materialComponent.open()
    }
})

//#endregion

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
            if (casesList.childElementCount > 0) {
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
        foundCases = new Array()
        let casePromises = []

        currentCasesSnap.forEach(_case => {
            if (!foundCases.includes(_case.id)) {
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
                                foundCases.push(_case.id)
                            }
                        })
                    )
                }
                else {
                    if (data.includes(searchQuery)) {
                        foundCases.push(_case.id)
                    }
                }
            }
        })

        if (casePromises.length > 0) {
            Promise.all(casePromises).then(cases => {
                if (foundCases.length > 0) {
                    listCases(currentCasesSnap)
                }
                else {
                    setTableOverlayState("empty")
                }
            })
        }
        else {
            if (foundCases.length > 0) {
                listCases(currentCasesSnap)
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
    foundCases = undefined
    listCases(currentCasesSnap)
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

        clickedHeader.sortIcon.classList.toggle('mdi-rotate-180')

        if (clickedHeader.sortIcon.classList.contains('mdi-rotate-180')) {
            orderCase(headerID, 'asc')
        }
        else {
            orderCase(headerID, 'desc')
        }
    }
}

function loadCases() {
    stopCurrentQuery()
    stopCurrentQuery = currentQuery.onSnapshot(
        snapshot => {
            console.log(snapshot)
            listCases(snapshot)
            currentCasesSnap = snapshot
        },
        error => {
            console.error("Error getting cases: " + error)
            setTableOverlayState("empty")
        }
    )
}

function listCases(snap) {
    if (snap.docs.length > 0) {
        let noOneFound = true

        casesList.innerHTML = ''
        currentRefQueries.forEach(stopRefQuery => stopRefQuery())
        snap.forEach(caseSnap => {
            if (foundCases == undefined || foundCases.includes(caseSnap.id)) {
                let doesntMatch = false

                if (selectedStatus != undefined) {
                    if (caseSnap.get('status') != selectedStatus.dataset.status) {
                        doesntMatch = true
                    }
                }

                Object.entries(filters).forEach(filter => {
                    switch (filter[0].split('-')[1]) {
                        case "min":
                            if (caseSnap.get(filter[0].split('-')[0]) < filter[1]) {
                                doesntMatch = true
                            }
                            break
                        case "max":
                            if (caseSnap.get(filter[0].split('-')[0]) > filter[1]) {
                                doesntMatch = true
                            }
                            break
                        default:
                            let value = caseSnap.get(filter[0].split('-')[0])

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
                    tr.id = caseSnap.id
                    tr.dataset.status = caseSnap.get('status')
                    tr.ondblclick = () => {
                        if (getSelectedText() == '') {
                            ipcRenderer.send('new-window', 'case', caseSnap.id)
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
                            selectedCase = allCases.doc(caseSnap.id)
                            selectedCaseID = caseSnap.id
                            selectedCaseRow = tr
                            selectedCaseRow.classList.add('selected')
                        }
                    }
                    tr.onmouseup = mouseEvent => {
                        if (mouseEvent.detail == 3) {
                            console.log('tripple clicked')
                        }
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
                        selectedCase = allCases.doc(selectedCaseID)
                        selectedCaseRow = tr
                        selectedCaseRow.classList.add('selected')
                    }
                    casesList.appendChild(tr)

                    for (const column of tableColumnsList.children) {
                        const td = document.createElement("td")
                        td.id = column.id
                        tr.appendChild(td)

                        if (td.id == "__name__") {
                            td.textContent = caseSnap.id
                        }
                        else {
                            const value = caseSnap.get(td.id)
                            if (value != undefined) {
                                if (typeof value === "object" && value !== null) {
                                    currentRefQueries.push(
                                        value.onSnapshot(
                                            snapshot => {
                                                td.textContent = snapshot.get('name')

                                                if (searchQuery != undefined && searchQuery != "") {
                                                    td.classList.toggle("found", td.textContent.toLowerCase().includes(searchQuery))
                                                }
                                            },
                                            error => {
                                                console.error(error)
                                            }
                                        )
                                    )
                                }
                                else {
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

        if (noOneFound) {
            setTableOverlayState("empty")
        }
    }
    else {
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
            }
            else if (orderDirection == "desc") {
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
        }
        else {
            if (switchcount == 0 && orderDirection == "asc") {
                orderDirection = "desc"
                switching = true
            }
        }
    }
    while (switching)
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
            casesList.classList.add('dimmed')
            casesList.querySelectorAll('tr[data-status="' + status.dataset.status + '"]').forEach(tr => {
                tr.classList.add('not-dimmed')
            })
        }
    }
    status.onmouseleave = () => {
        if (selectedStatus == undefined) {
            casesList.classList.remove('dimmed')
            casesList.querySelectorAll('tr[data-status="' + status.dataset.status + '"]').forEach(tr => {
                tr.classList.remove('not-dimmed')
            })
        }
    }

    status.onclick = () => {
        casesList.classList.remove('dimmed')
        casesList.querySelectorAll('tr[data-status="' + status.dataset.status + '"]').forEach(tr => {
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
        listCases(currentCasesSnap)
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
                loadCases()
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
            listCases(currentCasesSnap)
        }
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
    filters = {}
    setTableOverlayState("loading")
    loadCases()
}

//#endregion

function exportToExcel(table) {
    let uri = 'data:application/vnd.ms-excel;base64,'
        , template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><meta http-equiv="content-type" content="text/plain; charset=UTF-8"/></head><body><table>{table}</table></body></html>'
        , base64 = function (s) { return window.btoa(unescape(encodeURIComponent(s))) }
        , format = function (s, c) {
            return s.replace(/{(\w+)}/g, function (m, p) { return c[p] })
        }
        , downloadURI = function (uri, name) {
            let link = document.createElement("a")
            link.download = name
            link.href = uri
            link.click()
        }

    if (!table.nodeType) table = document.getElementById(table)
    let ctx = { worksheet: name || 'Worksheet', table: table.innerHTML }
    let resuri = uri + base64(format(template, ctx))
    downloadURI(resuri, new Date().toLocaleString().replace(',', '') + '.xls')
}

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