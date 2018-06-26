# Key scenarios

This is a list of scenarios which we hope portals will help solve. It includes desired privacy behavior not covered in the [v0 explainer](explainer.md).

## Carousel of articles from different websites
A news aggregator wants to provide its users the ability to quickly navigate between articles from various publications that cover the same news story.

A typical UX would consist of:
 - A navigation UI at the top of the viewport to convey where you are in the sequence of articles. May disappears and reappears as a user scroll down or back-up.
 - An article which occupies the rest of the viewport and allows for vertical scrolling
 - Left/Right swipe gestures to navigate between the previous/next article.

Requirements:
 - The address bar of the UA is updated to reflect the URL of the article a user has navigated to.
 - Navigations between next/previous articles happen seamlessly.
 - The Navigation UI is kept in sync with where the user is in the sequence of articles.
 - A publisher only get to know about a user when they swipe to an article from said publisher.
 - When a swipe gesture is completed, the news aggregator wants to communicate to the user that they are reading content from a specific publisher by showing the appropriate URL, thereby maintaining user expectations vis-a-vis their privacy.

After being activated, a portal opened by the news aggregator will now receive the input events. This means that it will have to co-operate with the news aggregator in order to maintain the desired user experience. For instance, here is how this could work:
 - The news aggregator becomes a portal of the activated article.
 - The activated article would include a provided script to let the news aggregator detect any swipe gestures and communicate to its portal.

```
<TODO sample code demonstrating how the API can be used to solve the use case>
```

publisher.com/articles/2018/05/monthly-trends...
```
[...]
// tentative approach
window.addEventListener('portalactivate', e => {
  let predecessor = e.adoptPredecessor(document);
  console.assert(predecessor instanceof HTMLPortalElement);
  // by special dispensation, this element keeps the portal alive for the duration of the portalactivate event
  // past that, the author must attach it to the document
  
  // maintain the user's expectations vis-a-vis the news aggregator flow
  // by keeping the news aggregator's UI around in the form of a portal 
  document.getElementById("extUI").appendChild(predecessor);
  
  // add script to forward swipe gestures to the news aggregator (portal)
  [...]
});
```

## Publication with an infinite list of articles
A web publication wants to offer an infinite list of articles but without having to redesign their website which is architectured as a Multi Page App. The desired UX is as follows:
 - As a user reaches the end of an article, they are presented with a sneak peek of a related article.
 - If they scroll further, the full article is then displayed and the address bar is updated since they have now moved on to a new document. Scrolling back would result in returning to the previous state.

Requirements:
 - The web publication wants to avoid complex changes to their website. They would like to achieve this UX by using a third party service, i.e. copy-pasting a pre-configured snippet.

```
<TODO sample code demonstrating how the API can be used to solve the use case>
```

### Product page inset on a review site
A web publication wants to make it easier to purchase the products it reviews.

The web publication would like to achieve the following UX:
 - At the end of a product review, have an inset showing a preview of the relevant product page from a reputable e-commerce website,
 - When the user tries to interact with the product page, perform a seamless navigation by expanding the inset until it takes over the full viewport, then navigate to the product page.

Requirements:
 - Preserve the reader’s privacy. The e-commerce website should only know that the reader is interested in the product if they decide to interact with the product page inset.
 - Seamless transition from the inset state to the navigated state.
 - Allow the reader to understand/confirm that they are on the reputable e-commerce website after the transition ends by showing the correct URL in the address bar.


```
<TODO sample code demonstrating how the API can be used to solve the use case>
```

## Same-origin seamless navigations
A Multi Page Application would like to achieve navigations that are comparable with those of a Single Page Application.

```
<TODO sample code demonstrating how the API can be used to solve the use case>
```
