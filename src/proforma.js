const proformaTabPage = document.querySelector('.tab-page#proforma')
proformaTabPage.stopLoadingContent = () => {
    selectedCaseSnap = undefined
    currentInsurance = undefined
    stopProformaCurrentQuery()
    stopProformaCurrentQuery = () => { }
    proformaCurrentQuery = undefined
    stopActivityQuery()
    stopActivityQuery = () => { }
    stopSelectedCaseQuery()
    stopSelectedCaseQuery = () => { }
    stopCurrentInsuranceQuery()
    stopCurrentInsuranceQuery = () => { }
}
proformaTabPage.loadContent = () => {
    proformaTabPage.stopLoadingContent()
    loadInsurance()
}

let stopSelectedCaseQuery = () => { }
let stopCurrentInsuranceQuery = () => { }
let currentInsurance, selectedCaseSnap

function loadInsurance() {
    if (selectedCaseID) {
        stopSelectedCaseQuery()
        stopSelectedCaseQuery = allCases.doc(selectedCaseID).onSnapshot(
            caseSnap => {
                selectedCaseSnap = caseSnap
                if (caseSnap.get('insurance') != currentInsurance) {
                    stopCurrentInsuranceQuery()
                    stopCurrentInsuranceQuery = caseSnap.get('insurance').onSnapshot(
                        insuranceSnap => {
                            if (currentInsurance?.id == insuranceSnap.id) {
                                calculateDialogActivitiesTotal()
                            }
                            else {
                                currentInsurance = insuranceSnap
                                loadProforma()
                                listActivities()
                            }
                            if (toggleAccount.checked) {
                                inputAddress.value = insuranceSnap.get('address') || ''
                            }
                            else {
                                inputAddress.value = ''
                            }
                        },
                        error => {
                            console.error('Error getting insurance: ' + error)
                        }
                    )
                }
            },
            error => {
                console.error('Error getting case: ' + error)
            }
        )
    }
    else {
        setListOverlayState('empty')
        setProformaOverlayState('empty')
    }
}

const proformaOverlay = proformaTabPage.querySelector('.overlay')
const proformaOverlayIcon = proformaOverlay.getElementsByClassName('iconify')
const proformaOverlayText = proformaOverlay.querySelector('h3')

const proformaTable = proformaTabPage.querySelector('table')
proformaTable.parentElement.onscroll = () => inlineEdit.moveToAnchor()
const proformaList = proformaTable.querySelector('tbody#proformaList')
let proformaCurrentOrder, proformaCurrentOrderDirection

const proformaColumnsJSON = require('./proformaColumns.json')
const proformaHeadersList = proformaTable.querySelector('#proformaHeadersList')
const proformaHeaderTemplate = document.getElementById('proformaHeaderTemplate')

function newProformaHeader(headerID) {
    const th = proformaHeaderTemplate.content.firstElementChild.cloneNode(true)
    new MDCRipple(th)
    th.id = headerID

    th.onmousedown = mouseEvent => {
        if (mouseEvent.button == 0) {
            if (th.parentElement != proformaHeadersList) {
            }
        }
    }
    th.onmouseup = () => {
        if (th.parentElement != proformaHeadersList) {
            if (proformaList.childElementCount > 0) {
                setProformaOverlayState('hide')
            }
            else {
                setProformaOverlayState('empty')
            }
        }
    }
    th.onclick = () => proformaHeaderClick(headerID)

    const label = th.querySelector('label')
    label.textContent = translate(proformaColumnsJSON[headerID])

    th.sortIcon = th.getElementsByClassName('iconify')

    return th
}

function loadProformaColumns() {
    setProformaOverlayState('loading')

    let columns = Object.keys(proformaColumnsJSON)
    if (localStorage.getItem('proformaColumns')) {
        columns = localStorage.getItem('proformaColumns').split(',')
    }
    columns.forEach(headerID => proformaHeadersList.appendChild(newProformaHeader(headerID)))

    if (proformaHeadersList.children['name']) {
        proformaHeaderClick('name')
        proformaHeaderClick('name')
    }
    else {
        proformaHeaderClick(proformaHeadersList.firstChild.id)
    }
}

