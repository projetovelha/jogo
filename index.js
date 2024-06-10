// Load correct CSS bacsed on device type
const mobileRE = /(android|bb\d+|meego).+mobile|armv7l|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series[46]0|samsungbrowser.*mobile|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i
const notMobileRE = /CrOS/
const tabletRE = /android|ipad|playbook|silk/i
function isMobile (opts) {
  if (!opts) opts = {}
  let ua = opts.ua
  if (!ua && typeof navigator !== 'undefined') ua = navigator.userAgent
  if (ua && ua.headers && typeof ua.headers['user-agent'] === 'string') {
    ua = ua.headers['user-agent']
  }
  if (typeof ua !== 'string') return false

  let result =
    (mobileRE.test(ua) && !notMobileRE.test(ua)) ||
    (!!opts.tablet && tabletRE.test(ua))

  if (
    !result &&
    opts.tablet &&
    opts.featureDetect &&
    navigator &&
    navigator.maxTouchPoints > 1 &&
    ua.indexOf('Macintosh') !== -1 &&
    ua.indexOf('Safari') !== -1
  ) {
    result = true
  }

  return result
}
const defaultStyle = isMobile() ? "./mobile.css" : "./desktop.css";
document.querySelector("link[rel='stylesheet']").href = defaultStyle;

// Set the saved theme as startup theme
const toggleSwitch = document.getElementById('theme-toggle');
const theme = localStorage.getItem("theme") || "dark";
document.documentElement.setAttribute("data-theme", theme) // document.documentElement -> html
toggleSwitch.checked = theme === "light";
document.querySelectorAll(".imgs > a").forEach(e => {if(theme === "light") e.classList.toggle("hidden-img")})

// Load the saved language as startup language
const langDropdown = document.getElementById("lang-select");
const lang = localStorage.getItem("language") || "en-us";
let langItems;
fetch(`./lang/${lang}.json`)
    .then(response => response.json())
    .then(data => {
        langItems = data;
        let target = "";
        for(i in data) {
            if(i.includes("placeholder")) target = "placeholder";
            else target = "innerHTML";
            const targetElement = document.querySelectorAll("." + i);
            const targetValue = data[i];
            targetElement.forEach(element => element[target] = targetValue);
            console.log(targetValue)
            window.dispatchEvent(new CustomEvent("SetupComplete"))
        };
    })
    .catch(error => console.error(error));

langDropdown.addEventListener("change", function(e) {
    localStorage.setItem("language", e.target.value);
    e.target.value = "default";
    location.reload();
})

// Load transitions after startup since otherwise it'd work weirdly
const pseudoStyle = document.getElementById("pseudo-style");
const pseudoStyleContent = `
.slider, .slider:before, body, .board-container, .player-input input, .char, .char::before, button, main .board-container, .topbar .imgs > *, .options select {
    transition: 400ms;
}
.startup, main, .gameplay-info, .board-container {
    transition: opacity 400ms, filter 400ms, transform 1s, background-color 400ms;
}
.player-color, .board-container span {
    transition: background-color 400ms, color 400ms;
}
`;
setTimeout(() => {
    pseudoStyle.innerText = pseudoStyleContent
}, 100);

// Toggle between themes
toggleSwitch.addEventListener('change', function(e) {
    const theme = e.target.checked ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    document.querySelectorAll(".imgs > a").forEach(e => e.classList.toggle("hidden-img"));
});

// Change checkboxes
document.querySelectorAll(".char-checkbox > input").forEach((checkbox) => {
    checkbox.addEventListener("change", function(e) {
        document.querySelectorAll("[data-select]").forEach(div => div.setAttribute("data-select", div.getAttribute("data-select") === "O" ? "X" : "O"))
    });
});

let playerTurn, wonPlayer, gameEnded;

