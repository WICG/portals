# portal-embed-demo
This demo demonstrates how a \<portal\> element can enable a seamless user experience between two different pages.


## TL;DR;
- This demo consists of two pages (same origin):
  - **PORTALOG**, an article page,
  - and **TTT Archive**, a podcast page.
- TTT Archive is embedded in the PORTALOG article page using **the \<portal\> element**.
- \<portal\> enables a **seamless navigation experience** between the two pages.

![hero img](https://cdn.glitch.com/98449704-33d8-49b2-88f2-aa6d2aeba5d3%2Fportal-demo.gif?v=1625501108442)

## Running the demo
### 1. Run the app
```bash
$ git clone https://github.com/WICG/portals.git
$ cd portals/demos/portal-embed-demo
$ npm install
$ npm run demo
💻 Portal Demo has launched: http://localhost:3000/?portalpath=/ttt
```
A local server will start running.

### 2. Open a browser that supports \<portal\>
Learn the supported envirionments [here](https://web.dev/hands-on-portals/#enable-flags).

### 3. Access [http://localhost:3000/?portalpath=/ttt](http://localhost:3000/?portalpath=/ttt)
You will see PORTALOG with TTT Archive embedded.

> Note that HTMLPortalElement has not implemented the `autoplay` policies yet. The first time you access PORTALOG, audio might not play. In that case, try reloading PORTALOG, access TTT Archive directly and click on any buttons and go back.

## Design

### Purpose of the demo
This is a demo to showcase what's possible with the \<portal\> element using [the same-origin message channel](https://github.com/WICG/portals#same-origin-communication-channels), [portal activation](https://wicg.github.io/portals/#dom-htmlportalelement-activate) and [the portal predecessor instance](https://wicg.github.io/portals/#dom-portalactivateevent-adoptpredecessor). The goal is to build a SPA-like smooth navigational experience with consistent state in a MPA (Multi-Page Application) architecture.

### Page design
The demo consists of two pages:
- PORTALOG ([https://localhost:3000/](https://localhost:3000/)) - a mock article page
- TTT Archive ([https://localhost:3000/ttt](https://localhost:3000/ttt)) - a mock podcast page that has the feature to select and play an audio

> For the folks who don't know TTT (Totally Tooling Tips), please check out the [YouTube play list](https://www.youtube.com/playlist?list=PLNYkxOF6rcIB3ci6nwNyLYNU6RDOU3YyL).

PORTALOG loads TTT Archive via the \<portal\> element to embed the audio player and seamlessly navigate back and forth between the two pages while playing the audio consistently. While TTT Archive is a single page, it has multiple UI style based on the state of the page:

![explainer-1](https://cdn.glitch.com/98449704-33d8-49b2-88f2-aa6d2aeba5d3%2Fportal-explainer-1.png?v=1625504903796)

### Basic use case and the sequence
- **Use case 1: Controling the audio** - While TTT Archive is being embeded via the \<portal\> element, use the same origin message channel to communicate between the host and the portal content i.e. `sendMessage` to command the audio player.

![explainer-2](https://cdn.glitch.com/98449704-33d8-49b2-88f2-aa6d2aeba5d3%2Fportal-explainer-2.png?v=1625504902812)

- **Use case 2: Navigating into the embeded content** - When the user taps on the \<portal\> element, navigate to TTT Archive adding CSS transition animation. 

![explainer-3](https://cdn.glitch.com/98449704-33d8-49b2-88f2-aa6d2aeba5d3%2Fportal-explainer-3.png?v=1625504903756)

- **Use case 3: Going back to the previous page** - When the user taps on the predecessor instance in TTT Archive (the background), activate the predecessor and navigate back to PORTALOG with animation.

Pleae also check how to use the \<portal\> element [here](https://web.dev/hands-on-portals/).


## Disclaimer
The code base is built for demo purpose only (non production ready code). It uses [Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components) (Shadow DOM v1, Custom Elements v1), [JS modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) (import/export) and written in ES6 syntax. To make the demo simple, it is not transpiled to ES5 and does not include any polyfills. If you access the demo with a browser that does not support the \<portal\> element, it will show a message as below with an iframe fallback (and the UI could break).

![fallback](https://cdn.glitch.com/98449704-33d8-49b2-88f2-aa6d2aeba5d3%2Fportal-fallback.png?v=1625507318099)

## TTT Archive creatives
Some of the images and mp3 files used in the TTT Archive demo are modifications based on work created and [shared by Google](https://developers.google.com/terms/site-policies) and used according to terms described in the [Creative Commons 3.0 Attribution License](https://creativecommons.org/licenses/by/3.0/).

## License
[https://github.com/WICG/portals/blob/master/LICENSE.md](https://github.com/WICG/portals/blob/master/LICENSE.md)