loadProformaColumns()

let proformaCurrentQuery
let proformaCurrentSnap
let stopProformaCurrentQuery = () => { }
let selectedActivity, selectedActivityRow, selectedActivityID

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        if (proformaTabPage.classList.contains('show')) {
            proformaTabPage.loadContent()
        }
    }
    else {
        proformaTabPage.stopLoadingContent()
    }
})

function proformaHeaderClick(headerID) {
    const clickedHeader = proformaHeadersList.querySelector('th#' + headerID)
    if (clickedHeader) {
        proformaHeadersList.querySelectorAll('[data-icon="ic:round-keyboard-arrow-up"]').forEach(otherHeaderIcon => {
            if (otherHeaderIcon.parentElement != clickedHeader) {
                otherHeaderIcon.classList.remove('rot-180')
                otherHeaderIcon.setAttribute('data-icon', 'ic:round-unfold-more')
            }
        })

        if (clickedHeader.sortIcon[0].getAttribute('data-icon') == 'ic:round-unfold-more') {
            clickedHeader.sortIcon[0].setAttribute('data-icon', 'ic:round-keyboard-arrow-up')
        }

        if (clickedHeader.sortIcon[0].classList.contains('rot-180')) {
            orderProforma(headerID, 'asc')
        }
        else {
            orderProforma(headerID, 'desc')
        }

        clickedHeader.sortIcon[0].classList.toggle('rot-180')
    }
}

function loadProforma() {
    if (selectedCase) {
        setProformaOverlayState('loading')
        proformaCurrentQuery = selectedCase.collection('proforma')
        stopProformaCurrentQuery = proformaCurrentQuery.onSnapshot(
            snapshot => {
                proformaCurrentSnap = snapshot
                listProforma(snapshot)
            },
            error => {
                console.error('Error getting proforma: ' + error)
                setProformaOverlayState('empty')
            }
        )
    }
    else {
        stopProformaCurrentQuery()
        stopProformaCurrentQuery = () => { }
        proformaCurrentQuery = undefined
        setProformaOverlayState('empty')
    }
}

function listProforma(snap) {
    if (snap.docs.length > 0) {
        proformaList.innerHTML = ''
        setProformaOverlayState('hide')
        snap.forEach(proformaSnap => {
            const tr = document.createElement('tr')
            tr.id = proformaSnap.id
            tr.onmousedown = mouseEvent => {
                if (mouseEvent.button != 1) {
                    if (selectedActivityID != proformaSnap.id) {
                        if (selectedActivityRow) {
                            selectedActivityRow.classList.remove('selected')
                        }
                        selectedActivity = proformaCurrentQuery.doc(proformaSnap.id)
                        selectedActivityID = proformaSnap.id
                        selectedActivityRow = tr
                        selectedActivityRow.classList.add('selected')
                    }
                }
            }
            tr.onmouseup = mouseEvent => {
                if (mouseEvent.button == 2) {
                    proformaContextMenu.style.left = mouseEvent.clientX + 'px'
                    proformaContextMenu.style.top = mouseEvent.clientY + 'px'
                    proformaContextMenu.materialComponent.setAbsolutePosition(mouseEvent.clientX, mouseEvent.clientY)
                    proformaContextMenu.materialComponent.open = true
                }
            }
            if (tr.id == selectedActivityID) {
                selectedActivity = proformaCurrentQuery.doc(selectedActivityID)
                selectedActivityRow = tr
                selectedActivityRow.classList.add('selected')
            }
            proformaList.appendChild(tr)

            for (const column of proformaHeadersList.children) {
                const td = document.createElement('td')
                td.id = column.id
                tr.appendChild(td)

                switch (td.id) {
                    case '__name__':
                        td.textContent = proformaSnap.id
                        break
                    case 'price':
                    case 'total':
                        const price = proformaSnap.get('price')
                        const currency = proformaSnap.get('currency')
                        td.textContent = price + ' ' + currency
                        td.realValue = price
                        if (currentInsurance) {
                            const exchangeToUSD = currentInsurance.get(currency)
                            if (exchangeToUSD) {
                                td.realValue = price / parseFloat(exchangeToUSD)
                            }
                        }
                        break
                    case 'date':
                        const seconds = proformaSnap.get(td.id).seconds
                        td.textContent = new Date(seconds * 1000).toLocaleString('tr').replace(',', '')
                        td.realValue = seconds
                        break
                    default:
                        td.textContent = proformaSnap.get(td.id)
                        break
                }
                switch (td.id) {
                    case 'name':
                        td.onclick = () => {
                            const proformaName = td.textContent
                            inlineEdit.show(td, proformaSnap.ref.path, proformaName.slice(0, proformaName.lastIndexOf('.')))
                            inlineEditInput.proformaType = proformaName.slice(proformaName.lastIndexOf('.')).toLowerCase()
                        }
                        break
                    case 'total':
                        const quantity = proformaSnap.get('quantity')
                        td.textContent = (parseFloat(td.textContent) * quantity) + ' ' + proformaSnap.get('currency')
                        td.realValue = parseFloat(td.realValue) * quantity
                        break
                }
            }
        })
        orderProforma(proformaCurrentOrder, proformaCurrentOrderDirection)
    }
    else {
        setProformaOverlayState('empty')
    }
    calculateProformaSubtotal()
}

