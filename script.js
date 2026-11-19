
const $ = (selector) => document.querySelector(selector);

const STORAGE_KEY = "estudae-dashboard-v1";

const now = new Date();

let viewDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
);

let miniDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
);

let selectedDateKey = null;
let editingNoteId = null;


/* =====================================
   DADOS E ARMAZENAMENTO
===================================== */

function dateKey(date) {

    const y = date.getFullYear();

    const m = String(date.getMonth() + 1).padStart(2, "0");

    const d = String(date.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;

}


function parseDate(key) {

    const [year, month, day] = key.split("-").map(Number);

    return new Date(year, month - 1, day);

}


function loadData() {
    try {
        const saved = JSON.parse(
            localStorage.getItem(STORAGE_KEY)
        );

        if (saved) {
            return {
                ...saved,

                notes: saved.notes || {},

                attendance: saved.attendance || [],

                folders: saved.folders || [],

                questionItems: saved.questionItems || [],

                questions: {
                    done: 0,
                    total: 0,
                    correct: 0,
                    wrong: 0,
                    ...(saved.questions || {})
                }
            };
        }

    } catch (error) {
        console.warn("Erro ao carregar dados:", error);
    }

    return {
        notes: {},
        attendance: [],
        folders: [],
        questionItems: [],

        questions: {
            done: 0,
            total: 0,
            correct: 0,
            wrong: 0
        }
    };
}

let data = loadData();

function saveData() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
    );
}


function monthName(date) {

    return date.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric"
    });

}


function sameDay(a, b) {

    return dateKey(a) === dateKey(b);

}


function notesFor(key) {

    return data.notes[key] || [];

}


/* =====================================
   CALENDÁRIO PRINCIPAL
===================================== */

function renderCalendar() {

    $("#monthTitle").textContent = monthName(viewDate);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDay = new Date(year, month, 1);

    const start = new Date(
        year,
        month,
        1 - firstDay.getDay()
    );

    const today = new Date();

    const calendar = $("#mainCalendar");

    calendar.innerHTML = "";


    for (let i = 0; i < 42; i++) {

        const date = new Date(start);

        date.setDate(start.getDate() + i);

        const key = dateKey(date);


        const cell = document.createElement("div");

        cell.className = "day-cell";


        if (date.getMonth() !== month) {

            cell.classList.add("outside");

        }


        if (sameDay(date, today)) {

            cell.classList.add("today");

        }


        // Número do dia

        const number = document.createElement("span");

        number.className = "day-number";

        number.textContent = date.getDate();

        cell.appendChild(number);


        // Botão de adicionar anotação

        const add = document.createElement("button");

        add.className = "add-note";

        add.type = "button";

        add.textContent = "+";

        add.title = "Adicionar anotação";

        add.addEventListener("click", () => {

            openNoteModal(key);

        });

        cell.appendChild(add);


        // Anotações do dia

        const noteList = document.createElement("div");

        noteList.className = "day-notes";


        notesFor(key).forEach(note => {

            const chip = document.createElement("button");

            chip.className = "note-chip";

            chip.type = "button";

            chip.textContent = note.title || "Anotação";

            chip.title = note.text || note.title || "Anotação";

            chip.addEventListener("click", () => {

                openNoteModal(key, note.id);

            });

            noteList.appendChild(chip);

        });


        cell.appendChild(noteList);

        calendar.appendChild(cell);

    }

}


/* =====================================
   MINI CALENDÁRIO
===================================== */


function renderMiniCalendar() {

    $("#miniMonthTitle").textContent = monthName(miniDate);

    const year = miniDate.getFullYear();
    const month = miniDate.getMonth();

    const firstDay = new Date(year, month, 1);

    const start = new Date(
        year,
        month,
        1 - firstDay.getDay()
    );

    const calendar = $("#miniCalendar");

    calendar.innerHTML = "";

    const today = new Date();

    for (let i = 0; i < 35; i++) {

        const date = new Date(start);

        date.setDate(start.getDate() + i);

        const key = dateKey(date);

        const day = document.createElement("div");

        day.className = "mini-day";

        day.textContent = date.getDate();

        // Dias de outros meses
        if (date.getMonth() !== month) {
            day.classList.add("outside");
        }

        // Dia atual
        if (sameDay(date, today)) {
            day.classList.add("today");
        }

        // Frequência marcada
        if (data.attendance.includes(key)) {
            day.classList.add("studied");
        }

        // Dia com anotação
        if (notesFor(key).length) {
            day.classList.add("has-note");
        }

        day.title = "Clique para marcar ou desmarcar a frequência";

        // Clicar para marcar ou desmarcar
        day.addEventListener("click", () => {

            if (data.attendance.includes(key)) {

                data.attendance = data.attendance.filter(
                    item => item !== key
                );

            } else {

                data.attendance.push(key);

            }

            saveData();

            renderFrequency();

        });

        calendar.appendChild(day);

    }

}



/* =====================================
   OFENSIVA DE ESTUDOS
===================================== */

function calculateStreak() {

    const attended = new Set(data.attendance);

    let cursor = new Date();

    if (!attended.has(dateKey(cursor))) {

        cursor.setDate(cursor.getDate() - 1);

    }

    let streak = 0;


    while (attended.has(dateKey(cursor))) {

        streak++;

        cursor.setDate(cursor.getDate() - 1);

    }


    return streak;

}


/* =====================================
   FREQUÊNCIA
===================================== */

function renderFrequency() {

    renderMiniCalendar();

    const year = miniDate.getFullYear();
    const month = miniDate.getMonth();

    const daysInMonth = new Date(
        year,
        month + 1,
        0
    ).getDate();


    const studiedThisMonth = data.attendance.filter(key => {

        const date = parseDate(key);

        return (
            date.getFullYear() === year &&
            date.getMonth() === month
        );

    }).length;


    const percent = Math.round(
        (studiedThisMonth / daysInMonth) * 100
    );


    $("#monthFrequency").textContent = `${percent}%`;

    $("#streakCount").textContent = calculateStreak();


    const todayKey = dateKey(new Date());

    const marked = data.attendance.includes(todayKey);


    $("#attendanceButton").classList.toggle(
        "is-marked",
        marked
    );


    $("#attendanceButton").textContent = marked
        ? "✓ Frequência marcada"
        : "＋ Marcar frequência";


    $("#attendanceHint").textContent = marked
        ? "Sua frequência de hoje está registrada. Muito bem!"
        : "Marque quando concluir seus estudos hoje.";

}


