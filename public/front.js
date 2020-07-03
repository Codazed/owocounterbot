const socket = io.connect(window.location.host);
const counter = document.getElementById('counter');
const lifetimeCounter = document.getElementById('lifetime');
const milestoneText = document.getElementById('milestone');
const milestoneNum = document.getElementById('milestonenum');
const hiscoreText = document.getElementById('hiscoretext');
const hiscoreNum = document.getElementById('hiscore');
const channel = window.location.pathname.substr(1);
const milestoneAudio = new Audio('/milestone.ogg');
var hiscorePassed = false;

socket.on('refresh', () => {
    window.location.reload(true);
});

socket.on('reset-' + channel, () => {
    hiscorePassed = false;
    counter.innerHTML = 0;
});

socket.on('counter-' + channel, async (count, lifetime) => {
    await Promise.all([animateCSS(counter, 'flipOutX'), animateCSS(lifetimeCounter, 'flipOutX')]);
    counter.innerHTML = count;
    lifetimeCounter.innerHTML = lifetime;
    await Promise.all([animateCSS(counter, 'flipInX'), animateCSS(lifetimeCounter, 'flipInX')]);
});

socket.on('hiscore-' + channel, async(newScore, show=true) => {
    if (!hiscorePassed && show) {
        hiscorePassed = true;
        milestoneAudio.play();
        hiscoreText.style.display = 'inline-block';
        updateHiScore();
        await animateCSS(hiscoreText, 'fadeInRight');
        await later(500);
        await animateCSS(hiscoreText, 'fadeOutLeft');
        hiscoreText.style.display = 'none';
    } else {
        updateHiScore();
    }
    async function updateHiScore() {
        await animateCSS(hiscoreNum, 'flipOutX');
        hiscoreNum.innerHTML = newScore;
        await animateCSS(hiscoreNum, 'flipInX');
    }
});

socket.on('milestone-' + channel, async (milestone, count) => {
    milestoneNum.innerHTML = milestone;
    milestoneText.style.display = 'inline-block';
    milestoneAudio.play();
    await animateCSS(milestoneText, 'fadeInRight');
    await animateCSS(milestoneNum, 'heartBeat');
    await later(1000);
    await animateCSS(milestoneText, 'fadeOutLeft');
    milestoneText.style.display = 'none';
});

const animateCSS = (element, animation, prefix = 'animate__') =>
    // We create a Promise and return it
    new Promise((resolve, reject) => {
        const animationName = `${prefix}${animation}`;
        const node = element;

        node.classList.add(`${prefix}animated`, animationName);

        // When the animation ends, we clean the classes and resolve the Promise
        function handleAnimationEnd() {
            node.classList.remove(`${prefix}animated`, animationName);
            node.removeEventListener('animationend', handleAnimationEnd);

            resolve('Animation ended');
        }

        node.addEventListener('animationend', handleAnimationEnd);
    });

function later(delay) {
    return new Promise(function(resolve) {
        setTimeout(resolve, delay);
    });
}