function orderProforma(orderBy, orderDirection) {
    let switching, i, shouldSwitch
    do {
        switching = false
        for (i = 0; i < proformaList.childElementCount - 1; i++) {
            shouldSwitch = false

            let a = proformaList.children[i].children[orderBy]
            if (a.realValue != undefined) {
                a = a.realValue
            }
            else {
                a = a.textContent.toLowerCase()
            }

            let b = proformaList.children[i + 1].children[orderBy]
            if (b.realValue != undefined) {
                b = b.realValue
            }
            else {
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
            proformaList.children[i].parentElement.insertBefore(proformaList.children[i + 1], proformaList.children[i])
            switching = true
        }
    }
    while (switching)

    proformaCurrentOrder = orderBy
    proformaCurrentOrderDirection = orderDirection
}

function setProformaOverlayState(state) {
    switch (state) {
        case 'loading':
            proformaOverlay.classList.remove('hide')
            proformaOverlay.classList.remove('show-headers')
            proformaOverlayIcon[0].setAttribute('data-icon', 'eos-icons:loading')
            proformaOverlayText.hidden = true
            break
        case 'empty':
            proformaOverlay.classList.remove('hide')
            proformaOverlay.classList.remove('show-headers')
            proformaOverlayIcon[0].setAttribute('data-icon', 'ic:round-sentiment-dissatisfied')
            proformaOverlayText.hidden = false
            proformaOverlayText.innerText = translate('ACTIVITIES') + ' ' + translate('NOT_FOUND')
            break
        case 'hide':
            proformaOverlay.classList.add('hide')
            break
    }
}

const proformaContextMenu = document.getElementById('proformaContextMenu')
proformaContextMenu.deleteOption = proformaContextMenu.children[0].children['delete']
proformaContextMenu.deleteOption.onclick = () => dialogDeleteActivity.materialComponent.open()

const dialogDeleteActivity = proformaTabPage.querySelector('#dialogDeleteActivity')
dialogDeleteActivity.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == 'delete') {
        if (selectedActivity) {
            selectedActivity.delete().then(() => {
                selectedActivity = undefined
                selectedActivityID = undefined
            }).catch(error => {
                console.error('Error removing activity from firestore: ', error)
            })
        }
    }
})

function refreshAndSaveProformaColumns() {
    listProforma(proformaCurrentSnap)
    let proformaColumns = []
    for (const header of proformaHeadersList.children) {
        proformaColumns.push(header.id)
    }
    localStorage.setItem('proformaColumns', proformaColumns)
}

const buttonNewActivity = proformaTabPage.querySelector('button#newActivity')
buttonNewActivity.onclick = () => {
    if (proformaCurrentQuery) {
        dialogAddActivity.materialComponent.open()
    }
}
const dialogAddActivity = proformaTabPage.querySelector('#dialogAddActivity')

