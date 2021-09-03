const { MDCTextField } = require('@material/textfield')

for (const element of document.getElementsByClassName('mdc-text-field')) {
    element.querySelector('input, textarea').materialComponent = new MDCTextField(element)
}