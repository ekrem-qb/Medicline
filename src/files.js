const filesTabPage = document.querySelector('.tab-page#files')
filesTabPage.stopLoadingContent = () => {
    stopFilesCurrentQuery()
    stopFilesCurrentQuery = () => { }
    filesCurrentQuery = undefined
    currentFilesRefQueries.forEach(stopRefQuery => stopRefQuery())
    currentFilesRefQueries = []
}
filesTabPage.loadContent = () => {
    filesTabPage.stopLoadingContent()
    loadFiles()
}

const filesOverlay = filesTabPage.querySelector('.overlay')
const filesOverlayIcon = filesOverlay.getElementsByClassName('iconify')
const filesOverlayText = filesOverlay.querySelector('h3')

const filesTable = filesTabPage.querySelector('table')
filesTable.parentElement.onscroll = () => inlineEdit.moveToAnchor()
const filesList = filesTable.querySelector('tbody#filesList')
let filesCurrentOrder, filesCurrentOrderDirection

const fileColumnsJSON = require('./fileColumns.json')
const filesHeadersList = filesTable.querySelector('#filesHeadersList')
const filesHeaderTemplate = document.getElementById('filesHeaderTemplate')

function newFileHeader(headerID) {
    const th = filesHeaderTemplate.content.firstElementChild.cloneNode(true)
    new MDCRipple(th)
    th.id = headerID

    th.onmousedown = mouseEvent => {
        if (mouseEvent.button == 0) {
            if (th.parentElement != filesHeadersList) {
            }
        }
    }
    th.onmouseup = () => {
        if (th.parentElement != filesHeadersList) {
            if (filesList.childElementCount > 0) {
                setFilesOverlayState('hide')
            }
            else {
                setFilesOverlayState('empty')
            }
        }
    }
    th.onclick = () => filesHeaderClick(headerID)

    const label = th.querySelector('label')
    label.textContent = translate(fileColumnsJSON[headerID])

    th.sortIcon = th.getElementsByClassName('iconify')

    return th
}

function loadFileColumns() {
    setFilesOverlayState('loading')

    let columns = Object.keys(fileColumnsJSON)
    if (localStorage.getItem('fileColumns')) {
        columns = localStorage.getItem('fileColumns').split(',')
    }
    columns.forEach(headerID => filesHeadersList.appendChild(newFileHeader(headerID)))

    if (filesHeadersList.children['name']) {
        filesHeaderClick('name')
        filesHeaderClick('name')
    }
    else {
        filesHeaderClick(filesHeadersList.firstChild.id)
    }
}

loadFileColumns()

let filesCurrentQuery
let filesCurrentFilesSnap
let stopFilesCurrentQuery = () => { }
let currentFilesRefQueries = []
let selectedFile, selectedFileRow, selectedFileID
let attachPdf

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        if (filesTabPage.classList.contains('show')) {
            filesTabPage.loadContent()
        }
    }
    else {
        filesTabPage.stopLoadingContent()
    }
})