const inputSearchActivities = dialogAddActivity.querySelector('input#searchActivities')
const buttonClearSearchActivities = inputSearchActivities.parentElement.querySelector('button#clearSearchActivities')

function refreshSearchActivities() {
    const searchActivitiesQuery = String(inputSearchActivities.value).trim().toLowerCase()

    if (searchActivitiesQuery != '') {
        buttonClearSearchActivities.disabled = false

        for (const activity of activitiesList.children) {
            activity.classList.toggle('hide', !(activity.label.textContent.toLowerCase() + activity.price.textContent).includes(searchActivitiesQuery))
        }

        refreshListOverlayState()
    }
    else {
        clearSearchActivities()
    }
}

inputSearchActivities.oninput = refreshSearchActivities

function clearSearchActivities() {
    activitiesList.querySelectorAll('li.hide').forEach(activity => {
        activity.classList.remove('hide')
    })
    refreshListOverlayState()
    buttonClearSearchActivities.disabled = true
    inputSearchActivities.value = ''
}

const activitiesList = document.getElementById('activitiesList')
activitiesList.overlay = document.getElementById('activitiesListOverlay')
activitiesList.overlay.icon = activitiesList.overlay.getElementsByClassName('iconify')
activitiesList.overlay.text = activitiesList.overlay.querySelector('h3')
const listItemTemplate = document.getElementById('listItemTemplate')
let stopActivityQuery = () => { }

function listActivities() {
    activitiesList.innerHTML = ''
    stopActivityQuery()
    if (currentInsurance) {
        stopActivityQuery = currentInsurance.ref.collection('prices').orderBy('name', 'asc').onSnapshot(
            snapshot => {
                snapshot.docChanges().forEach(
                    change => {
                        switch (change.type) {
                            case 'added':
                                const listItem = listItemTemplate.content.firstElementChild.cloneNode(true)
                                listItem.id = change.doc.ref.path
                                listItem.onclick = event => {
                                    if (event.target.parentElement != buttonRemove && event.target.parentElement != buttonAdd
                                        && event.target.parentElement.parentElement != buttonRemove && event.target.parentElement.parentElement != buttonAdd) {
                                        if (Number.parseInt(quantity.textContent) > 0) {
                                            quantity.textContent = 0
                                        }
                                        else {
                                            quantity.textContent = 1
                                        }
                                        calculateDialogActivitiesTotal(listItem)
                                    }
                                }
                                new MDCRipple(listItem)

                                const label = listItem.querySelector('b')
                                listItem.label = label
                                const price = listItem.querySelector('small')
                                listItem.price = price

                                label.textContent = change.doc.get('name')
                                price.textContent = change.doc.get('price') + ' ' + change.doc.get('currency')

                                const buttonRemove = listItem.children['remove']
                                listItem.buttonRemove = buttonRemove
                                buttonRemove.onclick = () => {
                                    quantity.textContent = Number.parseInt(quantity.textContent) - 1

                                    calculateDialogActivitiesTotal(listItem)
                                }
                                buttonRemove.materialRipple = new MDCRipple(buttonRemove)
                                buttonRemove.materialRipple.unbounded = true

                                const quantity = listItem.children['quantity']
                                listItem.quantity = quantity

                                const buttonAdd = listItem.children['add']
                                listItem.buttonAdd = buttonAdd
                                buttonAdd.onclick = () => {
                                    quantity.textContent = Number.parseInt(quantity.textContent) + 1

                                    calculateDialogActivitiesTotal(listItem)
                                }
                                buttonAdd.materialRipple = new MDCRipple(buttonAdd)
                                buttonAdd.materialRipple.unbounded = true

                                if (change.newIndex == activitiesList.childElementCount) {
                                    activitiesList.appendChild(listItem)
                                } else {
                                    activitiesList.insertBefore(listItem, activitiesList.children[change.newIndex])
                                }
                                break
                            case 'modified':
                                activitiesList.children[change.doc.ref.path].label.textContent = change.doc.get('name')
                                activitiesList.children[change.doc.ref.path].price.textContent = change.doc.get('price') + ' ' + change.doc.get('currency')

                                if (change.newIndex == activitiesList.childElementCount) {
                                    activitiesList.appendChild(activitiesList.children[change.doc.ref.path])
                                } else {
                                    const removedChild = activitiesList.removeChild(activitiesList.children[change.doc.ref.path])
                                    activitiesList.insertBefore(removedChild, activitiesList.children[change.newIndex])
                                }
                                break
                            case 'removed':
                                activitiesList.children[change.doc.ref.path].remove()
                                break
                        }
                    }
                )
                refreshSearchActivities()
            },
            error => {
                console.error('Error getting billable activities: ' + error)
            }
        )
    }
    refreshListOverlayState()
    calculateDialogActivitiesTotal()
}

