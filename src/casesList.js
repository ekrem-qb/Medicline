const tableOverlay = document.querySelector('.overlay')
const tableOverlayIcon = tableOverlay.getElementsByClassName('iconify')
const tableOverlayText = tableOverlay.querySelector('h3')

const casesTable = document.querySelector('table#cases')
const casesList = casesTable.querySelector('tbody#casesList')
let currentOrder, currentOrderDirection

const columnsJSON = require('./caseColumns.json')
const tableColumnsList = casesTable.querySelector('#tableColumnsList')
const hiddenTableColumnsList = document.getElementById('hiddenTableColumnsList')
const headerTemplate = document.getElementById('headerTemplate')
let selectedHeader

function newHeader(headerID) {
    const th = headerTemplate.content.firstElementChild.cloneNode(true)
    new MDCRipple(th)
    th.id = headerID

    th.onmousedown = mouseEvent => {
        if (th.parentElement != tableColumnsList) {
            if (mouseEvent.button == 0) {
                setTableOverlayState('drag')
            }
        }
        else {
            if (mouseEvent.button == 2) {
                tableHeaderContextMenu.materialComponent.open = false
                selectedHeader = th
            }
        }
    }
    th.onmouseup = mouseEvent => {
        if (th.parentElement != tableColumnsList) {
            if (casesList.childElementCount > 0) {
                setTableOverlayState('hide')
            }
            else {
                setTableOverlayState('empty')
            }
        }
        else {
            if (mouseEvent.button == 2) {
                tableHeaderContextMenu.style.left = (mouseEvent.clientX) + 'px'
                tableHeaderContextMenu.style.top = (mouseEvent.clientY) + 'px'
                tableHeaderContextMenu.materialComponent.setAbsolutePosition((mouseEvent.clientX), (mouseEvent.clientY))
                tableHeaderContextMenu.materialComponent.open = true
            }
        }
    }
    th.onclick = () => {
        if (th.parentElement != hiddenTableColumnsList) {
            headerClick(headerID)
        }
    }

    const label = th.querySelector('label')
    label.textContent = translate(columnsJSON[headerID])

    th.sortIcon = th.getElementsByClassName('iconify')

    return th
}

function loadColumns() {
    setTableOverlayState('loading')

    let enabledColumns = []
    if (localStorage.getItem('enabledColumns') != null) {
        enabledColumns = localStorage.getItem('enabledColumns').split(',')
    }
    else {
        enabledColumns.push('insuranceRefNo', 'insurance', 'callDate', 'createTime', 'createUser', 'surnameName', 'address', 'phone', 'status', 'birthDate', 'provider', 'provider2')
    }
    enabledColumns.forEach(
        column => {
            if (columnsJSON.hasOwnProperty(column)) {
                tableColumnsList.appendChild(newHeader(column))
            }
        })
    for (let column in columnsJSON) {
        if (!enabledColumns.includes(column)) {
            hiddenTableColumnsList.appendChild(newHeader(column))
        }
    }
    if (tableColumnsList.children['__name__']) {
        headerClick('__name__')
    }
    else {
        headerClick(tableColumnsList.firstChild.id)
    }
}

loadColumns()

const inputSearch = document.querySelector('input#search')
const buttonClearSearch = inputSearch.parentElement.querySelector('button#clearSearch')

const buttonCreate = document.querySelector('button#create')
buttonCreate.onclick = () => ipcRenderer.send('new-window', 'case')

const formFilter = document.querySelector('form#filter')
const buttonClearFilter = document.querySelector('button#clearFilter')

const statusBar = document.getElementById('statusBar')
let selectedStatus

let currentQuery = db.collection('cases')
let searchQuery
let foundCases
let currentCasesSnap
let stopCurrentQuery = () => { }
let currentRefQueries = []
let selectedCase, selectedCaseRow, selectedCaseID
let filters = {}

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        loadPermissions()
        if (Object.entries(filters).length == 0) {
            formFilter.querySelector('#createDate-min').value = new Date().toLocaleDateString('tr')
            applyFilter()
            hideEmptyFilters()
        }
    }
    else {
        stopPermissionsQuery()
        stopCurrentQuery()
        currentRefQueries.forEach(stopRefQuery => stopRefQuery())
        selectMenuQueries.forEach(stopQuery => stopQuery())
    }
})

