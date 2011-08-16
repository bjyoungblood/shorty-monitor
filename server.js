var sys     = require('sys'),
    http    = require('http'),
    qs      = require('querystring'),
    url     = require('url');

var monitor = {
    paths: {},
    shorty: {},

    addPath:
        function(path, callback) {
            this.paths[path] = callback;
        },

    hasPath:
        function(path) {
            if (path in this.paths) {
                return true;
            }
            return false;
        },
    send404:
        function(res) {
            res.writeHead(404);
            res.write('404');
            res.end();
        },
    runRequest:
        function(path, getData, postData, res) {
            if (!this.hasPath(path)) {
                this.send404(res);
                return;
            }
            return this.paths[path](getData, postData, res);
        }
};

var server = http.createServer(function(req, res) {
    var reqUrl = url.parse(req.url);
    var queryString = {};

    if (reqUrl.query != undefined && reqUrl.query != null) {
        queryString = qs.parse(reqUrl.query);
    }

    req.content = '';
    req.addListener('data', function(chunk) {
        req.content += chunk;
    });

    req.addListener('end', function() {
        if (req.method == 'GET') {
            monitor.runRequest(reqUrl.pathname, queryString, false, res);
        } else if (req.method == 'POST') {
            monitor.runRequest(reqUrl.pathname, queryString, req.content, res);
        }
    });
});

var getBindText = function(bind) {
    switch (bind) {
        case 0:
            return 'Unbound';
        case 1:
            return 'Receiver';
        case 2:
            return 'Transmitter';
        case 3:
            return 'Transceiver';
        default:
            return 'Unknown / Error';
    }
};

var smpp = {
    0x80000000: 'generic_nack',
    0x00000001: 'bind_receiver',
    0x80000001: 'bind_receiver_resp',
    0x00000002: 'bind_transmitter',
    0x80000002: 'bind_transmitter_resp',
    0x00000003: 'query_sm',
    0x80000003: 'query_sm_resp',
    0x00000004: 'submit_sm',
    0x80000004: 'submit_sm_resp',
    0x00000005: 'deliver_sm',
    0x80000005: 'deliver_sm_resp',
    0x00000006: 'unbind',
    0x80000006: 'unbind_resp',
    0x00000007: 'replace_sm',
    0x80000007: 'replace_sm_resp',
    0x00000008: 'cancel_sm',
    0x80000008: 'cancel_sm_resp',
    0x00000009: 'bind_transceiver',
    0x80000009: 'bind_transceiver_resp',
    0x0000000B: 'outbind',
    0x00000015: 'enquire_link',
    0x80000015: 'enquire_link_resp',
    0x00000021: 'submit_multi',
    0x80000021: 'submit_multi_resp',
    0x00000102: 'alert_notification',
    0x00000103: 'data_sm',
    0x80000103: 'data_sm_resp'
};

monitor.addPath('/viewconn', function(getData, postData, res) {
    var key = getData.id;
    var client = monitor.shorty.clients[key];

    if (client == undefined) {
        res.writeHead(404);
        res.write('404: no such client');
        res.end();
        return;
    }

    res.writeHead(200, {'Content-type': 'text/html'});
    res.write('<h1>Viewing Connection from ' + client.socket.remoteAddress + '</h1>');
    res.write('Bind type: ' + getBindText(client.bind_type) + '<br />');
    res.write('Connected at: ' + client.connect_time + '<br />');
    
    res.write('<h2>Packets Sent</h2>');
    res.write('<table><tr><th>Command ID</th><th>Count</th></th></tr>');
    for (var key in client.pdusSent) {
        res.write('<tr>');
        res.write('<td>' + smpp[key] + '</td>');
        res.write('<td>' + client.pdusSent[key] + '</td>');
        res.write('</tr>');
    }
    res.write('</table>');
    
    res.write('<h2>Packets Received</h2>');
    res.write('<table><tr><th>Command ID</th><th>Count</th></th></tr>');
    for (var key in client.pdusReceived) {
        res.write('<tr>');
        res.write('<td>' + smpp[key] + '</td>');
        res.write('<td>' + client.pdusReceived[key] + '</td>');
        res.write('</tr>');
    }
    res.write('</table>');

    res.end();
});

monitor.addPath('/', function(getData, postData, res) {
    var client;
    res.writeHead(200, {'Content-type': 'text/html'});
    res.write('<h1>Shorty Server Monitor</h1>');
    res.write('<table><tr><th></th><th>IP</th><th>System ID</th><th>Bind Type</th></tr>');
    for (var key in monitor.shorty.clients) {
        client = monitor.shorty.clients[key];
        ip = client.socket.remoteAddress;

        res.write('<tr>');
        res.write('<td><a href="/viewconn?id='+key+'">View</a></td>');
        res.write('<td>' + ip + '</td>');
        res.write('<td>' + client.system_id + '</td>');
        res.write('<td>' + getBindText(client.bind_type) + '</td>');
        res.write('</tr>');
    }

    res.write('</table>');
        
    res.end();
});

exports.monitor = function(shortyServer, port) {
    monitor.shorty = shortyServer;
    server.listen(port);
}
