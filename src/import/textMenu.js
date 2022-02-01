const textContextMenu = document.getElementById('textContextMenu')
textContextMenu.copyOption = textContextMenu.children[0].children['copy']
textContextMenu.copyOption.onclick = copySelectionToClipboard

function getSelectedText() {
    const selection = getSelection().toString().trim()
    if (selection.replaceAll('\n', '').replaceAll('\t', '').replaceAll('-', '').replaceAll('_', '').replaceAll(':', '').replaceAll('.', '').trim() != '') {
        return selection
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

if (textContextMenu) {
    document.onmouseup = mouseEvent => {
        if (mouseEvent.detail == 2) {
            if (getSelectedText() != '') {
                textContextMenu.style.left = mouseEvent.clientX + 2 + 'px'
                textContextMenu.style.top = mouseEvent.clientY + 2 + 'px'
                textContextMenu.materialComponent.setAbsolutePosition(mouseEvent.clientX + 2, mouseEvent.clientY + 2)
                textContextMenu.materialComponent.open = true
            }
        }
    }
}