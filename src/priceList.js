const pricesOverlay = document.getElementById('pricesOverlay')
const pricesOverlayIcon = pricesOverlay.getElementsByClassName('iconify')
const pricesOverlayText = pricesOverlay.querySelector('h3')

const pricesTable = document.querySelector('table#prices')
const priceList = pricesTable.querySelector('tbody#priceList')
let currentOrder, currentOrderDirection

const columnsJSON = {
    "__name__": "ID",
    "name": "NAME",
    "price": "PRICE",
}
const tableHeadersList = pricesTable.querySelector('#tableHeadersList')
const headerTemplate = document.getElementById('headerTemplate')

function newHeader(headerID) {
    const th = headerTemplate.content.firstElementChild.cloneNode(true)
    new MDCRipple(th)
    th.id = headerID

    th.onmousedown = mouseEvent => {
        if (mouseEvent.button == 0) {
            if (th.parentElement != tableHeadersList) {
                setOverlayState('drag')
            }
        }
    }
    th.onmouseup = () => {
        if (th.parentElement != tableHeadersList) {
            if (priceList.childElementCount > 0) {
                setOverlayState('hide')
            }
            else {
                setOverlayState('empty')
            }
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

    let columns = Object.keys(columnsJSON)
    if (localStorage.getItem('priceColumns')) {
        columns = localStorage.getItem('priceColumns').split(',')
    }
    columns.forEach(headerID => tableHeadersList.appendChild(newHeader(headerID)))

    if (tableHeadersList.children['name']) {
        headerClick('name')
        headerClick('name')
    }
    else {
        headerClick(tableHeadersList.firstChild.id)
    }
}

loadColumns()

let currentQuery = db.collection('insurance').doc(location.hash.replace('#', '')).collection('prices')
let searchQuery
let foundPrices
let currentPricesSnap
let stopCurrentQuery = () => { }
let currentRefQueries = []
let selectedPrice, selectedPriceRow, selectedPriceID

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        loadPrices()
        loadPermissions()
    }
    else {
        stopPermissionsQuery()
        stopCurrentQuery()
        currentRefQueries.forEach(stopRefQuery => stopRefQuery())
        currentRefQueries = []
    }
})

let stopPermissionsQuery = () => { }

function toggleEditMode(editIsAllowed) {
    buttonCreate.disabled = !editIsAllowed
    tableRowContextMenu.deleteOption.classList.toggle('mdc-list-item--disabled', !editIsAllowed)
}

function loadPermissions() {
    toggleEditMode(false)

    stopPermissionsQuery()
    stopPermissionsQuery = allUsers.doc(firebase.auth().currentUser.uid).collection('permissions').doc('institutions').onSnapshot(
        snapshot => {
            toggleEditMode(snapshot.get('edit'))
        },
        error => {
            console.error('Error getting permissions: ' + error)
        }
    )
}
const buttonCreate = document.querySelector('button#createPrice')
buttonCreate.onclick = () => {
    buttonCreate.nextElementSibling.classList.remove('hide')
    buttonCreate.classList.add('hide')
    inputName.focus()
}
const buttonCancel = document.querySelector('button#cancelPrice')
buttonCancel.onclick = () => {
    inputName.value = ''
    inputName.materialComponent.valid = true
    inputPrice.value = '0.00'
    inputPrice.materialComponent.valid = true
    buttonCreate.nextElementSibling.classList.add('hide')
    buttonCreate.classList.remove('hide')
}
const inputName = document.querySelector('input#activityName')
inputName.oninput = () => inputName.materialComponent.valid = inputName.value.trim() != ''
inputName.onkeydown = event => {
    switch (event.key) {
        case 'Enter':
            buttonDone.click()
            break
        case 'Escape':
            buttonCancel.click()
            break
    }
}
const inputPrice = document.querySelector('input#activityPrice')
inputPrice.oninput = () => inputPrice.materialComponent.valid = inputPrice.value.trim() != ''
inputPrice.onkeydown = event => {
    switch (event.key) {
        case 'Enter':
            buttonDone.click()
            break
        case 'Escape':
            buttonCancel.click()
            break
    }
}
const selectCurrency = document.getElementById('currency').materialComponent
const buttonDone = document.querySelector('button#donePrice')
buttonDone.onclick = () => {
    if (inputName.value.trim() != '') {
        currentQuery.add({
            name: inputName.value.trim(),
            price: parseFloat(inputPrice.mask.unmaskedvalue()),
            currency: selectCurrency.value
        }).then(() => {
            buttonCancel.click()
        }).catch(error => {
            console.error('Error creating price: ', error)
        })
    }
    else {
        inputName.focus()
    }
}
const inputSearch = document.querySelector('input#search')
const buttonClearSearch = document.querySelector('button#clearSearch')

