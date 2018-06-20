# Detailed design discussion

## Privacy considerations
Requirements:
For the use cases where the source and destination websites have different owners, it is important that the owner of the source website can preserve their users’ privacy.

We distinguish the following privacy concerns:
 - Leakage of sensitive personal data due to Network activity
 - Leakage of sensitive personal data due to JS activity
 - Considerations for users of browsers that block third-party cookies
 - Considerations for users of browsers with "double keys" strategies to storage and cache
 - Compliance with GDPR
 
On the other hand, we consider the following situation(s) as out-of-scope of the privacy model:
 - Collusion between a first party and a third party, i.e. the first party is enabling a third party to funnel privacy sensitive data out.


### Non exhaustive list of concrete issues
Leakage of sensitive personal data due to Network activity:
 - Revealing origins: *embarrassing-keyword*.example.com, *GUID-123ab54c-b49f-4e15-848e-212a42b4dfa8*.example.com
 - Revealing URLs: https://www.example.com/articles/*pay-off-credit-card-debt-fast*.html
 - Cookies
 - Validation of previously cached resources with a unique Etag
 - Beacon, pings but also regular resource fetching

Leakage of sensitive personal data due to JS activity:
 - HTTP Cache stuffing: 
   1. have each page fetch a long-lived unique resource,
   2. on subsequent navigations, use resource timing’s transferSize to test for cache hits on each unique resource to build/augment a user model.
 - Tracking via storage APIs: 
   1. record privacy sensitive info, e.g. potential interest deduced from pages displayed as insets, into one of the web platform storage facilities,
   2. On subsequent navigations, upstream data to augment a user model.
 - Tracking via scoped SW:
   1. serve each page under a specific sub-path and register a narrowly scoped SW,
   2. On subsequent navigations, call SW’s getRegistrations to obtain an array of all the registered SW for your origin, upstream the info to augment a user model.

Third-party cookie blocking:
 - Portals should NOT provide the ability to defeat third-party cookie blocking.
 
Storage with "double keys" strategies:
 - In browsers with double keys strategies, data is partitioned on a (first party origin, third party origin) basis. Data set by `someservice.com` in the context of a navigation to a page hosted by `example.com` is not accessible in different contexts, e.g. a navigation to `someservice.com` nor via a navigation to `otherexample.com` that happens to also include a script from `someservice.com`. 
 - Portals should NOT provide the ability to defeat this property of double keyed storages, i.e. it should NOT be possible for a third party to use portals in a way that self promote its partitioned data to a first party status.

