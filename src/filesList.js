const filesOverlay = document.getElementById('filesOverlay')
const filesOverlayIcon = filesOverlay.getElementsByClassName('iconify')
const filesOverlayText = filesOverlay.querySelector('h3')

const filesTable = document.querySelector('table#files')
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
                setFilesOverlayState('drag')
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

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        loadFiles()
    }
    else {
        stopFilesCurrentQuery()
        currentFilesRefQueries.forEach(stopRefQuery => stopRefQuery())
    }
})

const inputNewFile = document.querySelector('input#newFile')
inputNewFile.onchange = () => {
    if (inputNewFile.value != '') {
        const fileName = inputNewFile.files[0].name.split('.')
        if (fileName.length > 1) {
            inputFileName.value = fileName[0]
            inputFileName.fileType = fileName[1]
            inputFileName.focus()
            inlineEdit.classList.add('show')
            buttonUploadFile.classList.add('hide')
        }
    }
}
const buttonUploadFile = document.querySelector('button#uploadFile')
buttonUploadFile.onclick = () => {
    if (filesCurrentQuery) {
        inputNewFile.click()
    }
}
const inlineEdit = document.getElementById('inlineEdit')
const inputFileName = inlineEdit.querySelector('input#fileName')
inputFileName.oninput = () => {
    inputFileName.materialComponent.valid = inputFileName.value != ''
}
const buttonDoneFile = inlineEdit.querySelector('button#doneFile')
buttonDoneFile.onclick = () => {
    if (filesCurrentQuery && inputNewFile.value != '' && inputFileName.value != '') {
        filesCurrentQuery.add({
            name: inputFileName.value + '.' + inputFileName.fileType,
            createUser: allUsers.doc(firebase.auth().currentUser.uid),
            createDate: firebase.firestore.Timestamp.now()
        }).then(snapshot => {
            storage.child(snapshot.parent.parent.id + '/' + snapshot.id + '.' + inputFileName.fileType).put(inputNewFile.files[0], { name: inputFileName.value + '.' + inputFileName.fileType }).on('state_changed',
                (snapshot) => {
                    const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                    console.log('Upload is ' + percent + '% done')

                    if (percent == 100) {
                        inputNewFile.value = ''
                        inlineEdit.classList.remove('show')
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
const buttonCancelFile = inlineEdit.querySelector('button#cancelFile')
buttonCancelFile.onclick = () => {
    inputNewFile.value = ''
    inlineEdit.classList.remove('show')
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
    stopFilesCurrentQuery()
    if (selectedCase) {
        filesCurrentQuery = selectedCase.collection('files')
        stopFilesCurrentQuery = filesCurrentQuery.onSnapshot(
            snapshot => {
                console.log(snapshot)
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
        stopFilesCurrentQuery = () => { }
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
                if (getSelectedText() != '') {
                    textContextMenu.style.left = (mouseEvent.clientX) + 'px'
                    textContextMenu.style.top = (mouseEvent.clientY) + 'px'
                    textContextMenu.materialComponent.setAbsolutePosition((mouseEvent.clientX), (mouseEvent.clientY))
                    textContextMenu.materialComponent.open = true
                }
                else if (mouseEvent.button == 2) {
                    filesContextMenu.style.left = (mouseEvent.clientX) + 'px'
                    filesContextMenu.style.top = (mouseEvent.clientY) + 'px'
                    filesContextMenu.materialComponent.setAbsolutePosition((mouseEvent.clientX), (mouseEvent.clientY))
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
                            td.textContent = new Date(value.seconds * 1000).toLocaleString()
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

            const a = filesList.children[i].children[orderBy]
            const b = filesList.children[i + 1].children[orderBy]

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
        case 'drag':
            filesOverlay.classList.remove('hide')
            filesOverlay.classList.add('show-headers')
            filesOverlayIcon[0].setAttribute('data-icon', 'mdi:archive-arrow-up-outline')
            filesOverlayText.hidden = false
            filesOverlayText.innerText = translate('DRAG_AND_DROP')
            break
        case 'hide':
            filesOverlay.classList.add('hide')
            break
        default:
            break
    }
}

const inputReplaceFile = document.querySelector('input#replaceFile')
inputReplaceFile.onchange = () => {
    if (inputReplaceFile.value != '') {
        const fileName = inputReplaceFile.files[0].name.split('.')
        if (fileName.length > 1 && selectedCaseID && selectedFileID) {
            if ('.' + fileName[1] == inputReplaceFile.accept) {
                storage.child(selectedCaseID + '/' + selectedFileID + '.' + fileName[1]).put(inputReplaceFile.files[0], { name: selectedCaseID + '/' + selectedFileID + '.' + fileName[1] }).on('state_changed',
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
                alert(translate('NOT_SAME_FILE_TYPE'))
            }
        }
    }
}

const filesContextMenu = document.getElementById('filesContextMenu')
filesContextMenu.downloadOption = filesContextMenu.children[0].children['download']
filesContextMenu.downloadOption.onclick = () => {
    if (selectedCaseID && selectedFileRow) {
        const fileName = selectedFileRow.children['name'].textContent
        storage.child(selectedCaseID + '/' + selectedFileID + '.' + fileName.split('.')[1]).getDownloadURL().then(url => {
            ipcRenderer.send('download', url, fileName)
        }).catch(error => {
            console.error('Error downloading file: ', error)
        })
    }
}
filesContextMenu.renameOption = filesContextMenu.children[0].children['rename']
filesContextMenu.renameOption.onclick = () => { }
filesContextMenu.replaceOption = filesContextMenu.children[0].children['replace']
filesContextMenu.replaceOption.onclick = () => {
    if (filesCurrentQuery) {
        inputReplaceFile.accept = '.' + selectedFileRow.children['name'].textContent.split('.')[1]
        inputReplaceFile.click()
    }
}
filesContextMenu.deleteOption = filesContextMenu.children[0].children['delete']
filesContextMenu.deleteOption.onclick = () => dialogDeleteFile.materialComponent.open()

const dialogDeleteFile = document.querySelector('#dialogDeleteFile')
dialogDeleteFile.materialComponent.listen('MDCDialog:closed', event => {
    if (event.detail.action == 'delete') {
        if (selectedCaseID && selectedFileRow) {
            storage.child(selectedCaseID + '/' + selectedFileID + '.' + selectedFileRow.children['name'].textContent.split('.')[1]).delete().then(() => {
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