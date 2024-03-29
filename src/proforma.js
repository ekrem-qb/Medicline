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
    dialogAddActivity.materialComponent.close()
    dialogDeleteActivity.materialComponent.close()
}
proformaTabPage.loadContent = () => {
    proformaTabPage.stopLoadingContent()
    loadInsurance()
}

let stopSelectedCaseQuery = () => { }
let stopCurrentInsuranceQuery = () => { }
let currentInsurance, selectedCaseSnap

function loadInsurance() {
    if (selectedCase) {
        stopSelectedCaseQuery()
        stopSelectedCaseQuery = selectedCase.onSnapshot(
            caseSnap => {
                selectedCaseSnap = caseSnap
                const newInsurance = caseSnap.get('insurance')
                if (newInsurance != currentInsurance) {
                    stopCurrentInsuranceQuery()
                    if (newInsurance) {
                        stopCurrentInsuranceQuery = newInsurance.onSnapshot(
                            insuranceSnap => {
                                if (currentInsurance?.id == insuranceSnap.id) {
                                    calculateDialogActivitiesTotal()
                                }
                                else {
                                    currentInsurance = insuranceSnap
                                    loadProforma()
                                    listActivities()
                                }
                                textName.textContent = insuranceSnap.get(textName.id) || ' '
                            },
                            error => {
                                console.error('Error getting insurance: ' + error)
                            }
                        )
                        textName.link = newInsurance.id
                    }
                    else {
                        stopCurrentInsuranceQuery = () => { }
                        dialogAddActivity.materialComponent.close()
                    }
                }
            },
            error => {
                console.error('Error getting case: ' + error)
            }
        )
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
let selectedActivity, selectedActivityRow

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
                    if (selectedActivity?.id != proformaSnap.id) {
                        selectedActivityRow?.classList.remove('selected')
                        selectedActivity = proformaSnap.ref
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
            proformaList.appendChild(tr)

            for (const column of proformaHeadersList.children) {
                const td = document.createElement('td')
                td.id = column.id
                if (td.id != 'total') {
                    td.onclick = () => {
                        if (getSelectedText() == '') {
                            inlineEdit.show(td, proformaSnap.ref.path, proformaSnap.get(td.id), td.id)
                        }
                    }
                }
                tr.appendChild(td)

                switch (td.id) {
                    case 'price':
                        td.textContent = proformaSnap.get('price')
                        break
                    case 'total':
                        td.textContent = proformaSnap.get('price') * proformaSnap.get('quantity')
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
            }
        })
        if (proformaList.children.namedItem(selectedActivity?.id)) {
            selectedActivityRow = proformaList.children.namedItem(selectedActivity.id)
            selectedActivityRow.classList.add('selected')
        }
        else {
            selectedActivity = undefined
            selectedActivityRow = undefined
            dialogDeleteActivity.materialComponent.close()
            inlineEdit.hide()
        }
        orderProforma(proformaCurrentOrder, proformaCurrentOrderDirection)
    }
    else {
        setProformaOverlayState('empty')
    }
    calculateProformaSubtotal()
}

function orderProforma(orderBy, orderDirection) {
    if (proformaHeadersList.children[orderBy]) {
        let switching, i, shouldSwitch
        do {
            switching = false
            for (i = 0; i < proformaList.childElementCount - 1; i++) {
                shouldSwitch = false

                const a = proformaList.children[i].children[orderBy]
                const b = proformaList.children[i + 1].children[orderBy]

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
                proformaList.children[i].parentElement.insertBefore(proformaList.children[i + 1], proformaList.children[i])
                switching = true
            }
        }
        while (switching)

        proformaCurrentOrder = orderBy
        proformaCurrentOrderDirection = orderDirection

        inlineEdit.moveToAnchor()
    }
    else {
        if (proformaHeadersList.children['name']) {
            proformaHeaderClick('name')
        }
        else {
            proformaHeaderClick(proformaHeadersList.firstChild.id)
        }
    }
}

