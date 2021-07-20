const { MDCRipple } = require('@material/ripple')

document.querySelectorAll('.mdc-ripple-surface, .mdc-button, .mdc-icon-button, .mdc-fab').forEach(rippleElement => {
    rippleElement.materialRipple = new MDCRipple(rippleElement)
    if (rippleElement.classList.contains("mdc-icon-button")) {
        rippleElement.materialRipple.unbounded = true
    }
})