function calculateDialogActivitiesTotal(clickedActivity) {
    if (clickedActivity) {
        clickedActivity.classList.toggle('active', Number.parseInt(clickedActivity.quantity.textContent) > 0)
        clickedActivity.buttonRemove.classList.toggle('hide', Number.parseInt(clickedActivity.quantity.textContent) <= 0)
        clickedActivity.quantity.classList.toggle('hide', Number.parseInt(clickedActivity.quantity.textContent) <= 0)
    }
    let total = 0
    activitiesList.querySelectorAll('li.active').forEach(activity => {
        const priceNcurrency = activity.price.textContent.split(' ')
        let price = parseFloat(priceNcurrency[0])
        if (priceNcurrency[1] != selectCurrency.value) {
            if (currentInsurance) {
                const exchangeToUSD = currentInsurance.get(priceNcurrency[1])
                if (exchangeToUSD) {
                    price /= parseFloat(exchangeToUSD)
                }
                const exchangeBack = currentInsurance.get(selectCurrency.value)
                if (exchangeBack) {
                    price *= parseFloat(exchangeBack)
                }
            }
        }
        total += price * parseInt(activity.quantity.textContent)
    })
    buttonAddActivities.label.textContent = translate('ADD')
    if (total > 0) {
        buttonAddActivities.label.textContent += ' (' + roundFloat(total) + ')'
    }
    buttonAddActivities.disabled = total <= 0
}

function setListOverlayState(overlay, state) {
    switch (state) {
        case 'loading':
            overlay.classList.remove('hide')
            overlay.icon[0].setAttribute('data-icon', 'eos-icons:loading')
            overlay.text.hidden = true
            break
        case 'empty':
            overlay.classList.remove('hide')
            overlay.icon[0].setAttribute('data-icon', 'ic:round-sentiment-dissatisfied')
            overlay.text.hidden = false
            overlay.text.innerText = translate(overlay.id.replace('ListOverlay', '').toUpperCase()) + ' ' + translate('NOT_FOUND')
            break
        case 'hide':
            overlay.classList.add('hide')
            break
    }
}

function refreshListOverlayState() {
    if (activitiesList.querySelectorAll('li:not(.hide)').length > 0) {
        setListOverlayState(activitiesList.overlay, 'hide')
    } else {
        setListOverlayState(activitiesList.overlay, 'empty')
    }
}

const buttonCancelActivities = dialogAddActivity.querySelector('button#cancelActivities')

const buttonAddActivities = dialogAddActivity.querySelector('button#addActivities')
buttonAddActivities.label = buttonAddActivities.querySelector('.mdc-button__label')
buttonAddActivities.icon = buttonAddActivities.getElementsByClassName('iconify')
buttonAddActivities.onclick = () => {
    if (selectedCase) {
        if (activitiesList.querySelector('li.active')) {
            dialogAddActivity.scrimClickAction = ''
            buttonCancelActivities.disabled = true
            buttonAddActivities.icon[0].setAttribute('data-icon', 'eos-icons:loading')
            buttonAddActivities.disabled = true
            const promises = []
            for (const activity of activitiesList.children) {
                activity.classList.add('disabled')
                activity.buttonRemove.disabled = true
                activity.buttonAdd.disabled = true
                if (activity.classList.contains('active')) {
                    const priceNcurrency = activity.price.textContent.split(' ')
                    promises.push(
                        selectedCase.collection('proforma').add({
                            name: activity.label.textContent.trim(),
                            price: parseFloat(priceNcurrency[0]),
                            currency: priceNcurrency[1],
                            quantity: parseInt(activity.quantity.textContent),
                            date: firebase.firestore.Timestamp.now()
                        }).then(() => {
                            activity.classList.add('bg-success')
                            activity.classList.add('border-success')
                        }).catch(error => {
                            console.error('Error adding activity: ', error)
                            activity.classList.add('bg-danger')
                            activity.classList.add('border-danger')
                        })
                    )
                }
            }
            Promise.all(promises).then(() => {
                dialogAddActivity.scrimClickAction = 'cancel'
                buttonCancelActivities.disabled = false
                buttonAddActivities.icon[0].setAttribute('data-icon', 'ic:round-plus')
            })
        }
    }
}

