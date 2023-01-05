const DEFAULT_MIN = 5;
const DEFAULT_MAX = 7;

let startTime, endTime, myTimer;
let timeMin, timeMid, timeMax;

let minTime, maxTime, timewindow, startButton, stopButton, resetButton;
let currentTime = 0;

function init() {
    minTime = document.getElementById("minTime");
    maxTime = document.getElementById("maxTime");
    timewindow = document.getElementById("timewindow");
    startButton = document.getElementById("startButton");
    stopButton = document.getElementById("stopButton");
    resetButton = document.getElementById("resetButton");

    if(!minTime || !maxTime || !timewindow || !startButton || !stopButton || !resetButton) {
        console.error("ERROR: init failed to find one or more controls");
        return;
    }

    startButton.addEventListener("click", timerStart, false);
    stopButton.addEventListener("click", timerStop, false);
    resetButton.addEventListener("click", timerReset, false);

    startButton.disabled = false;
}

function displayTime() {
    const millis = Date.now() - startTime;

    let secs = Math.floor(millis / 1000);

    if(secs >= timeMax) {
        document.body.className = "maxtime";
    }
    else if(secs >= timeMid) {
        document.body.className = "midtime";
    }
    else if(secs >= timeMin) {
        document.body.className = "mintime";
    }

    let days = Math.floor(secs/(24 * 60 * 60));
    secs = secs - days * (24 * 60 * 60);
    let hours = Math.floor(secs/(60 * 60));
    secs = secs - hours * (60 * 60);
    let minutes = Math.floor(secs/60);
    secs = secs - minutes * 60;
    
    // timewindow.innerHTML = `${hours}:${minutes}:${secs}`;
    timewindow.innerHTML = pad(hours,1)+':'+pad(minutes,2)+':'+pad(secs,2);

    
}

function pad(num, size) {
    let s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
}

function timerReset() {
    timewindow.innerHTML = "0:00:00"
    resetButton.disabled = true;
    document.body.className = "reset";
}

function timerStart() {
    startTime = Date.now();
    startButton.disabled = true;
    stopButton.disabled = false;
    resetButton.disabled = true;

    timerReset();

    myTimer = setInterval(updateTime, 1000);

    timeMin = parseInt(minTime.value);
    timeMax = parseInt(maxTime.value);

    if(isNaN(timeMin))
        timeMin = DEFAULT_MIN;
    if(isNaN(timeMax))
        timeMax = DEFAULT_MAX;
    
    if(timeMin > timeMax) {
        let t = timeMin;
        timeMin = timeMax;
        timeMax = t;
    }
    timeMin = timeMin * 60;
    timeMax = timeMax * 60;
    timeMid = timeMin + ((timeMax - timeMin)/2);
}

function timerStop() {
    clearInterval(myTimer);
    myTimer = null;

    endTime = Date.now();
    displayTime();

    startButton.disabled = false;
    stopButton.disabled = true;

    if(timewindow.innerHTML != "0:00:00") {
        resetButton.disabled = false;
    }

    startTime = null;
}

function updateTime() {
    if(!startTime)
        return;
    
    endTime = Date.now();
    
    displayTime();
}