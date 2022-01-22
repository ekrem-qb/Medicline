const pricesOverlay = document.getElementById('pricesOverlay')
const pricesOverlayIcon = pricesOverlay.getElementsByClassName('iconify')
const pricesOverlayText = pricesOverlay.querySelector('h3')

const pricesTable = document.querySelector('table#prices')
const priceList = pricesTable.querySelector('tbody#priceList')
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

const columnsJSON = {
    "__name__": "ID",
    "name": "DESCRIPTION",
    "price": "PRICE",
}
const tableHeadersList = pricesTable.querySelector('#tableHeadersList')
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
            tableHeaderContextMenu.style.left = (mouseEvent.clientX) + 'px'
            tableHeaderContextMenu.style.top = (mouseEvent.clientY) + 'px'
            tableHeaderContextMenu.materialComponent.setAbsolutePosition((mouseEvent.clientX), (mouseEvent.clientY))
            tableHeaderContextMenu.materialComponent.open = true
        }
    }
    th.onclick = () => headerClick(headerID)

    const label = th.querySelector('label')
    label.textContent = translate(columnsJSON[headerID])

    th.sortIcon = th.getElementsByClassName('iconify')

    return th
}

const buttonExport = document.querySelector('button#export')
buttonExport.onclick = () => ipcRenderer.send('dialog-save', translate('ACTIVITIES') + ' ' + new Date().toLocaleString('tr').replace(',', '').replaceAll(':', '-') + '.xlsx')

function loadColumns() {
    setOverlayState('loading')

    let columns = Object.keys(columnsJSON)
    if (localStorage.getItem('priceColumns')) {
        columns = localStorage.getItem('priceColumns').split(',')
    }
    columns.forEach(headerID => tableHeadersList.appendChild(newHeader(headerID)))
    for (const column in columnsJSON) {
        if (!columns.includes(column)) {
            addHiddenHeaderOption(column)
        }
    }
    if (tableHeadersList.children['name']) {
        headerClick('name')
        headerClick('name')
    }
    else {
        headerClick(tableHeadersList.firstChild.id)
    }
}

loadColumns()

const selectedInsurance = db.collection('insurance').doc(location.hash.replace('#', ''))
let stopInsuranceQuery = () => { }
const allPrices = selectedInsurance.collection('prices')
let searchQuery
let foundPrices
let currentPricesSnap
let stopPricesQuery = () => { }
let currentRefQueries = []
let selectedPrice, selectedPriceRow, selectedPriceID

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        loadPrices()
        loadPermissions()
    }
    else {
        stopInsuranceQuery()
        stopPermissionsQuery()
        stopPricesQuery()
        currentRefQueries.forEach(stopRefQuery => stopRefQuery())
        currentRefQueries = []
    }
})

let stopPermissionsQuery = () => { }