function setProformaOverlayState(state) {
    switch (state) {
        case 'loading':
            proformaOverlay.classList.remove('hide')
            proformaOverlayIcon[0].setAttribute('data-icon', 'eos-icons:loading')
            proformaOverlayText.hidden = true
            break
        case 'empty':
            proformaOverlay.classList.remove('hide')
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
const selectCurrency = dialogAddActivity.querySelector('.mdc-select#currency').materialComponent
selectCurrency.listen('MDCSelect:change', () => {
    inputPrepay.symbol.textContent = selectCurrency.value
    textSubtotal.textContent = roundFloat(subtotal)
    textTotal.textContent = roundFloat(total)
    listActivities()
})
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
        stopActivityQuery = currentInsurance.ref.collection('prices').where('currency', '==', selectCurrency.value).onSnapshot(
            snapshot => {
                snapshot.docChanges().forEach(
                    change => {
                        switch (change.type) {
                            case 'added':
                                const listItem = listItemTemplate.content.firstElementChild.cloneNode(true)
                                listItem.id = change.doc.ref.path
                                listItem.onclick = event => {
                                    if (event.target != buttonRemove && event.target != buttonAdd) {
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
                                price.textContent = change.doc.get('price')

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
                                activitiesList.children[change.doc.ref.path].price.textContent = change.doc.get('price')

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
        total += parseFloat(activity.price.textContent) * parseInt(activity.quantity.textContent)
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
                    promises.push(
                        selectedCase.collection('proforma').add({
                            name: activity.label.textContent.trim(),
                            price: parseFloat(activity.price.textContent),
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
const textName = totalPanel.querySelector('span#name')
textName.onclick = () => { if (textName.link) ipcRenderer.send('new-window', 'institution', textName.link, 'insurance') }
const textSubtotal = totalPanel.querySelector('h6#subtotal')
let subtotal = 0

function calculateProformaSubtotal() {
    subtotal = 0
    if (proformaOverlay.classList.contains('hide')) {
        for (const row of proformaList.rows) {
            subtotal += parseFloat(row.cells['total'].textContent)
        }
    }
    textSubtotal.textContent = roundFloat(subtotal)
    calculateProformaTotal()
}

const inputDiscount = totalPanel.querySelector('input#discount')
inputDiscount.oninput = calculateProformaTotal
const inputPrepay = totalPanel.querySelector('input#prepay')
inputPrepay.oninput = calculateProformaTotal
inputPrepay.symbol = inputPrepay.nextElementSibling
const textTotal = totalPanel.querySelector('h4#total')
let total = 0

function calculateProformaTotal() {
    total = subtotal
    if (total) {
        const discount = inputDiscount.inputmask.unmaskedvalue()
        if (discount) {
            total -= total * (discount / 100)
        }
        const prepay = inputPrepay.inputmask.unmaskedvalue()
        if (prepay) {
            total -= prepay
        }
    }
    textTotal.textContent = roundFloat(total)
}

function roundFloat(float = 0, dontAddCurrency = false) {
    return dontAddCurrency ? Math.round(float * 100) / 100 : (Math.round(float * 100) / 100) + ' ' + selectCurrency.value
}

let readFile, compile, templateProforma, puppeteer, browserPage

async function proformaToPdf(attach = false) {
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
    if (selectedCase, currentInsurance, selectedCaseSnap) {
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

        const activities = []
        for (const row of proformaList.rows) {
            activities.push({
                name: row.cells['name'].textContent,
                quantity: row.cells['quantity'].textContent,
                total: row.cells['total'].textContent,
            })
        }

        const discount = inputDiscount.inputmask.unmaskedvalue()
        const data = {
            id: selectedCase.id,
            date: new Date().toLocaleDateString('tr'),
            case: caseData,
            to: currentInsurance.data(),
            activities: activities,
            subtotal: textSubtotal.textContent,
            discount_percent: discount,
            discount: roundFloat(subtotal * (discount / 100)),
            prepay: inputPrepay.inputmask.unmaskedvalue() + ' ' + selectCurrency.value,
            total: textTotal.textContent,
        }
        console.log(data)
        await browserPage.setContent(templateProforma(data))
        await browserPage.pdf({ format: 'A4' }).then(pdf => {
            if (attach) {
                attachPdf = pdf
                attachPdf.name = 'Proforma ' + selectedCase.id + '.pdf'
                tabBar.activateTab(tabBar.tabList.findIndex(tab => tab.id == 'files'))
                buttonUploadFile.click()
            }
            else {
                ipcRenderer.send('save-file', 'Proforma ' + selectedCase.id + '.pdf', pdf)
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