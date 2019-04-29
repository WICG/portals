# portal-embed-demo
This demo demonstrates how Portals can enable a seamless user experience between a website and a third party embed content. Be creative and have fun!!
<br/>
<br/>
## TL;DR;
- This demo consists of two websites (different origin): 
  - **PORTALOG**, a blog service, 
  - and **TTT Archive**, a podcast service.
- TTT Archive is embedded in one of the PORTALOG's article using **Portals**.
- The demo shows how portals enables **seamless experience** between to the two websites.

**[This short explainer video (a YouTube Video less than 2 min)](https://youtu.be/4JkipxFVE9k)** is a great place to start from.
![hero img](https://cdn.glitch.com/98449704-33d8-49b2-88f2-aa6d2aeba5d3%2Fhero_img.png?1556394393372)
<br/>
<br/>
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

### 3. Access [http://localhost:3000/](http://localhost:3000/)
...and you will see PORTALOG with TTT Archive embedded.

> Note that HTMLPortalElement has not implemented the auto play policies yet. In the very first access to PORTALOG, audio might not play. In that case try reloading PORTALOG OR access TTT Archive directly and click on any buttons and go back OR disable the chrome://flags/#autoplay-policy while playing around with the demo.

### 4. Play around with it ;-)
😎😎😎
<br/>
<br/>
## Explainer
This is to show how you can use Portals in cross origin situations. The demo runs a two local express servers for PORTALOG and TTT Archive to simulate cross origin use case. By default, PORTALOG runs in [http://localhost:3000/](http://localhost:3000/) and TTT Archive runs in [http://localhost:3001/](http://localhost:3001/).

The basic structure of the demo is explained below.

![explainer](https://cdn.glitch.com/98449704-33d8-49b2-88f2-aa6d2aeba5d3%2Fportal_explainer.png?1556377936083)

Before getting into details... this could be the current experience w/o Portals
![withoutportals](https://cdn.glitch.com/98449704-33d8-49b2-88f2-aa6d2aeba5d3%2Fw_o_portals_new.gif?1556394769252)
- You can embed thrid party contents with **iframes**.
- But if you want to visit to the content, a browser navigation starts and it needs to render all the content again which often leads to **slow page load experience**.
- Also in this case even if you are playing the audio, **it just stops** due to page navigation.
<br/>

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
> Demo code reference: [creating a Portal element](https://github.com/WICG/portals/blob/master/demos/portal-embed-demo/public/js/portalog/portals-controller.js#L37) 

For the Portal content side, you can judge if the page is used inside a Portal and customize the UI.
```javascript
// Check if window.portalHost is available
if(window.portalHost){
   // Customize the UI when being
   // embedded as portals
}
```
> Demo code reference: [Check if window.portalHost is avaiable](https://github.com/WICG/portals/blob/master/demos/portal-embed-demo/public/js/ttt/portals-controller.js#L198) and [change the style](https://github.com/WICG/portals/blob/master/demos/portal-embed-demo/public/js/ttt/portals-controller.js#L200)

For now, Portal will not process user input. If you want to interact with the Portal (like playing the audio in the demo), use `postMessage`/`onmessage`.
```javascript
// Send message from the portal element
const portal = document.querySelector('portal');
portal.postMessage({someKey: someValue}, ORIGIN);

// Receive message via window.portalHost
window.portalHost.addEventListener('message', evt => {
   const data = evt.data;
   // do the actual following
});
```
> Demo code reference: interacting with the audio player ([sending messages](https://github.com/WICG/portals/blob/master/demos/portal-embed-demo/public/js/portalog/portals-controller.js#L135) and [receiving messages](https://github.com/WICG/portals/blob/master/demos/portal-embed-demo/public/js/ttt/portals-controller.js#L183))

When the user decides to navigate the the Portal content i.e. click, it is a good opportunity to animate the Portal and then call the `activate` function. User will be navigated to the Portal content seamlessly (but the URL changes). You can also see that the session of the Portal content is consistent and the audio keeps playing even after this activation.
```javascript
// do some fancy animations and..
// activate portal
const portal = document.querySelector('portal');
portal.activate();
```
> Demo code reference: [doing some animation on user click](https://github.com/WICG/portals/blob/master/demos/portal-embed-demo/public/js/portalog/portals-controller.js#L47) and [activating the Portal](https://github.com/WICG/portals/blob/master/demos/portal-embed-demo/public/js/portalog/portals-controller.js#L85) (note that you can optionally pass [custom data](https://github.com/WICG/portals/blob/master/demos/portal-embed-demo/public/js/portalog/portals-controller.js#L86) to the Portal)

For the Portal content side, you can listen to the `portalactivate` event to check if the page was activated. Also from the event you can retrieve the previous page as a Portal element by calling the `adoptPredecessor` function. By leveraging the predecessor Portal element, you can implement a seamless navigation experience when going back and forth between the two pages (or origins).
```javascript
// Listen to the portalactivate event
window.addEventListener('portalactivate', evt => {
   // ... and creatively use the predecessor
   const portal = evt.adoptPredecessor();
   document.querySelector('someElm').appendChild(portal);
});
```
> Demo code reference: [listening to `portalactivate`](https://github.com/WICG/portals/blob/master/demos/portal-embed-demo/public/js/ttt/portals-controller.js#L144) and [reusing the predecessor](https://github.com/WICG/portals/blob/master/demos/portal-embed-demo/public/js/ttt/portals-controller.js#L152)

On the predcessor side, `activate` will resolve with an `undefined` `Promise` when the Portal activation has completed. If it was adopted as a predecessor, you can start using `window.portalHost`.
```javascript
// The activate function returns a Promise.
// When the promise resolves, it means that the portal has been activated.
// Note that the promise resolves with undefined
// i.e. https://wicg.github.io/portals/#complete-portal-activation
// 
// If this document was adopted by it, then window.portalHost will exist
// When the promise resolves, it means the page was adopted as a predecessor
portal.activate().then(_ => {
   // check if portalHost is available
   if(window.portalHost){
        // The page was adopted as a predecessor. You can start
        // communicating with the portal element i.e. listen to messages
        window.portalHost.addEventListener('message', evt => {
            // handle the event
        });

   }
});
```
> Demo code reference: [sending messages to follow](https://github.com/WICG/portals/blob/master/demos/portal-embed-demo/public/js/ttt/writer-follow.js#L106) the writer of PORTALOG and [handling the event in the article page](https://github.com/WICG/portals/blob/master/demos/portal-embed-demo/public/js/portalog/portals-controller.js#L105)


## Disclaimer
The code base is built for demo purpose only (non production ready code). The demo is using [Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components) (Shadow DOM v1, Custom Elements v1), [JS modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) (import/export) and written in ES6 syntax. To make the demo simple, it is not transpiling to ES5 and also not adding any polyfills. If you access the demo with a browser that does not support Portals, it will show a message as below with an iframe fallback (and the UI could break).

![fallback](https://cdn.glitch.com/98449704-33d8-49b2-88f2-aa6d2aeba5d3%2Ffallback.png?1556379460425)
<br/>
## License
[https://github.com/WICG/portals/blob/master/LICENSE.md](https://github.com/WICG/portals/blob/master/LICENSE.md)
