const { MDCDialog } = require('@material/dialog')

document.querySelectorAll('.mdc-dialog').forEach(dialogElement => {
    dialogElement.materialComponent = new MDCDialog(dialogElement)
})
