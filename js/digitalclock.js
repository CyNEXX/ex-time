// Returns current time;
const getTime = () => {
    let now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();
    return { hours, minutes, seconds };
}

// This function wraps getTime and updateTime and is sent as arg to setInterval
const refreshTime = () => {
    const currentTime = getTime();
    updateTime(currentTime);
}

// Updates time in UI
const updateTime = ({ hours, minutes, seconds }) => {
    const timeText = document.querySelector('.digits');
    const separator = !(seconds % 2) ? ':' : ' '
    timeText.innerHTML = `${padTime(hours)}${separator}${padTime(minutes)}${separator}${padTime(seconds)}`;
    const sunElement = document.querySelector('.day');
    const moonElement = document.querySelector('.night');

    // If past 18 o'clock but earlier than 6 in the morning, 
    // the moon will be lighten otherwise the sun will be lighten
    if (hours >= 18 || hours < 6) {
        sunElement.classList.remove('active');
        moonElement.classList.add('active');
    } else {
        sunElement.classList.add('active');
        moonElement.classList.remove('active');
    }
}

// Adds leading zeroes if value less than 10
const padTime = (value) => value > 9 ? value : `0${value}`;


const inter = setInterval(refreshTime, 1000);