const { MDCTextField } = require('@material/textfield')

for (const element of document.getElementsByClassName('mdc-text-field')) {
    element.getElementsByTagName('input', 'textarea')[0].materialComponent = new MDCTextField(element)
}