const socket = io.connect(window.location.host);
const counter = document.getElementById('counter');
const milestoneText = document.getElementById('milestone');
const milestoneNum = document.getElementById('milestonenum');
const channel = window.location.pathname.substr(1);

socket.on('refresh', () => {
    window.location.reload(true);
});

socket.on('counter-' + channel, async (count) => {
    await animateCSS(counter, 'flipOutX');
    counter.innerHTML = count;
    await animateCSS(counter, 'flipInX');
});

socket.on('milestone-' + channel, async (milestone, count) => {
    milestoneNum.innerHTML = milestone;
    milestoneText.style.opacity = '1';
    const audio = new Audio('/milestone.ogg');
    audio.play();
    await animateCSS(milestoneText, 'fadeInDown');
    await animateCSS(milestoneNum, 'heartBeat');
    await later(1000);
    await animateCSS(milestoneText, 'fadeOutUp');
    milestoneText.style.opacity = '0';
})

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