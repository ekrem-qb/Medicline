const textContextMenu = document.getElementById('textContextMenu')
textContextMenu.copyOption = textContextMenu.children[0].children['copy']
textContextMenu.copyOption.onclick = copySelectionToClipboard

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