const userPanel = document.querySelector("#userPanel")
const userName = userPanel.querySelector("#userName")
const userMenu = document.querySelector("#userMenu")

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

const statusBar = document.querySelector("#statusBar").children
var currentStatus

const dialogDeleteCase = document.querySelector("#dialogDeleteCase")
dialogDeleteCase.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == "delete") {
        currentCase.delete().then(() => {
            currentCase = undefined
        }).catch((error) => {
            console.error("Error removing document: ", error)
        })
    }
})

var currentQuery = db.collection("cases")
var searchQuery
var foundCases
var currentCasesSnap
var stopCurrentQuery = () => { }
var currentRefQueries = []
var filters = {}

const contextMenu = document.querySelector("#contextMenu")
contextMenu.materialComponent.listen("close", () => {
    currentCase = undefined
})

userPanel.onclick = () => {
    userMenu.materialComponent.open = true
}

//#region Login

const dialogLogin = document.querySelector('#dialogLogin')
dialogLogin.materialComponent.scrimClickAction = ''
dialogLogin.materialComponent.escapeKeyAction = ''

const inputUserName = dialogLogin.querySelector('input#userName')
const inputPassword = dialogLogin.querySelector('input#password')
const buttonPasswordVisibility = dialogLogin.querySelector('button#passwordVisibility')
const iconPasswordVisibility = buttonPasswordVisibility.querySelector('.mdi')
const buttonSignIn = dialogLogin.querySelector('button#signIn')
const iconSignIn = buttonSignIn.querySelector('.mdi')

buttonSignIn.onclick = () => {
    const signInIconClass = iconSignIn.classList.item(iconSignIn.classList.length - 1)
    iconSignIn.classList.remove(signInIconClass)
    iconSignIn.classList.add('mdi-loading', 'mdi-spin')

    firebase.auth().signInWithEmailAndPassword(inputUserName.materialComponent.value + emailSuffix, inputPassword.materialComponent.value)
        .then(() => {
            dialogLogin.materialComponent.close()
            iconSignIn.classList.add(signInIconClass)
            iconSignIn.classList.remove('mdi-loading', 'mdi-spin')
            inputUserName.materialComponent.value = ''
            inputPassword.materialComponent.value = ''
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

firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        if (user.displayName != null) {
            userName.textContent = user.displayName
        }
        else {
            userName.textContent = user.email.replace(emailSuffix, '')
        }
        loadCases()
    } else {
        dialogLogin.materialComponent.open()
    }
})

//#endregion

loadColumns()

function pageLoaded() {
    formFilter.querySelector("#createDate-min").value = new Date().toLocaleDateString("tr")
    applyFilter()
    hideEmptyFilters()
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
                    } else {
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
    } else {
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

function stopCurrentRefQueries() {
    currentRefQueries.forEach(query => {
        query()
    })
}

function loadCases() {
    stopCurrentQuery()
    stopCurrentQuery = currentQuery.onSnapshot(
        snapshot => {
            console.log(snapshot)
            listCases(snapshot)
            currentCasesSnap = snapshot
        },
        err => {
            console.error(err)
            setTableOverlayState("empty")
        }
    )
}

function listCases(snap) {
    if (snap.docs.length > 0) {
        let noOneFound = true

        casesList.innerHTML = ''
        stopCurrentRefQueries()
        snap.forEach(caseSnap => {
            if (foundCases == undefined || foundCases.includes(caseSnap.id)) {
                let doesntMatch = false

                if (currentStatus != undefined) {
                    if (caseSnap.get('status') != currentStatus.dataset.status) {
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
                    setTableOverlayState("hide")
                    noOneFound = false

                    let tr = document.createElement("tr")
                    tr.id = caseSnap.id
                    tr.dataset.status = caseSnap.get("status")
                    tr.ondblclick = () => {
                        ipcRenderer.send('case', caseSnap.id)
                    }
                    tr.oncontextmenu = mouseEvent => {
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
                                    currentRefQueries.push(
                                        value.onSnapshot(
                                            snapshot => {
                                                td.textContent = snapshot.get('name')

                                                if (searchQuery != undefined && searchQuery != "") {
                                                    td.classList.toggle("found", td.textContent.toLowerCase().includes(searchQuery))
                                                }
                                            },
                                            err => {
                                                console.error(err)
                                            }
                                        )
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
    currentCase.update(caseData).then(() => {
        currentCase = undefined
    }).catch((error) => {
        console.error("Error updating document: ", error)
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
            for (let otherStatus of statusBar) {
                otherStatus.classList.remove("dimmed")
                otherStatus.classList.remove("selected")
            }

            currentStatus = undefined
        }
        else {
            for (let otherStatus of statusBar) {
                otherStatus.classList.toggle("dimmed", otherStatus != status)
                otherStatus.classList.toggle("selected", otherStatus == status)
            }

            currentStatus = status
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

//#region Update

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

function exportToExcel(table) {
    var uri = 'data:application/vnd.ms-excel;base64,'
        , template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><meta http-equiv="content-type" content="text/plain; charset=UTF-8"/></head><body><table>{table}</table></body></html>'
        , base64 = function (s) { return window.btoa(unescape(encodeURIComponent(s))) }
        , format = function (s, c) {
            return s.replace(/{(\w+)}/g, function (m, p) { return c[p] })
        }
        , downloadURI = function (uri, name) {
            var link = document.createElement("a")
            link.download = name
            link.href = uri
            link.click()
        }

    if (!table.nodeType) table = document.getElementById(table)
    var ctx = { worksheet: name || 'Worksheet', table: table.innerHTML }
    var resuri = uri + base64(format(template, ctx))
    downloadURI(resuri, new Date().toLocaleString().replace(',', '') + '.xlsx')
}