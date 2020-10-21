# Portals Security and Privacy Questionnaire Answers

The following are the answers to the W3C TAG's [security and privacy self-review questionnaire](https://w3ctag.github.io/security-questionnaire/).

## What information might this feature expose to web sites or other parties, and for what purposes is that exposure necessary?

The design of portals, and other prerendering browsing contexts, is to [prevent as much information exposure as possible](https://github.com/jeremyroman/alternate-loading-modes/blob/gh-pages/browsing-contexts.md#privacy-based-restrictions). The only information that is exposed to the portaled content about its host, or to the host about the portaled content, is information that leaks through via side channels. We've done our best to plug as many of these side channels as possible, as detailed in the linked prerendering browsing context explainer.

Some side channels, such as server-side timing correlation, are not realistically blockable. To mitigate any leaks possible via such avenues, we block pre-activation access to first-party storage, to prevent the portaled content from exposing any _interesting_ information to the host via such side channels.

## Is this specification exposing the minimum amount of information necessary to power the feature?

Yes.

## How does this specification deal with personal information or personally-identifiable information or information derived thereof?

This specification does not deal with such information in itself. In terms of how it interacts with other existing features that do, we note that portaled content is [prohibited](https://github.com/jeremyroman/alternate-loading-modes/blob/gh-pages/browsing-contexts.md#restrictions-on-the-basis-of-being-non-user-visible) from accessing any permission-requiring features before activation.

## How does this specification deal with sensitive information?

Ditto.

## Does this specification introduce new state for an origin that persists across browsing sessions?

No. Portaled content has no storage access. Once activated, the formerly-portaled content has its usual access to first-party storage, but that is not new state; it is existing state.

## What information from the underlying platform, e.g. configuration data, is exposed by this specification to an origin?

None.

## Does this specification allow an origin access to sensors on a user’s device?

No.

## What data does this specification expose to an origin? Please also document what data is identical to data exposed by other features, in the same or different contexts.

Like `<iframe>`s or `<link>`s, `<portal>`s expose to an origin the fact that it is being embedded/linked to/portaled, along with the referrer. Like those features, the referrer exposure information is controlled by the `referrerpolicy=""` attribute.

## Does this specification enable new script execution/loading mechanisms?

Not in itself. Portaled content can use existing script execution and loading mechanisms, similar to iframes.

## Does this specification allow an origin to access other devices?

No, only web servers.

## Does this specification allow an origin some measure of control over a user agent’s native UI?

No.

## What temporary identifiers might this this specification create or expose to the web?

None.

## How does this specification distinguish between behavior in first-party and third-party contexts?

`<portal>`s cannot be used inside iframes at all, as activating into an iframe doesn't make sense.

The treatment of portaled content itself branches on whether that content is same-origin or cross-origin, with additional storage access and communications channel restrictions in place on cross-origin content, to prevent cross-site tracking.

## How does this specification work in the context of a user agent’s Private Browsing or "incognito" mode?

The same as in non-private browsing mode.

## Does this specification have a "Security Considerations" and "Privacy Considerations" section?

Not yet. Most of the relevant material is in the [explainer](./README.md#security-and-privacy-considerations) and this document.

## Does this specification allow downgrading default security characteristics?

No.
