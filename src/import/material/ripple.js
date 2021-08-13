const { MDCRipple } = require('@material/ripple')

for (const element of document.querySelectorAll('.mdc-ripple-surface, .mdc-button, .mdc-icon-button, .mdc-fab')) {
    element.materialRipple = new MDCRipple(element)
    if (element.classList.contains('mdc-icon-button')) {
        element.materialRipple.unbounded = true
    }
}