[GDPR](https://www.eugdpr.org/) compliance:
 - From May 25th 2018, the European Union will enforce a new data privacy regulation called General Data Protection Regulation (GDPR) which replaces the Data Protection Directive 95/46/EC. 
 - It appears that one of the key differences is an emphasis on obtaining “explicit” and “unambiguous” consent for processing sensitive personal data.

### Proposal
#### Constraints
 1. Privacy can not be preserved if a yet-to-be-activated portal is:
   - Loaded from a server owned by the publisher or an untrusted party, or
   - Able to reach a server owned by the publisher or an untrusted party, or
   - Able to talk to a non-isolated Service Worker owned by the publisher or an untrusted third party.
 2. Privacy can not be preserved if a yet-to-be-activated portal is able to affect local state in a way that can be retrieved by a subsequent but unrelated navigation.


##### Constraint #1
We can address the first constraint by providing privacy-conscious developers with ways to limit network activity to the server(s) they trust until a portal context is activated. In practice, this means servers either controlled by the source website itself or operated by a trustworthy party, e.g. a legally bound CDN partner.

Concretely:
 - Trusted entities must be able to serve complete Portal-aware pages. [Web Packages](https://github.com/WICG/webpackage/blob/master/explainer.md), i.e. a bundle of [Signed Exchanges](https://tools.ietf.org/id/draft-yasskin-http-origin-signed-responses-02.html), would enable this.
 - Communicate to browsers the desire to restrict network activity to privacy safe entities: the serving (trusted) origin, fresh assets in the local HTTP cache, the source origin. Web packages served with a self-contained hint would enable this.

##### Constraint #2
For the second constraint, we can help the privacy-conscious developers by providing two modes:
 - **Restricted mode.** Deny the yet-to-be-activated portals any capability that would result in affecting the local state.
 - **Isolated mode.** Allow yet-to-be-activated portals to modify local state but in a way which guarantees that unrelated navigations can’t access said state.

Concretely:
 - **Restricted mode.** Disallow Javascript / fail on any attempt to run JS. Possible exception: scripts that the source trusts via CSP, e.g. “script-src cdn.sourceproduct.org”   Upon activation, a lifecycle event is emitted, Javascript is allowed again and the page operates under its canonical origin.
 - **Isolated mode.** Give the yet-to-be-activated Portal a unique origin, allows it to run Javascript and modify local state.  Upon activation, the page either continue to operate under its unique origin, or is reloaded under its canonical origin at the cost of losing access to the local state it had previously setup. There is a way for the owner of the destination page to specify which of these behaviors they prefer.
 - **Isolated Service Worker Mode.** A Service Worker and its importScripts are provided, along with the content they're expected to fetch(), and the URL to load. If the URL already has a newer SW registration, that's used; otherwise the provided SW is installed and used. Any other fetch() fails, as do all writes to storage. (Reads from storage are probably safe?) When the portal is activated, the SW is killed and restarted without these restrictions. Since SW registrations own clients, there's no problem with the client suddenly acquiring a SW that it wasn't born with. If there's an existing SW for concurrent clients on the same origin, the pre-activation one runs in parallel but can't affect the "real" one, and post-activation the portal client re-uses the "real" SW. (H/T @wycats)

Finally, for the case where privacy concerns don’t exist, e.g. same-origin / origins owned by the same owner or trusted parties, there could be an unrestricted mode. 

The UA should **provide** reasonable defaults, e.g. restricted when cross origin. However, the UA **should never force** a particular mode because relationships between entities and developer intent are hard to reason about from a UA viewpoint.

### Third party cookie blocking
If a user has signified their desire to block third party cookies, the browser should block a `<portal>`'s access to cookies/storage while it still is a portal, in the same way they would block any third-party. If the portal gets promoted, e.g. via a navigation, it can then gain access to its existing cookies/storage if any.


### Double keys strategies for storage
This is only relevant in the **Isolated mode** since **Restricted mode** would disallow any problematic access to storage. The properties of **Isolated mode** are enough to maintain the guarantees of a "double keys" strategy to storage. 

Let's walk through a scenario involving a privacy-hostile page.

Setup:
 1. The user is on a page featuring a portal pointing to a privacy-hostile page using the Isolated mode. 
 2. While still a `<portal>`, the hostile page has access to storage but under a *unique origin* (Note: this is a Chrome concept but Firefox's opaque unique origin seems related) which isn't an actual origin.

The hostile page had 2 options to pick from beforehand in order to define what happens when its portal is activated:
 - Continue to operate under the *unique origin*
 - Reload under my *canonical origin* at the cost of losing access to the local state I had previously setup.

If the hostile page picked "Continue to operate under the *unique origin*", then it can't access nor merge the data into the canonical origin storage.

If the hostile page picked "Reload under my *canonical origin*", then the data that was created under the *unique origin* is lost and can't be merged into the canonical origin storage.


## Lifecycle events
Requirements:
 - A yet-to-be-activated Portal should be mindful of the user experience of the page it was created for.
 - A Portal that ran in the Restricted mode needs an event upon activation to boot its logic which had been disallowed until now.

This can be solved by providing new lifecycle events:
 - portal context created
 - portal context associated to a DOM Portal in a document
 - portal context activated and deactivated

Alternative: consider re-using existing events.

## On activation: do nothing / reload me under my origin
This is only relevant when activating a Portal that ran in the isolated mode. The desired behavior must be specified before the activation occurs:
 - Default: do nothing
 - JS API to set the desired behavior, i.e. do nothing / reload me under my origin.

### Reloading under one’s origin
 - To avoid jarring user experiences, reloading should re-use readily available resources from the web package (assumption: this can’t be tainted) but nothing outside of that. The memory cache should probably be cleared.

## Navigation for yet-to-be-activated Portals
 - Yet-to-be-activated Portals should not be allowed to navigate themselves, e.g. this would defeat various assumptions, in particular privacy preserving guarantees.
 - This also means that the portal wouldn’t have to deal with history issues.

# Open questions
## Deactivating oneself
 - Should an activated Portal have the ability to deactivate itself? Probably, yes.
 - Then, would the Portal keep their real origin and state? Probably, yes.
 - Should an inactive portal receive input events? No. Allowing interactivity with inactive portals creates additional complexity.

## Trickiness around history
 - What happens to the history of an activated Portal that went back to an unactivated state?
 - Does it go back to being disallowed from navigating itself?

## Yet-to-be-activated Portals and Viewability
By default, iframes are not mindful of viewability. This resulted in various interventions, e.g. throttling requestAnimationFrame or timers for offscreen cross origin iframes. 

Can we use this new opportunity to avoid repeating the same mistake, i.e. making Portals mindful of Viewability by default?

## Viewability, Visibility and Portals
Iframes have the same Visibility as the main document. Should that also be the case for Yet-to-be-activated portals?

## We must not go deeper
It seems desirable to avoid recursion of portals as it might result in added complexity for unclear value (use cases?). Options:
 - Yet-to-be-activated Portals should not be allowed to create any Portal
 - Portals to oneself should not be allowed.

## Self contained but incomplete web packages
What should happen if the web package backing a portal is missing some resources?
 - Should Loading completely fail? This would make things simpler.
 - Provide feedback to the source page? How?

## Portal busting
There are similarities with iframes and portals. Some publishers may not want to have a portal to their content on certain origins.
 - Do we need a different mechanism than what exists, i.e. re-use x-frame-options?

## Service Worker and restricted mode
How does the restricted mode interacts with Service Workers?
 - Is a portal just disassociated from its SW forever?
 - Does the SW get a notification and the opportunity to reload the page?
 - How about pages that actually rely on a SW to assemble their contents?

## Desired visual behavior of the portal
There are various use cases for Portals that may require different visual behaviors:
 - The DOM portal may show a partial view of the portal context, e.g. the portal context is rendered assuming the full viewport but the DOM portal is a half-tall viewport and may only show the top half of the portal context.
 - The DOM portal behaves as a "texture map" of the portal context, i.e. resize the paint to fit the portal
 - The DOM portal behaves as a layout context. This is useful for legibility reasons. When the portal is expanded to cover the whole viewport as part of a navigation transition, the portal context’s document would adapt its layout accordingly to the rules set for a regular responsive design.


## Considerations for GDPR compliance
TODO: sync with Legal/Privacy team