let stopPermissionsQuery = () => { }

function toggleEditMode(editIsAllowed) {
    buttonCreate.disabled = !editIsAllowed
    tableRowContextMenu.children[0].querySelectorAll('.mdc-list-item:not(#copy, #edit)').forEach(option => {
        option.classList.toggle('mdc-list-item--disabled', !editIsAllowed)
    })
    if (editIsAllowed) {
        editOption.icon[0].setAttribute('data-icon', 'ic:round-edit')
        editOption.label.textContent = translate('EDIT')
    }
    else {
        editOption.icon[0].setAttribute('data-icon', 'ic:round-visibility')
        editOption.label.textContent = translate('VIEW')
    }
}

function loadPermissions() {
    toggleEditMode(false)

    stopPermissionsQuery()
    stopPermissionsQuery = allUsers.doc(firebase.auth().currentUser.uid).collection('permissions').doc('cases').onSnapshot(
        snapshot => {
            toggleEditMode(snapshot.get('edit'))
        },
        error => {
            console.error('Error getting permissions: ' + error)
        }
    )
}

function refreshSearch() {
    setTableOverlayState('loading')
    searchQuery = String(inputSearch.value).trim().toLowerCase()

    if (searchQuery != '') {
        buttonClearSearch.disabled = false
        foundCases = []
        let casePromises = []

        currentCasesSnap.forEach(_case => {
            if (!foundCases.includes(_case.id)) {
                let data = String(_case.id)
                let valuePromises = []
                Object.values(_case.data()).forEach(value => {
                    if (typeof value === 'object' && value !== null) {
                        valuePromises.push(value.get())
                    }
                    else {
                        data += ' -- ' + value.toString().toLowerCase()
                    }
                })
                if (valuePromises.length > 0) {
                    casePromises.push(
                        Promise.all(valuePromises).then(values => {
                            values.forEach(snaphot => {
                                data += ' -- ' + snaphot.get('name').toString().toLowerCase()
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
                    setTableOverlayState('empty')
                }
            })
        }
        else {
            if (foundCases.length > 0) {
                listCases(currentCasesSnap)
            }
            else {
                setTableOverlayState('empty')
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
    inputSearch.value = ''
    searchQuery = undefined
    foundCases = undefined
    listCases(currentCasesSnap)
}

function headerClick(headerID) {
    const clickedHeader = tableColumnsList.children[headerID]
    if (clickedHeader) {
        tableColumnsList.querySelectorAll('[data-icon="ic:round-keyboard-arrow-up"]').forEach(otherHeaderIcon => {
            if (otherHeaderIcon.parentElement != clickedHeader) {
                otherHeaderIcon.classList.remove('rot-180')
                otherHeaderIcon.setAttribute('data-icon', 'ic:round-unfold-more')
            }
        })
        hiddenTableColumnsList.querySelectorAll('[data-icon="ic:round-keyboard-arrow-up"]').forEach(otherHeaderIcon => {
            if (otherHeaderIcon.parentElement != clickedHeader) {
                otherHeaderIcon.classList.remove('rot-180')
                otherHeaderIcon.setAttribute('data-icon', 'ic:round-unfold-more')
            }
        })

        if (clickedHeader.sortIcon[0].getAttribute('data-icon') == 'ic:round-unfold-more') {
            clickedHeader.sortIcon[0].setAttribute('data-icon', 'ic:round-keyboard-arrow-up')
        }

        if (clickedHeader.sortIcon[0].classList.contains('rot-180')) {
            orderCases(headerID, 'asc')
        }
        else {
            orderCases(headerID, 'desc')
        }

        clickedHeader.sortIcon[0].classList.toggle('rot-180')
    }
}

function loadCases() {
    stopCurrentQuery()
    stopCurrentQuery = currentQuery.onSnapshot(
        snapshot => {
            console.log(snapshot)
            currentCasesSnap = snapshot
            listCases(snapshot)
            refreshSearch()
        },
        error => {
            console.error('Error getting cases: ' + error)
            setTableOverlayState('empty')
        }
    )
}

function listCases(snap) {
    if (snap.docs.length > 0) {
        let noOneFound = true

        casesList.innerHTML = ''
        currentRefQueries.forEach(stopRefQuery => stopRefQuery())
        currentRefQueries = []
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
                        case 'min':
                            if (caseSnap.get(filter[0].split('-')[0]) < filter[1]) {
                                doesntMatch = true
                            }
                            break
                        case 'max':
                            if (caseSnap.get(filter[0].split('-')[0]) > filter[1]) {
                                doesntMatch = true
                            }
                            break
                        default:
                            let value = caseSnap.get(filter[0].split('-')[0])

                            if (value != undefined) {
                                if (typeof value === 'object' && value !== null) {
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
                                tableRowContextMenu.materialComponent.open = false
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
                        const hasSelection = getSelectedText() != ''

                        if (hasSelection || mouseEvent.button == 2) {
                            copyOption.hidden = !hasSelection
                            tableRowContextMenu.querySelectorAll('li.mdc-list-item:not(#copy)').forEach(option => {
                                option.hidden = hasSelection
                            })
                            tableRowContextMenu.style.left = (mouseEvent.clientX) + 'px'
                            tableRowContextMenu.style.top = (mouseEvent.clientY) + 'px'
                            tableRowContextMenu.materialComponent.setAbsolutePosition((mouseEvent.clientX), (mouseEvent.clientY))
                            tableRowContextMenu.materialComponent.open = true
                        }
                    }
                    if (tr.id == selectedCaseID) {
                        selectedCase = allCases.doc(selectedCaseID)
                        selectedCaseRow = tr
                        selectedCaseRow.classList.add('selected')
                    }
                    casesList.appendChild(tr)

                    for (const column of tableColumnsList.children) {
                        const td = document.createElement('td')
                        td.id = column.id
                        tr.appendChild(td)

                        if (td.id == '__name__') {
                            td.textContent = caseSnap.id
                        }
                        else {
                            const value = caseSnap.get(td.id)
                            if (value != undefined) {
                                if (typeof value === 'object' && value !== null) {
                                    currentRefQueries.push(
                                        value.onSnapshot(
                                            snapshot => {
                                                td.textContent = snapshot.get('name')

                                                if (searchQuery != undefined && searchQuery != '') {
                                                    td.classList.toggle('found', td.textContent.toLowerCase().includes(searchQuery))
                                                }

                                                orderCases(currentOrder, currentOrderDirection)
                                            },
                                            error => {
                                                console.error(error)
                                            }
                                        )
                                    )
                                }
                                else {
                                    switch (td.id) {
                                        case 'complaints':
                                            td.textContent = td.title = value
                                            break
                                        default:
                                            if (td.id.includes('Date')) {
                                                td.textContent = new Date(value).toJSON().substr(0, 10)
                                            }
                                            else {
                                                td.textContent = value
                                            }
                                            break
                                    }
                                }
                            }
                        }

                        if (searchQuery != undefined && searchQuery != '') {
                            td.classList.toggle('found', td.textContent.toLowerCase().includes(searchQuery))
                        }
                    }
                }
            }
        })
        orderCases(currentOrder, currentOrderDirection)

        if (noOneFound) {
            setTableOverlayState('empty')
        }
    }
    else {
        setTableOverlayState('empty')
    }
}

function orderCases(orderBy, orderDirection) {
    if (tableColumnsList.children[orderBy]) {
        let switching, i, shouldSwitch
        do {
            switching = false
            for (i = 0; i < casesList.childElementCount - 1; i++) {
                shouldSwitch = false

                const a = casesList.children[i].children[orderBy]
                const b = casesList.children[i + 1].children[orderBy]

                if (orderDirection == 'asc') {
                    if (a.innerHTML.toLowerCase() > b.innerHTML.toLowerCase()) {
                        shouldSwitch = true
                        break
                    }
                }
                else if (orderDirection == 'desc') {
                    if (a.innerHTML.toLowerCase() < b.innerHTML.toLowerCase()) {
                        shouldSwitch = true
                        break
                    }
                }
            }
            if (shouldSwitch) {
                casesList.children[i].parentElement.insertBefore(casesList.children[i + 1], casesList.children[i])
                switching = true
            }
        }
        while (switching)

        currentOrder = orderBy
        currentOrderDirection = orderDirection
    }
    else {
        if (tableColumnsList.children['createTime']) {
            headerClick('createTime')
        }
        else {
            headerClick(tableColumnsList.firstChild.id)
        }
    }
}

function setTableOverlayState(state) {
    switch (state) {
        case 'loading':
            tableOverlay.classList.remove('hide')
            tableOverlay.classList.remove('show-headers')
            tableOverlayIcon[0].setAttribute('data-icon', 'eos-icons:loading')
            tableOverlayText.hidden = true
            break
        case 'empty':
            tableOverlay.classList.remove('hide')
            tableOverlay.classList.remove('show-headers')
            tableOverlayIcon[0].setAttribute('data-icon', 'ic:round-sentiment-dissatisfied')
            tableOverlayText.hidden = false
            tableOverlayText.innerText = translate('CASES') + ' ' + translate('NOT_FOUND')
            break
        case 'drag':
            tableOverlay.classList.remove('hide')
            tableOverlay.classList.add('show-headers')
            tableOverlayIcon[0].setAttribute('data-icon', 'mdi:archive-arrow-up-outline')
            tableOverlayText.hidden = false
            tableOverlayText.innerText = translate('DRAG_AND_DROP')
            break
        case 'hide':
            tableOverlay.classList.add('hide')
            break
        default:
            break
    }
}

function changeCaseStatus(newStatus) {
    const today = new Date().toLocaleDateString('tr').split('.')
    selectedCase.update({
        status: newStatus,
        updateUser: allUsers.doc(firebase.auth().currentUser.uid),
        updateDate: today[2] + '-' + today[1] + '-' + today[0],
        updateTime: new Date().toLocaleTimeString().substr(0, 5)
    }).catch(error => {
        console.error('Error updating case: ', error)
    })
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

function modalExpand(header) {
    const currentModalBody = header.nextElementSibling
    const currentExpandIcon = header.querySelector('.dropdown-icon')

    let otherModalBody
    header.parentElement.parentElement.querySelectorAll('.modal-body').forEach(modalBody => {
        if (modalBody != currentModalBody) {
            otherModalBody = modalBody
        }
    })

    if (header.id == 'documents') {
        header.classList.toggle('hide')
        header.previousElementSibling.classList.toggle('hide')
    }

    if (otherModalBody) {
        const otherExpandIcon = otherModalBody.parentElement.querySelector('.dropdown-icon')

        if (currentModalBody.classList.contains('collapsed')) {
            otherModalBody.classList.add('collapsed')
            otherExpandIcon.classList.remove('rot-180')
        }
    }

    currentExpandIcon.classList.toggle('rot-180', currentModalBody.classList.contains('collapsed'))
    currentModalBody.classList.toggle('collapsed', !currentModalBody.classList.contains('collapsed'))
    header.classList.toggle('align-items-center', currentModalBody.classList.contains('collapsed'))
    hideEmptyFilters()
}

const headerDocuments = document.querySelector('header#documents')
const tabBar = headerDocuments.previousElementSibling.materialComponent
const documentsContent = headerDocuments.nextElementSibling

tabBar.listen('MDCTabBar:activated', event => {
    documentsContent.querySelector('.tab-page.show').classList.remove('show')
    documentsContent.children[event.detail.index].classList.add('show')
})

const buttonCloseDocuments = document.querySelector('button#closeDocuments')
buttonCloseDocuments.onclick = () => modalExpand(headerDocuments)

//#region Filter

function hideEmptyFilters() {
    if (formFilter.classList.contains('collapsed')) {
        let hide = true

        for (const filter of formFilter.children) {
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
                if (select.tomselect.getValue() != '') {
                    collapsed = false
                    hide = false
                    return
                }
            })
            filter.classList.toggle('collapsed', collapsed)
        }

        formFilter.classList.toggle('hide', hide)
    }
    else {
        formFilter.classList.remove('hide')
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
                value = inputFilter.mask.unmaskedvalue()
            }

            if (inputFilter.id.split('-')[0] == 'createDate') {
                setTableOverlayState('loading')
                switch (inputFilter.id.split('-')[1]) {
                    case 'min':
                        currentQuery = currentQuery.where(inputFilter.id.split('-')[0], '>=', value)
                        break
                    case 'max':
                        currentQuery = currentQuery.where(inputFilter.id.split('-')[0], '<=', value)
                        break
                    default:
                        currentQuery = currentQuery.where(inputFilter.id, '==', value)
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
        if (select.tomselect.getValue() != '') {
            emptyFilter = false

            filters[select.id] = db.doc(select.tomselect.getValue())
        }
    })

    if (!emptyFilter) {
        buttonClearFilter.disabled = false
        if (Object.entries(filters).length > 0) {
            listCases(currentCasesSnap)
        }
    }
    else {
        alert(translate('EMPTY_FILTERS'))
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
            select.tomselect.items.forEach(item => {
                select.tomselect.removeItem(item)
            })
        }
    })
    buttonClearFilter.disabled = true
    hideEmptyFilters()
    currentQuery = allCases
    filters = {}
    setTableOverlayState('loading')
    loadCases()
}

buttonClearFilter.onclick = clearFilter

//#endregion

const dialogDeleteCase = document.getElementById('dialogDeleteCase')
dialogDeleteCase.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == 'delete') {
        selectedCase.delete().then(() => {
            selectedCase = undefined
            selectedCaseID = undefined
        }).catch(error => {
            console.error('Error removing case: ', error)
        })
    }
})