/* =====================================
   QUESTÕES E GRÁFICO
===================================== */

function renderQuestions() {

    const q = data.questions;

    const done = Math.max(0, Number(q.done) || 0);

    const total = Math.max(0, Number(q.total) || 0);

    const correct = Math.max(0, Number(q.correct) || 0);

    const wrong = Math.max(0, Number(q.wrong) || 0);


    const percent = total
        ? Math.min(100, Math.round((done / total) * 100))
        : 0;


    // Números das questões

    $("#doneDisplay").textContent = done;

    $("#totalDisplay").textContent = total;


    // Barra de progresso

    $("#questionProgress").style.width = `${percent}%`;

    $("#progressPercent").textContent = `${percent}%`;


    // Gráfico

    $("#answeredTotal").textContent = correct + wrong;

    $("#correctDisplay").textContent = correct;

    $("#wrongDisplay").textContent = wrong;


    const sum = correct + wrong;

    const correctDegrees = sum
        ? (correct / sum) * 360
        : 0;


    $("#performanceChart").style.background = sum

        ? `conic-gradient(
            #82b99a 0deg ${correctDegrees}deg,
            #e6a0a0 ${correctDegrees}deg 360deg
        )`

        : "conic-gradient(#e6ebef 0deg 360deg)";


    // Inputs

    $("#doneInput").value = done;

    $("#totalInput").value = total;

    $("#correctInput").value = correct;

    $("#wrongInput").value = wrong;

}


/* =====================================
   ATUALIZAR TELA
===================================== */

function renderAll() {

    renderMainCalendar();

    renderFrequency();

    renderQuestions();

}


/* =====================================
   ANOTAÇÕES
===================================== */

function openNoteModal(key, noteId = null) {

    selectedDateKey = key;

    editingNoteId = noteId;


    const note = noteId

        ? notesFor(key).find(item => item.id === noteId)

        : null;


    $("#modalDate").textContent = parseDate(key)
        .toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });


    $("#modalTitle").textContent = note
        ? "Editar anotação"
        : "Nova anotação";


    $("#noteTitle").value = note?.title || "";

    $("#noteText").value = note?.text || "";


    $("#deleteNote").hidden = !note;


    $("#saveNote").textContent = note
        ? "Confirmar edição"
        : "Salvar anotação";


    $("#noteModal").hidden = false;

    setTimeout(() => $("#noteTitle").focus(), 0);

}


function closeNoteModal() {

    $("#noteModal").hidden = true;

    selectedDateKey = null;

    editingNoteId = null;

}


function saveNote() {

    const title = $("#noteTitle").value.trim();

    const text = $("#noteText").value.trim();


    if (!title && !text) {

        $("#noteTitle").focus();

        return;

    }


    if (!data.notes[selectedDateKey]) {

        data.notes[selectedDateKey] = [];

    }


    if (editingNoteId) {

        const note = data.notes[selectedDateKey].find(
            item => item.id === editingNoteId
        );


        if (note) {

            note.title = title || "Anotação";

            note.text = text;

        }

    } else {

        data.notes[selectedDateKey].push({

            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,

            title: title || "Anotação",

            text

        });

    }


    saveData();

    closeNoteModal();

    renderAll();

}


/* =====================================
   NAVEGAÇÃO DO CALENDÁRIO
===================================== */

$("#prevMonth").addEventListener("click", () => {

    viewDate.setMonth(viewDate.getMonth() - 1);

    renderMainCalendar();

});


$("#nextMonth").addEventListener("click", () => {

    viewDate.setMonth(viewDate.getMonth() + 1);

    renderMainCalendar();

});


$("#miniPrev").addEventListener("click", () => {

    miniDate.setMonth(miniDate.getMonth() - 1);

    renderFrequency();

});


$("#miniNext").addEventListener("click", () => {

    miniDate.setMonth(miniDate.getMonth() + 1);

    renderFrequency();

});


/* =====================================
   MARCAR FREQUÊNCIA
===================================== */

$("#attendanceButton").addEventListener("click", () => {

    const key = dateKey(new Date());


    if (data.attendance.includes(key)) {

        data.attendance = data.attendance.filter(
            item => item !== key
        );

    } else {

        data.attendance.push(key);

    }


    saveData();

    renderFrequency();

});


/* =====================================
   ATUALIZAÇÃO DOS NÚMEROS
===================================== */

["done", "total", "correct", "wrong"].forEach(field => {

    $(`#${field}Input`).addEventListener("change", event => {

        data.questions[field] = Math.max(
            0,
            Number(event.target.value) || 0
        );

        saveData();

        renderQuestions();

    });

});


/* =====================================
   BOTÕES DAS ANOTAÇÕES
===================================== */

$("#saveNote").addEventListener("click", saveNote);

$("#cancelNote").addEventListener("click", closeNoteModal);

$("#closeModal").addEventListener("click", closeNoteModal);


$("#deleteNote").addEventListener("click", () => {

    if (!editingNoteId || !selectedDateKey) return;


    data.notes[selectedDateKey] = notesFor(
        selectedDateKey
    ).filter(note => note.id !== editingNoteId);


    if (!data.notes[selectedDateKey].length) {

        delete data.notes[selectedDateKey];

    }


    saveData();

    closeNoteModal();

    renderAll();

});


/* =====================================
   FECHAR MODAL
===================================== */

$("#noteModal").addEventListener("click", event => {

    if (event.target === $("#noteModal")) {

        closeNoteModal();

    }

});