const inputNewFile = filesTabPage.querySelector('input#newFile')
inputNewFile.onchange = () => {
    if (inputNewFile.files[0]) {
        inputFileName.value = inputNewFile.files[0].name.slice(0, inputNewFile.files[0].name.lastIndexOf('.'))
        inputFileName.fileType = inputNewFile.files[0].name.slice(inputNewFile.files[0].name.lastIndexOf('.')).toLowerCase()
        inputFileName.focus()
        inputFileName.parentElement.parentElement.classList.remove('hide')
        buttonUploadFile.classList.add('hide')
    }
}
const buttonUploadFile = filesTabPage.querySelector('button#uploadFile')
buttonUploadFile.onclick = () => {
    if (filesCurrentQuery) {
        if (attachPdf) {
            inputFileName.value = attachPdf.name.slice(0, attachPdf.name.lastIndexOf('.'))
            inputFileName.fileType = attachPdf.name.slice(attachPdf.name.lastIndexOf('.')).toLowerCase()
            inputFileName.focus()
            inputFileName.parentElement.parentElement.classList.remove('hide')
            buttonUploadFile.classList.add('hide')
        }
        else {
            inputNewFile.click()
        }
    }
}
const inputFileName = filesTabPage.querySelector('input#fileName')
inputFileName.oninput = () => inputFileName.materialComponent.valid = inputFileName.value.trim() != ''
inputFileName.onchange = () => inputFileName.value = inputFileName.value.trim()
inputFileName.onkeydown = event => {
    switch (event.key) {
        case 'Enter':
            buttonDoneFile.click()
            break
        case 'Escape':
            buttonCancelFile.click()
            break
    }
}
const buttonDoneFile = filesTabPage.querySelector('button#doneFile')
buttonDoneFile.onclick = () => {
    if (filesCurrentQuery && (attachPdf || inputNewFile.files[0]) && inputFileName.value.trim() != '') {
        filesCurrentQuery.add({
            name: inputFileName.value + inputFileName.fileType,
            createUser: allUsers.doc(firebase.auth().currentUser.uid),
            createDate: firebase.firestore.Timestamp.now()
        }).then(snapshot => {
            storage.child(snapshot.parent.parent.id + '/' + snapshot.id + inputFileName.fileType).put(attachPdf || inputNewFile.files[0], { name: inputFileName.value + inputFileName.fileType }).on('state_changed',
                (snapshot) => {
                    const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                    console.log('Upload is ' + percent + '% done')

                    if (percent == 100) {
                        inputNewFile.value = ''
                        attachPdf = undefined
                        inputFileName.parentElement.parentElement.classList.add('hide')
                        buttonUploadFile.classList.remove('hide')
                    }
                },
                (error) => {
                    console.error('Error uploading file: ', error)
                }
            )
        }).catch(error => {
            console.error('Error creating file: ', error)
        })
    }
}
const buttonCancelFile = filesTabPage.querySelector('button#cancelFile')
buttonCancelFile.onclick = () => {
    inputNewFile.value = ''
    if (attachPdf) {
        tabBar.activateTab(tabBar.tabList.findIndex(tab => tab.id == 'proforma'))
        attachPdf = undefined
    }
    inputFileName.parentElement.parentElement.classList.add('hide')
    buttonUploadFile.classList.remove('hide')
}

function filesHeaderClick(headerID) {
    const clickedHeader = filesHeadersList.querySelector('th#' + headerID)
    if (clickedHeader) {
        filesHeadersList.querySelectorAll('[data-icon="ic:round-keyboard-arrow-up"]').forEach(otherHeaderIcon => {
            if (otherHeaderIcon.parentElement != clickedHeader) {
                otherHeaderIcon.classList.remove('rot-180')
                otherHeaderIcon.setAttribute('data-icon', 'ic:round-unfold-more')
            }
        })

        if (clickedHeader.sortIcon[0].getAttribute('data-icon') == 'ic:round-unfold-more') {
            clickedHeader.sortIcon[0].setAttribute('data-icon', 'ic:round-keyboard-arrow-up')
        }

        if (clickedHeader.sortIcon[0].classList.contains('rot-180')) {
            orderFiles(headerID, 'asc')
        }
        else {
            orderFiles(headerID, 'desc')
        }

        clickedHeader.sortIcon[0].classList.toggle('rot-180')
    }
}

function loadFiles() {
    if (selectedCase) {
        setFilesOverlayState('loading')
        filesCurrentQuery = selectedCase.collection('files')
        stopFilesCurrentQuery = filesCurrentQuery.onSnapshot(
            snapshot => {
                filesCurrentFilesSnap = snapshot
                listFiles(snapshot)
            },
            error => {
                console.error('Error getting files: ' + error)
                setFilesOverlayState('empty')
            }
        )
    }
    else {
        stopFilesCurrentQuery()
        stopFilesCurrentQuery = () => { }
        filesCurrentQuery = undefined
        setFilesOverlayState('empty')
    }
}