inputSearch.oninput = refreshSearch

function refreshSearch() {
    setOverlayState('loading')
    searchQuery = String(inputSearch.value).trim().toLowerCase()

    if (searchQuery != '') {
        buttonClearSearch.disabled = false
        foundPrices = []
        let pricePromises = []

        currentPricesSnap.forEach(price => {
            if (!foundPrices.includes(price.id)) {
                let data = String(price.id)
                let valuePromises = []
                Object.values(price.data()).forEach(value => {
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
                    pricePromises.push(
                        Promise.all(valuePromises).then(values => {
                            values.forEach(snaphot => {
                                data += ',' + snaphot.get('name').toString().toLowerCase()
                            })
                            if (data.includes(searchQuery)) {
                                foundPrices.push(price.id)
                            }
                        })
                    )
                }
                else {
                    if (data.includes(searchQuery)) {
                        foundPrices.push(price.id)
                    }
                }
            }
        })

        if (pricePromises.length > 0) {
            Promise.all(pricePromises).then(prices => {
                if (foundPrices.length > 0) {
                    listPrices(currentPricesSnap)
                }
                else {
                    setOverlayState('empty')
                }
            })
        }
        else {
            if (foundPrices.length > 0) {
                listPrices(currentPricesSnap)
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

function clearSearch() {
    buttonClearSearch.disabled = true
    inputSearch.value = ''
    searchQuery = undefined
    foundPrices = undefined
    listPrices(currentPricesSnap)
}

function headerClick(headerID) {
    const clickedHeader = tableHeadersList.querySelector('th#' + headerID)
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
            orderPrices(headerID, 'asc')
        }
        else {
            orderPrices(headerID, 'desc')
        }

        clickedHeader.sortIcon[0].classList.toggle('rot-180')
    }
}

function loadPrices() {
    stopCurrentQuery()
    stopCurrentQuery = currentQuery.onSnapshot(
        snapshot => {
            console.log(snapshot)
            currentPricesSnap = snapshot
            listPrices(snapshot)
            refreshSearch()
        },
        error => {
            console.error('Error getting prices: ' + error)
            setOverlayState('empty')
        }
    )
}

function listPrices(snap) {
    if (snap.docs.length > 0) {
        let noOneFound = true

        priceList.innerHTML = ''
        currentRefQueries.forEach(stopRefQuery => stopRefQuery())
        currentRefQueries = []
        snap.forEach(Pricesnap => {
            if (foundPrices == undefined || foundPrices.includes(Pricesnap.id)) {
                setOverlayState('hide')
                noOneFound = false

                const tr = document.createElement('tr')
                tr.id = Pricesnap.id
                tr.ondblclick = () => {
                    if (getSelectedText() == '') {
                        ipcRenderer.send('new-window', 'price', selectedPriceID, selectPriceType.value)
                    }
                }
                tr.onmousedown = mouseEvent => {
                    if (mouseEvent.button != 1) {
                        if (selectedPriceID != Pricesnap.id) {
                            if (selectedPriceRow) {
                                selectedPriceRow.classList.remove('selected')
                            }
                            selectedPrice = currentQuery.doc(Pricesnap.id)
                            selectedPriceID = Pricesnap.id
                            selectedPriceRow = tr
                            selectedPriceRow.classList.add('selected')
                        }
                    }
                }
                tr.onmouseup = mouseEvent => {
                    if (getSelectedText() != '') {
                        textContextMenu.style.left = (mouseEvent.clientX) + 'px'
                        textContextMenu.style.top = (mouseEvent.clientY) + 'px'
                        textContextMenu.materialComponent.setAbsolutePosition((mouseEvent.clientX), (mouseEvent.clientY))
                        textContextMenu.materialComponent.open = true
                    }
                    else if (mouseEvent.button == 2) {
                        tableRowContextMenu.style.left = (mouseEvent.clientX) + 'px'
                        tableRowContextMenu.style.top = (mouseEvent.clientY) + 'px'
                        tableRowContextMenu.materialComponent.setAbsolutePosition((mouseEvent.clientX), (mouseEvent.clientY))
                        tableRowContextMenu.materialComponent.open = true
                    }
                }
                if (tr.id == selectedPriceID) {
                    selectedPrice = currentQuery.doc(selectedPriceID)
                    selectedPriceRow = tr
                    selectedPriceRow.classList.add('selected')
                }
                priceList.appendChild(tr)

                for (const column of tableHeadersList.children) {
                    const td = document.createElement('td')
                    td.id = column.id
                    tr.appendChild(td)

                    if (td.id == '__name__') {
                        td.textContent = Pricesnap.id
                    }
                    else {
                        const value = Pricesnap.get(td.id)
                        if (value != undefined) {
                            if (typeof value === 'object' && value !== null) {
                                currentRefQueries.push(
                                    value.onSnapshot(
                                        snapshot => {
                                            td.textContent = snapshot.get('name')

                                            if (searchQuery != undefined && searchQuery != '') {
                                                td.classList.toggle('found', td.textContent.toLowerCase().includes(searchQuery))
                                            }

                                            orderPrices(currentOrder, currentOrderDirection)
                                        },
                                        error => {
                                            console.error(error)
                                        }
                                    )
                                )
                            }
                            else {
                                td.textContent = value
                            }
                        }
                    }

                    if (searchQuery != undefined && searchQuery != '') {
                        td.classList.toggle('found', td.textContent.toLowerCase().includes(searchQuery))
                    }
                }
            }
        })
        orderPrices(currentOrder, currentOrderDirection)

        if (noOneFound) {
            setOverlayState('empty')
        }
    }
    else {
        setOverlayState('empty')
    }
}

function orderPrices(orderBy, orderDirection) {
    let switching, i, shouldSwitch
    do {
        switching = false
        for (i = 0; i < priceList.childElementCount - 1; i++) {
            shouldSwitch = false

            const a = priceList.children[i].children[orderBy]
            const b = priceList.children[i + 1].children[orderBy]

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
            priceList.children[i].parentElement.insertBefore(priceList.children[i + 1], priceList.children[i])
            switching = true
        }
    }
    while (switching)

    currentOrder = orderBy
    currentOrderDirection = orderDirection
}

function setOverlayState(state) {
    switch (state) {
        case 'loading':
            pricesOverlay.classList.remove('hide')
            pricesOverlay.classList.remove('show-headers')
            pricesOverlayIcon[0].setAttribute('data-icon', 'eos-icons:loading')
            pricesOverlayText.hidden = true
            break
        case 'empty':
            pricesOverlay.classList.remove('hide')
            pricesOverlay.classList.remove('show-headers')
            pricesOverlayIcon[0].setAttribute('data-icon', 'ic:round-sentiment-dissatisfied')
            pricesOverlayText.hidden = false
            pricesOverlayText.innerText = translate('ACTIVITIES') + ' ' + translate('NOT_FOUND')
            break
        case 'drag':
            pricesOverlay.classList.remove('hide')
            pricesOverlay.classList.add('show-headers')
            pricesOverlayIcon[0].setAttribute('data-icon', 'mdi:archive-arrow-up-outline')
            pricesOverlayText.hidden = false
            pricesOverlayText.innerText = translate('DRAG_AND_DROP')
            break
        case 'hide':
            pricesOverlay.classList.add('hide')
            break
        default:
            break
    }
}

const { writeFile, utils } = require('xlsx')

function exportToExcel() {
    ipcRenderer.send('dialog-save', translate('ACTIVITIES') + ' ' + new Date().toLocaleString().replace(',', '').replaceAll(':', '-') + '.xlsx')
}

ipcRenderer.on('file-save', (event, filePath) => {
    writeFile(utils.table_to_book(pricesTable), filePath)
})

const tableRowContextMenu = document.getElementById('tableRowContextMenu')
tableRowContextMenu.deleteOption = tableRowContextMenu.children[0].children['delete']
tableRowContextMenu.deleteOption.onclick = () => dialogDeletePrice.materialComponent.open()
const dialogDeletePrice = document.querySelector('#dialogDeletePrice')

dialogDeletePrice.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == 'delete') {
        selectedPrice.delete().then(() => {
            selectedPrice = undefined
            selectedPriceID = undefined
        }).catch(error => {
            console.error('Error removing price: ', error)
        })
    }
})

function refreshAndSaveColumns() {
    listPrices(currentPricesSnap)
    let priceColumns = []
    for (const header of tableHeadersList.children) {
        priceColumns.push(header.id)
    }
    localStorage.setItem('priceColumns', priceColumns)
}