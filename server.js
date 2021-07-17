const cluster = require('cluster');
const http = require('http');
const common = require('./common.js');

const numWorkers = 4;
const port = 8000;

if (cluster.isMaster) {
    console.log(`Primary ${process.pid} is running`);
    const workerProcs = Array(numWorkers).fill().map(() => cluster.fork());
    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
    });
} else {
    const latStats = new common.LatStats();
    const server = http.createServer(async (req, res) => {
        const reqStart = common.monoTime();
        await common.sleep(2);
        res.end('hello world!');
        const reqEnd = common.monoTime();
        const latency = reqEnd - reqStart;
        latStats.addSample(latency);
    });
    console.log(`Worker ${process.pid} listening on ${port}...`);
    latStats.loggerWorker();
    server.listen(port);
}
