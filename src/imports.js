const jQuery = $ = require('jquery')

//#region Firebase

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

//#endregion

//#region Editable Select

require('jquery-editable-select')
$.fn.editableSelect.Constructor.DEFAULTS.effects = 'slide'

let editableSelectList = document.querySelectorAll('.editable-select')
for (let key in editableSelectList) {
    if (editableSelectList.hasOwnProperty(key)) {
        let select = editableSelectList[key]
        select.parentElement.style.zIndex = (editableSelectList.length - key).toString()
        $(select).editableSelect()
    }
}

//#endregion

//#region Material Elements

const { MDCTextField } = require('@material/textfield')
const { MDCRipple } = require('@material/ripple')
const { MDCMenu } = require('@material/menu')
const { MDCDialog } = require('@material/dialog')

document.querySelectorAll('.mdc-text-field').forEach(inputElement => {
    inputElement.querySelector('input, textarea').materialComponent = new MDCTextField(inputElement)
})

document.querySelectorAll('.mdc-button, .mdc-ripple-surface, .mdc-icon-button, .mdc-fab, .mdc-list-item__ripple').forEach(rippleElement => {
    rippleElement.materialRipple = new MDCRipple(rippleElement)
    if (rippleElement.classList.contains("mdc-icon-button")) {
        rippleElement.materialRipple.unbounded = true
    }
})

document.querySelectorAll('.mdc-menu').forEach(menuElement => {
    menuElement.materialComponent = new MDCMenu(menuElement)
    menuElement.materialComponent.setFixedPosition(true)
})

document.querySelectorAll('.mdc-dialog').forEach(dialogElement => {
    dialogElement.materialComponent = new MDCDialog(dialogElement)
})

//#endregion

//#region Table Export

const { TableExport } = require('tableexport')

function buttonExportClick() {
    let table = TableExport(document.querySelectorAll('table'), {
        filename: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString(),
        exportButtons: false
    })
    let xlsxData = table.getExportData()['kases'].xlsx
    table.export2file(xlsxData.data, xlsxData.mimeType, xlsxData.filename, xlsxData.fileExtension, xlsxData.merges, xlsxData.RTL, xlsxData.sheetname)
}

//#endregion


var currentLanguage = "en"
switch (navigator.language) {
    case "ru":
    case "tr":
        currentLanguage = navigator.language
        break
    default:
        break
}

var translate = require("./langs/" + currentLanguage + ".json")

let textElements = document.querySelectorAll("[translate]")
textElements.forEach(textElement => {
    if (translate.hasOwnProperty(textElement.innerText)) {
        textElement.innerText = translate[textElement.innerText]
    }
    else if (textElement.innerText.includes("-")) {
        textElement.innerText = translate[textElement.innerText.split("-")[1]] + " " + translate[textElement.innerText.split("-")[0]]
    }
    else if (!Number.isNaN(parseInt(textElement.innerText.slice(-1)))) {
        textElement.innerText = translate[textElement.innerText.slice(0, -1)] + " " + textElement.innerText.slice(-1)
    }
})