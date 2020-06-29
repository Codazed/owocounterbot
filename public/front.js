const socket = io.connect(window.location.host);
const counter = document.getElementById('counter');

socket.on('counter', async (count) => {
    await animateCSS(counter, 'flipOutX');
    counter.innerHTML = count;
    await animateCSS(counter, 'flipInX');
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