function toggleEditMode(editIsAllowed) {
    buttonCreate.disabled = !editIsAllowed
    buttonImport.disabled = !editIsAllowed
    tableRowContextMenu.editOption.classList.toggle('mdc-list-item--disabled', !editIsAllowed)
    tableRowContextMenu.deleteOption.classList.toggle('mdc-list-item--disabled', !editIsAllowed)
    if (!editIsAllowed) {
        buttonCancel.click()
        dialogDeletePrice.close()
        dialogImport.close()
    }
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
    inlineEdit.classList.add('m-2')
    buttonCancel.click()
    inlineEdit.show(buttonCreate)
    buttonCreate.classList.add('hide')
    inlineEditInput.focus()
}
const buttonCancel = document.querySelector('button#cancelPrice')
buttonCancel.onclick = () => {
    inlineEditInput.value = ''
    inlineEditInput.materialComponent.valid = true
    inputPrice.value = '0.00'
    inputPrice.materialComponent.valid = true
    inlineEdit.hide()
    buttonCreate.classList.remove('hide')
    const hiddenPrice = priceList.querySelector('.hide')
    if (hiddenPrice) {
        hiddenPrice.classList.remove('hide')
    }
}
const inlineEditInput = inlineEdit.querySelector('input#activityName')
inlineEditInput.oninput = () => inlineEditInput.materialComponent.valid = inlineEditInput.value.trim() != ''
inlineEditInput.onkeydown = event => {
    switch (event.key) {
        case 'Enter':
            buttonDone.click()
            break
        case 'Escape':
            buttonCancel.click()
            break
    }
}
const inputPrice = inlineEdit.querySelector('input#activityPrice')
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
const selectCurrency = inlineEdit.querySelector('.mdc-select#currency').materialComponent
const buttonDone = inlineEdit.querySelector('button#donePrice')
buttonDone.onclick = () => {
    if (inlineEditInput.value.trim() == '') {
        inlineEditInput.focus()
    }
    else if (inputPrice.value == '') {
        inputPrice.focus()
    }
    else {
        const data = {
            name: inlineEditInput.value.trim(),
            price: parseFloat(inputPrice.mask.unmaskedvalue()),
            currency: selectCurrency.value
        }
        if (inlineEditPath != undefined) {
            allPrices.doc(inlineEditPath).update(data).then(() => {
                buttonCancel.click()
            }).catch(error => {
                console.error('Error updating price: ', error)
            })
        }
        else {
            allPrices.add(data).then(() => {
                buttonCancel.click()
            }).catch(error => {
                console.error('Error creating price: ', error)
            })
        }
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
    stopInsuranceQuery()
    stopInsuranceQuery = selectedInsurance.onSnapshot(
        snapshot => {
            if (!snapshot.exists) {
                ipcRenderer.send('window-action', 'exit')
            }
        },
        error => {
            console.error('Error getting insurance: ' + error)
        }
    )
    stopPricesQuery()
    stopPricesQuery = allPrices.onSnapshot(
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
        snap.forEach(priceSnap => {
            if (foundPrices == undefined || foundPrices.includes(priceSnap.id)) {
                setOverlayState('hide')
                noOneFound = false

                const tr = document.createElement('tr')
                tr.id = priceSnap.id
                tr.onmousedown = mouseEvent => {
                    if (mouseEvent.button != 1) {
                        if (selectedPriceID != priceSnap.id) {
                            if (selectedPriceRow) {
                                selectedPriceRow.classList.remove('selected')
                            }
                            selectedPrice = allPrices.doc(priceSnap.id)
                            selectedPriceID = priceSnap.id
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
                    selectedPrice = allPrices.doc(selectedPriceID)
                    selectedPriceRow = tr
                    selectedPriceRow.classList.add('selected')
                }
                priceList.appendChild(tr)

                for (const column of tableHeadersList.children) {
                    const td = document.createElement('td')
                    td.id = column.id
                    td.ondblclick = () => {
                        if (getSelectedText() == '') {
                            inlineEdit.classList.remove('m-2')
                            buttonCancel.click()
                            inputPrice.value = parseFloat(tr.children['price'].textContent)
                            selectCurrency.value = tr.children['price'].textContent[tr.children['price'].textContent.length - 1]
                            tr.classList.add('hide')
                            inlineEdit.show(tr, selectedPriceID, tr.children['name'].textContent)

                            if (td.id == 'price') {
                                inputPrice.focus()
                            }
                        }
                    }
                    tr.appendChild(td)

                    switch (td.id) {
                        case '__name_':
                            td.textContent = priceSnap.id
                            break;
                        case 'price':
                            td.textContent = priceSnap.get(td.id) + ' ' + priceSnap.get('currency')
                            break;
                        default:
                            td.textContent = priceSnap.get(td.id)
                            break;
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

            let a = priceList.children[i].children[orderBy]
            let b = priceList.children[i + 1].children[orderBy]

            if (a.realValue != undefined) {
                a = a.realValue
                b = b.realValue
            }
            else {
                a = a.textContent.toLowerCase()
                b = b.textContent.toLowerCase()
            }

            if (orderDirection == 'asc') {
                if (a > b) {
                    shouldSwitch = true
                    break
                }
            }
            else if (orderDirection == 'desc') {
                if (a < b) {
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
    buttonExport.disabled = true

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
        case 'hide':
            pricesOverlay.classList.add('hide')
            buttonExport.disabled = false
            break
    }
}

const tableRowContextMenu = document.getElementById('tableRowContextMenu')
tableRowContextMenu.deleteOption = tableRowContextMenu.children[0].children['delete']
tableRowContextMenu.deleteOption.onclick = () => dialogDeletePrice.open()
tableRowContextMenu.editOption = tableRowContextMenu.children[0].children['edit']
tableRowContextMenu.editOption.onclick = () => {
    inlineEdit.classList.remove('m-2')
    buttonCancel.click()
    inputPrice.value = parseFloat(selectedPriceRow.children['price'].textContent)
    selectCurrency.value = selectedPriceRow.children['price'].textContent[selectedPriceRow.children['price'].textContent.length - 1]
    selectedPriceRow.classList.add('hide')
    inlineEdit.show(selectedPriceRow, selectedPriceID, selectedPriceRow.children['name'].textContent)
}
const dialogDeletePrice = document.querySelector('#dialogDeletePrice').materialComponent

dialogDeletePrice.listen('MDCDialog:closed', event => {
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

const { read, writeFile, utils } = require('xlsx')

const inputExcel = document.querySelector('input#excel')
const buttonImport = document.querySelector('button#import')
buttonImport.onclick = () => inputExcel.click()
inputExcel.onchange = async () => {
    if (inputExcel.value != '') {
        if (inputExcel.files[0].name.slice(inputExcel.files[0].name.lastIndexOf('.')).toLowerCase() == inputExcel.accept) {
            const data = await inputExcel.files[0].arrayBuffer()
            const workbook = read(data)
            dialogImport.content.innerHTML = utils.sheet_to_html(workbook.Sheets[workbook.SheetNames[0]])
            dialogImport.open()
            selectImportCurrency.disabled = false
            buttonReplaceImport.disabled = false
            buttonAddImport.disabled = false
            inputExcel.value = ''

            importTable = dialogImport.content.querySelector('table')
            for (const row of importTable.rows) {
                if (row.cells[0].textContent.trim() == '') {
                    row.cells[0].classList.add('btn-danger')
                    row.classList.add('dimmed')
                }
                else if (isNaN(parseFloat(row.cells[1].textContent.trim()))) {
                    row.cells[1].classList.add('btn-danger')
                    row.classList.add('dimmed')
                }
            }
        }
        else {
            inputExcel.value = ''
            alert(translate('WRONG_FILE_TYPE'))
        }
    }
}
const dialogImport = document.querySelector('#dialogImport').materialComponent
let importTable
const selectImportCurrency = document.getElementById('importCurrency').materialComponent
const buttonAddImport = dialogImport.container.querySelector('button#addImport')
buttonAddImport.icon = buttonAddImport.getElementsByClassName('iconify')

function importPrices() {
    dialogImport.scrimClickAction = ''
    selectImportCurrency.disabled = true
    buttonAddImport.icon[0].setAttribute('data-icon', 'eos-icons:loading')
    buttonAddImport.disabled = true
    buttonReplaceImport.disabled = true
    const promises = []
    importTable.querySelectorAll('tr:not(.dimmed)').forEach(row => {
        let currency = selectImportCurrency.value
        if (row.cells[1].textContent.trim().includes('₺')) {
            currency = '₺'
        }
        else if (row.cells[1].textContent.trim().includes('$')) {
            currency = '$'
        }
        else if (row.cells[1].textContent.trim().includes('€')) {
            currency = '€'
        }
        else if (row.cells[1].textContent.trim().includes('₽')) {
            currency = '₽'
        }
        promises.push(
            allPrices.add({
                name: row.cells[0].textContent.trim(),
                price: parseFloat(row.cells[1].textContent.trim()),
                currency: currency
            }).then(() => {
                row.classList.add('btn-success')
            }).catch(error => {
                console.error('Error creating price: ', error)
                row.classList.add('btn-danger')
            })
        )
    })
    Promise.all(promises).then(() => {
        dialogImport.scrimClickAction = 'cancel'
        buttonAddImport.icon[0].setAttribute('data-icon', 'ic:round-plus')
    })
}
buttonAddImport.onclick = importPrices

const buttonReplaceImport = dialogImport.container.querySelector('button#replaceImport')
buttonReplaceImport.icon = buttonReplaceImport.getElementsByClassName('iconify')
buttonReplaceImport.onclick = () => {
    dialogImport.scrimClickAction = ''
    selectImportCurrency.disabled = true
    buttonReplaceImport.icon[0].setAttribute('data-icon', 'eos-icons:loading')
    buttonReplaceImport.disabled = true
    buttonAddImport.disabled = true
    allPrices.get().then(prices => {
        const promises = []
        prices.forEach(price => {
            promises.push(
                price.ref.delete().then(() => {
                }).catch(error => {
                    console.error('Error removing price: ', error)
                })
            )
        })
        Promise.all(promises).then(() => {
            buttonReplaceImport.icon[0].setAttribute('data-icon', 'tabler:replace')
            importPrices()
        })
    })
}

ipcRenderer.on('file-save', (event, filePath) => {
    writeFile(utils.table_to_book(pricesTable, { raw: true }), filePath)
})