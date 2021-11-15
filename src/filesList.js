// const filesOverlay = document.getElementById('filesOverlay')
// const filesOverlayIcon = filesOverlay.getElementsByClassName('iconify')
// const filesOverlayText = filesOverlay.querySelector('h3')

// const filesTable = document.querySelector('table#files')
// const filesList = filesTable.querySelector('tbody#filesList')
// let currentOrder, currentOrderDirection

// const columnsJSON = require('./fileColumns.json')
// const tableHeadersList = filesTable.querySelector('#tableHeadersList')
// const headerTemplate = document.getElementById('headerTemplate')

// function newHeader(headerID) {
//     const th = headerTemplate.content.firstElementChild.cloneNode(true)
//     new MDCRipple(th)
//     th.id = headerID

//     th.onmousedown = mouseEvent => {
//         if (mouseEvent.button == 0) {
//             if (th.parentElement != tableHeadersList) {
//                 setOverlayState('drag')
//             }
//         }
//     }
//     th.onmouseup = () => {
//         if (th.parentElement != tableHeadersList) {
//             if (filesList.childElementCount > 0) {
//                 setOverlayState('hide')
//             }
//             else {
//                 setOverlayState('empty')
//             }
//         }
//     }
//     th.onclick = () => headerClick(headerID)

//     const label = th.querySelector('label')
//     label.textContent = translate(columnsJSON[headerID])

//     th.sortIcon = th.getElementsByClassName('iconify')

//     return th
// }

// function loadColumns() {
//     setOverlayState('loading')

//     let columns = Object.keys(columnsJSON)
//     if (localStorage.getItem('fileColumns')) {
//         columns = localStorage.getItem('fileColumns').split(',')
//     }
//     columns.forEach(headerID => tableHeadersList.appendChild(newHeader(headerID)))

//     if (tableHeadersList.children['name']) {
//         headerClick('name')
//         headerClick('name')
//     }
//     else {
//         headerClick(tableHeadersList.firstChild.id)
//     }
// }

// loadColumns()

// let currentQuery = db.collection('insurance')
// let currentFilesSnap
// let stopCurrentQuery = () => { }
// let currentRefQueries = []
// let selectedFile, selectedFileRow, selectedFileID

// firebase.auth().onAuthStateChanged(user => {
//     if (user) {
//         loadFiles()
//         loadPermissions()
//     }
//     else {
//         stopPermissionsQuery()
//         stopCurrentQuery()
//         currentRefQueries.forEach(stopRefQuery => stopRefQuery())
//     }
// })

// let stopPermissionsQuery = () => { }

// function toggleEditMode(editIsAllowed) {
//     buttonCreateFile.disabled = !editIsAllowed
//     deleteOption.classList.toggle('mdc-list-item--disabled', !editIsAllowed)
//     if (editIsAllowed) {
//         editOption.icon[0].setAttribute('data-icon', 'ic:round-edit')
//         editOption.label.textContent = translate('EDIT')
//     }
//     else {
//         editOption.icon[0].setAttribute('data-icon', 'ic:round-visibility')
//         editOption.label.textContent = translate('VIEW')
//     }
// }

// function loadPermissions() {
//     toggleEditMode(false)

//     stopPermissionsQuery()
//     stopPermissionsQuery = allUsers.doc(firebase.auth().currentUser.uid).collection('permissions').doc('files').onSnapshot(
//         snapshot => {
//             toggleEditMode(snapshot.get('edit'))
//         },
//         error => {
//             console.error('Error getting permissions: ' + error)
//         }
//     )
// }
const buttonCreateFile = document.querySelector('button#createFile')

// function headerClick(headerID) {
//     const clickedHeader = tableHeadersList.querySelector('th#' + headerID)
//     if (clickedHeader) {
//         tableHeadersList.querySelectorAll('[data-icon="ic:round-keyboard-arrow-up"]').forEach(otherHeaderIcon => {
//             if (otherHeaderIcon.parentElement != clickedHeader) {
//                 otherHeaderIcon.classList.remove('rot-180')
//                 otherHeaderIcon.setAttribute('data-icon', 'ic:round-unfold-more')
//             }
//         })

