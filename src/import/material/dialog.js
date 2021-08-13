const { MDCDialog } = require('@material/dialog')

for (const element of document.getElementsByClassName('mdc-dialog')) {
    element.materialComponent = new MDCDialog(element)
}