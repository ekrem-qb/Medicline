const { MDCRipple } = require('@material/ripple')

document.querySelectorAll('.mdc-button, .mdc-ripple-surface, .mdc-icon-button, .mdc-fab, .mdc-list-item__ripple').forEach(rippleElement => {
    rippleElement.materialRipple = new MDCRipple(rippleElement)
    if (rippleElement.classList.contains("mdc-icon-button")) {
        rippleElement.materialRipple.unbounded = true
    }
})
