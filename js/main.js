'use strict'

let checkAnswerBtn,
	hideAnswerBtn,
	goodAnswerBtn,
	wrongAnswerBtn,
	drawCategoryBtn,
	drawQuestionBtn,
	startBtn,
	infoBtn,
	newGameBtn,
	buttons
let categoryTxt, questionTxt, jackpotTxt, answerTxt, answerBox, info, categoryName, questionSrc, categoryId, teams
// Lepszy sposób śledzenia wykorzystanych pytań i kategorii
let doneQuestions = [new Set(), new Set(), new Set(), new Set(), new Set()]
let availableCategories = [0, 1, 2, 3, 4]
let doneQuestionsCount = 0,
	jackpot = 0

const newGame = () => {
	window.location.reload()
}

const hideInfo = () => {
	info.classList.add('start--hidden')
	startBtn.innerText = 'Wróć do gry'
	newGameBtn.classList.remove('game__btn--disabled')
}

const showInfo = () => {
	info.classList.remove('start--hidden')
}

const disableBtn = btn => {
	btn.disabled = true
	btn.classList.add('game__btn--disabled')
}

const enableBtn = btn => {
	btn.disabled = false
	btn.classList.remove('game__btn--disabled')
}

const disableFields = () => {
	for (let [a, b, c] of teams) {
		a.disabled = true
		a.classList.add('game__auction-field--disabled')
	}
}

const enableFields = () => {
	for (let [a, b, c] of teams) {
		if (c > 0) {
			a.disabled = false
			a.classList.remove('game__auction-field--disabled')
		}
	}
}

const showAnswer = () => {
	answerBox.classList.remove('answer--hidden')
	handleAnswerButtons()
}

const hideAnswer = () => {
	answerBox.classList.add('answer--hidden')
	if (drawQuestionBtn.classList.contains('game__btn--disabled')) {
		enableBtn(checkAnswerBtn)
	}
}

const handleAnswerButtons = () => {
	// Sprawdzamy, czy jakikolwiek zespół postawił licytację
	const hasAnyBid = teams.some(team => parseInt(team[0].value) !== 0)

	if (
		hasAnyBid &&
		!checkAnswerBtn.classList.contains('game__btn--disabled') &&
		drawQuestionBtn.classList.contains('game__btn--disabled')
	) {
		enableBtn(goodAnswerBtn)
		enableBtn(wrongAnswerBtn)
	} else {
		disableBtn(goodAnswerBtn)
		disableBtn(wrongAnswerBtn)
	}
}

// Ulepszona funkcja losowania kategorii
const drawCategory = () => {
	setMaxInputValues()
	if (doneQuestionsCount === 25) {
		answerTxt.innerText = 'To już wszystkie pytania, które przygotowaliśmy.'
		hideAnswerBtn.addEventListener('click', newGame)
		hideAnswerBtn.innerText = 'Nowa gra'
		showAnswer()
		disableBtn(drawCategoryBtn)
		disableBtn(checkAnswerBtn)
		return
	}

	// Ustaw początkową licytację
	for (let [a, b, c] of teams) {
		a.value = 10
	}
	bid()

	// Usuń kategorie, które mają wszystkie wykorzystane pytania
	const filteredCategories = availableCategories.filter(catId => doneQuestions[catId].size < 5)

	// Jeśli brak dostępnych kategorii, kończymy grę
	if (filteredCategories.length === 0) {
		answerTxt.innerText = 'Wykorzystano wszystkie dostępne pytania z każdej kategorii.'
		hideAnswerBtn.addEventListener('click', newGame)
		hideAnswerBtn.innerText = 'Nowa gra'
		showAnswer()
		disableBtn(drawCategoryBtn)
		disableBtn(checkAnswerBtn)
		return
	}

	// Losowanie kategorii z dostępnych
	const randomIndex = Math.floor(Math.random() * filteredCategories.length)
	const randomCategoryId = filteredCategories[randomIndex]

	fetch('data/categories.json')
		.then(res => res.json())
		.then(data => {
			categoryId = randomCategoryId
			categoryTxt.innerText = data[categoryId].categoryName
			questionSrc = `${data[categoryId].categorySrc}.json`

			// Aktualizuje listę dostępnych kategorii, jeśli ta kategoria ma już 4 wykorzystane pytania
			if (doneQuestions[categoryId].size === 4) {
				availableCategories = availableCategories.filter(id => id !== categoryId)
			}

			disableBtn(drawCategoryBtn)
			enableFields()
		})
		.catch(error => {
			console.error('Błąd podczas pobierania kategorii:', error)
			answerTxt.innerText = 'Wystąpił błąd podczas pobierania kategorii. Spróbuj ponownie.'
			showAnswer()
		})
}

