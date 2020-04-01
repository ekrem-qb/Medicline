var timerInterval = setInterval(timer, 1000)

const buttonCreate = document.getElementById('buttonCreate')

const formEditData = document.getElementById('formEditData')

const inputName = document.getElementById('inputName')
const inputSurname = document.getElementById('inputSurname')
const inputBirthDate = document.getElementById('inputBirthDate')
const inputCreateDate = document.getElementById('inputCreateDate')

const formUpdate = document.getElementById('formUpdate')
const inputUpdateDate = document.getElementById('inputUpdateDate')

const buttonSave = document.getElementById('buttonSave')
const buttonCancel = document.getElementById('buttonCancel')
const buttonDelete = document.getElementById('buttonDelete')

const personsList = document.getElementById('personsList')
const rowPersons = document.getElementsByClassName('rowPerson')

const persons = firebase.database().ref().child("persons")
var personId, person
var exists

function timer() {
    inputCreateDate.value = new Date().toLocaleString()
}

buttonCreate.onclick = function () {
    clearPerson()

    exists = true
    while (exists) {
        personId = new Date().getFullYear().toString().substr(-2) + (Math.floor(Math.random() * (99999 - 10000)) + 10000).toString()
        person = persons.child(personId)
        person.once('value', function (snapshot) {
            exists = snapshot.exists()
        })
        console.log(personId + ' ' + exists)
    }

    formEditData.style.display = "block"
    timerInterval = setInterval(timer, 100)
}

function clearPerson() {
    personId = null
    person = null
    inputName.value = null
    inputSurname.value = null
    inputBirthDate.value = null
    inputCreateDate.value = null
    inputUpdateDate.value = null
    formEditData.style.display = "none"
    formUpdate.style.display = "none"
    buttonDelete.style.display = "none"
}

buttonSave.onclick = function () {
    if (exists) {
        person.update({
            name: inputName.value,
            surname: inputSurname.value,
            birthDate: inputBirthDate.value,
            updateDate: new Date().toUTCString()
        })
    } else {
        person.set({
            name: inputName.value,
            surname: inputSurname.value,
            birthDate: inputBirthDate.value,
            createDate: new Date().toUTCString()
        })
    }

    clearPerson()
}

buttonCancel.onclick = function () {
    clearPerson()
}

buttonDelete.onclick = function () {
    person.remove()

    clearPerson()
}

persons.on('value', function (snapshot) {
    personsList.innerHTML = null

    snapshot.forEach(p => {
        var tr = document.createElement('tr')
        tr.id = p.key
        tr.className = 'rowPerson'
        personsList.appendChild(tr)

        var td_Name = document.createElement('td')
        tr.appendChild(td_Name)
        td_Name.textContent = p.child('name').val()

        var td_Surname = document.createElement('td')
        tr.appendChild(td_Surname)
        td_Surname.textContent = p.child('surname').val()

        var td_BirthDate = document.createElement('td')
        tr.appendChild(td_BirthDate)
        td_BirthDate.textContent = p.child('birthDate').val()
    })

    Array.from(rowPersons).forEach(rowPerson => {
        rowPerson.ondblclick = function () {
            clearPerson()

            personId = rowPerson.id
            person = snapshot.child(personId)

            formEditData.style.display = 'block'
            formUpdate.style.display = 'block'
            buttonDelete.style.display = 'inline-block'

            inputName.value = person.child('name').val()
            inputSurname.value = person.child('surname').val()
            inputBirthDate.value = person.child('birthDate').val()
            clearInterval(timerInterval)
            inputCreateDate.value = new Date(person.child('createDate').val()).toLocaleString()

            if (person.hasChild('updateDate')) {
                inputUpdateDate.value = new Date(person.child('updateDate').val()).toLocaleString()
            }

            person = persons.child(personId)

            person.once('value', function (snapshot) {
                exists = snapshot.exists()
            })
            console.log(personId + ' ' + exists)
        }
    })
})