dialogAddActivity.materialComponent.listen('MDCDialog:closed', event => {
    activitiesList.querySelectorAll('li.disabled').forEach(activity => {
        activity.buttonRemove.disabled = false
        activity.buttonAdd.disabled = false
        activity.classList.remove('disabled', 'bg-success', 'border-success', 'bg-danger', 'border-danger')
        if (activity.classList.contains('active')) {
            activity.click()
        }
    })
})

const totalPanel = proformaTabPage.querySelector('#totalPanel')
const toggleAccount = totalPanel.querySelector('input[type=checkbox]#account')
toggleAccount.parentElement.parentElement.onclick = () => {
    toggleAccount.checked = !toggleAccount.checked
    inputAddress.disabled = toggleAccount.checked
    if (toggleAccount.checked) {
        inputAddress.value = currentInsurance?.get('address') || ''
    }
    else {
        inputAddress.value = ''
    }
}
const inputAddress = totalPanel.querySelector('textarea#address')
const selectCurrency = totalPanel.querySelector('.mdc-select#currency').materialComponent
selectCurrency.listen('MDCSelect:change', () => {
    inputPrepay.symbol.textContent = selectCurrency.value
    calculateProformaSubtotal()
    calculateDialogActivitiesTotal()
})
const textSubtotal = totalPanel.querySelector('h5#subtotal')
let subtotal = 0

function calculateProformaSubtotal() {
    subtotal = 0
    if (proformaOverlay.classList.contains('hide')) {
        for (const row of proformaList.rows) {
            const priceNcurrency = row.cells['total'].textContent.split(' ')
            let price = parseFloat(priceNcurrency[0])
            if (priceNcurrency[1] != selectCurrency.value) {
                if (currentInsurance) {
                    const exchangeToUSD = currentInsurance.get(priceNcurrency[1])
                    if (exchangeToUSD) {
                        price /= parseFloat(exchangeToUSD)
                    }
                    const exchangeBack = currentInsurance.get(selectCurrency.value)
                    if (exchangeBack) {
                        price *= parseFloat(exchangeBack)
                    }
                }
            }
            subtotal += price
        }
    }
    textSubtotal.textContent = roundFloat(subtotal)
    calculateProformaTotal()
}

const inputDiscount = totalPanel.querySelector('input#discount')
inputDiscount.oninput = calculateProformaTotal
inputDiscount.onchange = () => { if (inputDiscount.value == '') inputDiscount.value = 0 }
const inputPrepay = totalPanel.querySelector('input#prepay')
inputPrepay.oninput = calculateProformaTotal
inputPrepay.onchange = () => { if (inputPrepay.value == '') inputPrepay.value = 0 }
inputPrepay.symbol = inputPrepay.nextElementSibling
const textTotal = totalPanel.querySelector('h4#total')

function calculateProformaTotal() {
    let total = subtotal
    if (total) {
        const discount = inputDiscount.mask.unmaskedvalue()
        if (discount) {
            total -= total * (discount / 100)
        }
        const prepay = inputPrepay.mask.unmaskedvalue()
        if (prepay) {
            total -= prepay
        }
    }
    textTotal.textContent = roundFloat(total)
}

function roundFloat(float, dontAddCurrency) {
    return dontAddCurrency ? Math.round(float * 100) / 100 : (Math.round(float * 100) / 100) + ' ' + selectCurrency.value
}