document.addEventListener("keydown", event => {

    if (
        event.key === "Escape" &&
        !$("#noteModal").hidden
    ) {

        closeNoteModal();

    }


    if (
        event.key === "Enter" &&
        event.target === $("#noteTitle")
    ) {

        saveNote();

    }

});


/* =====================================
   DATA ATUAL
===================================== */

$("#todayLabel").textContent = now.toLocaleDateString(
    "pt-BR",
    {
        day: "numeric",
        month: "long"
    }
);




/* =====================================
   SISTEMA DE PASTAS E QUESTÕES
===================================== */

// Dados adicionais, mantendo os dados antigos do dashboard.

data.folders ??= [];
data.questionItems ??= [];

let currentFolderId = null;
let activeQuestionId = null;
let activeQuestionTab = "resolution";


/* =====================================
   IDENTIFICADORES
===================================== */

function generateId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}


function getCurrentFolder() {
    return data.folders.find(
        folder => folder.id === currentFolderId
    );
}


/* =====================================
   NAVEGAÇÃO ENTRE TELAS
===================================== */

const dashboardElements = [
    $(".topbar"),
    $(".calendar-section"),
    $(".bottom-note")
];

function showPage(page) {

    const isQuestions = page === "questions";

    dashboardElements.forEach(element => {
        element.hidden = isQuestions;
    });

    $("#questionsPage").hidden = !isQuestions;

    $("#navDashboard").classList.toggle(
        "active",
        !isQuestions
    );

    $("#navQuestions").classList.toggle(
        "active",
        isQuestions
    );

    if (isQuestions) {
        renderFolderSystem();
    }

}


$("#navDashboard").addEventListener("click", event => {

    event.preventDefault();

    showPage("dashboard");

});


$("#navQuestions").addEventListener("click", event => {

    event.preventDefault();

    showPage("questions");

});


/* =====================================
   CRIAR PASTAS
===================================== */

$("#createFolder").addEventListener("click", () => {

    const name = prompt("Qual será o nome da pasta?");

    if (!name || !name.trim()) return;

    data.folders.push({

        id: generateId(),

        name: name.trim(),

        parentId: currentFolderId

    });

    saveData();

    renderFolderSystem();

});


/* =====================================
   ADICIONAR QUESTÕES
===================================== */

$("#createQuestion").addEventListener("click", () => {

    const question = {

        id: generateId(),

        folderId: currentFolderId,

        name: "",

        done: false,

        correct: false,

        image: null,

        resolution: {
            text: "",
            image: null
        },

        answer: {
            text: "",
            image: null
        }

    };

    data.questionItems.push(question);

    saveData();

    renderFolderSystem();
    renderQuestions();

    // Foca no nome da questão recém-criada.

    const input = document.querySelector(
        `[data-question-name="${question.id}"]`
    );

    if (input) {
        input.focus();
        input.select();
    }

});


/* =====================================
   CAMINHO DAS PASTAS
===================================== */

function renderBreadcrumb() {

    const breadcrumb = $("#folderBreadcrumb");

    breadcrumb.innerHTML = "";

    function addItem(label, id) {

        const button = document.createElement("button");

        button.className = "breadcrumb-item";

        button.textContent = label;

        button.addEventListener("click", () => {

            currentFolderId = id;

            renderFolderSystem();

        });

        breadcrumb.appendChild(button);

    }

    addItem("Questões", null);

    if (!currentFolderId) return;

    const path = [];

    let folder = getCurrentFolder();

    while (folder) {

        path.unshift(folder);

        folder = data.folders.find(
            item => item.id === folder.parentId
        );

    }

    path.forEach(folder => {

        const separator = document.createElement("span");

        separator.textContent = "›";

        breadcrumb.appendChild(separator);

        addItem(folder.name, folder.id);

    });

}


/* =====================================
   EXIBIR PASTAS E QUESTÕES
===================================== */

