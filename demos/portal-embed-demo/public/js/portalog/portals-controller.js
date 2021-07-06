/**
 * Default path used for the portal
 */
const DEFAULT_PORTAL_PATH = '/ttt';

/**
 * Portals Controller
 * Controlling all the portal related features
 */
class PortalsController {
    /**
     * Initiating paratmeter
     * @constructor
     * @param {HTMLElement} embedContainer
     *     - the parent element of the embedded content
     * @param {URL} src - URL to embed in the container
     */
    constructor(embedContainer, src) {
        this.embedContainer = embedContainer;
        this.src = src;
        this.isPortalHostListenerAdded = false;

        // Event fires when coming back from TTT Archive
        window.addEventListener('portalactivate', (evt) => {
            // show the scroll bar when coming back
            document.body.classList.remove('hide-scroll-bars');
            // embed predecessor
            this.returnFromEmbed(evt.adoptPredecessor());
        });

        // Event fires after the portal on-click animation finishes
        this.embedContainer.addEventListener('transitionend', (evt) => {
            // We wait until the top transition finishes
            if (evt.propertyName !== 'transform') {
                return;
            }
            this.activateAfterAnimation();
        });

        // TODO: Separate the follow operations from the PortalsController
        // https://github.com/WICG/portals/pull/105/files#r279998963
        document.querySelector('#follow').addEventListener('click', (evt) => {
            const isFollowed = evt.target.classList.contains('followed');
            this._changeFollowStatus(isFollowed);
        });
    }

    /**
     * Creates a new <portal> element and player UI.
     */
    populateEmbedContainer() {
        this.portal = document.createElement('portal');
        this.portal.src = this.src;
        // Accepting autoplay
        this.portal.setAttribute('allow', 'autoplay');

        // Adding a transparent overlay div element on top of the portal
        // so that it won't immediately activate when clicking
        this.transparentOverlay = document.createElement('div');
        this.transparentOverlay.style.width = '100%';
        this.transparentOverlay.style.height = '100%';
        this.transparentOverlay.style.position = 'absolute';
        this.transparentOverlay.style.top = '0px';
        this.transparentOverlay.style.backgroundColor = 'transparent';

        this.playerUI = this._genPortalMessageUI();
        this.embedContainer.append(
            this.portal, this.transparentOverlay, this.playerUI);

        // When the portal is clicked, start animating it.
        this.embedContainer.addEventListener('click', (evt) => {
            if (evt.target === this.transparentOverlay) {
                this.animateAndActivate();
            }
        });
    }

    /**
     * Animates the embedded content to smoothly activate it.
     */
    animateAndActivate() {
        // The Y poistion that needs to be animated to
        // TODO: retrieve this value from the portal via postMessage
        // in the future
        const TARGET_Y = 170;

        // Animate the embed container
        this.playerUI.style.display = 'none';
        this.initialY = this.embedContainer.getBoundingClientRect().y;
        this.initialWidth = this.embedContainer.getBoundingClientRect().width;
        this.embedContainer.style.transition = 'transform 0.6s';
        this.embedContainer.style.transformOrigin = 'top center';
        this.embedContainer.style.transform =
            `translateY(${TARGET_Y - this.initialY}px) scale(1.05)`;
        this.portal.postMessage({control: 'hide'});
    }

    /**
     * Activating the portal
     */
    activateAfterAnimation() {
        const isFollowed = document.querySelector('#follow')
            .classList.contains('followed');

        // Activate portal with data used in the activated page
        this.portal.activate({
            data: {
                followed: isFollowed,
                name: 'Yusuke Utsunomiya',
                photoSrc: '/img/profile.png',
                initialY: this.initialY,
                activatedWidth:
                    this.embedContainer.getBoundingClientRect().width,
                initialWidth: this.initialWidth,
            },
        }).then(() => {
            // Reset the position of the container after the portal activates
            this._resetPositionOfEmbedContainer();

            // Check if this page was adopted by the embedded content.
            if (!window.portalHost) {
                return;
            }

            // hide the scroll bar so that it won't show
            // when used as a predecessor
            document.body.classList.add('hide-scroll-bars');

            // don't add event listeners if it was already added
            if (this.isPortalHostListenerAdded) {
                return;
            }

            // Listen to messages (follow/unfollow)
            window.portalHost.addEventListener('message', (evt) => {
                const isFollowed = evt.data.isFollowed;
                this._changeFollowStatus(!isFollowed);
            });
            this.isPortalHostListenerAdded = true;
        });
    }

    /**
     * Reinstalls the embedded portal after returning to PORTALOG.
     * @param {HTMLPortalElement} predecessor
     *     - A portal element containing the embedded page.
     */
    returnFromEmbed(predecessor) {
        this.playerUI.style.display = '';
        this.portal.replaceWith(predecessor);
        this.portal = predecessor;
    }

    /**
     * Generate a transparent UI to control the embedded content via message
     * @return {HTMLDivElement}
     */
    _genPortalMessageUI() {
        const controller = document.createElement('div');
        const prev = document.createElement('div');
        const play = document.createElement('div');
        const next = document.createElement('div');

        controller.classList.add('message-controller');
        prev.classList.add('message-button');
        play.classList.add('message-button');
        next.classList.add('message-button');

        prev.addEventListener('click', (evt) => {
            this.portal.postMessage({control: 'prev'});
        });
        play.addEventListener('click', (evt) => {
            const isPlaying = play.getAttribute('playing');
            if (isPlaying === 'true') {
                this.portal.postMessage({control: 'pause'});
                play.setAttribute('playing', false);
            } else {
                this.portal.postMessage({control: 'play'});
                play.setAttribute('playing', true);
            }
        });
        next.addEventListener('click', (evt) => {
            this.portal.postMessage({control: 'next'});
        });

        controller.appendChild(prev);
        controller.appendChild(play);
        controller.appendChild(next);

        return controller;
    }

    /**
     * Resetting embedContainer's position after activating the portal
     */
    _resetPositionOfEmbedContainer() {
        this.embedContainer.style.transition = '';
        this.embedContainer.style.transform = 'translateY(0px) scale(1)';
    }

    /**
     * Follow and unfollow
     * @param {boolean} isFollowed
     */
    _changeFollowStatus(isFollowed) {
        const follow = document.querySelector('#follow');
        if (isFollowed) {
            follow.classList.remove('followed');
            follow.textContent = 'Follow';
        } else {
            follow.classList.add('followed');
            follow.textContent = 'Following';
        }
    };
}

const portalPath =
    new URL(location).searchParams.get('portalpath') || DEFAULT_PORTAL_PATH;
const embedContainer = document.querySelector('#embed');
if ('HTMLPortalElement' in window) {
    // Create instance
    const portalsController = new PortalsController(
        embedContainer,
        new URL(`${location.origin}${portalPath}`)
    );

    // Embed portals and hook events
    portalsController.populateEmbedContainer();
} else {
    // iframe fallback
    const embedURL = `${location.origin}${portalPath}`;
    const iframe = document.createElement('iframe');
    const link = document.createElement('div');
    link.style.width = '100%';
    link.style.height = 'calc(100% - 80px)';
    link.style.position = 'absolute';
    link.style.top = '0px';
    link.style.backgroundColor = 'transparent';
    link.addEventListener('click', (evt) => {
        link.style.backgroundColor = 'skyblue';
        link.style.opacity = 0.4;
        location.href = embedURL;
    });
    iframe.src = embedURL;
    embedContainer.append(iframe, link);
    // show fallback message
    document.querySelector('#fallback-message').style.display = 'block';
}
