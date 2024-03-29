const casesOverlay = document.getElementById('casesOverlay')
const casesOverlayIcon = casesOverlay.getElementsByClassName('iconify')
const casesOverlayText = casesOverlay.querySelector('h3')

const casesTable = document.querySelector('table#cases')
const casesList = casesTable.querySelector('tbody#casesList')
let currentOrder, currentOrderDirection

const tableHeaderContextMenu = document.getElementById('tableHeaderContextMenu')
const addOption = tableHeaderContextMenu.children[0].children['add']
addOption.onclick = () => {
    hiddenHeadersMenu.style.left = (tableHeaderContextMenu.offsetLeft) + 'px'
    hiddenHeadersMenu.style.top = (tableHeaderContextMenu.offsetTop) + 'px'
    hiddenHeadersMenu.materialComponent.setAbsolutePosition(tableHeaderContextMenu.offsetLeft, tableHeaderContextMenu.offsetTop)
    hiddenHeadersMenu.materialComponent.open = true
}
const hideOption = tableHeaderContextMenu.children[0].children['hide']
hideOption.onclick = () => {
    if (selectedHeader) {
        addHiddenHeaderOption(selectedHeader.id)

        tableHeadersList.removeChild(selectedHeader)
        refreshAndSaveColumns()

        selectedHeader = undefined
    }
}

const hiddenHeadersMenu = document.getElementById('hiddenHeadersMenu')
const hiddenHeadersList = hiddenHeadersMenu.children[0]
const hiddenHeaderOptionTemplate = hiddenHeadersMenu.children['hiddenHeaderOptionTemplate']

function addHiddenHeaderOption(headerID) {
    const option = hiddenHeaderOptionTemplate.content.firstElementChild.cloneNode(true)
    new MDCRipple(option.children[0])
    option.id = headerID

    option.onclick = () => {
        if (selectedHeader) {
            option.remove()
            tableHeadersList.insertBefore(newHeader(headerID), selectedHeader)
        }
        refreshAndSaveColumns()

        hiddenHeadersMenu.materialComponent.open = false
    }

    const label = option.children[1]
    label.textContent = translate(columnsJSON[headerID])

    hiddenHeadersList.appendChild(option)
}

const columnsJSON = require('./caseColumns.json')
const tableHeadersList = casesTable.querySelector('#tableHeadersList')
const headerTemplate = document.getElementById('headerTemplate')
let selectedHeader

function newHeader(headerID) {
    const th = headerTemplate.content.firstElementChild.cloneNode(true)
    new MDCRipple(th)
    th.id = headerID

    th.onmousedown = mouseEvent => {
        if (mouseEvent.button == 2) {
            selectedHeader = th
            addOption.classList.toggle('mdc-list-item--disabled', hiddenHeadersList.childElementCount == 0)
            hideOption.classList.toggle('mdc-list-item--disabled', tableHeadersList.childElementCount < 2)
        }
    }
    th.onmouseup = mouseEvent => {
        if (mouseEvent.button == 2) {
            tableHeaderContextMenu.style.left = mouseEvent.clientX + 'px'
            tableHeaderContextMenu.style.top = mouseEvent.clientY + 'px'
            tableHeaderContextMenu.materialComponent.setAbsolutePosition(mouseEvent.clientX, mouseEvent.clientY)
            tableHeaderContextMenu.materialComponent.open = true
        }
    }
    th.onclick = () => headerClick(headerID)

    const label = th.querySelector('label')
    label.textContent = translate(columnsJSON[headerID])

    th.sortIcon = th.getElementsByClassName('iconify')

    return th
}

function loadColumns() {
    setOverlayState('loading')

    let columns = ['insuranceRefNo', 'insurance', 'callDate', 'createTime', 'createUser', 'surnameName', 'address', 'phone', 'status', 'birthDate', 'provider', 'provider2']
    if (localStorage.getItem('caseColumns')) {
        columns = localStorage.getItem('caseColumns').split(',')
    }
    columns.forEach(column => tableHeadersList.appendChild(newHeader(column)))
    for (const column in columnsJSON) {
        if (!columns.includes(column)) {
            addHiddenHeaderOption(column)
        }
    }
    if (tableHeadersList.children['__name__']) {
        headerClick('__name__')
    }
    else {
        headerClick(tableHeadersList.firstChild.id)
    }
}

