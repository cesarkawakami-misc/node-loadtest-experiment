const http = require('http');

const server = http.createServer((req, res) => {
    res.end('hello world!');
});

const port = 8000;
console.log(`Server listening on port ${port}...`);
server.listen(port);
