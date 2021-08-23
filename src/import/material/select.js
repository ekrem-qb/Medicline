const { MDCSelect } = require('@material/select')

for (const element of document.getElementsByClassName('mdc-select')) {
    element.materialComponent = new MDCSelect(element)
}