loadColumns()

const inputSearch = document.querySelector('input#search')
const buttonClearSearch = inputSearch.parentElement.querySelector('button#clearSearch')

const buttonCreate = document.querySelector('button#create')
buttonCreate.onclick = () => ipcRenderer.send('new-window', 'case')

const formFilter = document.querySelector('form#filter')
const headerFilter = formFilter.previousElementSibling
headerFilter.onclick = modalExpand
const buttonClearFilter = formFilter.nextElementSibling.querySelector('button#clearFilter')
const buttonApplyFilter = formFilter.nextElementSibling.querySelector('button#applyFilter')

const statusBar = document.getElementById('statusBar')
let selectedStatus

let currentQuery = db.collection('cases')
let searchQuery
let foundCases
let currentCasesSnap
let stopCurrentQuery = () => { }
let currentRefQueries = []
let selectedCase, selectedCaseRow
let filters = {}

formFilter.querySelector('#createDate-min').value = new Date().toLocaleDateString('tr')

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        loadPermissions()
        if (Object.entries(filters).length == 0 && formFilter.querySelector('#createDate-min').value == new Date().toLocaleDateString('tr')) {
            applyFilter()
            hideEmptyFilters()
        }
        else {
            listCases(currentCasesSnap)
        }
        modalExpand(headerDocuments, localStorage.getItem('isDocumentsPanelOpen') || false)
    }
    else {
        stopPermissionsQuery()
        stopCurrentQuery()
        currentRefQueries.forEach(stopRefQuery => stopRefQuery())
        currentRefQueries = []
    }
})

let stopPermissionsQuery = () => { }
let haveEditPermission = false