function renderFolderSystem() {

    renderBreadcrumb();

    const folderList = $("#folderList");

    const questionList = $("#questionList");

    folderList.innerHTML = "";

    questionList.innerHTML = "";


    // Pastas da localização atual.

    const folders = data.folders.filter(
        folder => folder.parentId === currentFolderId
    );


    folders.forEach(folder => {

        const row = document.createElement("div");

        row.className = "folder-row";


        const open = document.createElement("button");

        open.className = "folder-open";

        open.innerHTML = `
            <span>▰</span>
            <span></span>
        `;

        open.lastElementChild.textContent = folder.name;

        open.addEventListener("click", () => {

            currentFolderId = folder.id;

            renderFolderSystem();

        });


        const empty = document.createElement("span");

        const empty2 = document.createElement("span");


        const remove = document.createElement("button");

        remove.className = "delete-item";

        remove.textContent = "×";

        remove.title = "Deletar pasta";

        remove.addEventListener("click", () => {

            deleteFolder(folder.id);

        });


        const empty3 = document.createElement("span");

        row.append(open, empty, empty2, empty3, remove);

        folderList.appendChild(row);

    });


    // Questões da localização atual.

    const questions = data.questionItems.filter(
        question => question.folderId === currentFolderId
    );


    questions.forEach(question => {

        const row = document.createElement("div");

        row.className = "question-row";


        // Nome editável.

        const name = document.createElement("input");

        name.className = "question-name-input";

        name.type = "text";

        name.placeholder = "Questão sem nome";

        name.value = question.name;

        name.dataset.questionName = question.id;

        name.addEventListener("change", () => {

            question.name = name.value.trim();

            saveData();

            name.value = question.name;

        });



        // Checkbox de questão feita.

        const doneLabel = document.createElement("label");
        doneLabel.className = "question-check";

        const done = document.createElement("input");

        done.type = "checkbox";
        done.checked = question.done;
        done.title = "Marcar como feita";

        done.addEventListener("change", () => {

            question.done = done.checked;

            // Ao desmarcar como feita, limpa acerto e erro.
            if (!question.done) {
                question.correct = false;
                question.wrong = false;
            }

            saveData();

            renderFolderSystem();
            renderQuestions();

        });

        doneLabel.appendChild(done);


        // Checkbox de acerto.

        const correctLabel = document.createElement("label");
        correctLabel.className = "question-check";

        const correct = document.createElement("input");

        correct.type = "checkbox";
        correct.checked = !!question.correct;
        correct.disabled = !question.done;
        correct.title = "Marcar como acertada";

        correct.addEventListener("change", () => {

            question.correct = correct.checked;

            // Não pode ser acerto e erro ao mesmo tempo.
            if (question.correct) {
                question.wrong = false;
            }

            saveData();

            renderFolderSystem();
            renderQuestions();

        });

        correctLabel.appendChild(correct);


        // Checkbox de erro.

        const wrongLabel = document.createElement("label");
        wrongLabel.className = "question-check";

        const wrong = document.createElement("input");

        wrong.type = "checkbox";
        wrong.checked = !!question.wrong;
        wrong.disabled = !question.done;
        wrong.title = "Marcar como errada";

        wrong.addEventListener("change", () => {

            question.wrong = wrong.checked;

            // Não pode ser erro e acerto ao mesmo tempo.
            if (question.wrong) {
                question.correct = false;
            }

            saveData();

            renderFolderSystem();
            renderQuestions();

        });

        wrongLabel.appendChild(wrong);


        // Abrir questão.

        const open = document.createElement("button");

        open.className = "question-open";

        open.textContent = "↗";

        open.title = "Abrir questão";

        open.addEventListener("click", () => {

            openQuestion(question.id);

        });


        // Deletar questão.

        const remove = document.createElement("button");

        remove.className = "delete-item";

        remove.textContent = "×";

        remove.title = "Deletar questão";

        remove.addEventListener("click", () => {

            if (!confirm("Deseja realmente deletar esta questão?")) {
                return;
            }

            data.questionItems = data.questionItems.filter(
                item => item.id !== question.id
            );

            saveData();

            renderFolderSystem();

            renderQuestions();

        });


        row.append(
            name,
            doneLabel,
            correctLabel,
            wrongLabel,
            open
        );

        // Botão de deletar fica disponível ao abrir a questão.
        // Para não aumentar a quantidade de colunas, usamos o próprio
        // botão de abertura e deixamos a exclusão no modal.

        open.title = "Abrir questão";

        questionList.appendChild(row);

    });


    // Mostrar mensagem quando a pasta estiver vazia.

    const hasItems = folders.length > 0 || questions.length > 0;

    $("#emptyQuestions").hidden = hasItems;

}


/* =====================================
   DELETAR PASTAS E SUBPASTAS
===================================== */

function deleteFolder(folderId) {

    if (!confirm(
        "Deletar esta pasta e todo o seu conteúdo?"
    )) {
        return;
    }

    function collectFolderIds(id) {

        const children = data.folders.filter(
            folder => folder.parentId === id
        );

        let ids = [id];

        children.forEach(child => {

            ids = ids.concat(
                collectFolderIds(child.id)
            );

        });

        return ids;

    }


    const ids = collectFolderIds(folderId);

    data.folders = data.folders.filter(
        folder => !ids.includes(folder.id)
    );

    data.questionItems = data.questionItems.filter(
        question => !ids.includes(question.folderId)
    );

    currentFolderId = null;

    saveData();

    renderFolderSystem();

    renderQuestions();

}


/* =====================================
   ABRIR MODAL DE QUESTÃO
===================================== */

function openQuestion(questionId) {

    activeQuestionId = questionId;

    activeQuestionTab = "resolution";

    const question = data.questionItems.find(
        item => item.id === questionId
    );

    if (!question) return;

    $("#questionModalTitle").textContent =
        question.name || "Questão sem nome";


    renderQuestionModal();

    $("#questionModal").hidden = false;

}


function closeQuestion() {

    $("#questionModal").hidden = true;

    activeQuestionId = null;

}


$("#closeQuestionModal").addEventListener("click", closeQuestion);


$("#questionModal").addEventListener("click", event => {

    if (event.target === $("#questionModal")) {
        closeQuestion();
    }

});


/* =====================================
   RENDERIZAR MODAL
===================================== */

function renderQuestionModal() {

    const question = data.questionItems.find(
        item => item.id === activeQuestionId
    );

    if (!question) return;


    // Imagem principal.

    const mainImage = $("#questionImagePreview");

    mainImage.hidden = !question.image;

    mainImage.src = question.image || "";


    $("#removeQuestionImage").hidden = !question.image;


    // Abas.

    document.querySelectorAll(".question-tab").forEach(tab => {

        tab.classList.toggle(
            "active",
            tab.dataset.tab === activeQuestionTab
        );

    });


    const section = question[activeQuestionTab];

    const isResolution = activeQuestionTab === "resolution";


    $("#tabImageTitle").textContent = isResolution
        ? "Imagem da minha resolução"
        : "Imagem do gabarito";


    $("#writingTitle").textContent = isResolution
        ? "Minha resolução"
        : "Gabarito";


    $("#questionText").value = section.text || "";

    $("#questionText").readOnly = true;


    const tabImage = $("#tabImagePreview");

    tabImage.hidden = !section.image;

    tabImage.src = section.image || "";


    $("#removeTabImage").hidden = !section.image;


    $("#editQuestionText").hidden = false;

    $("#confirmQuestionText").hidden = true;

}


/* =====================================
   TROCAR ABAS
===================================== */

document.querySelectorAll(".question-tab").forEach(tab => {

    tab.addEventListener("click", () => {

        activeQuestionTab = tab.dataset.tab;

        renderQuestionModal();

    });

});


/* =====================================
   EDITAR E CONFIRMAR TEXTO
===================================== */

$("#editQuestionText").addEventListener("click", () => {

    $("#questionText").readOnly = false;

    $("#questionText").focus();

    $("#editQuestionText").hidden = true;

    $("#confirmQuestionText").hidden = false;

});


