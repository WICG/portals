# Portals

Portals enable seamless navigations between pages. In particular, we propose a new `<portal>` HTML element which enables a page to show another page as an inset, and then *activate* it to perform a seamless transition to a new state, where the formerly-inset page becomes the top-level document.

Portals encompass some of the use cases that iframes currently do, but with better security, privacy, and ergonomics properties. And via the activation operation, they enable new use cases like preloading or navigation transitions.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of contents

- [Example](#example)
- [Use cases](#use-cases)
- [Objectives](#objectives)
- [Details](#details)
  - [Privacy threat model and restrictions](#privacy-threat-model-and-restrictions)
    - [Storage access blocking](#storage-access-blocking)
    - [Communications channels that are blocked](#communications-channels-that-are-blocked)
    - [Communications channels that match navigation](#communications-channels-that-match-navigation)
    - [TODO](#todo)
  - [Other restrictions while portaled](#other-restrictions-while-portaled)
  - [Rendering](#rendering)
  - [Interactivity](#interactivity)
  - [Accessibility](#accessibility)
  - [Session history, navigation, and bfcache](#session-history-navigation-and-bfcache)
  - [Opt-in](#opt-in)
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

## Example

A document can include a `<portal>` element, which renders the specified URL in a portal context:

```html
<portal id="myPortal" src="https://example.com/"></portal>
```

This is somewhat like an iframe, in that it provides a rendering of the specified document at `https://example.com/`. However, a portal is much more restricted than an iframe: user interaction with it [does not pass through to the portaled document](#interactivity), and when the portaled document is cross-origin, capabilities like storage and `postMessage()` communication are [prohibited](#privacy-threat-model-and-restrictions) while rendering in the portal context. These restrictions, among other concerns, mean that the portaled document needs to declare itself as able to be portaled; see [below](#opt-in) for more information.

In exchange for these restrictions, portals gain an additional capability that iframes do not have. A portal can be *activated*, which causes the embedding window to navigate, replacing its document with the portal:

```js
myPortal.activate();
```

Unless prevented by the author, clicking a portal activates it as well, similarly to a link.

At this point, the user will observe that their browser has navigated to `https://example.com/` (e.g., via changes to the URL bar contents and back/forward UI). Since `https://example.com/` was already loaded in the portal context, this navigation will occur seamlessly and instantly, without a network round-trip or document re-initialization.

For more advanced use cases, the `https://example.com/` document can react to activation, using the `portalactivate` event. It can use this event to adapt itself to its new context, and even to adopt its *predecessor* (the document which previously occupied the tab) into a new portal context.

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

## Use cases

_See the ["Key Scenarios"](./key-scenarios.md) document for more detail on each of these, including visualizations._

- **Pre-rendering**: by loading a page in a hidden portal, it is possible to pre-render the destination page. Then, activating the portal will instantly display the pre-rendered document in the same browser tab.

  This requires some care and cooperation from both sides to deal with the restrictions on portaled content, and the transition between portaled and activated states.

- **Navigation transitions**: pre-rendering opens the door for more elaborate transitions, by displaying the portal in some form, animating it (using resizing, translations, etc.) until it occupies the full viewport, then finally activating the portal to perform the instant navigation.

- **Aggregation**: multiple portals on the same page can be used to create more elaborate experiences, where the user chooses which portal to activate. This category of use cases includes cases like a news reader, a shopping site, an infinite scrolling list of articles, etc. By using a portal instead of (or in addition to) a link, the aggregated content has the opportunity to display a preview, and to benefit from pre-rendering and navigation transitions.

  Additionally, by using the ability to adopt the predecessor during the `portalactivate` event, more complicated interactions between the aggregator and the aggregated content can be built, such as retaining a portion of the shopping site or article-list UI in a portal even after navigating to an individual page.

- **"Better iframe"**: portals encompass some, but not all, of the use cases for iframes. And they do so in a way that is better for users, in terms of security and privacy. They also remove a lot of the legacy baggage and sharp edges that come with iframes, making them easier to use for web developers. So we anticipate many of the current cases for iframes, such as ads, being able to be replaced with portals.

  See [below](#summary-of-differences-between-portals-and-iframes) for a more detailed summary of the differences between portals and iframes.

## Objectives

Goals:

- Enable seamless navigations from a page showing a portal, to the portaled page

- Enable seamless navigations between pages of a portal-aware website

- Avoid the characteristics of iframes which have negative impacts on security, privacy, and performance

Non-goals:

- Built-in support for high-level navigation patterns, such as carousels or infinite lists. Portals provide a low-level building block for pre-rendering, which can be combined with the usual tools of HTML for creating navigation pattern UIs.

- Built-in support for portal-specific transition animations. Given that portals are represented by HTML elements, existing CSS mechanisms are enough to allow authors to create compelling navigation transitions.

- Subsume all the use cases of iframes. The use cases for portals overlap with those for iframes, but in exchange for the ability to be activated, portaled pages lose abilities like cross-origin communication, storage, and nontrivial interactivity. As such, portals are not suitable for use cases like embedded widgets.

- Allowing arbitrary unmodified web pages to be portaled. Cross-origin pages will need to adapt to work well when they are hosted in a portal.

## Details

The general idea of portals is summed up above: inset pre-rendering, activation, and predecessor adoption. These subsections go into more detail on important parts of how portals work.

### Privacy threat model and restrictions

The Portals design is intended to comply with the [W3C Target Privacy Threat Model](https://w3cping.github.io/privacy-threat-model/). This section discusses the aspects of that threat model that are particularly relevant to portals and how the design satisfies them.

A portal can contain either a same-site or cross-site resource. Same-site portals don't present any privacy risks, but cross-site resources risk enabling [cross-site recognition](https://w3cping.github.io/privacy-threat-model/#model-cross-site-recognition) by creating a messaging channel across otherwise-partitioned domains. For simplicity, when a cross-site channel needs to be blocked, we also block it for same-site cross-origin portals. In some cases, marked below, we even block it for same-origin portals.

Because portaled documents can be activated into a top-level browsing context, they (eventually) live in the first-party [storage shelf](https://storage.spec.whatwg.org/#storage-shelf) of their origin. This means that the usual plan of [storage partitioning](https://github.com/privacycg/storage-partitioning) does not suffice for portals as it does for iframes. Instead, we take the following measures to restrict cross-origin portals:

- Prevent communication with the host document, to the same extent we prevent it with a cross-site link opened in a new tab.
- Block all storage access while content is portaled.

If we allowed communication, then the portaled content could be given the user ID from the host site. Then, after activation gives the portaled page access to first-party storage, it would join that user ID with information from its own first-party storage to perform cross-site tracking.

If we allowed access to unpartitioned storage, then side channels available pre-activation (e.g., server-side timing correlation) could potentially be used to join two separate user identifiers, one from the host site and one from the portaled site's unpartitioned storage.

The below subsections explore the implementation of these restrictions in more detail.

#### Storage access blocking

Portaled pages that are cross-origin to their host will have no access to storage, similar to how an opaque-origin `<iframe>` behaves. (See this [discussion on the spec mechanism](https://github.com/whatwg/storage/issues/18#issuecomment-615336554).)

We could attempt to address the threat by providing partitioned or ephemeral storage access, but then it is unclear how to transition to _unpartitioned_ storage upon activation. It would likely require some kind of web-developer-written merging logic. Completely blocking storage access is thus deemed simpler; portaled pages should not be doing anything which requires persistent storage before activation.

This means that most existing content will appear "broken" when portaled by a cross-origin host. This necessitates an explicit opt-in to allow cross-origin content to be portaled, [discussed below](#opt-in). Such content might optionally "upgrade" itself to a credentialed view upon activation, as shown in the [example](#example) above.

For a more concrete example, consider `https://aggregator.example/` which wants to prerender this GitHub repository using a `<portal>`. To make this work, GitHub would need to add the opt-in to allow the page to be portaled. Additionally, GitHub should add code to adapt their UI to show the logged-in view upon activation, by removing the "Join GitHub today" banner, and retrieving the user's credentials from storage and using them to replace the signed-out header with the signed-in header. Without such adapter code, activating the portal would show the user a logged-out view of GitHub in the top-level tab that the portal has been activated into. This would be a bad and confusing user experience, since the user is logged in to GitHub in all of their other top-level tabs.

#### Communications channels that are blocked

- [`postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) isn't allowed between a cross-origin portal and its container.
- Fetches within cross-origin non-activated portals, including the initial request for the portaled page, do not use credentials. Credentialed fetches could be used for cross-site recognition, for example by:
  - Using the sequence of portal loads. The host page could encode a user ID into the order in which a sequence of URLs are loaded into portals. To prevent the target from correlating this ID with its own user ID without a navigation, a document loaded into a cross-origin portal is fetched without credentials and doesn't have access to storage, as described above.
  - The host creates a portal, and the portaled site decides between a 204 and a real response based on the user's ID. Or the portaled site delays the response by an amount of time that depends on the user's ID. Because the portal load is done without credentials, the portaled site can't get its user ID in order to make this sort of decision.
- Side channels, further discussed in [Rendering](#rendering):
  - Portal resize: JavaScript outside the portal could use a sequence of portal resizes to send a user ID, so a portal's content cannot observe any resizes after creation. If a portal is resized, that just rescales the view of the portal. For simplicity, this is the case for same-origin portals too.
  - Portal initial size: JavaScript outside the portal could use the initial size to send part of a user ID, so portals are always sized the same as the top-level tab that they'll be activated into and then scaled into the portal element. For simplicity, this is the case for same-origin portals too.
  - [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API): Won't give visibility information to script inside the portal, to avoid occlusion being used to send information.
  - [Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) and the timing of `requestAnimationFrame()` callbacks match the visibility of the top-level page, as in iframes, to prevent the page from encoding messages in visibility changes. However, this leads to the possibility that a portal and containing page could use the timing of user-caused visibility changes to join the user across site boundaries. Whether and how to prevent this is [still under discussion](https://github.com/WICG/portals/issues/193#issuecomment-639768218).

#### Communications channels that match navigation

As mentioned above, we prevent communications to the same extent we prevent it with a cross-site link opened in a new tab. In particular:

- The URL of the portal and the referring URL are available to portals after activation to the same extent they're available to normal navigations. Solutions to link decoration will apply to both.

Note that since a non-activated portal has no storage access, it cannot join any information stored in the URL with any of the portaled site's data. So it's only activation, which gives full first-party storage access, which creates a navigation-equivalent communications channel. This equivalence makes sense, as activating a portal is much like clicking a link.

#### TODO

- More side channels?
- Note that design-discussions.md has discussion about hiding never-activated portals from their servers, which is a different sort of attack than the cross-site tracking we discuss here.

### Other restrictions while portaled

Apart from the privacy-related restrictions to communications and storage, while portaled, pages are additionally restricted in various ways, to prevent them from interfering with content outside of their rendering area:

- Portals are top-level browsing contexts, and given their own [browsing context group](https://html.spec.whatwg.org/multipage/browsers.html#groupings-of-browsing-contexts). This means they cannot synchronously access their embedder, e.g. to navigate it or modify its DOM.

- Any features that are controlled by the [Permissions API](https://w3c.github.io/permissions/) ([list](https://w3c.github.io/permissions/#permission-registry)) will be automatically denied without prompting.

- Any features controlled by [Permissions Policy](https://w3c.github.io/webappsec-permissions-policy/) ([list](https://github.com/w3c/webappsec-permissions-policy/blob/master/features.md)) will be disabled, unless their default allowlist is `*`. There is no ability for the host page to delegate these permissions. (In particular, there is no counterpart to `<iframe>`'s `allow=""` attribute.)

- Popups, pointer lock, orientation lock, the presentation API, downloads, and modal dialogs (`alert()` etc.) all are disabled pre-activation. (These are features which are currently only possible to disable with through [iframe sandboxing](https://html.spec.whatwg.org/multipage/origin.html#sandboxing).)

After activation, these restrictions are lifted: the portaled content is treated like a normal top-level browsing context, and is able to use all these features in the normal way. The `portalactivate` event can be used to request permissions upon activation, if necessary. (Although doing so gives a user experience equivalent to requesting permissions on load, and thus is rarely the best design.)

_Note: ideally Permissions Policy would become a superset of the Permissions API and iframe sandboxing. Then we could use that infrastructure as the single place to impose and lift these restrictions. Currently that is not the case, so the spec will be more messy._

All of these restrictions apply uniformly to both same-origin and cross-origin portals, for simplicity. We could consider lifting some of them for same-origin portals in the future, if use cases arise.

### Rendering

Like iframes, portals can render their contents inline in another document. To ensure a smooth transition when activation occurs, and to limit the avenues for communication between the two documents, rendering generally occurs in the same way as it will when the portal is activated. This means that `document.visibilityState` and `document.hidden` will, like iframes, match the values in their host browsing context, even if they are offscreen. Similarly, `IntersectionObserver` will report intersections up to the portal contents viewport, but will assume that viewport is fully visible. Other behavior that depends on intersection with the viewport, such as lazy-loading images, behaves similarly.

`requestAnimationFrame` issues vsync callbacks as it would in the host document (in particular the host document should not control the frequency of animation updates), except that for performance reasons user agents may suspend or throttle callbacks to offscreen portals if the two documents are same-origin.

Since documents can detect when they are embedded in a portal, they may choose to suspend, limit or delay animations or other rendering activity that is not essential to prerendering. Authors may also style the document differently while in a portal, but if so they should take care to ensure that this doesn't make activation jarring (e.g. they may wish to animate elements in after activation, or reserve space for elements to avoid layout shift).

TODO:

- Discuss viewport size. Full viewport size at all times? Resizing OK or no? I'm sketchy on the plan here.
- Discuss practices and patterns for authors of portaling sites, e.g. how to create a prerender (with a `display: none` portal) or an animated transition
- Include more detailed samples of how authors would adapt for being in a portal and reacting to activation, including if applicable the resolution of https://github.com/WICG/portals/issues/3
- Maybe this is where we discuss fallback content for non-supporting browsers?

### Interactivity

Portals enable preloading, previewing and seamless transitions to another web page. They are expected to often be partially or fully offscreen, scaled, faded or otherwise styled in a way that makes them unnatural to interact with directly. Additionally, we expect many web pages to allow themselves to be loaded in a portal for the purposes of facilitating a seamless transition, but wish to mitigate certain kinds of threat (e.g. some forms of [clickjacking](https://owasp.org/www-community/attacks/Clickjacking)) from an embedder who may not be fully trusted.

Therefore the portal content cannot be focused and does not receive input events. Instead, the `<portal>` element itself is focusable (similar to a button or link) and eligible to receive input events (such as clicks) in the host document. For instance, the host document may handle this click event to animate and activate the `<portal>` element and navigate to the target document. If not handled, clicking will activate the `<portal>` immediately.

TODO:

- Discuss scrolling, including the problem of scroll handoff and its importance. Note that scroll handoff is a ??? in spec terms but we promise to spec something interoperably implementable, somehow.
- When/if we update this explainer to discuss resize limitations, comment on how that affects interactivity.
- Consider discussing how storage access limitations interact with interactivity.

### Accessibility

From an accessibility perspective, portals behave like a single activatable element (similar to a button). As discussed in the section above, the contents of portals are not interactive and don't receive input events and focus. As a result, the embedded contents of a portal are not exposed as elements in the accessibility tree.

Portals come with accessibility defaults right out of the box. Their default ARIA role is `"button"`, and they are therefore visible to screen-readers as a button by default. The portal element is also intended to be focusable and keyboard activatable in the same way as a button.

Portals also compute a default label from their embedded contents (by either using the title of the embedded page or concatenating all the visible text in the portal's viewport if the page doesn't have a title). This label can be overridden by authors using the `aria-label` attribute.

These defaults ensure that a portal can be accessed and described by assistive technology without any work from authors. Additionally, authors should add a click handler to activate the portal, even if it would otherwise be activated by some other gesture (e.g. a swipe), to ensure that assistive technology or keyboard users can activate the portal. ([#174](https://github.com/WICG/portals/issues/174) discusses adding this as default behavior.) Authors should use the `hidden` HTML attribute, or `display: none`, to hide portals that are meant to be hidden until activation time, e.g. portals that are only used for prerendering. (This will also hide them from the accessibility tree.)

Authors should respect the `prefers-reduced-motion` media query by conditionally disabling any animations used before/during portal activation. For CSS animations and transitions, this can be easily accomplished by overriding all animation durations with a short unnoticeable duration value when the media query is set. Animations triggered with the Web Animations API would have to be explicitly disabled in script by authors when the media query is set.

### Session history, navigation, and bfcache

From the user's perspective, a portal activation behaves like a conventional navigation. The content of the portal is appended to session history with any existing forward history entries pruned. Any navigations within a portal do not affect session history.

From the developer's perspective, a portal context can be thought of as having a trivial [session history](https://html.spec.whatwg.org/multipage/history.html#the-session-history-of-browsing-contexts) where only one entry, the current entry, exists. All navigations within the portal are effectively done with replacement. While APIs that operate on session history, such as [window.history](https://html.spec.whatwg.org/multipage/history.html#the-history-interface), can be called within portal contexts, they only operate on the portal's trivial session history. Consequently, portals cannot navigate their hosts using these APIs, unlike iframes.

We want the history model for portals to conform to users' expectations of the back button. Specifically, the back button should take them back to the last thing they saw. To accommodate this, the portal context should not have an independent session history which we aggregate with its host context to present to the user. To illustrate how this could cause problems, consider `example.com/a.html` loading `b.html` in a portal, then navigating the portal to `c.html`, then activating the portal. If the user pressed the back button, it would not be appropriate to navigate the top level page to `b.html`, since this is a state the user has not seen before. Instead, the user is returned to `a.html` (potentially restored from adoption/bfcache) which is the last page they saw. Even for states that the user has seen previously, having a single navigation reintroduce potentially multiple history states maps poorly to the web's chronological history model, as opposed to the mental models for tab switching or mobile device style multitasking.

Navigations within portals are subject to certain security restrictions for loading embedded content ([see above](#permissions-and-policies)). Furthermore, both the portal host and the portal content must use an HTTP(S) scheme, in order to establish their origins.

Navigation errors within portals may cause portal activation to be rejected. Instead of, for example, the user agent showing an error page to the user as with a conventional navigation, the promise returned by the activate method allows a page to gracefully handle the rejection. Furthermore, user agents have existing limitations on navigations initiated by the page where they may be ignored if they are considered to conflict with a user's intent to perform a different navigation. Such cases are not described by the existing navigation spec (see [#218](https://github.com/WICG/portals/issues/218)), but portal activations are subject to these limitations. In the case where another navigation takes precedence over portal activation, the promise returned by the activate method rejects.

See the [rough algorithms](history-traversal.md) for cases where portals may be auto-activated, and pages may be reportaled, when traversing session history.

TODO:

- Talk about how bfcache is tricky.
- Describe reversing transitions on back with bfcache and adopted portals.
- Outline our solution for these, in terms of observable effects for users (not in terms of spec primitives).
- Describe an option for activating portals with replacement.
- Describe an option for activating adopted portals which traverses session history.
- Is it acceptable to reject activation when a portal is in an error state? Doing otherwise seems unergonomic ([#228](https://github.com/WICG/portals/issues/228)).
- Currently, if no navigation has ever matured in the portal context, we reject activation. This is unergonomic (see [#191](https://github.com/WICG/portals/issues/191)). Explore options such as waiting to resolve/reject the promise while the initial navigation is in progress.

### Opt-in

Because of the [restrictions](#other-restrictions-while-portaled) on portaled content, especially the [storage restrictions](#storage-access-blocking), most existing content is not prepared to be rendered in a portal. As such, content will need to opt-in to being portaled; any content that does not so opt-in will cause the portal to fail to load.

The current proposal for such an opt-in is being drafted in the [Alternate Loading Modes](https://github.com/jeremyroman/alternate-loading-modes) proposal. (This opt-in to privacy-preserving prerendering would be more general than just portals; thus, the separate proposal. Indeed, many of the parts of this document, such as the restrictions on portaled content, might be further generalized to other prerendering technologies in the future; we expect the layering to evolve over time.) To summarize, the portaled content would use a

```
Supports-Loading-Mode: uncredentialed-prerender
```

header, or a

```html
<meta http-equiv="Supports-Loading-Mode" content="uncredentialed-prerender">
```

meta tag, to opt in. Without either of these present, the content would not be shown in the portal.

Because this opt-in is available, portaled content does not make use of any of the existing opt-outs that other embedded content such as iframes use. For example, specifying the `X-Frame-Options` header, or the [`frame-ancestors`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors) CSP directive, does not change whether the content is portaled. This allows pages to allow themselves to be portaled via the opt-in, while also using these existing mechanisms to prevent themselves from being framed.

### CSP integration

CSP has various interactions with embedded content and navigations. We propose the following integrations for portals.

A portaled page can apply CSP to itself as normal. Just like iframes, these policies are generally self-contained; none of them vary depending on whether the content is portaled or not. (For example, specifying `unsafe-eval` works the same for portaled content as for any other content.)

Note that since portals do not allow hosting of `data:` URLs, `javascript:` URLs, `about:blank`, etc., there is never any inheritance from the host's CSP into the guest browsing context, like there sometimes is with iframes and their nested browsing context.

When it comes to the host page's CSP, it has the following mechanisms available to prevent content from being loaded into a portal, or being activated:

- A new [fetch directive](https://w3c.github.io/webappsec-csp/#directives-fetch), `portal-src`, is introduced, which can be used to restrict what URLs can be loaded into `<portal>` elements.
- [`default-src`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/default-src), which serves as a fallback for all fetch directives, will apply to portals.
- [`navigate-to`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/navigate-to) prevents portal activation (based on the guest browsing context's current URL).

Note that `portal-src` does *not* fall back to `frame-src`, `child-src`, or `prefetch-src`, despite portals being arguably somewhat-like frames/children/prefetch hints. They are different enough that they need to be treated separately.

A natural worry about not falling back to `frame-src` or similar is that portals might introduce new attack vectors to pages that set `frame-src` with the intention of protecting themselves from injected embedded content. However, we believe this is not the case. Portaled content is limited enough in how it communicates with the host page that the only relevant attack CSP can prevent is exfiltration of data via the `<portal>`'s `src=""` attribute. But if the page author is concerned about this sort of attack, then they also needs to prevent all resource loads in general, which means they will have set `default-src`. And since `portal-src` falls back to `default-src`, this means the attack is prevented even under our proposed scheme.

### Embedder-imposed policies and delegation

Portals, unlike iframes, do _not_ provide mechanisms for the embedder to impose policies or delegate permissions. Namely, there is no counterpart to the following `<iframe>` attributes:

- `csp=""`, for triggering [CSP Embedded Enforcement](https://w3c.github.io/webappsec-cspee/)
- `policy=""`, for triggering [Document Policy](https://w3c.github.io/webappsec-permissions-policy/document-policy.html)
- `sandbox=""`, for triggering [sandboxing](https://html.spec.whatwg.org/multipage/origin.html#sandboxing)
- `allow=""`/`allowfullscreen=""`/`allowpaymentrequest=""`, for triggering [Permissions Policy](https://w3c.github.io/webappsec-permissions-policy/)

This is a design choice based on the fact that portaling a page is more like linking to it than it is like embedding it, as discussed [below](#summary-of-differences-between-portals-and-iframes).

In particular, after portal activation, it doesn't make sense for the host page to impose policies or delegate permissions. At that point the portaled content has become a full top-level browsing context, out of the original host's control. It might even navigate to a completely unrelated site, e.g. through the user clicking on an outgoing link.

So, any mechanism for supporting this kind of embedder control or delegation would need to switch off upon activation. But these features aren't designed to do that; they all are imposed for the entire lifetime of the browsing context. We could try to create variants of them that only lasted for a document's lifetime, instead of an entire browsing context's lifetime, but this would pile confusion on top of an already-complicated space.

An additional reason for avoiding these mechanisms is that it makes writing portalable content even harder. Not only would the content author have to deal with browser-imposed pre-activation [communications and storage restrictions](https://github.com/WICG/portals#privacy-threat-model-and-restrictions) and [restrictions to prevent it from acting outside of its rendered area](https://github.com/WICG/portals#other-restrictions-while-portaled)—it would also have to deal with embedder-specific restrictions, which could vary from embedder to embedder. Since, unlike iframes, portaled content generally wants to be portaled by many different embedders (e.g. different content aggregators all using portals for prerendering), this kind of ecosystem fragmentation is undesirable.

To conclude, instead of giving embedders this control as iframes do, we believe that the browser can take the role of mitigating any problematic features. For example, instead of requiring embedders to use `sandbox=""` to turn off modal `alert()`/`confirm()`/`prompt()` dialogs, or permissions policy to turn off autoplaying media, those features are [always disabled](https://github.com/WICG/portals#other-restrictions-while-portaled) in pre-activation portals. And because portals are isolated from communicating with their embedder pre-activation, any problems which CSP Embedded Enforcement would attempt to protect against will instead be caught by this communications barrier and prevented from impacting the embedder.

## Summary of differences between portals and iframes

Portals are somewhat reminiscent of iframes, but are different in enough significant ways that we propose them as a new element.

From a user's perspective, a portal behaves more like a "super link" than an iframe. That is, it has the same [interactivity](#interactivity) and [accessibility](#accessibility) model of being a single activatable element, which will cause a navigation of the page they're currently viewing. It'll be fancier than a link, in that the portal might display a preview of the portaled content, and the navigation experience will be quicker (and potentially animated, if the site author so chooses). But the ways in which it is fancier will generally not remind users of iframes, i.e. of scrollable viewports into an independently-interactive piece of content hosted on another page.

From the perspective of implementers and specification authors, portals behave something like "popups that display inline". This is because they use the [top-level browsing context](https://html.spec.whatwg.org/#top-level-browsing-context) concept, instead of the [nested browsing context](https://html.spec.whatwg.org/#nested-browsing-context) concept. More specifically, [portal browsing contexts](https://wicg.github.io/portals/#portal-browsing-context) sit alongside [auxiliary browsing contexts](https://html.spec.whatwg.org/#auxiliary-browsing-context) (popups) as two distinct types of top-level browsing context, and much of the specification infrastructure is shared. This becomes even more true after activation, when the portal browsing context becomes just another tab.

Finally, the web developer dealing with a portal element's API sees the following differences from iframes:

- Portaled content needs to [opt-in](#opt-in) to being portaled. Iframed content can only opt-out from being iframed (via `X-Frame-Options` or CSP's `frame-ancestors`).

- Even same-origin portals do not provide synchronous DOM access to the portaled `Window` or `Document` objects, whereas iframes give such access via `frame.contentWindow`/`frame.contentDocument`. This gives a more uniform isolation boundary for more predictable performance and security.

- Similarly, portaled `Window` objects are not accessible via accessors like `window.iframeName` or `window[0]`, and they cannot access related `Window` objects via `top` or `parent` (or `opener`).

- Navigations and history APIs within a pre-activation portal do not affect session history (see [above](#session-history-navigation-and-bfcache)). In contrast, navigating an iframe creates a new session history entry, and affects the resulting back button behavior.

- Portals cannot be made to navigate from the outside in the way iframes (or popups) can, via `window.open(url, iframeName)`.

- Portals can only load `http:` and `https:` URLs. This removes an entire category of confusing interactions regarding `about:blank`, `javascript:`, `blob:`, and `data:` URLs, as well as the `<iframe srcdoc="">` feature and its resulting `about:srcdoc` URLs. Notably, the portaled content will always have an origin derived from its URL, without any inheritance from the host document.

- Pre-activation, portals [cannot cause effects outside of their rendered area](#other-restrictions-while-portaled). In particular, they cannot use features that require permissions; there is no equivalent of `<iframe>`'s `allow=""` attribute which lets portaled pages act on behalf of their host.

- Pre-activation, portals [do not have access to storage](#storage-access-blocking); in exchange, they get full access to unpartitioned first-party storage after activation. (In contrast, iframes are moving toward having access to [partitioned storage](https://github.com/privacycg/storage-partitioning) throughout their lifetime.)

- Portals, like links but unlike iframes, [cannot have policies imposed on them](#embedder-imposed-policies-and-delegation) by the embedding page.

TODO: summarize above sections that cause major differences, once they are written: session history, rendering.

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

The main privacy concern with portals, as with all embedded content, is cross-site tracking. The threat model here is outlined in great detail [above](#privacy-threat-model-and-restrictions), as are the mitigations that portals apply to prevent such tracking. The summary is that portals are much better in this regard than iframes, and instead are designed to have the same privacy properties as links. That is, cross-site tracking is possible using link decoration on the `<portal>`'s `src=""` attribute, similar to the `<a>` element's `href=""`, but this tracking will only be possible once the portal activates/link navigates, which causes a very-user-visible full-page transition to the portaled/linked site.

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