const tableRowContextMenu = document.getElementById('tableRowContextMenu')
const copyOption = tableRowContextMenu.children[0].children['copy']
copyOption.onclick = copySelectionToClipboard
const editOption = tableRowContextMenu.children[0].children['edit']
editOption.icon = editOption.getElementsByClassName('iconify')
editOption.label = editOption.querySelector('.mdc-list-item__text')
editOption.onclick = () => ipcRenderer.send('new-window', 'case', selectedCaseID)
const deleteOption = tableRowContextMenu.children[0].children['delete']
deleteOption.onclick = () => dialogDeleteCase.materialComponent.open()

const { writeFile, utils } = require('xlsx')

function exportToExcel() {
    ipcRenderer.send('dialog-save', translate('CASES') + ' ' + new Date().toLocaleString().replace(',', '').replaceAll(':', '-') + '.xlsx')
}

ipcRenderer.on('file-save', (event, filePath) => {
    writeFile(utils.table_to_book(casesTable), filePath)
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
        alert('"' + selectedText + '"' + translate('COPIED'))
    }
}

const tableHeaderContextMenu = document.getElementById('tableHeaderContextMenu')
const hideOption = tableHeaderContextMenu.children[0].children['hide']
hideOption.onclick = () => {
    if (selectedHeader) {
        tableColumnsList.removeChild(selectedHeader)
        hiddenTableColumnsList.insertBefore(selectedHeader, hiddenTableColumnsList.children[0])
        selectedHeader = undefined

        listCases(currentCasesSnap)
        let enabledColumns = []
        for (let column of tableColumnsList.children) {
            enabledColumns.push(column.id)
        }
        localStorage.setItem('enabledColumns', enabledColumns)
    }
}