$("#confirmQuestionText").addEventListener("click", () => {

    const question = data.questionItems.find(
        item => item.id === activeQuestionId
    );

    if (!question) return;


    question[activeQuestionTab].text = $("#questionText").value;

    saveData();

    $("#questionText").readOnly = true;

    $("#editQuestionText").hidden = false;

    $("#confirmQuestionText").hidden = true;

});


/* =====================================
   CARREGAR IMAGENS
===================================== */

function readImage(file, callback) {

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Selecione um arquivo de imagem.");
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {

        callback(reader.result);

    };

    reader.onerror = () => {

        alert("Não foi possível carregar a imagem.");

    };

    reader.readAsDataURL(file);

}


/* IMAGEM PRINCIPAL */

$("#questionImageInput").addEventListener("change", event => {

    const file = event.target.files[0];

    const question = data.questionItems.find(
        item => item.id === activeQuestionId
    );

    if (!question) return;

    readImage(file, result => {

        question.image = result;

        try {
            saveData();
            renderQuestionModal();
        } catch (error) {
            alert("Imagem muito grande para salvar. Tente uma imagem menor.");
        }

    });

    event.target.value = "";

});


/* IMAGEM DA RESOLUÇÃO OU GABARITO */

$("#tabImageInput").addEventListener("change", event => {

    const file = event.target.files[0];

    const question = data.questionItems.find(
        item => item.id === activeQuestionId
    );

    if (!question) return;

    readImage(file, result => {

        const previousImage = question[activeQuestionTab].image;

        question[activeQuestionTab].image = result;

        try {
            saveData();
            renderQuestionModal();
        } catch (error) {
            question[activeQuestionTab].image = previousImage;
            alert("Imagem muito grande para salvar. Tente uma imagem menor.");
        }

    });

    event.target.value = "";

});


/* =====================================
   REMOVER IMAGENS
===================================== */

$("#removeQuestionImage").addEventListener("click", () => {

    const question = data.questionItems.find(
        item => item.id === activeQuestionId
    );

    if (!question) return;

    question.image = null;

    saveData();

    renderQuestionModal();

});


$("#removeTabImage").addEventListener("click", () => {

    const question = data.questionItems.find(
        item => item.id === activeQuestionId
    );

    if (!question) return;

    question[activeQuestionTab].image = null;

    saveData();

    renderQuestionModal();

});


/* =====================================
   DELETAR QUESTÃO PELO MODAL
===================================== */

const originalCloseQuestion = closeQuestion;

const deleteQuestionButton = document.createElement("button");

deleteQuestionButton.className = "delete-button";

deleteQuestionButton.textContent = "Deletar questão";

deleteQuestionButton.style.marginTop = "15px";

$(".question-modal").appendChild(deleteQuestionButton);

deleteQuestionButton.addEventListener("click", () => {

    if (!confirm("Deseja realmente deletar esta questão?")) {
        return;
    }

    data.questionItems = data.questionItems.filter(
        question => question.id !== activeQuestionId
    );

    saveData();

    closeQuestion();

    renderFolderSystem();

    renderQuestions();

});


/* =====================================
   INTEGRAÇÃO COM O DASHBOARD
===================================== */

// Substitui o cálculo manual anterior.
// Agora os números vêm diretamente das questões.


function renderQuestions() {

    const total = data.questionItems.length;

    const done = data.questionItems.filter(
        question => question.done
    ).length;

    const correct = data.questionItems.filter(
        question => question.done && question.correct
    ).length;

    const wrong = data.questionItems.filter(
        question => question.done && question.wrong
    ).length;


    // Atualizar dados gerais.

    data.questions.done = done;
    data.questions.total = total;
    data.questions.correct = correct;
    data.questions.wrong = wrong;


    const percent = total
        ? Math.round((done / total) * 100)
        : 0;


    // Progresso.

    $("#doneDisplay").textContent = done;
    $("#totalDisplay").textContent = total;

    $("#questionProgress").style.width =
        `${percent}%`;

    $("#progressPercent").textContent =
        `${percent}%`;


    // Acertos e erros.

    $("#answeredTotal").textContent =
        done;

    $("#correctDisplay").textContent =
        correct;

    $("#wrongDisplay").textContent =
        wrong;


    // Gráfico circular.

    const correctDegrees = done
        ? (correct / done) * 360
        : 0;

    const wrongDegrees = done
        ? (wrong / done) * 360
        : 0;

    const unansweredDegrees =
        360 - correctDegrees - wrongDegrees;


    $("#performanceChart").style.background =
        `conic-gradient(
            #82b99a 0deg ${correctDegrees}deg,
            #e6a0a0 ${correctDegrees}deg ${correctDegrees + wrongDegrees}deg,
            #e6ebef ${correctDegrees + wrongDegrees}deg 360deg
        )`;


    // Campos informativos.

    $("#doneInput").value = done;
    $("#totalInput").value = total;

    $("#correctInput").value = correct;
    $("#wrongInput").value = wrong;


    // Persistir os dados atualizados.

    saveData();

}



/* =====================================
   ATUALIZAÇÃO INICIAL
===================================== */
renderAll();

renderFolderSystem();

renderQuestions();


/* =====================================================
   SISTEMA DE ARRASTAR, TAGS E FILTROS
   Cole este bloco no FINAL do script.js
===================================================== */

data.tags ??= [];

let selectedTagFilters = [];
let selectedStatusFilter = "all";
let draggedItem = null;


/* =====================================================
   ESTILOS
===================================================== */

