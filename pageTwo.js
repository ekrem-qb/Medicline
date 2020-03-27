const today = new Date()

const buttonCreate = document.getElementById('buttonCreate')

const formEditData = document.getElementById('formEditData')

const inputName = document.getElementById('inputName')
const inputSurname = document.getElementById('inputSurname')
const inputDate = document.getElementById('inputDate')

const buttonSave = document.getElementById('buttonSave')
const buttonCancel = document.getElementById('buttonCancel')

const personsList = document.getElementById('personsList')

const persons = firebase.database().ref().child("persons")
var newPersonId, newPerson

buttonCreate.addEventListener('click', function () {
    newPersonId = today.getFullYear().toString().substr(-2) + (Math.floor(Math.random() * (9999 - 1000)) + 1000).toString()
    newPerson = persons.child(newPersonId)

    formEditData.style.display = "block"
})

function clearPerson() {
    newPersonId = null
    newPerson = null
    inputName.value = null
    inputSurname.value = null
    inputDate.value = null
    formEditData.style.display = "none"
}

buttonSave.addEventListener('click', function () {
    newPerson.set({
        name: inputName.value,
        surname: inputSurname.value,
        birthDate: inputDate.value,
        createDate: today.toString()
    })

    clearPerson()
})

buttonCancel.addEventListener('click', function () {
    clearPerson()
})

persons.on('value', function (snapshot) {
    personsList.innerHTML = null

    snapshot.forEach(person => {
        var tr = document.createElement('tr')
        personsList.appendChild(tr)


        var td_Name = document.createElement('td')
        tr.appendChild(td_Name)
        td_Name.textContent = person.child('name').val()

        var td_Surname = document.createElement('td')
        tr.appendChild(td_Surname)
        td_Surname.textContent = person.child('surname').val()

        var td_BirthDate = document.createElement('td')
        tr.appendChild(td_BirthDate)
        td_BirthDate.textContent = person.child('birthDate').val()
    })
})