// Ulepszona funkcja losowania pytania
const drawQuestion = () => {
	// Sprawdzenie remisu w licytacji
	const bids = teams.map(team => parseInt(team[0].value))
	const uniqueBids = [...new Set(bids)].sort((a, b) => b - a)

	if (uniqueBids.length > 1 && uniqueBids[0] === uniqueBids[1]) {
		answerTxt.innerText = 'Aby wygrać licytację, musisz przebić swojego przeciwnika.'
		showAnswer()
		return
	}

	disableBtn(drawQuestionBtn)
	enableBtn(checkAnswerBtn)
	disableFields()

	fetch(`data/${questionSrc}`)
		.then(res => res.json())
		.then(data => {
			// Znajdź wszystkie dostępne pytania (te, które nie zostały jeszcze wykorzystane)
			const availableQuestions = data.filter(question => !doneQuestions[categoryId].has(question.questionId))

			// Jeśli brak dostępnych pytań, wybierz inną kategorię
			if (availableQuestions.length === 0) {
				answerTxt.innerText = 'Wykorzystano już wszystkie pytania z tej kategorii. Wybierz inną.'
				showAnswer()
				enableBtn(drawCategoryBtn)
				disableBtn(checkAnswerBtn)
				return
			}

			// Losuj pytanie z dostępnych
			const randomIndex = Math.floor(Math.random() * availableQuestions.length)
			const selectedQuestion = availableQuestions[randomIndex]

			questionTxt.innerText = selectedQuestion.questionText
			answerTxt.innerText = selectedQuestion.questionAnswer

			// Zapisz wykorzystane pytanie
			doneQuestions[categoryId].add(selectedQuestion.questionId)
			doneQuestionsCount++
		})
		.catch(error => {
			console.error('Błąd podczas pobierania pytania:', error)
			answerTxt.innerText = 'Wystąpił błąd podczas pobierania pytania. Spróbuj ponownie.'
			showAnswer()
			enableBtn(drawCategoryBtn)
		})
}

const checkLose = () => {
	for (let [a, b, c] of teams) {
		if (c === 0) {
			a.classList.add('game__auction-field--disabled')
			a.disabled = true
			b.classList.add('game__auction-field--disabled')
		}
	}
}

const checkWin = () => {
	const winThreshold = 1500
	for (let [a, b, c] of teams) {
		if (c >= winThreshold) {
			hideAnswerBtn.innerText = 'Nowa gra'
			answerTxt.innerText = `Drużyna osiągnęła cel ${winThreshold} punktów! Koniec gry :)`
			hideAnswerBtn.addEventListener('click', newGame)
			disableBtn(drawCategoryBtn)
			showAnswer()
			return true
		}
	}
	return false
}

const checkFields = () => {
	for (let [a, b, c] of teams) {
		let value = a.value

		// Sprawdzanie czy wartość jest liczbą
		if (value === '' || isNaN(value)) {
			a.value = 10
			continue
		}

		// Konwersja na liczbę
		let numValue = Number(value)

		// Sprawdzenie limitu i minimalnej wartości
		if (numValue > c) {
			a.value = c
		} else if (!Number.isInteger(numValue)) {
			a.value = Math.round(numValue)
		} else if (numValue < 10 && c >= 10) {
			a.value = 10
		} else if (numValue < 0) {
			a.value = 0
		}
	}
}

const setMaxInputValues = () => {
	for (let [a, b, c] of teams) {
		a.setAttribute('max', c)
	}
}

const goodAnswer = () => {
	// Znajdź zespół z najwyższą licytacją
	let maxBid = -1
	let winningTeamIndex = -1

	for (let i = 0; i < teams.length; i++) {
		const bid = parseInt(teams[i][0].value)
		if (bid > maxBid) {
			maxBid = bid
			winningTeamIndex = i
		}
	}

	if (winningTeamIndex === -1) {
		console.error('Nie znaleziono zwycięskiego zespołu!')
		return
	}

	// Dodaj punkty do wygranej drużyny
	const currentPoints = parseInt(teams[winningTeamIndex][1].innerText)
	const jackpotValue = parseInt(jackpotTxt.innerText)
	const newPoints = currentPoints + jackpotValue

	teams[winningTeamIndex][2] = newPoints
	teams[winningTeamIndex][1].innerText = newPoints

	// Resetuj licytację i jackpot
	for (let [a, b, c] of teams) {
		a.value = 0
	}

	jackpot = 0
	jackpotTxt.innerText = jackpot
	questionTxt.innerText = ''

	hideAnswer()
	enableBtn(drawCategoryBtn)
	disableBtn(checkAnswerBtn)
	refreshTeams()
	handleAnswerButtons()
	disableFields()
	checkLose()
	checkWin()
}

