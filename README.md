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
  - [Permissions and policies](#permissions-and-policies)
  - [Rendering](#rendering)
  - [Interactivity](#interactivity)
  - [Accessibility](#accessibility)
  - [Session history, navigation, and bfcache](#session-history-navigation-and-bfcache)
- [Summary of differences between portals and iframes](#summary-of-differences-between-portals-and-iframes)
- [Alternatives considered](#alternatives-considered)
- [Security and privacy considerations](#security-and-privacy-considerations)
- [Stakeholder feedback](#stakeholder-feedback)
- [Acknowledgments](#acknowledgments)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Example

A document can include a `<portal>` element, which renders the specified URL in a portal context:

```html
<portal id="myPortal" src="https://www.example.com/"></portal>
```

This is somewhat like an iframe, in that it provides a rendering of the specified document at `https://example.com/`. However, a portal is much more restricted than an iframe: user interaction with it [does not pass through to the portaled document](#interactivity), and when the portaled document is cross-origin, capabilities like storage and `postMessage()` communication are [prohibited](#privacy-threat-model-and-restrictions) while rendering in the portal context. This allows portals to be used as a more-restricted view onto another document when the full capabilities of an iframe are not needed.

In exchange for these restrictions, portals gain an additional capability that iframes do not have. A portal can be *activated*, which causes the embedding window to navigate, replacing its document with the portal:

```js
myPortal.activate();
```

_Note: [issue #174](https://github.com/WICG/portals/issues/174) discusses making this the default behavior when clicking on a portal, similar to a link._

At this point, the user will observe that their browser has navigated to `https://www.example.com/` (e.g., via changes to the URL bar contents and back/forward UI). Since `https://example.com/` was already loaded in the portal context, this navigation will occur seamlessly and instantly, without a network round-trip or document re-initialization.

For more advanced use cases, the `https://www.example.com/` document can react to activation, using the `portalactivate` event. It can use this event to adapt itself to its new context, and even to adopt its *predecessor* (the document which previously occupied the tab) into a new portal context.

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

TODO:

- Privacy threat model summary and goals. Focused on cross-origin threats.
- Storage and communication restrictions summary
- Brief discussion of side channels
- Discuss pre-activation vs. post-activation, `requestStorageAccess()`, ...
- Maybe this is also the place to discuss the fact that there's no sync access (even same-origin)?
- Discuss "the origin model" explicitly. This uses the normal origin model (like iframes), but with restrictions similar to those already in place elsewhere in the platform (such as restricted storage).
- This section might benefit from being split in two.
- Note that design-discussions.md has a lot of stuff that might be useful here, and should probably be deleted if we're going to cover it here. (Or, we could keep using it as a place to put more details, and link to it from here.)

### Permissions and policies

TODO:

- Discuss default portaled state. You get no permissions; you inherit (how?) policies. Policies = CSP, document policies, feature policies, referrer policy, ... Anything else?
- Discuss how things change post-activation.
- Discuss practices and patterns for site authors, probably mostly from the point of view of someone being portaled that wants to do something permission-requiring once activated.
- Explicitly point out how activation makes this different from iframes in certain ways, but we still share a lot of the infrastructure.
- Briefly discuss permissions and policies that people might want to impose on portals, including some that aren't proposed yet (like blocking scripts or network access). Note that these will be developed independently, for iframes and portals alike.
- Somewhere we need to discuss our plans for `X-Frame-Options`, CSP `frame-ancestors`, and portal-specific variants of those? This might be the place for that?

### Rendering

TODO:

- Discuss rendering. Full viewport size at all times? Resizing OK or no? I'm sketchy on the plan here.
- Discuss practices and patterns for authors of portaled sites, e.g. how to adapt on activation.
- Discuss practices and patterns for authors of portaling sites, e.g. how to create a prerender (with a `display: none` portal) or an animated transition
- Maybe this is where we discuss fallback content for non-supporting browsers?

### Interactivity

TODO:

- Discuss how portals are only trivially interactive, like buttons or links. Not like iframes.
- Discuss focus. (Again, like buttons or links.)
- Did we end up adding a default click behavior like links?
- Discuss scrolling, including the problem of scroll handoff and its importance. Note that scroll handoff is a ??? in spec terms but we promise to spec something interoperably implementable, somehow.

### Accessibility

TODO:

- Discuss role and description.
- Discuss best practices for authors of portaling pages.
- Explicitly mention how authors should respect `prefers-reduced-motion` (and how this might happen automatically if they already turn off all CSS transitions/animations when that media query tests true).

### Session history, navigation, and bfcache

TODO:

- One-sentence reiteration of how activation is a navigation.
- Talk about how session history is tricky.
- Talk about how bfcache is tricky.
- Outline our solution for these, in terms of observable effects for users (not in terms of spec primitives).
- Maybe compare/contrast with iframes. Is it helpful or confusing to talk about how portals are more like popups than iframes? (I.e. they are auxiliary browsing contexts in spec terms.)

## Summary of differences between portals and iframes

TODO:

- Maybe introduce by telling people to think of portals as super-links, not super-iframes. At least from a user's perspective; from the spec and implementer perspective they're more related to iframes, and for web developers they're kind of in between.
- Reiterate everything from the above sections in one convenient place.
- Include minor things as well (like, doesn't appear in `window.frames`).

## Alternatives considered

TODO:

- A new attribute on iframes ([text existed in explainer.md](https://github.com/WICG/portals/blob/d901563053af7d56a2cafee686ee89d651c49eb7/explainer.md#why-do-we-need-a-new-html-tag-why-not-use-iframe) but was very implementer-focused)
- Other (historical?) solutions to prerendering
- Other (historical?) solutions to navigation transitions
- Adding activation ("promotion") to iframes ([text existed in explainer.md](https://github.com/WICG/portals/blob/d901563053af7d56a2cafee686ee89d651c49eb7/explainer.md#iframe-promotion) but was very implementer-focused)
- Using the fullscreen API ([text existed in explainer.md](https://github.com/WICG/portals/blob/d901563053af7d56a2cafee686ee89d651c49eb7/explainer.md#fullscreen-iframe) but was very implementer-focused)
- Allowing cross-origin communication and storage

## Security and privacy considerations

TODO:

- Can reference privacy threat model and restrictions above (or however that splits into sections when written)
- Eventually content here should be incorporated into the spec, but for now let's develop it in the explainer

See also the [W3C TAG Security and Privacy Questionnaire answers](./security-and-privacy-questionnaire.md).

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