(function installQuestionTools() {
    if ($("#questionToolsStyles")) return;

    const style = document.createElement("style");

    style.id = "questionToolsStyles";

    style.textContent = `
        .question-tools {
            display: flex;
            flex-wrap: wrap;
            align-items: flex-end;
            gap: 12px;
            padding: 14px 0;
        }

        .question-tools-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
            min-width: 160px;
        }

        .question-tools label {
            font-size: 12px;
            color: #718096;
        }

        .question-tools select,
        .question-tools button {
            min-height: 36px;
            border: 1px solid #dce5eb;
            border-radius: 9px;
            padding: 7px 10px;
            background: white;
            color: #465565;
            cursor: pointer;
        }

        .question-tools select[multiple] {
            min-width: 190px;
            min-height: 76px;
        }

        .question-tools button:hover,
        .question-tag-button:hover {
            background: #f3f8fb;
        }

        .question-tools-hint {
            font-size: 11px;
            color: #8a9aa8;
        }

        .question-name-cell {
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .question-name-cell .question-name-input {
            width: 100%;
            min-width: 0;
        }

        .question-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }

        .question-tag {
            display: inline-flex;
            align-items: center;
            border-radius: 20px;
            padding: 2px 8px;
            font-size: 10px;
            white-space: nowrap;
        }

        .question-tag-button {
            align-self: flex-start;
            padding: 3px 8px;
            font-size: 10px;
            border: 1px solid #dce5eb;
            background: white;
            color: #607487;
            border-radius: 9px;
            cursor: pointer;
        }

        .question-row,
        .folder-row {
            cursor: grab;
        }

        .question-row {
            grid-template-columns:
                minmax(0, 1fr) 65px 65px 65px 30px !important;
        }

        .folder-row {
            grid-template-columns:
                minmax(0, 1fr) 65px 65px 65px 30px !important;
        }

        .question-row.dragging,
        .folder-row.dragging {
            opacity: .42;
        }

        .question-row.drag-over,
        .folder-row.drag-over,
        .folder-row.drop-target {
            outline: 2px dashed #9bbdce;
            outline-offset: -2px;
            background: #f1f8fb;
        }

        @media (max-width: 600px) {
            .question-tools {
                align-items: stretch;
            }

            .question-tools-group {
                flex: 1 1 140px;
            }

            .question-tools select[multiple] {
                width: 100%;
            }
        }
    `;

    document.head.appendChild(style);

    const breadcrumb = $("#folderBreadcrumb");

    const tools = document.createElement("div");

    tools.className = "question-tools";
    tools.id = "questionTools";

    tools.innerHTML = `
        <div class="question-tools-group">
            <label>Filtrar por tags</label>

            <select id="questionTagFilter" multiple>
            </select>

            <span class="question-tools-hint">
                Use Ctrl ou Cmd para selecionar várias.
            </span>
        </div>

        <div class="question-tools-group">
            <label>Situação</label>

            <select id="questionStatusFilter">
                <option value="all">Todas as questões</option>
                <option value="pending">Não feitas</option>
                <option value="done">Feitas</option>
                <option value="correct">Acertos</option>
                <option value="wrong">Erros</option>
            </select>
        </div>

        <div class="question-tools-group">
            <label>Tags personalizadas</label>

            <button type="button" id="manageQuestionTags">
                ＋ Criar / gerenciar tags
            </button>
        </div>

        <div class="question-tools-group">
            <label>Exibição</label>

            <button type="button" id="clearQuestionFilters">
                Limpar filtros
            </button>
        </div>
    `;

    if (breadcrumb) {
        breadcrumb.parentNode.insertBefore(
            tools,
            breadcrumb
        );
    }

    $("#questionTagFilter").addEventListener("change", () => {
        selectedTagFilters = Array.from(
            $("#questionTagFilter").selectedOptions
        ).map(option => option.value);

        renderFolderSystem();
    });

    $("#questionStatusFilter").addEventListener("change", () => {
        selectedStatusFilter = $("#questionStatusFilter").value;

        renderFolderSystem();
    });

    $("#manageQuestionTags").addEventListener(
        "click",
        manageQuestionTags
    );

    $("#clearQuestionFilters").addEventListener("click", () => {
        selectedTagFilters = [];
        selectedStatusFilter = "all";

        $("#questionTagFilter").selectedIndex = -1;
        $("#questionStatusFilter").value = "all";

        renderFolderSystem();
    });

})();


/* =====================================================
   TAGS
===================================================== */

function tagColor(index) {

    const colors = [
        "#e8d9f4",
        "#d8e9f8",
        "#d9eee4",
        "#f8e5cf",
        "#f4dce2",
        "#e5e8c9",
        "#d8e9e8",
        "#f1e0cf"
    ];

    return colors[index % colors.length];
}


function refreshTagFilter() {

    const select = $("#questionTagFilter");

    if (!select) return;

    const previous = selectedTagFilters.slice();

    select.innerHTML = "";

    data.tags.forEach(tag => {

        const option = document.createElement("option");

        option.value = tag.id;
        option.textContent = tag.name;

        option.selected = previous.includes(tag.id);

        select.appendChild(option);

    });

    selectedTagFilters = previous.filter(id =>
        data.tags.some(tag => tag.id === id)
    );

}


/* =====================================================
   CRIAR, EDITAR E EXCLUIR TAGS
===================================================== */

function manageQuestionTags() {

    const action = prompt(
        "Digite o nome da nova tag.\n" +
        "Para editar ou excluir uma tag, digite: gerenciar"
    );

    if (!action) return;

    if (action.trim().toLowerCase() === "gerenciar") {

        if (!data.tags.length) {
            alert("Você ainda não criou nenhuma tag.");
            return;
        }

        const list = data.tags.map((tag, index) =>
            `${index + 1}. ${tag.name}`
        ).join("\n");

        const choice = Number(prompt(
            `Suas tags:\n${list}\n\n` +
            "Digite o número da tag que deseja editar ou excluir:"
        ));

        const tag = data.tags[choice - 1];

        if (!tag) return;

        const operation = prompt(
            `Tag: ${tag.name}\nDigite "editar" ou "excluir":`
        );

        if (!operation) return;

        if (operation.trim().toLowerCase() === "excluir") {

            if (!confirm(
                `Excluir a tag "${tag.name}" de todas as questões?`
            )) return;

            data.tags = data.tags.filter(
                item => item.id !== tag.id
            );

            data.questionItems.forEach(question => {

                question.tags = (question.tags || []).filter(
                    id => id !== tag.id
                );

            });

            selectedTagFilters = selectedTagFilters.filter(
                id => id !== tag.id
            );

        } else if (operation.trim().toLowerCase() === "editar") {

            const newName = prompt(
                "Novo nome da tag:",
                tag.name
            );

            if (newName && newName.trim()) {
                tag.name = newName.trim();
            }

        }

    } else {

        const name = action.trim();

        if (data.tags.some(tag =>
            tag.name.toLowerCase() === name.toLowerCase()
        )) {
            alert("Já existe uma tag com esse nome.");
            return;
        }

        data.tags.push({
            id: generateId(),
            name,
            color: tagColor(data.tags.length)
        });

    }

    saveData();

    refreshTagFilter();

    renderFolderSystem();

}