function listFiles(snap) {
    if (snap.docs.length > 0) {
        filesList.innerHTML = ''
        currentFilesRefQueries.forEach(stopRefQuery => stopRefQuery())
        currentFilesRefQueries = []
        snap.forEach(fileSnap => {
            setFilesOverlayState('hide')

            const tr = document.createElement('tr')
            tr.id = fileSnap.id
            tr.onmousedown = mouseEvent => {
                if (mouseEvent.button != 1) {
                    if (selectedFileID != fileSnap.id) {
                        if (selectedFileRow) {
                            selectedFileRow.classList.remove('selected')
                        }
                        selectedFile = filesCurrentQuery.doc(fileSnap.id)
                        selectedFileID = fileSnap.id
                        selectedFileRow = tr
                        selectedFileRow.classList.add('selected')
                    }
                }
            }
            tr.onmouseup = mouseEvent => {
                if (mouseEvent.button == 2) {
                    filesContextMenu.style.left = mouseEvent.clientX + 'px'
                    filesContextMenu.style.top = mouseEvent.clientY + 'px'
                    filesContextMenu.materialComponent.setAbsolutePosition(mouseEvent.clientX, mouseEvent.clientY)
                    filesContextMenu.materialComponent.open = true
                }
            }
            if (tr.id == selectedFileID) {
                selectedFile = filesCurrentQuery.doc(selectedFileID)
                selectedFileRow = tr
                selectedFileRow.classList.add('selected')
            }
            filesList.appendChild(tr)

            for (const column of filesHeadersList.children) {
                const td = document.createElement('td')
                td.id = column.id
                tr.appendChild(td)

                if (td.id == '__name__') {
                    td.textContent = fileSnap.id
                }
                else {
                    const value = fileSnap.get(td.id)
                    if (value != undefined) {
                        if (td.id.includes('Date')) {
                            td.textContent = new Date(value.seconds * 1000).toLocaleString('tr').replace(',', '')
                            td.realValue = value.seconds
                        }
                        else if (typeof value === 'object' && value !== null) {
                            currentFilesRefQueries.push(
                                value.onSnapshot(
                                    snapshot => {
                                        td.textContent = snapshot.get('name')
                                        orderFiles(filesCurrentOrder, filesCurrentOrderDirection)
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
                if (td.id == 'name') {
                    td.onclick = () => {
                        const fileName = td.textContent
                        inlineEdit.show(td, fileSnap.ref.path, fileName.slice(0, fileName.lastIndexOf('.')))
                        inlineEditInput.fileType = fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
                    }
                }
            }
        })
        orderFiles(filesCurrentOrder, filesCurrentOrderDirection)
    }
    else {
        setFilesOverlayState('empty')
    }
}

function orderFiles(orderBy, orderDirection) {
    let switching, i, shouldSwitch
    do {
        switching = false
        for (i = 0; i < filesList.childElementCount - 1; i++) {
            shouldSwitch = false

            let a = filesList.children[i].children[orderBy]
            if (a.realValue != undefined) {
                a = a.realValue
            }
            else {
                a = a.textContent.toLowerCase()
            }

            let b = filesList.children[i + 1].children[orderBy]
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
            filesList.children[i].parentElement.insertBefore(filesList.children[i + 1], filesList.children[i])
            switching = true
        }
    }
    while (switching)

    filesCurrentOrder = orderBy
    filesCurrentOrderDirection = orderDirection
}

function setFilesOverlayState(state) {
    switch (state) {
        case 'loading':
            filesOverlay.classList.remove('hide')
            filesOverlay.classList.remove('show-headers')
            filesOverlayIcon[0].setAttribute('data-icon', 'eos-icons:loading')
            filesOverlayText.hidden = true
            break
        case 'empty':
            filesOverlay.classList.remove('hide')
            filesOverlay.classList.remove('show-headers')
            filesOverlayIcon[0].setAttribute('data-icon', 'ic:round-sentiment-dissatisfied')
            filesOverlayText.hidden = false
            filesOverlayText.innerText = translate('FILES') + ' ' + translate('NOT_FOUND')
            break
        case 'hide':
            filesOverlay.classList.add('hide')
            break
    }
}

const inputReplaceFile = filesTabPage.querySelector('input#replaceFile')
inputReplaceFile.onchange = () => {
    if (inputReplaceFile.value != '' && selectedCaseID && selectedFileID) {
        if (inputReplaceFile.files[0].name.slice(inputReplaceFile.files[0].name.lastIndexOf('.')).toLowerCase() == inputReplaceFile.accept) {
            storage.child(selectedCaseID + '/' + selectedFileID + inputReplaceFile.files[0].name.slice(inputReplaceFile.files[0].name.lastIndexOf('.')).toLowerCase()).put(inputReplaceFile.files[0], {
                name: selectedCaseID + '/' + selectedFileID + inputReplaceFile.files[0].name.slice(inputReplaceFile.files[0].name.lastIndexOf('.')).toLowerCase()
            }).on('state_changed',
                (snapshot) => {
                    const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                    console.log('Upload is ' + percent + '% done')

                    if (percent == 100) {
                        inputReplaceFile.value = ''
                        inputReplaceFile.accept = ''

                        const fullpath = snapshot.metadata.fullPath.split('.')[0].split('/')

                        allCases.doc(fullpath[0] + '/files/' + fullpath[1]).update({
                            updateUser: allUsers.doc(firebase.auth().currentUser.uid),
                            updateDate: firebase.firestore.Timestamp.now()
                        }).then(() => {

                        }).catch(error => {
                            console.error('Error updating file: ', error)
                        })
                    }
                },
                (error) => {
                    console.error('Error replacing file: ', error)
                }
            )
        }
        else {
            alert(translate('WRONG_FILE_TYPE'))
        }
    }
}

const filesContextMenu = document.getElementById('filesContextMenu')
filesContextMenu.downloadOption = filesContextMenu.children[0].children['download']
filesContextMenu.downloadOption.onclick = () => {
    if (selectedCaseID && selectedFileRow) {
        const fileName = selectedFileRow.children['name'].textContent
        storage.child(selectedCaseID + '/' + selectedFileID + fileName.slice(fileName.lastIndexOf('.')).toLowerCase()).getDownloadURL().then(url => {
            ipcRenderer.send('download', url, fileName)
        }).catch(error => {
            console.error('Error downloading file: ', error)
        })
    }
}
filesContextMenu.renameOption = filesContextMenu.children[0].children['rename']
filesContextMenu.renameOption.onclick = () => {
    const fileName = selectedFileRow.children['name'].textContent
    inlineEdit.show(selectedFileRow.children['name'], selectedFile.path, fileName.slice(0, fileName.lastIndexOf('.')))
    inlineEditInput.fileType = fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
}
filesContextMenu.replaceOption = filesContextMenu.children[0].children['replace']
filesContextMenu.replaceOption.onclick = () => {
    if (filesCurrentQuery) {
        inputReplaceFile.accept = selectedFileRow.children['name'].textContent.slice(selectedFileRow.children['name'].textContent.lastIndexOf('.')).toLowerCase()
        inputReplaceFile.click()
    }
}
filesContextMenu.deleteOption = filesContextMenu.children[0].children['delete']
filesContextMenu.deleteOption.onclick = () => dialogDeleteFile.materialComponent.open()

const dialogDeleteFile = filesTabPage.querySelector('#dialogDeleteFile')
dialogDeleteFile.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == 'delete') {
        if (selectedCaseID && selectedFileRow) {
            storage.child(selectedCaseID + '/' + selectedFileID + selectedFileRow.children['name'].textContent.slice(selectedFileRow.children['name'].textContent.lastIndexOf('.')).toLowerCase()).delete().then(() => {
                selectedFile.delete().then(() => {
                    selectedFile = undefined
                    selectedFileID = undefined
                }).catch(error => {
                    console.error('Error removing file from firestore: ', error)
                })
            }).catch(error => {
                if (error.code == 'storage/object-not-found') {
                    selectedFile.delete().then(() => {
                        selectedFile = undefined
                        selectedFileID = undefined
                    }).catch(error => {
                        console.error('Error removing file from firestore: ', error)
                    })
                }
                else {
                    console.error('Error removing file from storage: ', error)
                }
            })
        }
    }
})

function refreshAndSaveFileColumns() {
    listFiles(filesCurrentFilesSnap)
    let fileColumns = []
    for (const header of filesHeadersList.children) {
        fileColumns.push(header.id)
    }
    localStorage.setItem('fileColumns', fileColumns)
}

const inlineEditInput = inlineEdit.querySelector('input')
const saveButton = inlineEdit.querySelector('button#save')
const saveButtonIcon = saveButton.getElementsByClassName('iconify')

saveButton.onclick = () => {
    if (inlineEditInput.value != '' && inlineEditInput.value != inlineEditInput.oldValue) {
        saveButtonIcon[0].setAttribute('data-icon', 'eos-icons:loading')

        db.doc(inlineEditPath).update({
            name: inlineEditInput.value.trim() + inlineEditInput.fileType
        }).then(() => {
            saveButton.disabled = true
            saveButtonIcon[0].setAttribute('data-icon', 'ic:round-done')
            inlineEdit.hide()
        }).catch(error => {
            saveButtonIcon[0].setAttribute('data-icon', 'ic:round-done')
            console.error('Error updating file name: ', error)
        })
    }
}

inlineEditInput.oninput = () => {
    if (inlineEditInput.value.trim() != '' && inlineEditInput.value.trim() != inlineEditInput.oldValue) {
        saveButton.disabled = false
    } else {
        saveButton.disabled = true
    }
}
inlineEditInput.onchange = () => inlineEditInput.value = inlineEditInput.value.trim()

inlineEditInput.onblur = event => {
    if (event.relatedTarget != null) {
        if (event.relatedTarget.parentElement == inlineEdit) {
            return
        }
    }
    inlineEdit.hide()
}

inlineEditInput.onkeydown = event => {
    switch (event.key) {
        case 'Enter':
            saveButton.click()
            break
        case 'Escape':
            inlineEdit.hide()
            break
    }
}