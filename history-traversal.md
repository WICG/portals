# History traversal

These rough algorithms describe how portal activation, adoption, reportaling, and deportaling should work.

Eventually, these steps will be moved into the portal spec, and the history traversal section of the HTML spec.

## Definitions

<dl>
  <dt>Navigable</dt>
  <dd>something that has session history, such as a top level page, an iframe, or a portal (although a portal can only have one item of session history).</dd>
</dl>

## Activate a portal in a 'push' style

This is a regular activation that clears any 'forward' items in join session history and adds a new top-level history entry for the portaled document.

1. Let _document_ be the portal's session history item's document.
1. Let _targetHistoryItem_ be a copy of the portal's session history item.
1. Remove _targetHistoryItem_'s document.
1. Give _targetHistoryItem_ a weak reference to _document_.
1. All 'forward' session history items are removed from the parent navigable.
1. Append _targetHistoryItem_ to the parent navigable's history items.
1. [Traverse to session history item](#traverse-to-session-history-item) with _targetHistoryItem_.

   Note: Actual activation is handled in history traversal.

## Activate a portal in a 'back' style

This is an activation that goes back through join session history. The API for this hasn't been designed, but if it exists it's likely to be an option to `activate()`.

1. Let _targetHistoryItem_ be the previous history item in the parent navigable, where the browsing context or URL differs from the current history item, ignoring the hash portion of the URLs.
1. If _targetHistoryItem_ does not have a weak reference to the portal's history item's document, reject and abort these steps.
1. [Traverse to session history item](#traverse-to-session-history-item) with _targetHistoryItem_.

   Note: Actual activation is handled in history traversal.

## Activate a portal in a 'forwards' style

This is an activation that go forward through join session history, without destroying existing items. The API for this hasn't been designed, but if it exists it's likely to be an option to `activate()`.

1. Let _targetHistoryItem_ be the next history item in the parent navigable, where the browsing context or URL differs from the current history item, ignoring the hash portion of the URLs.
1. If _targetHistoryItem_ does not have a weak reference to the portal's history item's document, reject and abort these steps.
1. [Traverse to session history item](#traverse-to-session-history-item) with _targetHistoryItem_.

   Note: Actual activation is handled in history traversal.

## Activate a portal in a 'replace' style

This is an activation that will replace the current top level page. The API for this hasn't been designed, but if it exists it's likely to be an option to `activate()`.

1. Let _document_ be the portal's session history item's document.
1. Let _targetHistoryItem_ be a copy of the portal's session history item.
1. Remove _targetHistoryItem_'s document.
1. Give _targetHistoryItem_ a weak reference to _document_.
1. [Traverse to session history item](#traverse-to-session-history-item) with _targetHistoryItem_ and isReplacement set to true.

   Note: Actual activation is handled in history traversal.

## Traverse to session history item

With _targetHistoryItem_ and _isReplacement_.

1. If the _targetHistoryItem_ and the current history item have the same document, and neither is null, traverse to _targetHistoryItem_ in the regular way and abort these steps.

   Note: This is an in-document navigation. Nothing portal-related happens in this case.

1. Let _documentChangesInDelta_ be 0.
1. Let _historyItems_ be null.
1. If _isReplacement_, then set _historyItems_ to [the current history item, _targetHistoryItem_].
1. Otherwise, set _historyItems_ to the history items of this navigable, between the current item, and target item, including the current item and _targetHistoryItem_, in order.
1. Remove the first item from _historyItems_.
1. For each _historyItem_ of _historyItems_, if any of the following is true, increment _documentChangesInDelta_:
   - _historyItem_ has a different browsing context to the previous item in the list.
   - _historyItem_'s URL is different to the previous item in the list, ignoring the hash portion of the URL in both.
1. If _documentChangesInDelta_ is greater than 1, then traverse to _targetHistoryItem_ in the regular way and abort these steps.

   Note: To avoid multiple levels of reportaling, reportaling and implicit activation is skipped if the navigation spans across multiple documents

1. Asset: _documentChangesInDelta_ is not 0.

   Note: This should have been catered for in step 1.

1. If _targetHistoryItem_ does not contain a document, and _targetHistoryItem_ has a weak reference to a document that's inside a portal in the current history item's document. then:

   1. Let _document_ be that portal's document.
   1. For each item in the navigable's session history that has a weak reference to _document_, set its document to _document_, and remove its weak reference to _document_.
   1. Give the portal a weak reference to the document inside the portal.
   1. Remove the portal's session history item.
   1. If adoption is permitted, offer _targetHistoryItem_'s document the opportunity to adopt the current history item. If this opportunity is taken:

      1. A new portal element is created in _targetHistoryItem_'s document.
      1. Give the portal a weak reference to the current history item's document.

         Note: The rest of the process is picked up in step 12.

1. If _targetHistoryItem_ does not contain a document, then traverse to _targetHistoryItem_ in the regular way and abort these steps.
1. If _targetHistoryItem_'s document contains a portal with a weak reference to the current history item's document, then:
   1. Let _documentToPortal_ be the current history item's document.
   1. Set the portal's history item to a copy of the current history item.
   1. Remove the portal's weak reference to _documentToPortal_.
   1. For each item in the navigable's session history, remove its document if the document is _documentToPortal_, and give it a weak reference to _documentToPortal_.
1. Otherwise, unload the current history item's document.

   Note: This may include excluding it from bfcache.

1. Continue traversing to _targetHistoryItem_ in the regular way.
