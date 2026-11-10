const display = document.getElementById("current-operand");
const previousDisplay = document.getElementById("previous-operand");
const buttons = document.querySelector(".buttons");

const angleButton = document.getElementById("angle-mode");
const historyPanel = document.getElementById("history-panel");
const historyList = document.getElementById("history-list");

let expression = "";
let lastAnswer = 0;
let angleMode = "DEG";
let resultDisplayed = false;
let history = [];

const MAX_LENGTH = 100;

// Menampilkan ekspresi pada layar
function updateDisplay() {
    let shownExpression = expression
        .replace(/sqrt\(/g, "√(")
        .replace(/sin\(/g, "sin(")
        .replace(/cos\(/g, "cos(")
        .replace(/tan\(/g, "tan(")
        .replace(/log\(/g, "log(")
        .replace(/ln\(/g, "ln(")
        .replace(/\*/g, " × ")
        .replace(/\//g, " ÷ ")
        .replace(/-/g, " − ")
        .replace(/\+/g, " + ")
        .replace(/\^2/g, "²")
        .replace(/\^3/g, "³")
        .replace(/\^/g, " ^ ");

    display.textContent = shownExpression || "0";
}

// Mengubah ekspresi menjadi token matematika
function tokenize(input) {
    const tokens = [];
    let position = 0;

    while (position < input.length) {
        const remaining = input.slice(position);

        const match = remaining.match(
            /^(?:\d+(?:\.\d*)?|\.\d+)|^[a-zA-Z]+|^[()+\-*/^%!]/ 
        );

        if (!match) {
            throw new Error("Input tidak valid");
        }

        tokens.push(match[0].toLowerCase());
        position += match[0].length;
    }

    // Menambahkan perkalian otomatis
    const result = [];

    function canEnd(token) {
        return !isNaN(Number(token)) ||
            ["pi", "e", "ans", ")", "!", "%"].includes(token);
    }

    function canStart(token) {
        return !isNaN(Number(token)) ||
            ["pi", "e", "ans", "(",
             "sin", "cos", "tan", "log", "ln", "sqrt"].includes(token);
    }

    for (let i = 0; i < tokens.length; i++) {
        const current = tokens[i];

        if (
            result.length > 0 &&
            canEnd(result[result.length - 1]) &&
            canStart(current)
        ) {
            result.push("*");
        }

        result.push(current);
    }

    return result;
}

// Mesin perhitungan matematika
function calculateExpression(input) {
    const tokens = tokenize(input);
    let index = 0;

    function peek() {
        return tokens[index];
    }

    function consume() {
        return tokens[index++];
    }

    function expressionValue() {
        let value = term();

        while (peek() === "+" || peek() === "-") {
            const operator = consume();
            const right = term();

            value = operator === "+"
                ? value + right
                : value - right;
        }

        return value;
    }

    function term() {
        let value = unary();

        while (peek() === "*" || peek() === "/") {
            const operator = consume();
            const right = unary();

            if (operator === "/" && right === 0) {
                throw new Error("Tidak bisa dibagi 0");
            }

            value = operator === "*"
                ? value * right
                : value / right;
        }

        return value;
    }

    function unary() {
        if (peek() === "+") {
            consume();
            return unary();
        }

        if (peek() === "-") {
            consume();
            return -unary();
        }

        return power();
    }

    function power() {
        const base = primary();

        if (peek() === "^") {
            consume();
            return Math.pow(base, unary());
        }

        return base;
    }

    function primary() {
        let value;
        const token = consume();

        if (token === undefined) {
            throw new Error("Ekspresi belum lengkap");
        }

        if (!isNaN(Number(token)) && token !== "") {
            value = Number(token);
        } else if (token === "pi") {
            value = Math.PI;
        } else if (token === "e") {
            value = Math.E;
        } else if (token === "ans") {
            value = lastAnswer;
        } else if (token === "(") {
            value = expressionValue();

            if (consume() !== ")") {
                throw new Error("Kurung belum lengkap");
            }
        } else if (
            ["sin", "cos", "tan", "log", "ln", "sqrt"].includes(token)
        ) {
            if (consume() !== "(") {
                throw new Error("Gunakan tanda kurung fungsi");
            }

            const argument = expressionValue();

            if (consume() !== ")") {
                throw new Error("Kurung belum lengkap");
            }

            value = calculateFunction(token, argument);
        } else {
            throw new Error("Input tidak valid");
        }

        // Faktorial dan persen
        while (peek() === "!" || peek() === "%") {
            const operator = consume();

            if (operator === "!") {
                if (
                    !Number.isInteger(value) ||
                    value < 0 ||
                    value > 170
                ) {
                    throw new Error("Faktorial hanya untuk 0-170");
                }

                let factorial = 1;

                for (let i = 2; i <= value; i++) {
                    factorial *= i;
                }

                value = factorial;
            } else {
                value = value / 100;
            }
        }

        return value;
    }

    const result = expressionValue();

    if (index !== tokens.length) {
        throw new Error("Ekspresi tidak valid");
    }

    if (!Number.isFinite(result)) {
        throw new Error("Hasil tidak valid");
    }

    return result;
}

// Fungsi ilmiah
function calculateFunction(name, value) {
    const radians = angleMode === "DEG"
        ? value * Math.PI / 180
        : value;

    switch (name) {
        case "sin":
            return Math.sin(radians);

        case "cos":
            return Math.cos(radians);

        case "tan":
            if (Math.abs(Math.cos(radians)) < 1e-12) {
                throw new Error("Hasil tan tidak terdefinisi");
            }
            return Math.tan(radians);

        case "log":
            if (value <= 0) {
                throw new Error("Log harus lebih dari 0");
            }
            return Math.log10(value);

        case "ln":
            if (value <= 0) {
                throw new Error("Ln harus lebih dari 0");
            }
            return Math.log(value);

        case "sqrt":
            if (value < 0) {
                throw new Error("Akar negatif tidak valid");
            }
            return Math.sqrt(value);

        default:
            throw new Error("Fungsi tidak dikenal");
    }
}

// Menambahkan angka atau operator
function appendValue(value) {
    if (resultDisplayed) {
        if (
            /^[0-9.]$/.test(value) ||
            ["pi", "e", "ans", "sin(", "cos(", "tan(",
             "log(", "ln(", "sqrt(", "("].includes(value)
        ) {
            expression = "";
        }

        resultDisplayed = false;
    }

    if (expression.length + value.length > MAX_LENGTH) {
        return;
    }

    if (value === ".") {
        const lastNumber = expression.match(/(\d*\.?\d*)$/);

        if (lastNumber && lastNumber[0].includes(".")) {
            return;
        }

        if (!lastNumber || lastNumber[0] === "") {
            expression += "0";
        }
    }

    expression += value;
    updateDisplay();
}

// Menghitung hasil
function calculate() {
    if (!expression) return;

    try {
        const originalExpression = expression;
        const result = calculateExpression(expression);

        lastAnswer = result;

        const formattedResult = Number(
            result.toPrecision(12)
        ).toString();

previousDisplay.textContent =
    originalExpression
    .replace(/sqrt\(/g, "√(")
    .replace(/\*/g, " × ")
    .replace(/\//g, " ÷ ")
    .replace(/\^2/g, "²")
    .replace(/\^3/g, "³")
    + " =";
        expression = formattedResult;

        display.textContent = formattedResult;
        resultDisplayed = true;

        addHistory(originalExpression, formattedResult);

    } catch (error) {
        previousDisplay.textContent = error.message;
        display.textContent = "Error";
        expression = "";
        resultDisplayed = true;
    }
}

// Menghapus semua input
function clearCalculator() {
    expression = "";
    previousDisplay.textContent = "Ready to calculate";
    resultDisplayed = false;
    updateDisplay();
}

// Menghapus satu karakter
function deleteNumber() {
    if (resultDisplayed) {
        clearCalculator();
        return;
    }

    expression = expression.slice(0, -1);
    updateDisplay();
}

// Mengubah tanda positif/negatif
function toggleSign() {
    if (!expression) return;

    if (resultDisplayed) {
        expression = `-(${expression})`;
        resultDisplayed = false;
    } else {
        expression += "*(-1)";
    }

    if (expression.length > MAX_LENGTH) {
        expression = expression.slice(0, MAX_LENGTH);
    }

    updateDisplay();
}

// Riwayat perhitungan
function addHistory(input, result) {
    history.unshift({ input, result });

    if (history.length > 10) {
        history.pop();
    }

    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = "";

    if (history.length === 0) {
        historyList.textContent = "No history yet";
        return;
    }

    history.forEach(item => {
        const element = document.createElement("div");
        element.className = "history-item";

        const calculation = document.createElement("span");
        calculation.textContent = item.input + " =";

        const answer = document.createElement("strong");
        answer.textContent = item.result;

        element.append(calculation, answer);

        historyList.appendChild(element);
    });
}

// Tombol kalkulator
buttons.addEventListener("click", function(event) {
    const button = event.target.closest("button");

    if (!button) return;

    if (button.dataset.value === "+/-") {
        toggleSign();
        return;
    }

    if (button.dataset.value !== undefined) {
        appendValue(button.dataset.value);
    }

    if (button.dataset.action === "calculate") {
        calculate();
    }

    if (button.dataset.action === "clear") {
        clearCalculator();
    }

    if (button.dataset.action === "delete") {
        deleteNumber();
    }
});

// Mengubah DEG dan RAD
angleButton.addEventListener("click", function() {
    angleMode = angleMode === "DEG" ? "RAD" : "DEG";

    angleButton.textContent = angleMode;
});

// Menampilkan atau menyembunyikan riwayat
document.getElementById("history-toggle").addEventListener("click", function() {
    historyPanel.classList.toggle("hidden");
});

// Menghapus riwayat
document.getElementById("clear-history").addEventListener("click", function() {
    history = [];
    renderHistory();
});

// Dukungan keyboard
document.addEventListener("keydown", function(event) {
    const key = event.key;

    if (/^[0-9.]$/.test(key)) {
        appendValue(key);
    } else if (["+", "-", "*", "/", "^", "(", ")", "%", "!"].includes(key)) {
        appendValue(key);
    } else if (key === "Enter" || key === "=") {
        event.preventDefault();
        calculate();
    } else if (key === "Backspace") {
        deleteNumber();
    } else if (key === "Escape") {
        clearCalculator();
    }
});

updateDisplay();
renderHistory();
