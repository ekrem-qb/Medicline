const { MDCTextField } = require('@material/textfield')

document.querySelectorAll('.mdc-text-field').forEach(inputElement => {
    inputElement.querySelector('input, textarea').materialComponent = new MDCTextField(inputElement)
})
