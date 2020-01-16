const express = require('express')
const app = express()
const port = 3000
var exec = require('child_process').exec;
var net = require('net'),
    Socket = net.Socket;

var checkPort = function (port, host, callback) {
    var socket = new Socket(),
        status = null;

    socket.on('connect', function () {
        status = 'open';
        socket.end();
    });
    socket.setTimeout(1500);
    socket.on('timeout', function () {
        status = 'closed';
        socket.destroy();
    });
    socket.on('error', function (exception) {
        status = 'closed';
    });
    socket.on('close', function (exception) {
        callback(status, host, port);
    });

    socket.connect(port, host);
}

app.get('/test', (req, res) => {
    console.log("Hey Bro!")

    res.send("Hey Man: " + req.ip)
});

app.get('/allowme', (req, res) => {
    console.log("It's All Yours Bro!")

    ip = req.ip
    command = `sudo iptables -D INPUT -p tcp --dport 22 --source ${ip}/32 -j ACCEPT;\r\nsudo iptables -D INPUT -p tcp --dport 22 -j DROP;\r\nsudo iptables -A INPUT -p tcp --dport 22 --source ${ip}/32 -j ACCEPT;\r\nsudo iptables -A INPUT -p tcp --dport 22 -j DROP`
    res.send("Execute Following Command: " + command)
    exec(command)
});

app.get('/checkme', (req, res) => {

})

app.listen(port, '0.0.0.0', () => {
    console.log("Start...");
})