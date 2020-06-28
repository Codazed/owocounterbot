const socket = io.connect('http://localhost:8080');
const counter = document.getElementById('counter');

socket.on('counter', (count) => {
    counter.innerHTML = count;
});