const wrongAnswer = () => {
	refreshTeams()
	for (let [a, b, c] of teams) {
		a.value = 0
	}

	questionTxt.innerText = ''
	hideAnswer()
	enableBtn(drawCategoryBtn)
	disableBtn(checkAnswerBtn)
	disableFields()
	checkLose()
	checkWin()
	handleAnswerButtons()
}

const bid = () => {
	checkFields()

	// Oblicz nową wartość jackpota
	let newJackpot = jackpot

	for (let [a, b, c] of teams) {
		const bidValue = parseInt(a.value) || 0
		const newBalance = c - bidValue

		// Aktualizuj wyświetlany stan konta
		b.innerText = newBalance

		// Dodaj licytację do jackpota
		newJackpot += bidValue
	}

	jackpotTxt.innerText = newJackpot
	enableBtn(drawQuestionBtn)
}

const refreshTeams = () => {
	teams = [
		[
			document.querySelector('.game__auction-field--blue'),
			document.querySelector('.game__balance-field--blue'),
			parseInt(document.querySelector('.game__balance-field--blue').innerText),
		],
		[
			document.querySelector('.game__auction-field--green'),
			document.querySelector('.game__balance-field--green'),
			parseInt(document.querySelector('.game__balance-field--green').innerText),
		],
		[
			document.querySelector('.game__auction-field--yellow'),
			document.querySelector('.game__balance-field--yellow'),
			parseInt(document.querySelector('.game__balance-field--yellow').innerText),
		],
		[
			document.querySelector('.game__auction-field--red'),
			document.querySelector('.game__balance-field--red'),
			parseInt(document.querySelector('.game__balance-field--red').innerText),
		],
	]
}

const prepareDOMElements = () => {
	drawCategoryBtn = document.querySelector('.game__category-btn')
	drawQuestionBtn = document.querySelector('.game__question-btn')
	checkAnswerBtn = document.querySelector('.game__question-btn-answer')
	hideAnswerBtn = document.querySelector('.answer__btn')
	newGameBtn = document.querySelector('.start__new-game-btn')
	goodAnswerBtn = document.querySelector('.game__good-answer-btn')
	wrongAnswerBtn = document.querySelector('.game__wrong-answer-btn')
	startBtn = document.querySelector('.start__play-btn')
	buttons = document.querySelectorAll('.game__btn')
	infoBtn = document.querySelector('.header__info-btn')
	answerBox = document.querySelector('.answer')
	categoryTxt = document.querySelector('.game__category')
	jackpotTxt = document.querySelector('.game__jackpot')
	questionTxt = document.querySelector('.game__question')
	answerTxt = document.querySelector('.answer__text')
	info = document.querySelector('.start')

	teams = [
		[
			document.querySelector('.game__auction-field--blue'),
			document.querySelector('.game__balance-field--blue'),
			parseInt(document.querySelector('.game__balance-field--blue').innerText),
		],
		[
			document.querySelector('.game__auction-field--green'),
			document.querySelector('.game__balance-field--green'),
			parseInt(document.querySelector('.game__balance-field--green').innerText),
		],
		[
			document.querySelector('.game__auction-field--yellow'),
			document.querySelector('.game__balance-field--yellow'),
			parseInt(document.querySelector('.game__balance-field--yellow').innerText),
		],
		[
			document.querySelector('.game__auction-field--red'),
			document.querySelector('.game__balance-field--red'),
			parseInt(document.querySelector('.game__balance-field--red').innerText),
		],
	]
}

const prepareDOMEvents = () => {
	checkAnswerBtn.addEventListener('click', showAnswer)
	hideAnswerBtn.addEventListener('click', hideAnswer)
	drawCategoryBtn.addEventListener('click', drawCategory)
	drawQuestionBtn.addEventListener('click', drawQuestion)
	goodAnswerBtn.addEventListener('click', goodAnswer)
	wrongAnswerBtn.addEventListener('click', wrongAnswer)
	startBtn.addEventListener('click', hideInfo)
	infoBtn.addEventListener('click', showInfo)
	newGameBtn.addEventListener('click', newGame)

	for (let [a, b, c] of teams) {
		a.addEventListener('change', bid)
		a.addEventListener('input', bid) // Dodaje obsługę zdarzeń dla natychmiastowej aktualizacji
		a.value = 0
	}

	handleAnswerButtons()
}

const main = () => {
	prepareDOMElements()
	prepareDOMEvents()
}

document.addEventListener('DOMContentLoaded', main)
