const { MDCSnackbar } = require('@material/snackbar')

document.querySelectorAll('.mdc-snackbar').forEach(snackbarElement => {
    snackbarElement.materialComponent = new MDCSnackbar(snackbarElement)
    snackbarElement.materialComponent.timeoutMs = 4000
})

const snackbar = document.querySelector("#snackbar")

if (snackbar != undefined) {
    function alert(message) {
        snackbar.materialComponent.close()
        snackbar.materialComponent.labelText = message
        snackbar.materialComponent.open()
    }
}
