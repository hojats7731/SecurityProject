const express = require('express')
const app = express()
const fs = require('fs');
const exec = require('child_process').exec;
const net = require('net'),
    Socket = net.Socket;
const ipfilter = require('express-ipfilter').IpFilter
const IpDeniedError = require('express-ipfilter').IpDeniedError
const request = require('request');

const ips = ["0.0.0.0/0"]
var iranAccess = false;

function checkURL(url, callback) {
    request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log("URL is OK");
            callback("None")
        } else {
            if (response == undefined) {
                console.log("URL Response Code: Timeout");
                callback("Timeout");
            } else {
                console.log("URL Response Code: " + response.statusCode);
                callback(response.statusCode.toString());
            }
        }
    })
};

function clearArray(array) {
    while (array.length) {
        array.pop();
    }
}

var restriction = function () {
    iranAccess = !iranAccess;
    clearArray(ips);

    if (iranAccess) {
        ipcsv = fs.readFileSync('iran.csv', 'utf8');
        iplines = ipcsv.split("\r\n");

        for (var i = 0; i < iplines.length; i++) {
            items = iplines[i].split(",");
            ips.push([items[0], items[1]]);
        }
    } else {
        ips.push("0.0.0.0/0");
    }
}

app.use(ipfilter(ips, {
    mode: 'allow'
}))

app.use((err, req, res, _next) => {
    if (err instanceof IpDeniedError) {
        res.status(403);
        res.send("<h1 align='center'>🖕" + err.message + "🖕</h1>");
        log(`Forbidden Request For ${req.hostname}${req.path}`, req)
    } else {
        res.status(err.status || 500);
        res.send("Internal Error")
    }
})


const port = 3000;

var ports = [22, 25, 80, 443]

var log = function (message, req) {
    var time = "";
    let date_ob = new Date(Date.now());
    time = date_ob.toLocaleString('en-US-u-ca-persian', {
        timeZone: 'Asia/Tehran',
        hourCycle: 'h24'
    });

    var logString = `[${time}][IP: ${req.ip}][User-Agent: ${req.get("User-Agent")}]: ${message}`
    console.log(logString)
    logString += "\r\n";
    fs.appendFile("log.txt", logString, 'utf8',
        // callback function
        function (err) {
            if (err) throw err;
            // if no error
            console.log("Data is appended to file successfully.")
        });
}

var checkPort = function (port, host, callback) {
    var socket = new Socket(),
        status = null;

    socket.on('connect', function () {
        status = 'Open';
        socket.end();
    });
    socket.setTimeout(1500);
    socket.on('timeout', function () {
        status = 'Closed';
        socket.destroy();
    });

    socket.on('error', function (exception) {
        status = 'Closed';
    });
    socket.on('close', function (exception) {
        callback(status, host, port);
    });

    socket.connect(port, host);
}

app.get('/test', (req, res) => {
    log("Test Request", req);
    res.send("Hey Bro: " + req.ip);
});

app.get('/allowme', (req, res) => {
    var ip = req.ip;
    log("Permission Access", req);

    var command = `sudo iptables -D INPUT -p tcp --dport 22 --source ${ip}/32 -j ACCEPT;\r\nsudo iptables -D INPUT -p tcp --dport 22 -j DROP;\r\nsudo iptables -A INPUT -p tcp --dport 22 --source ${ip}/32 -j ACCEPT;\r\nsudo iptables -A INPUT -p tcp --dport 22 -j DROP`;
    res.send("It's All Yours.");
    exec(command);
});

app.get('/checkme', (req, res) => {
    var result = "<ul>";

    var portMap = {};
    var counter = 0;
    var ip = req.ip;
    log("Check Ports Request", req);

    for (var i = 0; i < ports.length; i++) {
        checkPort(ports[i], ip, (status, host, port) => {
            portMap[port] = status;
            counter++;
            result += "<li>";
            result += `${host}:${port} is ${status}`
            result += "</li>";
            if (counter == ports.length) {
                result += "</ul>"
                res.send(result);
            }

        });
    }
});

app.get("/checkAvailability", (req, res) => {
    url = req.query['url'];

    if (url == undefined) {
        log("Avaibility Check With Empty URL", req);
        res.send("Parameter url Is Empty!!!");
    } else {
        if (url.substr(0, 4) != "http") {
            url = "http://" + url;
        }
        log(`Avaibility Check With ${url} As URL`, req);
        err = checkURL(url, (err) => {
            if (err == "None") {
                res.send(`<b>${url}</b> Is Accessible`)
            } else {
                res.send(`<b>${url}</b> Is Not Accessible: ${err} Error`)
            }
        });
    }
});

app.get("/IRANAccess", (req, res) => {
    log("IRAN Access Request", req);

    restriction();
    res.send(`IRAN Access State: ${iranAccess}`)
});

app.get("/log", (req, res) => {
    fs.readFile('log.txt', 'utf8', (err, data) => {
        if (err) {
            res.send("Can't read log file due " + err).status(500);
            return;
        }

        var lines = data.split("\r\n");
        var result = "<h2>Logs</h2><ul>";
        for (var i = 0; i < lines.length; i++) {
            if (lines[i].trim() != "") {
                result += `<li>${lines[i]}</li>`;
            }
        }
        result += "</ul>";
        res.send(result);
    });
    log("Log Request", req);
});

app.listen(port, '0.0.0.0', () => {
    console.log("Start...");
})