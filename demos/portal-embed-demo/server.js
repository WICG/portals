const express = require('express');
const DEFAULT_PORT = 3000;

const genServer = (port, root, portal) => {
    const app = express();
    app.use(express.static('public'));
    const addRoute = (path, file) => {
        app.get(path, (req, res) => {
            res.sendFile(`${__dirname}/${file}`);
        });
    };
    addRoute(root.path, root.file);
    addRoute(portal.path, portal.file);
    const listener = app.listen(port, () => {
        const myPort = listener.address().port;
        console.log(`💻 Portal Demo has launched: http://localhost:${myPort}/?portalpath=${portal.path}`);
    });
};

/*
 * A simple server hosting an article page and a podcast page
 * Due to Privacy considerations, Portals have now limited its communication
 * chanel to same-origin use cases
 * e.g. https://github.com/WICG/portals#same-origin-communication-channels
 * */
genServer(DEFAULT_PORT,
    {
        path: '/',
        file: 'view/portalog.html',
    },
    {
        path: '/ttt',
        file: 'view/ttt.html',
    }
);