//         if (clickedHeader.sortIcon[0].getAttribute('data-icon') == 'ic:round-unfold-more') {
//             clickedHeader.sortIcon[0].setAttribute('data-icon', 'ic:round-keyboard-arrow-up')
//         }

//         if (clickedHeader.sortIcon[0].classList.contains('rot-180')) {
//             orderFiles(headerID, 'asc')
//         }
//         else {
//             orderFiles(headerID, 'desc')
//         }

//         clickedHeader.sortIcon[0].classList.toggle('rot-180')
//     }
// }

// function loadFiles() {
//     stopCurrentQuery()
//     stopCurrentQuery = currentQuery.onSnapshot(
//         snapshot => {
//             console.log(snapshot)
//             currentFilesSnap = snapshot
//             listFiles(snapshot)
//         },
//         error => {
//             console.error('Error getting files: ' + error)
//             setOverlayState('empty')
//         }
//     )
// }

// function listFiles(snap) {
//     if (snap.docs.length > 0) {
//         filesList.innerHTML = ''
//         currentRefQueries.forEach(stopRefQuery => stopRefQuery())
//         currentRefQueries = []
//         snap.forEach(fileSnap => {
//             setOverlayState('hide')

//             const tr = document.createElement('tr')
//             tr.id = fileSnap.id
//             tr.ondblclick = () => {
//                 if (getSelectedText() == '') {
//                     ipcRenderer.send('new-window', 'file', selectedFileID, selectFileType.value)
//                 }
//             }
//             tr.onmousedown = mouseEvent => {
//                 if (mouseEvent.button != 1) {
//                     if (selectedFileID != fileSnap.id) {
//                         if (selectedFileRow) {
//                             selectedFileRow.classList.remove('selected')
//                         }
//                         selectedFile = currentQuery.doc(fileSnap.id)
//                         selectedFileID = fileSnap.id
//                         selectedFileRow = tr
//                         selectedFileRow.classList.add('selected')
//                     }
//                 }
//             }
//             tr.onmouseup = mouseEvent => {
//                 const hasSelection = getSelectedText() != ''

//                 if (hasSelection || mouseEvent.button == 2) {
//                     copyOption.hidden = !hasSelection
//                     tableRowContextMenu.querySelectorAll('li.mdc-list-item:not(#copy)').forEach(option => {
//                         option.hidden = hasSelection
//                     })
//                     tableRowContextMenu.style.left = (mouseEvent.clientX) + 'px'
//                     tableRowContextMenu.style.top = (mouseEvent.clientY) + 'px'
//                     tableRowContextMenu.materialComponent.setAbsolutePosition((mouseEvent.clientX), (mouseEvent.clientY))
//                     tableRowContextMenu.materialComponent.open = true
//                 }
//             }
//             if (tr.id == selectedFileID) {
//                 selectedFile = currentQuery.doc(selectedFileID)
//                 selectedFileRow = tr
//                 selectedFileRow.classList.add('selected')
//             }
//             filesList.appendChild(tr)

//             for (const column of tableHeadersList.children) {
//                 const td = document.createElement('td')
//                 td.id = column.id
//                 tr.appendChild(td)

//                 if (td.id == '__name__') {
//                     td.textContent = fileSnap.id
//                 }
//                 else {
//                     const value = fileSnap.get(td.id)
//                     if (value != undefined) {
//                         if (typeof value === 'object' && value !== null) {
//                             currentRefQueries.push(
//                                 value.onSnapshot(
//                                     snapshot => {
//                                         td.textContent = snapshot.get('name')
//                                         orderFiles(currentOrder, currentOrderDirection)
//                                     },
//                                     error => {
//                                         console.error(error)
//                                     }
//                                 )
//                             )
//                         }
//                         else {
//                             td.textContent = value
//                         }
//                     }
//                 }
//             }
//         })
//         orderFiles(currentOrder, currentOrderDirection)
//     }
//     else {
//         setOverlayState('empty')
//     }
// }

