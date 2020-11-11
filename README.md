# Portals

Portals enable seamless and instant navigations between pages. In particular, we propose a new `<portal>` HTML element which enables a page to show another page as an inset, and then *activate* it to perform a seamless transition to a new state, where the formerly-inset page becomes the top-level document.

Portals are part of a general effort toward [privacy-conscious, well-specified prerendering](https://github.com/jeremyroman/alternate-loading-modes/blob/main/README.md). They go beyond basic prerendering support by also providing the inset _preview_ of the content. This makes them suitable for seamless navigations, not just instant ones; for example, they enable web-developer-controlled navigation transitions between the referring page and the prerendered page. Their inset form also can serve as a more-private and more-secure form of an iframe, in certain cases.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of contents

- [Examples](#examples)
  - [Introductory example](#introductory-example)
  - [Navigation transitions](#navigation-transitions)
- [Use cases](#use-cases)
- [Objectives](#objectives)
- [Details](#details)
  - [Same-origin communication channels](#same-origin-communication-channels)
  - [Rendering](#rendering)
  - [Interactivity](#interactivity)
  - [Accessibility](#accessibility)
  - [Session history, navigation, and bfcache](#session-history-navigation-and-bfcache)
  - [Activation](#activation)
  - [CSP integration](#csp-integration)
  - [Embedder-imposed policies and delegation](#embedder-imposed-policies-and-delegation)
- [Summary of differences between portals and iframes](#summary-of-differences-between-portals-and-iframes)
- [Alternatives considered](#alternatives-considered)
  - [A new attribute on an existing element](#a-new-attribute-on-an-existing-element)
  - [TODO:](#todo)
- [Security and privacy considerations](#security-and-privacy-considerations)
- [Stakeholder feedback](#stakeholder-feedback)
- [Acknowledgments](#acknowledgments)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Examples

### Introductory example

A document can include a `<portal>` element, which prerenders the specified URL in the portal:

```html
<portal id="myPortal" src="https://example.com/"></portal>
```

This prerenders `https://example.com/` in a [prerendering browsing context](https://github.com/jeremyroman/alternate-loading-modes/blob/main/browsing-context.md), which imposes certain restrictions such as no use of permission-requiring APIs, or no access to storage in the cross-origin case. Importantly, cross-origin content will need to [opt in](https://github.com/jeremyroman/alternate-loading-modes/blob/main/opt-in.md) to such prerendering.

But unlike other prerendering technologies, where the prerendering takes place entirely offscreen, the portal element shows a preview of the prerendered content. In this way it is somewhat like an iframe, providing a rendered view of another page. Note, however, that a portal's preview is much more restricted than the general embedding mechanism iframes provide; e.g., user interaction with [does not pass through to the portaled content](#interactivity).

When the portaled content is same-origin, the embedding page can communicate with it using

```js
myPortal.postMessage(data);
```

This can be useful to coordinate the preview displayed. However, when the portaled content is cross-origin, `postMessage()` does not function, so as to [prevent cross-site tracking](https://github.com/jeremyroman/alternate-loading-modes/blob/main/browsing-context.md#privacy-based-restrictions).

While all prerendered content can be [activated](https://github.com/jeremyroman/alternate-loading-modes/blob/main/browsing-context.md), becoming fully-rendered top-level content, portals expose this ability to web developers directly. That is, while other prerendering technologies rely on the browser to implicitly activate the prerendered content, with portals the web developer can call

```js
myPortal.activate();
```

which causes the embedding window to navigate, replacing its document with the prerendered one. At this point, the user will observe that their browser has navigated to `https://example.com/`, e.g., via changes to the URL bar contents and back/forward UI. Since `https://example.com/` was already loaded and prerendered in the portal context, this navigation will occur seamlessly and instantly, without a network round-trip or document re-initialization.

For more advanced use cases, the `https://example.com/` document can react to activation, using the `portalactivate` event. It can use this event to adapt itself to its new context. For example, if the page was only showing preview content while in a portal, it can switch to showing the full content of the page. The page can also adopt its *predecessor* (the document which previously occupied the tab) into a new portal context.

```js
window.addEventListener('portalactivate', e => {
  document.body.classList.add('displayed-fully');
  document.requestStorageAccess().then(() => {
    document.getElementById('user').textContent = localStorage.getItem('current-user');
  });

  let predecessor = e.adoptPredecessor(document);
  console.assert(predecessor instanceof HTMLPortalElement);
  document.body.appendChild(predecessor);
});
```

If `https://example.com/` does not need to adapt portal-specific content when activated and does not need the predecessor-adoption capability, then it can instead use the generic APIs for reacting to prerendering activation or other relevant changes, outlined [in that explainer](https://github.com/jeremyroman/alternate-loading-modes/blob/main/browsing-context.md#javascript-api).

### Navigation transitions

As a more realistic example, consider a page which wants to prerender a link and provide a seamless navigation transition when it's clicked. It can do this by hiding the portal until the link is clicked,
and then animating the portal to full screen before activation.

This might be written like so:

```html
<a href="https://example.com/" class="seamless">Click me!</a>

<script>
for (const link of document.querySelectorAll('a.seamless')) {
  const portal = document.createElement('portal');
  portal.src = link.href;
  portal.hidden = true;
  portal.style = 'position: fixed; top: 0; left: 0; width: 10vw; height: 10vh;';
  document.body.append(portal);

  link.onclick = async e => {
    if (portal.state === 'empty') {
      // The content couldn't be portaled, likely because it didn't opt-in.
      // Let the normal link click go through.
      return;
    }

    e.preventDefault();

    // Show the portal, and animate it to the whole viewport over 300 milliseconds.
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      portal.hidden = false;
      await portal.animate([{ width: '100vw', height: '100vh' }], { duration: 300 }).finished;
    }

    // Once the preview is now displayed as the whole viewport, activate.
    // This performs the instant navigation/URL bar update/etc.
    try {
      await portal.activate();
    } catch {
      // If activation failed, restore the portal to hidden (so that back-navigations
      // don't show the full-viewport portal), and fall back to a normal navigation.
      portal.hidden = true;
      portal.style.width = '10vw';
      portal.style.height = '10vh';
      location.href = link.href;
    }
  };
}
</script>
```

## Use cases

_See the ["Key Scenarios"](./key-scenarios.md) document for more detail on each of these, including visualizations._

- **Navigation transitions**: prerendering opens the door for more elaborate transitions, by displaying the portal in some form, animating it (using resizing, translations, etc.) until it occupies the full viewport, then finally activating the portal to perform the instant navigation. See [above](#navigation-transitions) for a simple example of this.

- **Aggregation**: multiple portals on the same page can be used to create more elaborate experiences, where the user chooses which portal to activate. This category of use cases includes cases like a news reader, a shopping site, an infinite scrolling list of articles, etc. By using a portal instead of (or in addition to) a link, the aggregated content has the opportunity to display a preview, and to benefit from pre-rendering and navigation transitions.

  Additionally, by using the ability to adopt the predecessor during the `portalactivate` event, more complicated interactions between the aggregator and the aggregated content can be built, such as retaining a portion of the shopping site or article-list UI in a portal even after navigating to an individual page.

- **"Better iframe"**: portals encompass some, but not all, of the use cases for iframes. And they do so in a way that is better for users, in terms of security and privacy. They also remove a lot of the legacy baggage and sharp edges that come with iframes, making them easier to use for web developers. So for cases where the only relevant interaction is activation, without a need for manipulation or scrolling of the embedded content, portals can provide an alternative to iframes that improve privacy, security, and ergnomics.

  See [below](#summary-of-differences-between-portals-and-iframes) for a more detailed summary of the differences between portals and iframes.

## Objectives

Goals:

- Enable seamless navigations from a page showing a portal, to the portaled page

- Enable seamless navigations between pages of a portal-aware website

- Enable developer control over the activation of prerendered content, to provide more custom experiences than the browser's default navigation pattern

- Avoid the characteristics of iframes which have negative impacts on security, privacy, and performance

Non-goals:

- Built-in support for high-level navigation patterns, such as carousels or infinite lists. Portals provide a low-level building block for prerendering with preview, which can be combined with the usual tools of HTML for creating navigation pattern UIs.

- Built-in support for portal-specific transition animations. Given that portals are represented by HTML elements, existing CSS mechanisms are enough to allow authors to create compelling navigation transitions.

- Subsume all the use cases of iframes. The use cases for portals overlap with those for iframes, but in exchange for the ability to be activated, portaled pages lose abilities like cross-origin communication, storage, and nontrivial interactivity. As such, portals are not suitable for use cases like embedded widgets.

- Allowing arbitrary unmodified web pages to be portaled. Cross-origin pages will need to adapt to work well when they are hosted in a portal.

## Details

The general idea of portals is summed up above: prerendering-with-preview, activation, and predecessor adoption. Many further details are covered in the [prerendering browsing contexts explainer](https://github.com/jeremyroman/alternate-loading-modes/blob/main/browsing-context.md); in particular, the restrictions on portaled content, the session history and navigation integration, and some of the baseline rendering-related behavior.

These subsections go into more detail on important parts of how portals work, with a focus on how portals extend the baseline prerendering browsing context concept.

### Same-origin communication channels

An embedder which portals same-origin content has the ability to communicate with the portaled page via message passing, similar to how iframes work. This can be used for coordinating across the boundary to create especially-dynamic previews.

As shown in the [introductory example](#introductory-example), this is done by exposing the `postMessage()` method directly on the `HTMLPortalElement` interface. Unlike an iframe, there is no direct access to the `contentWindow` of the portaled content; message passing is the only interface available.

Additionally, all pages get a `window.portalHost` property, which is non-null for all portaled content. This is the way that portaled content receives or transmits messages from or to its embedder:

```js
window.portalHost.addEventListener("message", e => { /* ... */ });
window.portalHost.postMessage(/* ... */);
```

Cross-origin portaled content cannot communicate with its embedder, as doing so would [allow cross-site tracking](https://github.com/jeremyroman/alternate-loading-modes/blob/main/browsing-context.md#privacy-based-restrictions). In those cases, no `message` events will be sent to `window.portalHost`, and `window.portalHost.postMessage()` will not deliver any message.

### Rendering

Like iframes, portals can render their contents inline in another document. However, because the portaled content is rendered in a prerendering browsing context, many APIs will treat the rendered content as non-visible. See the [prerendering browsing context explainer's section on this](https://github.com/jeremyroman/alternate-loading-modes/blob/main/browsing-context.md#rendering-related-behavior) for more information. This "not rendered, but prerendered" mode might require adaptation on the part of authors, which is part of the reason that an [opt-in](https://github.com/jeremyroman/alternate-loading-modes/blob/main/opt-in.md) is required for prerendering.

TODO: do we really want to treat portals the same as `<link rel="prerender">` or similar? Unlike those cases, they can be visible.

### Interactivity

Portals enable preloading, previewing, and seamless transitions to another web page. They are expected to often be partially or fully offscreen, scaled, faded, or otherwise styled in a way that makes them unnatural to interact with directly. Additionally, we expect many web pages to allow themselves to be loaded in a portal for the purposes of facilitating a seamless transition, but still wish to mitigate certain kinds of threat (e.g. some forms of [clickjacking](https://owasp.org/www-community/attacks/Clickjacking)) from an embedder who may not be fully trusted.

Therefore the portal content cannot be focused and does not receive input events. Instead, the `<portal>` element itself is focusable (similar to a button or link) and eligible to receive input events (such as clicks) in the host document. For instance, the host document may handle this click event to animate and activate the `<portal>` element and navigate to the target document. If not handled, clicking will activate the `<portal>` immediately.

TODO: are we still considering any special treatment for scrolling of portaled content? Scroll handoff??

### Accessibility

From an accessibility perspective, portals behave like a single activatable element (similar to a button). As discussed in the section above, the contents of portals are not interactive and don't receive input events and focus. As a result, the embedded contents of a portal are not exposed as elements in the accessibility tree.

Portals come with accessibility defaults right out of the box. Their default ARIA role is `"button"`, and they are therefore visible to screen-readers as a button by default. The portal element is also intended to be focusable and keyboard activatable in the same way as a button. _TODO: or should it instead be a link? See [#226](https://github.com/WICG/portals/issues/226)._

Portals also compute a default label from their embedded contents (by either using the title of the embedded page or concatenating all the visible text in the portal's viewport if the page doesn't have a title). This label can be overridden by authors using the `aria-label` attribute.

These defaults ensure that a portal can be accessed and described by assistive technology without any work from authors. Additionally, by default clicking on a portal activates it; this ensures that even if the page author designs a more complicated interaction mode (such as a swipe), assistive technology and keyboard users can still activate the portal.

Authors should use the `hidden` HTML attribute, or `display: none`, to hide portals that are meant to be hidden until activation time, e.g. portals that are only used for prerendering. (This will also hide them from the accessibility tree.)

Authors should respect the `prefers-reduced-motion` media query by conditionally disabling any animations used before/during portal activation. For CSS animations and transitions, this can be easily accomplished by overriding all animation durations with a short unnoticeable duration value when the media query is set. Animations triggered with the Web Animations API would have to be explicitly disabled in script by authors when the media query is set.

### Session history, navigation, and bfcache

At a base level, portals behave the same as other prerendering browsing contexts do with respect to [session history](https://github.com/jeremyroman/alternate-loading-modes/blob/main/browsing-context.md#session-history) and [navigation](https://github.com/jeremyroman/alternate-loading-modes/blob/main/browsing-context.md#navigation). To summarize, content inside the portal has a trivial session history, and activation acts like a navigation of the host page, appending the portal's current session history entry to the host page's session history. This works to preserve user expectations for the back button. Note that this is very different from how iframes behave, and is one of the reasons it is better to think of portals as "inline-displayed popups" or "prerendered links" than as iframes. (Discussed further [below](#summary-of-differences-between-portals-and-iframes).)

Because of the predecessor adoption feature, portals have some additional complexity, where they can cause the predecessor (i.e. the original host document) to move into a prerendering browsing context which is then hosted by the _successor_ (i.e. the activated page). This means that a top-level browsing context can turn into a prerendering browsing context. This is a problem since a prerendering browsing context is [restricted](https://github.com/jeremyroman/alternate-loading-modes/blob/gh-pages/browsing-context.md#restrictions). In particular, for the cross-origin case, privacy and permission related restrictions may be infeasible to reimpose. So while adoption is appropriate for the same-origin case, we propose more limited forms of this for the cross-origin case. For example, freezing the context on adoption or only showing an image of the previous content.

Furthermore, there is a period of time between activation and adoption when it has not yet been determined if the predecessor will be adopted as a portal or unloaded. We refer to this as the _orphaned_ portal state. The predecessor is subject to the restrictions on a portal context while in this state.

If the predecessor is not adopted, then it may enter back/forward cache (bfcache). If the predecessor can't be cached then it is unloaded.

In addition to enabling seamless transitions to portaled content, we also want to enable seamless transitions from previously portaled content, the successor, back to its predecessor. This is done by re-hosting the successor context in its original portal element, and can be thought of as a form of implicit adoption. When a live predecessor is navigated to (e.g. by the user pressing the back button), we restore the successor context to its portal element in the predecessor. We then fire a `restoration` event on the element so that the predecessor can respond (e.g. by reversing the animation before the original activation). The live predecessor may be taken from bfcache, or if the predecessor was adopted, taken from a portal in the successor. In the latter case, this involves an implicit activation of the portal in the successor. Also note that since this restoration involves turning a top-level browsing context back into a portal context, only limited forms of restoration are proposed for the cross-origin case, as described above for regular adoption.

If the predecessor page can't handle being restored, it may set the `irreversible` field in the activation options as an escape hatch to ensure it's unloaded. This prevents adoption and causes the predecessor to be ineligible for bfcache. Furthermore, eligibility for bfcache is a requirement for being adoptable.

Since whether a portal element is hosting a context changes over time, the element itself can be thought of as having a lifecycle. This is exposed to the page via `state`.

State | Meaning
----- | -------
empty | Nothing has ever been loaded in the portal, or the previous contents were discarded due to failed restoration, the user agent reclaiming resources, etc.
live | The portal is hosting a browsing context.
activated | The portal has activated. This host page is adopted or in bfcache.
frozen | The portal is hosting a browsing context, but that context has been [frozen](https://github.com/WICG/page-lifecycle).
epitaph | The previous contents were discarded, but unlike the empty state, there is some visual representation of the previous content.

The events fired on a portal element to notify of its lifecycle changes are as follows.

Event | Meaning
----- | -------
onactivation | The portal contents have been activated by something other than an explicit call to the `activate` method (e.g. default click, back navigation).
onrestoration | The previous contents were restored into this portal element.
ondiscard | The portal contents have been discarded due to a need to reclaim resources or due to the inability to perform restoration.
onfreeze/onresume | Indicates when the portal context has been [frozen/resumed](https://github.com/WICG/page-lifecycle).

There is one more event, `window.onportaladopt`, needed to communicate to a page that it has become a portal when other forms (`activate()` promise resolving or `onactivation` of a predecessor portal) are not applicable.

Depending on the semantics of the page, the activation of a predecessor may be viewed as traversing session history. For example, if scrolling a preview portal into view activates the preview, then scrolling back up could be considered a back navigation. A page can specify how a portal activation should affect session history by setting the `history` field in the activation options to one of `push` (default), `replace`, `back`, or `forward`.

Consider how the [navigation transition example above](#navigation-transitions) may be extended to handle back button transitions.
```js
portal.addEventListener('restoration', async () => {
  // Reverse the animation from the whole viewport preview.
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    await portal.animate([{ width: '100px', height: '100px' }], { duration: 300 }).finished;
    portal.hidden = true;
  } else {
    portal.hidden = true;
    portal.style.width = '100px';
    portal.style.height = '100px';
  }
});
portal.addEventListener('discard', () => {
  portal.hidden = true;
});
```

### Activation

The basics of activation are explained [in the intro examples](#examples): calling `portalElement.activate()` causes the embedding window to navigate to the content which is already loaded into the portal. That is, it is a developer-controlled way of performing the general activation operation that all prerendering browsing contexts have. This section discusses some of the subtler details created by exposing this functionality to developers, instead of leaving it up to the browser as other prerendering browsing contexts do.

First, note that a portal element may be in a state where it is not displaying valid, activatable content (see [above](#session-history-navigation-and-bfcache)). This could happen for several reasons:

- The host page author has incorrectly set the portal to a non-HTTP(S) URL, e.g. using `<portal src="data:text/html,hello"></portal>`. Portals, [like all prerendering browsing contexts](https://github.com/jeremyroman/alternate-loading-modes/blob/main/browsing-context.md#restrictions-on-loaded-content), can only display HTTP(S) URLs.
- The portaled page cannot be loaded, for reasons outside of the host page author's control. For example, if the portaled content does a HTTP redirect to a `data:` URL, or if the portaled content gives a network error.
- The user is offline, which also causes a network error.

(What, exactly, the `<portal>` element displays in this state is still under discussion: [#251](https://github.com/WICG/portals/issues/251).)

Attempting to activate a portal in such a state will fail, causing the `activate()` promise to reject.

Furthermore, user agents have existing limitations on navigations initiated by the page where they may be ignored if they are considered to conflict with a user's intent to perform a different navigation. Such cases are not described by the existing navigation spec (see [#218](https://github.com/WICG/portals/issues/218)), but portal activations are subject to these limitations. In the case where another navigation takes precedence over portal activation, the promise returned by `activate()` will reject.

Activation promise rejections allow page authors to gracefully handle the inability to navigate. They could do this by simply falling back to the browser's default error experience, e.g. by doing `location.href = portalEl.src`. Or they could display a custom error experience.

Another consideration is how activation behaves when the portal is currently loading content. This breaks down into a few cases:

- During the initial load of content into a portal, e.g. given

  ```js
  const portal = document.createElement("portal");
  portal.src = "https://slow.example.com/";
  document.body.append(portal);
  portal.activate();
  ```

  the promise returned by `activate()` will not settle until the navigation is far enough along to determine whether or not it will be successful. This requires waiting for the response to start arriving, to ensure there are no network errors and that the final response URL is a HTTP(S) URL. Once it reaches that point, then the promise will fulfill or reject appropriately. If the promise fulfills, then activation will have completed, and the content will be loading into the newly-activated browsing context. If it rejects, then no activation will have occurred.

- After the initial load of the portal, via a host-initiated navigation. For example, given

  ```js
  const portal = getSomeExistingFullyLoadedPortal();
  portal.src = "https://different-url.example.com/";
  portal.activate();
  ```

  the assignment to `src=""` will immediately close the currently-displayed browsing context, and start loading the assigned URL in a new browsing context. So, this ends up behaving the same as the previous case: the promise returned by `activate()` will not settle until the navigation is far enough along to determine success.

- After the initial load of the portal, via a portaled-content–initiated navigation. For example, given

  ```js
  const portal = document.createElement("portal");
  portal.src = "https://example.com/";
  document.body.append(portal);
  portal.onload = () => portal.activate();
  ```

  where `https://example.com/` itself contains

  ```html
  <script>
  location.href = "https://slow.example.org";
  </script>
  ```

  we will immediately activate the portal's content, and the navigation to the new content will happen at top-level, not delaying `activate()`. In these cases, the promise returned by `activate()` will generally fulfill, as it is almost always possible to activate the already-loaded content. (The exceptions are edge cases like if another user-initiated navigation, or another portal activation, is already ongoing.)

Combined, these behaviors allow authors to write fairly simple code to activate and handle errors, as seen in the [navigation transitions example](#navigation-transitions).

### CSP integration

CSP has various interactions with embedded content and navigations. Portaled content follows all the [baseline rules](https://github.com/jeremyroman/alternate-loading-modes/blob/main/browsing-context.md#csp-integration) for prerendering browsing contexts. The following section outlines some additional integrations.

The host page's CSP has the following mechanisms available to prevent content from being loaded into a portal, or being activated:

- A new [fetch directive](https://w3c.github.io/webappsec-csp/#directives-fetch), `portal-src`, is introduced, which can be used to restrict what URLs can be loaded into `<portal>` elements. If not supplied, its value will fall back to that of `prefetch-src`.
- [`prefetch-src`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/prefetch-src) will apply to portals, as they are a special case of prerendering browsing contexts.
- [`default-src`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/default-src), which serves as a fallback for all fetch directives, will apply to portals.
- [`navigate-to`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/navigate-to) prevents portal activation, based on the `<portal>`'s `src=""` URL (_not_ based on the URL of its currently-loaded content).

Note that `portal-src` does *not* fall back to `frame-src` or `child-src`, despite portals being arguably somewhat-like frames/children. They are different enough that they need to be treated separately.

A natural worry about not falling back to `frame-src` or similar is that portals might introduce new attack vectors to pages that set `frame-src` with the intention of protecting themselves from injected embedded content. However, we believe this is not the case. Portaled content is limited enough in how it communicates with the host page that the only relevant attack CSP can prevent is exfiltration of data via the `<portal>`'s `src=""` attribute. But if the page author is concerned about this sort of attack, then they also needs to prevent all resource loads in general, which means they will have set `default-src` or `prefetch-src`. And since `portal-src` falls back to these values, this means the attack is prevented even under our proposed scheme.

Finally, we note that because portaled content must [opt in](https://github.com/jeremyroman/alternate-loading-modes/blob/main/opt-in.md) to being portaled, portaled content is not subject to any of the existing opt-outs that other embedded content such as iframes use. For example, specifying the [`frame-ancestors`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors) CSP directive, or its legacy counterpart in the `X-Frame-Options` header, does not change whether the content is portaled. This allows pages to allow themselves to be portaled via the opt-in, while also using these existing mechanisms to prevent themselves from being framed.

### Embedder-imposed policies and delegation

Portals, unlike iframes, do _not_ provide mechanisms for the embedder to impose policies or delegate permissions. Namely, there is no counterpart to the following `<iframe>` attributes:

- `csp=""`, for triggering [CSP Embedded Enforcement](https://w3c.github.io/webappsec-cspee/)
- `policy=""`, for triggering [Document Policy](https://w3c.github.io/webappsec-permissions-policy/document-policy.html)
- `sandbox=""`, for triggering [sandboxing](https://html.spec.whatwg.org/multipage/origin.html#sandboxing)
- `allow=""`/`allowfullscreen=""`, for triggering [Permissions Policy](https://w3c.github.io/webappsec-permissions-policy/)

This is a design choice based on the fact that portaling a page is more like linking to it than it is like embedding it, as discussed [below](#summary-of-differences-between-portals-and-iframes).

In particular, after portal activation, it doesn't make sense for the host page to impose policies or delegate permissions. At that point the portaled content has become a full top-level browsing context, out of the original host's control. It might even navigate to a completely unrelated site, e.g. through the user clicking on an outgoing link.

So, any mechanism for supporting this kind of embedder control or delegation would need to switch off upon activation. But these features aren't designed to do that; they all are imposed for the entire lifetime of the browsing context. We could try to create variants of them that only lasted for a document's lifetime, instead of an entire browsing context's lifetime, but this would pile confusion on top of an already-complicated space.

An additional reason for avoiding these mechanisms is that it makes writing portalable content even harder. Not only would the content author have to deal with browser-imposed pre-activation [restrictions](https://github.com/jeremyroman/alternate-loading-modes/blob/main/browsing-context.md#restrictions)—it would also have to deal with embedder-specific restrictions, which could vary from embedder to embedder. Since, unlike iframes, portaled content generally wants to be portaled by many different embedders (e.g. different content aggregators all using portals for prerendering), this kind of ecosystem fragmentation is undesirable.

To conclude, instead of giving embedders this control as iframes do, we believe that the browser can take the role of mitigating any problematic features. For example, instead of requiring embedders to use `sandbox=""` to turn off modal `alert()`/`confirm()`/`prompt()` dialogs, or permissions policy to turn off autoplaying media, those features are [always disabled](https://github.com/jeremyroman/alternate-loading-modes/blob/main/browsing-context.md#restrictions-on-the-basis-of-being-non-user-visible) in pre-activation portals. And because portals are isolated from communicating with their embedder pre-activation, any problems which CSP Embedded Enforcement would attempt to protect against will instead be caught by this communications barrier and prevented from impacting the embedder.

## Summary of differences between portals and iframes

Portals are somewhat reminiscent of iframes, but are different in enough significant ways that we propose them as a new element.

From a user's perspective, a portal behaves more like a "super link" than an iframe. That is, it has the same [interactivity](#interactivity) and [accessibility](#accessibility) model of being a single activatable element, which will cause a navigation of the page they're currently viewing. It'll be fancier than a link, in that the portal might display a preview of the portaled content, and the navigation experience will be quicker (and potentially animated, if the site author so chooses). But the ways in which it is fancier will generally not remind users of iframes, i.e. of scrollable viewports into an independently-interactive piece of content hosted on another page.

From the perspective of implementers and specification authors, portals behave something like "popups that display inline". This is because [prerendering browsing contexts](https://github.com/jeremyroman/alternate-loading-modes/blob/main/browsing-context.md) are [top-level browsing contexts](https://html.spec.whatwg.org/#top-level-browsing-context), and not [nested browsing contexts](https://html.spec.whatwg.org/#nested-browsing-context). More specifically, prerendering browsing contexts sit alongside [auxiliary browsing contexts](https://html.spec.whatwg.org/#auxiliary-browsing-context) (popups) as two distinct types of top-level browsing context, and much of the specification infrastructure is shared. This becomes even more true after activation, when the portal browsing context becomes just another tab (and ceasing being a prerendering browsing context).

Finally, the web developer dealing with a portal element's API sees the following differences from iframes:

- Portaled content needs to [opt-in](https://github.com/jeremyroman/alternate-loading-modes/blob/main/opt-in.md) to being portaled. Iframed content can only opt-out from being iframed (via `X-Frame-Options` or CSP's `frame-ancestors`).

- Even same-origin portals do not provide synchronous DOM access to the portaled `Window` or `Document` objects, whereas iframes give such access via `frame.contentWindow`/`frame.contentDocument`. This gives a more uniform isolation boundary for more predictable performance and security.

- Similarly, portaled `Window` objects are not accessible via accessors like `window.iframeName` or `window[0]`, and they cannot access related `Window` objects via `top` or `parent` (or `opener`).

- Navigations and history APIs within a pre-activation portal do not affect session history (see [above](#session-history-navigation-and-bfcache)). In contrast, navigating an iframe creates a new session history entry, and affects the resulting back button behavior.

- Portals cannot be made to navigate from the outside in the way iframes (or popups) can, via `window.open(url, iframeName)`.

- Portals can only load `http:` and `https:` URLs. This removes an entire category of confusing interactions regarding `about:blank`, `javascript:`, `blob:`, and `data:` URLs, as well as the `<iframe srcdoc="">` feature and its resulting `about:srcdoc` URLs. Notably, the portaled content will always have an origin derived from its URL, without any inheritance from the host document.

- Pre-activation, portals are [restricted](https://github.com/jeremyroman/alternate-loading-modes/blob/main/browsing-context.md#restrictions-on-the-basis-of-being-non-user-visible) from using a variety of features, like any API that requires a permission or user gesture, or modal dialogs, or downloads. There is no equivalent of `<iframe>`'s `allow=""` attribute which lets portaled pages act on behalf of their host.

- Pre-activation, cross-origin portals [do not have access to storage or other communication channels](https://github.com/jeremyroman/alternate-loading-modes/blob/main/browsing-context.md#privacy-based-restrictions). In exchange, they get full access to unpartitioned first-party storage after activation. (In contrast, iframes are moving toward having access to [partitioned storage](https://github.com/privacycg/storage-partitioning) throughout their lifetime.)

- Portals, like links but unlike iframes, [cannot have policies imposed on them](#embedder-imposed-policies-and-delegation) by the embedding page.

TODO: summarize the differences related to rendering, once those are more fleshed out.

## Alternatives considered

### A new attribute on an existing element

It would be possible to design portals as an extension of an existing element. As discussed in the [summary of differences between portals and iframes](#summary-of-differences-between-portals-and-iframes), potential candidates would be `<iframe>` or `<a>`. So you could imagine something like

```html
<a href="https://example.com/portal-me" portal>Some text</a>
```

or

```html
<iframe src="https://example.com/portal-me" portal></iframe>
```

However, in both cases the new attribute would change the behavior of the element in ways that are problematic from the perspective of users, web developers, implementers, and specification writers.

For users, the biggest confusion would be the experience in browsers that do not support portals. Falling back to a link might work reasonably well, as long as the web developer specifically codes around the lack of activation behavior. Falling back to an iframe is likely to work poorly; portaled content operates under a very different security and privacy model than iframed content, and the resulting page would likely be broken.

Additionally, the behavioral differences outlined above would lead to extensive forks in the specification for these elements, to go down a new "portal path" whenever the attribute was present. This creates a maintenance burden for specification writers and implementers, and a confusing experience for web developers. The closest precedent we have for a single attribute causing such a dramatic change to behavior is `<input>`'s `type=""` attribute, which has been [a painful experience](https://html.spec.whatwg.org/#concept-input-apply). We would also have to define behavior for when the attribute is added or removed, including when such additions or removals happen during delicate phases of the element's lifecycle like parsing, navigation, interaction, or portal activation.

Finally, we believe that attempting to classify a portal as a "type of iframe" or "type of link" is pedagogically harmful. Although there is some overlap in use cases, a portal is a different piece of technology, and as such is best represented as its own element. It can thus generate its own documentation, developer guidance, and ecosystem discussion. This includes guidance both on how to use portals, as separate from iframes and links, and on how best to let your content be portaled, separately from letting it be framed or linked to.

### TODO:

- Other (historical?) solutions to prerendering
- Other (historical?) solutions to navigation transitions
- Adding activation ("promotion") to iframes ([text existed in explainer.md](https://github.com/WICG/portals/blob/d901563053af7d56a2cafee686ee89d651c49eb7/explainer.md#iframe-promotion) but was very implementer-focused)
- Using the fullscreen API ([text existed in explainer.md](https://github.com/WICG/portals/blob/d901563053af7d56a2cafee686ee89d651c49eb7/explainer.md#fullscreen-iframe) but was very implementer-focused)
- Allowing cross-origin communication and storage

## Security and privacy considerations

_See also the [W3C TAG Security and Privacy Questionnaire answers](./security-and-privacy-questionnaire.md)._

The main privacy concern with portals, as with all embedded content, is cross-site tracking. The threat model here is outlined in great detail [elsewhere](https://github.com/jeremyroman/alternate-loading-modes/blob/main/browsing-context.md#privacy-based-restrictions), as are the mitigations that portals apply to prevent such tracking. The summary is that portals are much better in this regard than iframes, and instead are designed to have the same privacy properties as links. That is, cross-site tracking is possible using link decoration on the `<portal>`'s `src=""` attribute, similar to the `<a>` element's `href=""`, but this tracking will only be possible once the portal activates/link navigates, which causes a very-user-visible full-page transition to the portaled/linked site.

On the security side, portals are a new element which can emit requests and run script. Although much of the potential damage that a portal could cause is mitigated by the privacy protections—e.g., unlike the `<iframe>` or `<script>` elements, there is no direct access to the host document—it is still important to provide control over portals through the usual mechanisms. This is where our [CSP integration](#csp-integration) comes in.

Finally, any embedded content naturally gives rise to concerns about [clickjacking](https://owasp.org/www-community/attacks/Clickjacking). For portals, this is not a concern: user interaction [does not pass through to the portaled document](#interactivity).

## Stakeholder feedback

- W3C TAG: [w3ctag/design-reviews#331](https://github.com/w3ctag/design-reviews/issues/331)
- Browsers:
  - Safari: No feedback so far
  - Firefox: [mozilla/standards-positions#157](https://github.com/mozilla/standards-positions/issues/157)
  - Samsung: No feedback so far
  - UC: No feedback so far
  - Opera: No feedback so far
  - Edge: No feedback so far
- Web developers: TODO

## Acknowledgments

Thank you to Andrew Betts for his [promotable iframe proposal](https://discourse.wicg.io/t/proposal-for-promotable-iframe/2375), which inspired much of the thinking here.

Contributions and insights from:
Adithya Srinivasan,
David Bokan,
Domenic Denicola,
Ian Clelland,
Jake Archibald,
Jeffrey Jasskin,
Jeremy Roman,
Kenji Baheux,
Kevin McNee,
Lucas Gadani,
Ojan Vafai,
Rick Byers, and
Yehuda Katz.
