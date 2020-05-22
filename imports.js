const jQuery = $ = require('jquery')

/* ----- Firebase ----- */
const firebase = require('firebase/app')
require('firebase/auth')
require('firebase/firestore')

var firebaseConfig = {
    apiKey: "AIzaSyBEMpWUykF8sZB83zlpZZpq5u5QgTID0W8",
    authDomain: "medicline-35e34.firebaseapp.com",
    databaseURL: "https://medicline-35e34.firebaseio.com",
    projectId: "medicline-35e34",
    storageBucket: "medicline-35e34.appspot.com",
    messagingSenderId: "169065015752",
    appId: "1:169065015752:web:efda915944a808ea24f8fd",
    measurementId: "G-K1XPKRC2L6"
}
firebase.initializeApp(firebaseConfig)

firebase.firestore().enablePersistence()
    .catch(function (err) {
        if (err.code == 'failed-precondition') {

        } else if (err.code == 'unimplemented') {

        }
    })

/* ----- Material Elements ----- */
const { MDCTextField } = require('@material/textfield')
const { MDCRipple } = require('@material/ripple')
const { MDCSelect } = require('@material/select')

Array.from(document.querySelectorAll('.mdc-text-field')).forEach(element => {
    element.querySelector('input, textarea').materialComponent = new MDCTextField(element)
})

Array.from(document.querySelectorAll('.mdc-button, .mdc-fab')).forEach(element => {
    element.materialRipple = new MDCRipple(element)
})

Array.from(document.querySelectorAll('.mdc-select')).forEach(element => {
    element.querySelector('input').materialComponent = new MDCSelect(element)
})

/* ----- Bootstrap Datepicker ----- */
const datepicker = require('bootstrap-datepicker')
require('bootstrap-datepicker/js/locales/bootstrap-datepicker.ru')
require('bootstrap-datepicker/js/locales/bootstrap-datepicker.tr')

$('.dateselect').datepicker({
    format: 'yyyy-mm-dd',
    language: navigator.language,
    todayHighlight: true,
    todayBtn: 'linked'
})

/* ----- Table Export ----- */
const TableExport = require('tableexport')

function buttonExportClick() {
    let table = TableExport(document.getElementsByTagName('table'), {
        filename: new Date().toJSON(),
        exportButtons: false
    })
    let xlsxData = table.getExportData()['persons'].csv
    table.export2file(xlsxData.data, xlsxData.mimeType, xlsxData.filename, xlsxData.fileExtension, xlsxData.merges, xlsxData.RTL, xlsxData.sheetname)
}