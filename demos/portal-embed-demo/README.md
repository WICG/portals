# portal-embed-demo
This demo demonstrates how Portals can enable a seamless user experience between a website and third-party embedded content. Be creative and have fun!!


## TL;DR;
- This demo consists of two websites (different origin): 
  - **PORTALOG**, a blog service, 
  - and **TTT Archive**, a podcast service.
- TTT Archive is embedded in one of PORTALOG's articles using **Portals**.
- Portals enables a **seamless experience** between the two websites.

**[This short explainer video](https://youtu.be/4JkipxFVE9k)** is a great place to start from.
![hero img](https://cdn.glitch.com/98449704-33d8-49b2-88f2-aa6d2aeba5d3%2Fhero_img.png?1556394393372)


## Running the demo
### 1. Run the app
```bash
$ git clone https://github.com/WICG/portals.git
$ cd portals/demos/portal-embed-demo
$ npm install
$ npm run demo
```
Two local servers will start running.

```bash
$ npm run demo
📝 PORTALOG has launched: http://localhost:3000?portalport=3001
🎧 TTT Archive has launched: http://localhost:3001
```

### 2. Open a browser that supports Portals
As of May 2019, Chrome Canary is the only platform that supports Portals. You can try out Portals in Chrome Canary by flipping an experimental flag (chrome://flags/#enable-portals).

### 3. Access [ http://localhost:3000/?portalport=3001]( http://localhost:3000/?portalport=3001)
...and you will see PORTALOG with TTT Archive embedded.

> Note that HTMLPortalElement has not implemented the autoplay policies yet. The first time you access PORTALOG, audio might not play. In that case, try reloading PORTALOG, access TTT Archive directly and click on any buttons and go back, or disable the chrome://flags/#autoplay-policy while playing around with the demo.

### 4. Play around with it ;-)
😎😎😎


## Explainer
This is to show how you can use Portals in cross origin situations. The demo runs a two local express servers for PORTALOG and TTT Archive to simulate a cross origin use case. By default, PORTALOG is available at [http://localhost:3000/](http://localhost:3000/) and TTT Archive is available at [http://localhost:3001/](http://localhost:3001/).

The basic structure of the demo is explained below.

![explainer](https://cdn.glitch.com/98449704-33d8-49b2-88f2-aa6d2aeba5d3%2Fportal_explainer.png?1556377936083)

Before getting into details... this could be the current experience w/o Portals
![withoutportals](https://cdn.glitch.com/98449704-33d8-49b2-88f2-aa6d2aeba5d3%2Fw_o_portals_new.gif?1556394769252)
- You can embed third party contents with **iframes**.
- But if you want to visit the content, a browser navigation starts and it needs to render all the content again which often leads to a **slow page load experience**.
- If you are playing the audio, **it just stops** due to page navigation.

**...But with having Portals** 🚪🏃💨
![withportals](https://cdn.glitch.com/98449704-33d8-49b2-88f2-aa6d2aeba5d3%2Fw_portals.gif?1556394385809)

You can embed third party content just like an `iframe`.
```html
<!-- You can use it like iframes -->
<portal src='https://example.com'></portal>
```
OR
```javascript
// From JavaScript
const portal = document.createElement('portal');
portal.src = 'https://example.com';
```
> Demo code reference: [creating a portal element](public/js/portalog/portals-controller.js#L37) 

A page can detect if it is inside a portal and, if so, modify its UI accordingly.
```javascript
// Detect whether this page is hosted in a portal
if (window.portalHost) {
  // Customize the UI when being embedded as a portal
}
```
> Demo code reference: [Check if window.portalHost is available](public/js/ttt/portals-controller.js#L198) and [change the style](public/js/ttt/portals-controller.js#L200)

For now, portals do not respond to user input. If you want to interact with portals (like playing the audio in the demo), use `postMessage`.
```javascript
// Send message to the portal element
const portal = document.querySelector('portal');
portal.postMessage({someKey: someValue}, ORIGIN);

// Receive message via window.portalHost
window.portalHost.addEventListener('message', evt => {
  const data = evt.data.someKey;
  // handle the event
});
```
> Demo code reference: interacting with the audio player ([sending messages](public/js/portalog/portals-controller.js#L135) and [receiving messages](public/js/ttt/portals-controller.js#L183))

When the user decides to navigate the the portal content i.e. click, it is a good opportunity to animate the portal and then call the `activate` function. User will be navigated to the portal content seamlessly (but the URL changes). The content continues running uninterrupted, and the audio even keeps playing after activation.
```javascript
// do some fancy animations and after animations are complete, activate the portal.
const portal = document.querySelector('portal');
portal.activate();
```
> Demo code reference: [animating the portal on click](public/js/portalog/portals-controller.js#L47) and [activating the portal](public/js/portalog/portals-controller.js#L85) (note that you can optionally pass [custom data](public/js/portalog/portals-controller.js#L86) to the portal)

Inside the portal content, you can listen to the `portalactivate` event to be notified when the page is activated. You can retrieve the previous page as a `<portal>` element by calling the `adoptPredecessor` function on the event. By leveraging the predecessor portal element, you can implement a seamless navigation experience when going back and forth between the two pages.
```javascript
// Listen to the portalactivate event
window.addEventListener('portalactivate', evt => {
  // ... and creatively use the predecessor
  const portal = evt.adoptPredecessor();
  document.querySelector('someElm').appendChild(portal);
});
```
> Demo code reference: [listening to `portalactivate`](public/js/ttt/portals-controller.js#L144) and [reusing the predecessor](public/js/ttt/portals-controller.js#L152)

`activate` returns a promise that resolves when activation has completed.
```javascript
// The activate function returns a Promise.
// When the promise resolves, it means that the portal has been activated.
// If this document was adopted by it, then window.portalHost will exist.
// When the promise resolves, it means the page was adopted as a predecessor
portal.activate().then(_ => {
  // Check if this document was adopted into a portal element.
  if (window.portalHost) {
    // You can start communicating with the portal element i.e. listen to messages
    window.portalHost.addEventListener('message', evt => {
      // handle the event
    });
  }
});
```
> Demo code reference: [sending messages to follow](public/js/ttt/writer-follow.js#L106) the writer of PORTALOG and [handling the event in the article page](public/js/portalog/portals-controller.js#L105)


## Disclaimer
The code base is built for demo purpose only (non production ready code). It uses [Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components) (Shadow DOM v1, Custom Elements v1), [JS modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) (import/export) and written in ES6 syntax. To make the demo simple, it is not transpiled to ES5 and does not include any polyfills. If you access the demo with a browser that does not support Portals, it will show a message as below with an iframe fallback (and the UI could break).

![fallback](https://cdn.glitch.com/98449704-33d8-49b2-88f2-aa6d2aeba5d3%2Ffallback.png?1556379460425)

## TTT Archive creatives
Some of the images and mp3 files used in the TTT Archive demo are modifications based on work created and [shared by Google](https://developers.google.com/terms/site-policies) and used according to terms described in the [Creative Commons 3.0 Attribution License](https://creativecommons.org/licenses/by/3.0/).

## License
[https://github.com/WICG/portals/blob/master/LICENSE.md](https://github.com/WICG/portals/blob/master/LICENSE.md)
