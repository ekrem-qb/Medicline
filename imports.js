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

/* ----- Editable Select ----- */
require('jquery-editable-select')
$.fn.editableSelect.Constructor.DEFAULTS.effects = 'slide'

let editableSelectList = document.getElementsByClassName('editable-select')
for (const key in editableSelectList) {
    if (editableSelectList.hasOwnProperty(key)) {
        const element = editableSelectList[key];
        element.parentElement.style.zIndex = (editableSelectList.length - key).toString()
        $(element).editableSelect()
    }
}
$('.filter').on('show.editable-select', function (e) {
    $(this).editableSelect('filter')
})

/* ----- Material Elements ----- */
const { MDCTextField } = require('@material/textfield')
const { MDCRipple } = require('@material/ripple')
const { MDCSelect } = require('@material/select')

Array.from(document.querySelectorAll('.mdc-text-field')).forEach(element => {
    element.querySelector('input, textarea').materialComponent = new MDCTextField(element)
})

Array.from(document.querySelectorAll('.mdc-button, .mdc-fab, .mdc-ripple-surface')).forEach(element => {
    element.materialRipple = new MDCRipple(element)
})

Array.from(document.querySelectorAll('.mdc-select')).forEach(element => {
    element.querySelector('input').materialComponent = new MDCSelect(element)
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