window.addEventListener("SetupComplete", function() {

// Start
const start = document.getElementById("start");
const startup = document.querySelector(".startup");
const main = document.getElementById("main");

const gameplayInfo = document.getElementById("gameplay-info");
const tiles = Array.from(document.getElementsByClassName("board-item"));
playerTurn = document.getElementById("player-turn");
wonPlayer = document.getElementById("won-player");
const whichPlayer = document.getElementById("which-player");
const tiePlayer = document.getElementById("tie-player");
let playerNames = [];
let playerBoard = [[], []];
gameEnded = false;
let turn = 0;
start.addEventListener("click", function(e) {
    startup.style.opacity = 0;
    startup.classList.add("slideOut");
    main.style.filter = "none";
    setTimeout(() => {
       startup.style.display = "none"; 
    }, 400);
    playerNames = [document.getElementById("player1-name").value.trim(), document.getElementById("player2-name").value.trim()]
    .map((name, i) => name.length === 0 ? `${langItems.playerDefault} ${i+1}` : name);
    tiles.forEach((tile) => {
        tile.addEventListener("click", function(e) {
            if(tile.innerText !== "" || gameEnded) return;
            const char = turn%2 === (document.querySelector('[data-player="1"]').getAttribute("data-select") === "X" ? 0 : 1) ? "X" : "O";
            tile.innerText = char;
            tile.setAttribute("data-player", char);
            playerBoard[turn%2].push(tile.getAttribute("data-region"));
            const win = checkWin(playerBoard);
            if(win[1]) {
                document.querySelectorAll("[data-region]").forEach(tile => tile.setAttribute("data-player", "L"));
                const winner = win[0];
                const scoreBoard = document.getElementById("score");
                scoreBoard.innerText = scoreBoard.innerText.replace(scoreBoard.innerText.split("-")[winner], parseInt(scoreBoard.innerText.split("-")[winner])+1)
                for(i in win[1]) {
                    const curr = win[1][i];
                    const currElement = document.querySelector(`[data-region="${curr}"]`);
                    currElement.setAttribute("data-player", "W")
                };
                whichPlayer.style.display = "none";
                const wonSpan = document.getElementById("player-won");
                wonSpan.setAttribute("data-player", char);
                wonSpan.innerText = playerNames[turn%2]
                wonPlayer.style.display = "inherit";
                gameEnded = true;
                return;
            };
            if(turn >= 8) {
                whichPlayer.style.display = "none";
                tiePlayer.style.display = "inherit";
                gameEnded = true;
                return;
            }
            playerTurn.innerText = playerNames[turn%2 === 0 ? 1 : 0]
            playerTurn.setAttribute("data-player", char === "X" ? "O" : "X");

            turn++;
        })
    });
    startGame();
});

function startGame() {
    wonPlayer.style.display = "none";
    tiePlayer.style.display = "none";
    whichPlayer.style.display = "inherit";
    gameplayInfo.style.opacity = 1;
    gameplayInfo.style.transform = "none";
    playerTurn.innerText = playerNames[0];
    playerTurn.setAttribute("data-player", document.querySelector('[data-player="1"]').getAttribute("data-select"))
};

function checkWin(board) {
    const conditions = [
        ["TOP-LEFT", "TOP-MIDDLE", "TOP-RIGHT"],
        ["MIDDLE-LEFT", "MIDDLE-MIDDLE", "MIDDLE-RIGHT"],
        ["BOTTOM-LEFT", "BOTTOM-MIDDLE", "BOTTOM-RIGHT"],
        ["TOP-LEFT", "MIDDLE-LEFT", "BOTTOM-LEFT"],
        ["TOP-MIDDLE", "MIDDLE-MIDDLE", "BOTTOM-MIDDLE"],
        ["TOP-RIGHT", "MIDDLE-RIGHT", "BOTTOM-RIGHT"],
        ["TOP-LEFT", "MIDDLE-MIDDLE", "BOTTOM-RIGHT"],
        ["TOP-RIGHT", "MIDDLE-MIDDLE", "BOTTOM-LEFT"]
    ]
    for(i in board) {
        for(j in conditions) {
            if(board[i].includes(conditions[j][0]) &&
                board[i].includes(conditions[j][1]) &&
                board[i].includes(conditions[j][2])
            ) {
                return [i, board[i].filter(check => conditions[j].includes(check))]
            }
        }
    }
    return [];
}

const restart = document.getElementById("restart")
restart.addEventListener("click", function(e) {
    tiles.forEach((tile) => {
        tile.innerText = "";
        tile.setAttribute("data-player", "B");
        playerBoard = [[], []];
        turn = 0;
        gameEnded = false;
        startGame();
    });
});

});

function toggleView(pressedTimes) {
    view = !(pressedTimes % 2);
    document.getElementById("style").href = view ? "./default.css" : defaultStyle;
    pseudoStyle.innerText = view ? "" : pseudoStyleContent;
}

let pressedTimes = 0;
document.addEventListener("keydown", function(e) {
    if(e.code === "KeyT") {
        toggleView(pressedTimes++);
    }
});
let held = false;
document.addEventListener("touchstart", function(e) {
    held = true;
    setTimeout(() => {
        if(held) toggleView(pressedTimes++);
    }, 500);
});
document.addEventListener("touchend", function(e) {
    held = false;
})