// function orderFiles(orderBy, orderDirection) {
//     let switching, i, shouldSwitch
//     do {
//         switching = false
//         for (i = 0; i < filesList.childElementCount - 1; i++) {
//             shouldSwitch = false

//             const a = filesList.children[i].children[orderBy]
//             const b = filesList.children[i + 1].children[orderBy]

//             if (orderDirection == 'asc') {
//                 if (a.innerHTML.toLowerCase() > b.innerHTML.toLowerCase()) {
//                     shouldSwitch = true
//                     break
//                 }
//             }
//             else if (orderDirection == 'desc') {
//                 if (a.innerHTML.toLowerCase() < b.innerHTML.toLowerCase()) {
//                     shouldSwitch = true
//                     break
//                 }
//             }
//         }
//         if (shouldSwitch) {
//             filesList.children[i].parentElement.insertBefore(filesList.children[i + 1], filesList.children[i])
//             switching = true
//         }
//     }
//     while (switching)

//     currentOrder = orderBy
//     currentOrderDirection = orderDirection
// }

// function setOverlayState(state) {
//     switch (state) {
//         case 'loading':
//             filesOverlay.classList.remove('hide')
//             filesOverlay.classList.remove('show-headers')
//             filesOverlayIcon[0].setAttribute('data-icon', 'eos-icons:loading')
//             filesOverlayText.hidden = true
//             break
//         case 'empty':
//             filesOverlay.classList.remove('hide')
//             filesOverlay.classList.remove('show-headers')
//             filesOverlayIcon[0].setAttribute('data-icon', 'ic:round-sentiment-dissatisfied')
//             filesOverlayText.hidden = false
//             filesOverlayText.innerText = translate('CASES') + ' ' + translate('NOT_FOUND')
//             break
//         case 'drag':
//             filesOverlay.classList.remove('hide')
//             filesOverlay.classList.add('show-headers')
//             filesOverlayIcon[0].setAttribute('data-icon', 'mdi:archive-arrow-up-outline')
//             filesOverlayText.hidden = false
//             filesOverlayText.innerText = translate('DRAG_AND_DROP')
//             break
//         case 'hide':
//             filesOverlay.classList.add('hide')
//             break
//         default:
//             break
//     }
// }

// const tableRowContextMenu = document.getElementById('tableRowContextMenu')
// const copyOption = tableRowContextMenu.children[0].children['copy']
// copyOption.onclick = copySelectionToClipboard
// const editOption = tableRowContextMenu.children[0].children['edit']
// editOption.icon = editOption.getElementsByClassName('iconify')
// editOption.label = editOption.querySelector('.mdc-list-item__text')
// editOption.onclick = () => ipcRenderer.send('new-window', 'file', selectedFileID, selectFileType.value)
// const deleteOption = tableRowContextMenu.children[0].children['delete']
// deleteOption.onclick = () => dialogDeleteFile.materialComponent.open()

// const dialogDeleteFile = document.querySelector('#dialogDeleteFile')

// dialogDeleteFile.materialComponent.listen('MDCDialog:closed', event => {
//     if (event.detail.action == 'delete') {
//         selectedFile.delete().then(() => {
//             selectedFile = undefined
//             selectedFileID = undefined
//         }).catch(error => {
//             console.error('Error removing file: ', error)
//         })
//     }
// })

// function getSelectedText() {
//     if (getSelection().toString().replaceAll('\n', '').replaceAll('\t', '').trim() != '') {
//         return getSelection().toString()
//     }
//     else {
//         return ''
//     }
// }

// function copySelectionToClipboard() {
//     const selectedText = getSelectedText()
//     if (selectedText != '') {
//         navigator.clipboard.writeText(selectedText)
//         alert('"' + selectedText + '"' + translate('COPIED'))
//     }
// }

// function refreshAndSaveColumns() {
//     listFiles(currentFilesSnap)
//     let fileColumns = []
//     for (const header of tableHeadersList.children) {
//         fileColumns.push(header.id)
//     }
//     localStorage.setItem('fileColumns', fileColumns)
// }