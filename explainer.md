# Portals
**Published:** 2018-04-25, **Updated:** N/A

The name Portals is tentative and the proposal is very early stages. Feedback wanted!

<img src="portal-mocks-1.png" alt="Mocks showing a seamless navigation between 2 sites with an inset 1/2" width="50%"><img src="portal-mocks-2.png" alt="Mocks showing a seamless navigation between 2 sites with an inset 2/2" width="50%">

## tl;dr:
This is a proposal for enabling seamless navigations between sites or pages. In particular, this proposal enables a page to show another page as an inset and perform a seamless transition between an inset state and a navigated state.

A document can include an element which renders a document loaded in a portal context:

```html
<portal id="myPortal" src="https://www.example.com/"></portal>
```

Like a frame, you can use `postMessage` to communicate with a document loaded in a portal context.

Unlike a frame, a portal can be *activated*, which causes the top-level browsing context to navigate, replacing its document with the portal.

```js
myPortal.activate({ data: [...] });
```

At this point, the user will observe that their browser has navigated to `https://www.example.com/`. The document receives an event when it is activated. It can use this event to receive data from its *predecessor* (the document which previously occupied the tab), and even move it into a portal context.

```js
window.addEventListener('portalactivate', e => {
  let predecessor = e.adoptPredecessor(document);
  console.assert(predecessor instanceof HTMLPortalElement);
  document.body.appendChild(predecessor);
});
```

### Goals

Enable seamless navigations:
 - from a page showing a portal-aware destination as an inset
 - between pages of a portal-aware website

### Non-goals

We consider the following items out-of-scope:
 - Specifying navigation patterns, e.g. carousel, infinite lists. UX patterns come and go, we don’t want to hinder innovation or spend time on a pattern that might become obsolete in a couple of years.
 - Specifying transitions or defining APIs related to transitions: the proposal assumes that existing animations and DOM manipulations are enough to create compelling user experiences. We might discover important gaps but these should be addressed via separate efforts to avoid overly specific solutions.
 - Hosting arbitrary unmodified web pages with guarantees of privacy and performance. While we are interested in allowing the embedder to apply additional restrictions to a document in a portal context, we anticipate that pages may require modification to work in such modes. Chrome's experience with prerendering suggests that solving this transparently would be very difficult.

## FAQs

### Why do we need a new HTML tag? Why not use `<iframe>`?

This proposal departs from the behavior of `<iframe>` in a number of ways, which
we believe may be confusing if we use the same HTML tag.

From past experience with `<iframe>` promotion in Chromium, we found that there
were many hidden assumptions in the browser implementation that the frame
hierarchy does not change over time. Instead we intend for content to observe
a universe more similar to being a top-level browsing context from load to
unload.

We wish to give user agents as much flexibility as possible to isolate
the host and guest browsing contexts (in implementations, in separate processes),
even when the active documents may be *same origin-domain*. To make this
possible, we intend not to expose the `Document` or `WindowProxy` of the guest
contents, via the IDL attributes on `HTMLIFrameElement`, by using
access to named windows, or by indexed access to `window.frames`.
Without such access, communication can be be guaranteed to be asynchronous and
not require shared access to JavaScript objects. Those operations which don't
apply to portal contexts would all need to be modified to throw an appropriate
exception in such cases.

We intend to support operations (first and foremost, *activate*) which
will not make sense for non-portal `<iframe>`. These operations would need
additional complexity to handle being called on non-portal frames.

Using a `portal` attribute on iframes would also require defining the behavior
in the case where the attribute is added or removed from an existing element,
which may already have a browsing context. In some cases, the `<iframe>` element
currently silently ignores such changes.

We do expect that some features of `HTMLIFrameElement`, such as sandboxing and
feature policy attributes, will eventually be wanted for portals as well.
We haven't yet figured out how they would interact with portals; even if they
would work the same, implementers would have to make sure all of these
interactions worked correctly before shipping the portals feature in any form.

### How does this work in browsers that restrict third-party cookies?

We imagine that in such cases, the browser would provide functionality for
gaining access to first-party cookies (and other storage) at the author's
request after activation. For instance, the browser could allow using the
[Storage Access API](https://webkit.org/blog/8124/introducing-storage-access-api/)
for this purpose.

There are other kinds of privilege afforded to top-level or first-party
documents. We think they could be handled similarly.

## Alternatives considered
### iframe promotion
Iframe promotion is the idea of providing an API for promoting an iframe to become the top document. 

A while ago, Chromium engineers [experimented](https://bugs.webkit.org/show_bug.cgi?id=32848) with such feature but it was eventually [removed](https://bugs.webkit.org/show_bug.cgi?id=81590) because it turned into a source of security issues and added significant complexity to the code base.

Implementing it today in Chrome would still be extremely complex and run against many hidden assumptions throughout the code base. We believe that this would again lead to a constant stream of security bugs. Also, it seems extremely likely that this feature would be tricky and problematic in other browsers for similar reasons.

### fullscreen iframe
The idea here is to make an iframe appear as if it were the main document and reflect that state in the address bar. Concretely, the proposal suggested to extend requestFullscreen with the ability to opt into showing more system and browser UI which would allow iframes to use the whole viewport. There were several concerns with this approach, in particular having the main document still active while one of its iframe is shown “fullscreen” was seen as problematic.

## References
 - [Promotable Iframe (WICG discussion)](https://discourse.wicg.io/t/proposal-for-promotable-iframe/2375/11)

## Acknowledgements
Contributions and insights from: Domenic Denicola, Jake Archibald, Jeffrey Yasskin, Jeremy Roman, Lucas Gadani, Ojan Vafai, Rick Byers, Yehuda Katz (@wycats).
