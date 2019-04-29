const express = require('express');
const PORTALOG_PORT = 3000;
const TTT_ARCHIVE_PORT = 3001;

const genServer = (serverName, port, rootHTML) => {
  const app = express();
  app.use(express.static('public'));
  app.get('/', (req, res) => {
    res.sendFile(`${__dirname}/${rootHTML}`);
  });
  const listener = app.listen(port, function() {
    const myPort = listener.address().port;
    console.log(`${serverName} has launched: http://localhost:${myPort}${myPort === PORTALOG_PORT ? '?portalport=' + TTT_ARCHIVE_PORT : ''}`);
  });
};

/** A simple server hosting an article page and a podcast page
 * in a differen port (=simulating cross domain situation). */
genServer('📝 PORTALOG', PORTALOG_PORT, 'view/portalog.html');
genServer('🎧 TTT Archive', TTT_ARCHIVE_PORT, 'view/ttt.html');