/* =====================================================
   ADICIONAR TAGS À QUESTÃO
===================================================== */

function editQuestionTags(question) {

    const existing = (question.tags || [])
        .map(id => data.tags.find(tag => tag.id === id)?.name)
        .filter(Boolean);

    const answer = prompt(
        `Tags atuais: ${existing.join(", ") || "nenhuma"}\n\n` +
        "Digite os nomes das tags separados por vírgula.\n" +
        "Tags inexistentes serão criadas:",
        existing.join(", ")
    );

    if (answer === null) return;

    const names = answer
        .split(",")
        .map(name => name.trim())
        .filter(Boolean);

    const ids = [];

    names.forEach(name => {

        let tag = data.tags.find(item =>
            item.name.toLowerCase() === name.toLowerCase()
        );

        if (!tag) {

            tag = {
                id: generateId(),
                name,
                color: tagColor(data.tags.length)
            };

            data.tags.push(tag);

        }

        if (!ids.includes(tag.id)) {
            ids.push(tag.id);
        }

    });

    question.tags = ids;

    saveData();

    refreshTagFilter();

    renderFolderSystem();

}


/* =====================================================
   FILTROS
===================================================== */

function questionMatchesFilters(question) {

    const tags = question.tags || [];

    // Todas as tags selecionadas precisam estar na questão.
    const matchesTags =
        !selectedTagFilters.length ||
        selectedTagFilters.every(id => tags.includes(id));

    let matchesStatus = true;

    if (selectedStatusFilter === "pending") {
        matchesStatus = !question.done;
    }

    if (selectedStatusFilter === "done") {
        matchesStatus = !!question.done;
    }

    if (selectedStatusFilter === "correct") {
        matchesStatus = !!question.done && !!question.correct;
    }

    if (selectedStatusFilter === "wrong") {
        matchesStatus = !!question.done && !!question.wrong;
    }

    return matchesTags && matchesStatus;

}


/* =====================================================
   REORDENAR QUESTÕES
===================================================== */

function moveArrayItem(array, item, targetItem) {

    const from = array.indexOf(item);
    const to = array.indexOf(targetItem);

    if (from < 0 || to < 0 || from === to) return;

    array.splice(from, 1);

    array.splice(
        array.indexOf(targetItem),
        0,
        item
    );

}


/* =====================================================
   ARRASTAR E SOLTAR
===================================================== */

function setDropEvents(row, type, item) {

    row.draggable = true;

    row.addEventListener("dragstart", event => {

        draggedItem = {
            type,
            id: item.id
        };

        event.dataTransfer.effectAllowed = "move";

        event.dataTransfer.setData(
            "text/plain",
            `${type}:${item.id}`
        );

        row.classList.add("dragging");

    });


    row.addEventListener("dragend", () => {

        row.classList.remove("dragging");

        document.querySelectorAll(
            ".drag-over, .drop-target"
        ).forEach(element => {
            element.classList.remove(
                "drag-over",
                "drop-target"
            );
        });

        draggedItem = null;

    });


    row.addEventListener("dragover", event => {

        if (!draggedItem || draggedItem.id === item.id) {
            return;
        }

        event.preventDefault();

        row.classList.add(
            type === "folder" ? "drop-target" : "drag-over"
        );

    });


    row.addEventListener("dragleave", () => {

        row.classList.remove(
            "drag-over",
            "drop-target"
        );

    });


    row.addEventListener("drop", event => {

        event.preventDefault();
        event.stopPropagation();

        row.classList.remove(
            "drag-over",
            "drop-target"
        );

        if (!draggedItem || draggedItem.id === item.id) {
            return;
        }

        const dragged = draggedItem;


        // Questão ou pasta sendo solta em uma pasta.

        if (type === "folder") {

            const targetFolder = data.folders.find(
                folder => folder.id === item.id
            );

            if (!targetFolder) return;


            if (dragged.type === "question") {

                const question = data.questionItems.find(
                    q => q.id === dragged.id
                );

                if (question) {
                    question.folderId = targetFolder.id;
                }

            }


            if (dragged.type === "folder") {

                const folder = data.folders.find(
                    f => f.id === dragged.id
                );

                if (!folder) return;

                // Impede colocar uma pasta dentro dela mesma
                // ou dentro de uma de suas subpastas.

                let ancestor = targetFolder;

                while (ancestor) {

                    if (ancestor.id === folder.id) {

                        alert(
                            "Não é possível mover uma pasta " +
                            "para dentro dela mesma ou de uma subpasta."
                        );

                        return;

                    }

                    ancestor = data.folders.find(
                        f => f.id === ancestor.parentId
                    );

                }

                folder.parentId = targetFolder.id;

            }

        }


        // Reordenar questões dentro da mesma pasta.

        else if (
            type === "question" &&
            dragged.type === "question"
        ) {

            const draggedQuestion = data.questionItems.find(
                q => q.id === dragged.id
            );

            const targetQuestion = data.questionItems.find(
                q => q.id === item.id
            );

            if (
                draggedQuestion &&
                targetQuestion &&
                draggedQuestion.folderId === targetQuestion.folderId
            ) {

                moveArrayItem(
                    data.questionItems,
                    draggedQuestion,
                    targetQuestion
                );

            }

        }

        saveData();

        renderFolderSystem();

        renderQuestions();

    });

}