let readFile, compile, templateProforma, puppeteer, browserPage

async function proformaToPdf(attach) {
    if (!templateProforma) {
        if (!readFile) readFile = require('fs').readFile
        await readFile('proforma.html', 'utf8', (err, html) => {
            if (err) throw err

            if (!compile) compile = require('handlebars').compile
            templateProforma = compile(html)
        })
    }
    if (!browserPage) {
        if (!puppeteer) puppeteer = require('puppeteer')
        const browser = await puppeteer.launch()
        await browser.pages().then(pages => {
            browserPage = pages[0]
        })
    }
    if (selectedCaseID, currentInsurance, selectedCaseSnap) {
        const caseData = {}

        if (Array.isArray(selectedCaseSnap.get('diagnosis'))) {
            caseData.diagnosis = []
            selectedCaseSnap.get('diagnosis').forEach(item => {
                if (!icd10Codes) icd10Codes = require('./icd10_codes.json')
                if (icd10Codes[item]) {
                    caseData.diagnosis.push(icd10Codes[item])
                }
                else {
                    caseData.diagnosis.push(item)
                }
            })
        }

        await selectedCaseSnap.get('patientStatus').get().then(value => {
            caseData.patientStatus = value.get('name')
        }).catch(error => {
            console.error('Error getting patient status: ', error)
        })

        caseData.surnameName = selectedCaseSnap.get('surnameName')
        caseData.insuranceRefNo = selectedCaseSnap.get('insuranceRefNo')
        caseData.policyNo = selectedCaseSnap.get('policyNo')

        let personData
        if (!toggleAccount.checked) {
            personData = {
                name: selectedCaseSnap.get('surnameName'),
                phone: selectedCaseSnap.get('phone'),
                phone2: selectedCaseSnap.get('phone2'),
                phone3: selectedCaseSnap.get('phone3'),
                address: inputAddress.value
            }
        }

        const activities = []
        for (const row of proformaList.rows) {
            activities.push({
                name: row.cells['name'].textContent,
                quantity: row.cells['quantity'].textContent,
                total: row.cells['total'].textContent,
            })
        }

        const discount = inputDiscount.mask.unmaskedvalue()
        const data = {
            id: selectedCaseID,
            date: new Date().toLocaleDateString('tr'),
            case: caseData,
            to: personData || currentInsurance.data(),
            activities: activities,
            subtotal: textSubtotal.textContent,
            discount_percent: discount,
            discount: roundFloat(subtotal * (discount / 100)),
            prepay: inputPrepay.mask.unmaskedvalue() + ' ' + selectCurrency.value,
            total: textTotal.textContent,
        }
        console.log(data)
        await browserPage.setContent(templateProforma(data))
        await browserPage.pdf({ format: 'A4' }).then(pdf => {
            if (attach) {
                attachPdf = pdf
                attachPdf.name = 'Proforma ' + selectedCaseID + '.pdf'
                tabBar.activateTab(tabBar.tabList.findIndex(tab => tab.id == 'files'))
                buttonUploadFile.click()
            }
            else {
                ipcRenderer.send('save-file', 'Proforma ' + selectedCaseID + '.pdf', pdf)
            }
        })
    }
}

const buttonExportPdf = proformaTabPage.querySelector('button#exportPdf')
buttonExportPdf.icon = buttonExportPdf.getElementsByClassName('iconify')
buttonExportPdf.onclick = async () => {
    buttonExportPdf.icon[0].setAttribute('data-icon', 'eos-icons:loading')
    await proformaToPdf(false)
    buttonExportPdf.icon[0].setAttribute('data-icon', 'mdi:file-pdf')
}

const buttonAttachPdf = proformaTabPage.querySelector('button#attachPdf')
buttonAttachPdf.icon = buttonAttachPdf.getElementsByClassName('iconify')
buttonAttachPdf.onclick = async () => {
    buttonAttachPdf.icon[0].setAttribute('data-icon', 'eos-icons:loading')
    await proformaToPdf(true)
    buttonAttachPdf.icon[0].setAttribute('data-icon', 'ic:round-attach-file')
}