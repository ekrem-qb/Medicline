const { MDCSnackbar } = require('@material/snackbar')
const snackbar = document.getElementById('snackbar')

if (snackbar != undefined) {
    snackbar.materialComponent = new MDCSnackbar(snackbar)
    snackbar.materialComponent.timeoutMs = 4000

    function alert(message) {
        snackbar.materialComponent.close()
        snackbar.materialComponent.labelText = message
        snackbar.materialComponent.open()
    }
}