/* =====================================================
   RENDERIZAR PASTAS E QUESTÕES
===================================================== */

function renderFolderSystem() {

    renderBreadcrumb();

    refreshTagFilter();

    const folderList = $("#folderList");
    const questionList = $("#questionList");

    folderList.innerHTML = "";
    questionList.innerHTML = "";


    // PASTAS DA LOCALIZAÇÃO ATUAL

    const folders = data.folders.filter(
        folder => folder.parentId === currentFolderId
    );


    folders.forEach(folder => {

        const row = document.createElement("div");

        row.className = "folder-row";


        const open = document.createElement("button");

        open.className = "folder-open";

        open.innerHTML = `
            <span>▰</span>
            <span></span>
        `;

        open.lastElementChild.textContent = folder.name;

        open.addEventListener("click", () => {

            currentFolderId = folder.id;

            renderFolderSystem();

        });


        const empty1 = document.createElement("span");
        const empty2 = document.createElement("span");
        const empty3 = document.createElement("span");


        const remove = document.createElement("button");

        remove.className = "delete-item";
        remove.textContent = "×";
        remove.title = "Deletar pasta";

        remove.addEventListener("click", () => {
            deleteFolder(folder.id);
        });


        row.append(
            open,
            empty1,
            empty2,
            empty3,
            remove
        );

        setDropEvents(row, "folder", folder);

        folderList.appendChild(row);

    });


    // QUESTÕES DA LOCALIZAÇÃO ATUAL

    const questions = data.questionItems.filter(question =>
        question.folderId === currentFolderId &&
        questionMatchesFilters(question)
    );


    questions.forEach(question => {

        question.tags ??= [];

        const row = document.createElement("div");

        row.className = "question-row";


        // NOME E TAGS

        const nameCell = document.createElement("div");

        nameCell.className = "question-name-cell";


        const name = document.createElement("input");

        name.className = "question-name-input";
        name.type = "text";
        name.placeholder = "Questão sem nome";
        name.value = question.name || "";

        name.dataset.questionName = question.id;

        name.addEventListener("change", () => {

            question.name = name.value.trim();

            saveData();

            name.value = question.name;

        });

        nameCell.appendChild(name);


        // MOSTRAR TAGS

        const tagList = document.createElement("div");

        tagList.className = "question-tags";

        question.tags.forEach(tagId => {

            const tag = data.tags.find(
                item => item.id === tagId
            );

            if (!tag) return;

            const chip = document.createElement("span");

            chip.className = "question-tag";
            chip.textContent = tag.name;

            chip.style.background = tag.color || "#e8edf1";
            chip.style.color = "#536575";

            tagList.appendChild(chip);

        });

        nameCell.appendChild(tagList);


        // BOTÃO DE EDITAR TAGS

        const tagButton = document.createElement("button");

        tagButton.type = "button";
        tagButton.className = "question-tag-button";
        tagButton.textContent = "＋ Tags";

        tagButton.addEventListener("click", () => {
            editQuestionTags(question);
        });

        nameCell.appendChild(tagButton);


        // FEITA

        const doneLabel = document.createElement("label");

        doneLabel.className = "question-check";

        const done = document.createElement("input");

        done.type = "checkbox";
        done.checked = !!question.done;
        done.title = "Marcar como feita";

        done.addEventListener("change", () => {

            question.done = done.checked;

            if (!question.done) {
                question.correct = false;
                question.wrong = false;
            }

            saveData();

            renderFolderSystem();
            renderQuestions();

        });

        doneLabel.appendChild(done);


        // ACERTO

        const correctLabel = document.createElement("label");

        correctLabel.className = "question-check";

        const correct = document.createElement("input");

        correct.type = "checkbox";
        correct.checked = !!question.correct;
        correct.disabled = !question.done;
        correct.title = "Marcar como acertada";

        correct.addEventListener("change", () => {

            question.correct = correct.checked;

            if (question.correct) {
                question.wrong = false;
            }

            saveData();

            renderFolderSystem();
            renderQuestions();

        });

        correctLabel.appendChild(correct);


        // ERRO

        const wrongLabel = document.createElement("label");

        wrongLabel.className = "question-check";

        const wrong = document.createElement("input");

        wrong.type = "checkbox";
        wrong.checked = !!question.wrong;
        wrong.disabled = !question.done;
        wrong.title = "Marcar como errada";

        wrong.addEventListener("change", () => {

            question.wrong = wrong.checked;

            if (question.wrong) {
                question.correct = false;
            }

            saveData();

            renderFolderSystem();
            renderQuestions();

        });

        wrongLabel.appendChild(wrong);


        // ABRIR QUESTÃO

        const open = document.createElement("button");

        open.className = "question-open";
        open.textContent = "↗";
        open.title = "Abrir questão";

        open.addEventListener("click", () => {
            openQuestion(question.id);
        });


        row.append(
            nameCell,
            doneLabel,
            correctLabel,
            wrongLabel,
            open
        );

        setDropEvents(row, "question", question);

        questionList.appendChild(row);

    });


    // MENSAGEM DE LISTA VAZIA

    const hasFolders = folders.length > 0;
    const hasQuestions = questions.length > 0;

    const hasUnfilteredQuestions = data.questionItems.some(
        question => question.folderId === currentFolderId
    );

    $("#emptyQuestions").hidden = hasFolders || hasQuestions;

    if (!hasFolders && !hasQuestions && hasUnfilteredQuestions) {

        $("#emptyQuestions").hidden = false;

        $("#emptyQuestions").textContent =
            "Nenhuma questão corresponde aos filtros selecionados.";

    } else {

        $("#emptyQuestions").textContent =
            "Esta pasta está vazia. Crie uma pasta ou adicione uma questão.";

    }

}


/* =====================================================
   INICIALIZAÇÃO
===================================================== */

renderFolderSystem();
