var currentLanguage = "en"
switch (navigator.language) {
    case "ru":
    case "tr":
        currentLanguage = navigator.language
        break
    default:
        break
}

var translateStrings = require("./langs/" + currentLanguage + ".json")

let textElements = document.querySelectorAll("[translate], [placeholder]")
textElements.forEach(textElement => {
    if (textElement.hasAttribute("placeholder")) {
        textElement.setAttribute("placeholder", translate(textElement.getAttribute("placeholder")))
    }
    else {
        textElement.innerText = translate(textElement.innerText)
    }
})

function translate(textToTranslate) {
    if (translateStrings.hasOwnProperty(textToTranslate)) {
        return translateStrings[textToTranslate]
    }
    else if (textToTranslate.includes("-")) {
        return translateStrings[textToTranslate.split("-")[1]] + " " + translateStrings[textToTranslate.split("-")[0]]
    }
    else if (!Number.isNaN(parseInt(textToTranslate.slice(-1)))) {
        return translateStrings[textToTranslate.slice(0, -1)] + " " + textToTranslate.slice(-1)
    }
}
