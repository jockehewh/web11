var express = require('express');
var webtorrent = require('webtorrent');
var path = require('path');
var http = require('http');
var appE = express();
const electron = require('electron');
const {app, BrowserWindow} = electron;
const {ipcMain} = electron;
var port = 9111;

var client = new webtorrent();
// Allow Cross-Origin requests
app.on('ready', ()=>{
let win = new BrowserWindow({width:800, height:600});
win.loadURL('http://localhost:9111');
let list = new BrowserWindow({width:300, height:600, frame:false});
const urlist = 'file://'+__dirname+'/list.html';

list.on('close',()=>{list.loadURL(urlist);
list.hide();})


var Menu = electron.Menu;
  var menu = Menu.buildFromTemplate([
    {
      label: 'collection',
      submenu:[
        {
          label:'Collection',
      click: () => {
        if(list.isVisible())
        list.hide()
        else
          list.show()
      }
      }]
    }
  ]);
  Menu.setApplicationMenu(menu);



  //-------------------------------------------------*
appE.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'OPTIONS, POST, GET, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

appE.use(express.static(path.join(__dirname, 'app')));

var getLargestFile = function (torrent) {
    var file;
    for(i = 0; i < torrent.files.length; i++) {
        if (!file || file.length < torrent.files[i].length) {
            file = torrent.files[i];
        }
    }
    return file;
};

var buildMagnetURI = function(infoHash) {
    return 'magnet:?xt=urn:btih:' + infoHash + '&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.ccc.de%3A80&tr=udp%3A%2F%2Ftracker.istole.it%3A80&tr=udp%3A%2F%2Fopen.demonii.com%3A1337&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Fexodus.desync.com%3A6969';
};

appE.get('/api/add/:infoHash', function(req, res) {
    if(typeof req.params.infoHash == 'undefined' || req.params.infoHash == '') {
        res.status(500).send('Missing infoHash parameter!'); return;
    }
    var torrent = buildMagnetURI(req.params.infoHash);
    try {
        client.add(torrent, function (torrent) {
            var file = getLargestFile(torrent);
            torrent.on('error', function(err) {
              console.log(err);
                if(torrent.length == torrent.downloaded) {
                    torrent.destroy();
                    torrent.discovery.stop();
                }
            });
            res.status(200).send('Added torrent!');
        });
    } catch (err) {
        res.status(500).send('Error: ' + err.toString());
    }
});


appE.get('/stream/:infoHash.mp4', function(req, res, next) {
    if(typeof req.params.infoHash == 'undefined' || req.params.infoHash == '') {
        res.status(500).send('Missing infoHash parameter!'); return;
    }
    var torrent = buildMagnetURI(req.params.infoHash);
    try {
        var torrent = client.get(torrent);
        var file = getLargestFile(torrent);
        var total = file.length;

        if(typeof req.headers.range != 'undefined') {
            var range = req.headers.range;
            var parts = range.replace(/bytes=/, "").split("-");
            var partialstart = parts[0];
            var partialend = parts[1];
            var start = parseInt(partialstart, 10);
            var end = partialend ? parseInt(partialend, 10) : total - 1;
            var chunksize = (end - start) + 1;
        } else {
            var start = 0; var end = total;
        }

        var stream = file.createReadStream({start: start, end: end});
        res.writeHead(206, { 'Content-Range': 'bytes ' + start + '-' + end + '/' + total, 'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': 'video/mp4' });
        stream.pipe(res);
    } catch (err) {
        res.status(500).send('Error: ' + err.toString());
    }
});


appE.get('/api/delete/:infoHash', function(req, res, next) {
    if(typeof req.params.infoHash == 'undefined' || req.params.infoHash == '') {
        res.status(500).send('Missing infoHash parameter!'); return;
    }
    var torrent = buildMagnetURI(req.params.infoHash);
    try {
        var torrent = client.remove(torrent);
        res.status(200).send('Removed torrent. ');
    } catch (err) {
        res.status(500).send('Error: ' + err.toString());
    }
});

var server = http.createServer(appE);
server.listen(port, function() {
    console.log('Listening on http://127.0.0.1:' + port);
});
//APP.ONREADY..
});