function toggleEditMode(editIsAllowed) {
    buttonCreate.disabled = !editIsAllowed
    if (typeof buttonUploadFile !== 'undefined') {
        buttonUploadFile.disabled = !editIsAllowed
        buttonDoneFile.disabled = !editIsAllowed
        for (const option of filesContextMenu.children[0].children) {
            if (option != filesContextMenu.downloadOption && !option.classList.contains('mdc-list-divider')) {
                option.classList.toggle('mdc-list-item--disabled', !editIsAllowed)
            }
        }
    }
    for (const option of tableRowContextMenu.children[0].children) {
        if (option != tableRowContextMenu.editOption && !option.classList.contains('mdc-list-divider')) {
            option.classList.toggle('mdc-list-item--disabled', !editIsAllowed)
        }
    }
    if (typeof buttonNewActivity !== 'undefined') {
        buttonNewActivity.disabled = !editIsAllowed
        for (const option of proformaContextMenu.children[0].children) {
            if (!option.classList.contains('mdc-list-divider')) {
                option.classList.toggle('mdc-list-item--disabled', !editIsAllowed)
            }
        }
    }
    if (editIsAllowed) {
        tableRowContextMenu.editOption.icon[0].setAttribute('data-icon', 'ic:round-edit')
        tableRowContextMenu.editOption.label.textContent = translate('EDIT')
    }
    else {
        tableRowContextMenu.editOption.icon[0].setAttribute('data-icon', 'ic:round-visibility')
        tableRowContextMenu.editOption.label.textContent = translate('VIEW')
    }
    haveEditPermission = editIsAllowed
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
    setOverlayState('loading')
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
                    if (Array.isArray(value)) {
                        data += ',' + value.toString().toLowerCase()
                    }
                    else if (typeof value === 'object' && value !== null) {
                        valuePromises.push(value.get())
                    }
                    else {
                        data += ',' + value.toString().toLowerCase()
                    }
                })
                if (valuePromises.length > 0) {
                    casePromises.push(
                        Promise.all(valuePromises).then(values => {
                            values.forEach(snaphot => {
                                data += ',' + snaphot.get('name').toString().toLowerCase()
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
                if (foundCases) {
                    if (foundCases.length > 0) {
                        listCases(currentCasesSnap)
                    }
                    else {
                        setOverlayState('empty')
                    }
                }
            })
        }
        else {
            if (foundCases.length > 0) {
                listCases(currentCasesSnap)
            }
            else {
                setOverlayState('empty')
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
    const clickedHeader = tableHeadersList.children[headerID]
    if (clickedHeader) {
        tableHeadersList.querySelectorAll('[data-icon="ic:round-keyboard-arrow-up"]').forEach(otherHeaderIcon => {
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
            currentCasesSnap = snapshot
            refreshSearch()
        },
        error => {
            console.error('Error getting cases: ' + error)
            setOverlayState('empty')
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
                    setOverlayState('hide')
                    noOneFound = false

                    const tr = document.createElement('tr')
                    tr.id = caseSnap.id
                    tr.dataset.status = caseSnap.get('status')
                    tr.ondblclick = () => {
                        if (getSelectedText() == '') {
                            ipcRenderer.send('new-window', 'case', caseSnap.id)
                        }
                    }
                    tr.onmousedown = mouseEvent => {
                        if (mouseEvent.button != 1) {
                            if (selectedCase?.id != caseSnap.id) {
                                selectedCaseRow?.classList.remove('selected')
                                selectedCase = caseSnap.ref
                                selectedCaseRow = tr
                                selectedCaseRow.classList.add('selected')
                                tabsOverlay.classList.add('hide')
                                if (headerDocuments.classList.contains('hide')) {
                                    loadTab(documentsContent.children[tabBar.foundation.adapter.getPreviousActiveTabIndex()])
                                }
                            }
                        }
                    }
                    tr.onmouseup = mouseEvent => {
                        if (mouseEvent.button == 2) {
                            tableRowContextMenu.style.left = mouseEvent.clientX + 'px'
                            tableRowContextMenu.style.top = mouseEvent.clientY + 'px'
                            tableRowContextMenu.materialComponent.setAbsolutePosition(mouseEvent.clientX, mouseEvent.clientY)
                            tableRowContextMenu.materialComponent.open = true
                        }
                    }
                    casesList.appendChild(tr)

                    for (const column of tableHeadersList.children) {
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
                                                td.textContent = new Date(value).toLocaleDateString('tr')
                                                td.realValue = value
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
        if (casesList.children.namedItem(selectedCase?.id)) {
            selectedCaseRow = casesList.children.namedItem(selectedCase.id)
            selectedCaseRow.classList.add('selected')
        }
        else {
            selectedCase = undefined
            selectedCaseRow = undefined
            dialogDeleteCase.materialComponent.close()
            tabsOverlay.classList.remove('hide')
            if (headerDocuments.classList.contains('hide')) {
                const activePage = documentsContent.children[tabBar.foundation.adapter.getPreviousActiveTabIndex()]
                if (activePage.stopLoadingContent) {
                    activePage.stopLoadingContent()
                }
            }
        }
        orderCases(currentOrder, currentOrderDirection)

        if (noOneFound) {
            setOverlayState('empty')
        }
    }
    else {
        setOverlayState('empty')
    }
}

function orderCases(orderBy, orderDirection) {
    if (tableHeadersList.children[orderBy]) {
        let switching, i, shouldSwitch
        do {
            switching = false
            for (i = 0; i < casesList.childElementCount - 1; i++) {
                shouldSwitch = false

                const a = casesList.children[i].children[orderBy]
                const b = casesList.children[i + 1].children[orderBy]

                if (orderDirection == 'asc') {
                    if ((a.realValue || a.textContent.toLowerCase()) > (b.realValue || b.textContent.toLowerCase())) {
                        shouldSwitch = true
                        break
                    }
                }
                else if (orderDirection == 'desc') {
                    if ((a.realValue || a.textContent.toLowerCase()) < (b.realValue || b.textContent.toLowerCase())) {
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
        if (tableHeadersList.children['__name__']) {
            headerClick('__name__')
        }
        else {
            headerClick(tableHeadersList.firstChild.id)
        }
    }
}

function setOverlayState(state) {
    switch (state) {
        case 'loading':
            casesOverlay.classList.remove('hide')
            casesOverlayIcon[0].setAttribute('data-icon', 'eos-icons:loading')
            casesOverlayText.hidden = true
            break
        case 'empty':
            casesOverlay.classList.remove('hide')
            casesOverlayIcon[0].setAttribute('data-icon', 'ic:round-sentiment-dissatisfied')
            casesOverlayText.hidden = false
            casesOverlayText.innerText = translate('CASES') + ' ' + translate('NOT_FOUND')
            break
        case 'hide':
            casesOverlay.classList.add('hide')
            break
    }
}

function changeCaseStatus(newStatus) {
    const today = new Date().toLocaleDateString('tr').split('.')
    selectedCase.update({
        status: newStatus,
        updateUser: allUsers.doc(firebase.auth().currentUser.uid),
        updateDate: today[2] + '-' + today[1] + '-' + today[0],
        updateTime: new Date().toLocaleTimeString('tr').substr(0, 5)
    }).catch(error => {
        console.error('Error updating case: ', error)
    })
}

for (const status of statusBar.children) {
    status.onmouseover = () => {
        if (selectedStatus == undefined) {
            casesList.setAttribute('data-dim-status', status.dataset.status)
        }
    }
    status.onmouseleave = () => {
        if (selectedStatus == undefined) {
            casesList.removeAttribute('data-dim-status')
        }
    }

    status.onclick = () => {
        casesList.removeAttribute('data-dim-status')

        if (selectedStatus) {
            selectedStatus.classList.remove('selected')
        }

        statusBar.classList.toggle('dimmed', status != selectedStatus)
        status.classList.toggle('selected', status != selectedStatus)

        if (status == selectedStatus) {
            selectedStatus = undefined
            casesList.setAttribute('data-dim-status', status.dataset.status)
        }
        else {
            selectedStatus = status
        }
        listCases(currentCasesSnap)
    }
}

const headerDocuments = document.querySelector('header#documents')
headerDocuments.onclick = modalExpand
const tabBar = headerDocuments.previousElementSibling.materialComponent
const documentsContent = headerDocuments.nextElementSibling
const tabsOverlay = documentsContent.querySelector('#tabsOverlay')

function loadTab(page) {
    if (tabsOverlay.classList.contains('hide')) {
        if (page.loadContent) {
            page.loadContent()
        }
        else {
            const script = document.createElement('script')
            script.type = 'text/javascript'
            script.src = page.id + '.js'
            document.head.appendChild(script)
            script.onload = () => {
                toggleEditMode(haveEditPermission)
                if (page.loadContent) {
                    page.loadContent()
                }
            }
            script.onerror = () => {
                page.loadContent = () => { }
            }
        }
    }
}

tabBar.listen('MDCTabBar:activated', event => {
    const activePage = documentsContent.children[event.detail.index]
    const prevPage = documentsContent.querySelector('.tab-page.show')
    if (activePage != prevPage) {
        if (prevPage.stopLoadingContent) {
            prevPage.stopLoadingContent()
        }
        prevPage.classList.remove('show')
    }
    loadTab(activePage)
    activePage.classList.add('show')
})

function modalExpand(header, toggle) {
    if (header.target) {
        header = header.target
    }
    if (header == headerDocuments) {
        let isCollapsed
        if (toggle != undefined) {
            isCollapsed = documentsContent.classList.toggle('collapsed', !toggle)
        }
        else {
            isCollapsed = documentsContent.classList.toggle('collapsed')
        }
        header.classList.toggle('hide', !isCollapsed)
        header.previousElementSibling.classList.toggle('hide', isCollapsed)
        const activePage = documentsContent.children[tabBar.foundation.adapter.getPreviousActiveTabIndex()]
        if (isCollapsed) {
            localStorage.removeItem('isDocumentsPanelOpen')
            if (activePage.stopLoadingContent) {
                activePage.stopLoadingContent()
            }
        }
        else {
            localStorage.setItem('isDocumentsPanelOpen', 1)
            loadTab(activePage)
        }
    }
    else {
        formFilter.classList.toggle('collapsed')
        header.querySelector('.dropdown-icon').classList.toggle('rot-180', !formFilter.classList.contains('collapsed'))
        hideEmptyFilters()
    }
}

const buttonCloseDocuments = document.querySelector('button#closeDocuments')
buttonCloseDocuments.onclick = () => modalExpand(headerDocuments, false)

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

            if (inputFilter.inputmask != undefined) {
                value = inputFilter.inputmask.unmaskedvalue()
            }

            if (inputFilter.id.split('-')[0] == 'createDate') {
                setOverlayState('loading')
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

buttonApplyFilter.onclick = applyFilter

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
    setOverlayState('loading')
    loadCases()
}

buttonClearFilter.onclick = clearFilter

//#endregion

const dialogDeleteCase = document.getElementById('dialogDeleteCase')
dialogDeleteCase.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == 'delete') {
        const caseID = selectedCase.id
        allCases.doc(caseID).collection('proforma').get().then(files => {
            files.forEach(file => {
                file.ref.delete().then(() => {
                }).catch(error => {
                    console.error('Error removing activity: ', error)
                })
            })
        }).catch(error => {
            console.error('Error getting activities: ', error)
        })
        allCases.doc(caseID).collection('files').get().then(files => {
            files.forEach(file => {
                file.ref.delete().then(() => {
                }).catch(error => {
                    console.error('Error removing file from firestore: ', error)
                })
            })
        }).catch(error => {
            console.error('Error getting files from firestore: ', error)
        })
        storage.child(caseID).listAll().then(folder => {
            folder.items.forEach(file => {
                storage.child(file.fullPath).delete().then(() => {
                }).catch(error => {
                    console.error('Error removing file from storage: ', error)
                })
            })
        }).catch(error => {
            console.error('Error listing files from storage: ', error)
        })
        allCases.doc(caseID).delete().then(() => {
        }).catch(error => {
            console.error('Error removing case: ', error)
        })
    }
})

const tableRowContextMenu = document.getElementById('tableRowContextMenu')
tableRowContextMenu.editOption = tableRowContextMenu.children[0].children['edit']
tableRowContextMenu.editOption.icon = tableRowContextMenu.editOption.getElementsByClassName('iconify')
tableRowContextMenu.editOption.label = tableRowContextMenu.editOption.querySelector('.mdc-list-item__text')
tableRowContextMenu.editOption.onclick = () => ipcRenderer.send('new-window', 'case', selectedCase.id)
tableRowContextMenu.deleteOption = tableRowContextMenu.children[0].children['delete']
tableRowContextMenu.deleteOption.onclick = () => dialogDeleteCase.materialComponent.open()

let write, utils

function exportToExcel() {
    if (!write) write = require('xlsx').write
    if (!utils) utils = require('xlsx').utils
    ipcRenderer.send('save-file', translate('CASES') + ' ' + new Date().toLocaleString('tr').replace(',', '').replaceAll(':', '-') + '.xlsx', write(utils.table_to_book(casesTable), { type: 'buffer' }))
}

function refreshAndSaveColumns() {
    listCases(currentCasesSnap)
    let caseColumns = []
    for (const header of tableHeadersList.children) {
        caseColumns.push(header.id)
    }
    localStorage.setItem('caseColumns', caseColumns)
}

buttonDone.onclick = async () => {
    buttonDone.icon[0].setAttribute('data-icon', 'eos-icons:loading')
    switch (inlineEditPath.split('/')[2]) {
        case 'files':
            await db.doc(inlineEditPath).update({
                name: inlineEdit.input.value.trim() + inlineEdit.input.fileType
            }).then(() => {
            }).catch(error => {
                console.error('Error updating file name: ', error)
            })
            break
        case 'proforma':
            const data = {}
            if (inlineEdit.input.inputmask) {
                data[inlineEdit.valueType] = inlineEdit.input.inputmask.unmaskedvalue()
            }
            else if (!isNaN(inlineEdit.input.valueAsNumber)) {
                data[inlineEdit.valueType] = inlineEdit.input.valueAsNumber
            }
            else {
                data[inlineEdit.valueType] = inlineEdit.input.value
            }
            await db.doc(inlineEditPath).update(data).then(() => {
            }).catch(error => {
                console.error('Error updating proforma: ', error)
            })
            break
    }
    inlineEdit.hide()
}