/**
 * Portals Controller
 * Controlling all the portal related features
 */
class PortalsController {

    /**
     * Initiating paratmeter
     * @constructor
     * @param {HTMLElement} root - the root element
     * @param {String} origin - origin of portal
     * @param {String} path - path of portal
     * @param {Number} anmiateY - A target position to animate in px
     */
    constructor(root, origin, path, anmiateY) {
        this.root = root;
        this.origin = origin;
        this.path = path;
        this.anmiateY = anmiateY;
    }

    /**
     * Embedding portal element to the root.
     * @param {HTMLPortalElement} predecessor - optional
     */
    embed(predecessor) {

        // clean up the root
        this._remove(this.root.querySelector('portal'));

        if (predecessor) {
            // If the optional predecessor parameter was set
            // add the predecessor to the root
            this.portal = predecessor;
        } else {
            // Or else, create new portal
            this.portal = document.createElement('portal');
            this.portal.src = this.origin + this.path;
            // https://developers.google.com/web/updates/2017/09/autoplay-policy-changes
            // TODO: autoplay workaround
        }
        const messageUI = this._genPortalMessageUI();
        this.root.appendChild(this.portal);
        this.root.appendChild(messageUI);

        // Add animation on-click
        this.portal.addEventListener('click', (evt) => {
            this.initialY = this.root.getBoundingClientRect().y;
            this.initialWidth = this.root.getBoundingClientRect().width;
            this._remove(this.root.querySelector('.message-controller'));
            this.root.style.transition =
                `top 0.6s cubic-bezier(.49,.86,.37,1.01),
                 left 0.3s cubic-bezier(.49,.86,.37,1.01), 
                width 0.3s cubic-bezier(.49,.86,.37,1.01),
                padding-top 0.3s cubic-bezier(.49,.86,.37,1.01)`;
            this.root.style.top = `${this.anmiateY - this.initialY}px`;
            this.root.style.width = '95%';
            this.root.style.paddingTop = 'calc(95% * 0.65)';
            this.root.style.left = 'calc((100% - 95%)/2)';
            this.portal.postMessage({ control: 'hide' }, this.origin);
        });

    }

    /**
     * Adding event listeners
     */
    hookEvents() {
        
        // Event fires when coming back from TTT Archive
        window.addEventListener('portalactivate', (evt) => {
            // reset the overflow style to default
            document.body.style.overflow = '';
            // embed predecessor
            this.embed(evt.adoptPredecessor());
        });

        // Event fires after the portal on-click animation finishes
        this.root.addEventListener('transitionend', (evt) => {
            if (evt.propertyName === 'top') {
                const isFollowed = document.querySelector('#follow')
                    .classList.contains('followed');

                // Activate portal with data used in the activated page
                this.portal.activate({
                    data: {
                        followed: isFollowed,
                        name: 'Yusuke Utsunomiya',
                        photoSrc: '/img/profile.png',
                        initialY: this.initialY,
                        activatedWidth: this.root.getBoundingClientRect().width,
                        initialWidth: this.initialWidth,
                    }
                }).then((_) => {
                    // Resolves with undefined when adoped as a predecessor
                    // Check if window.portalHost is present (just in case)
                    if(!window.portalHost){
                        return;
                    }

                    // hide the scroll bar
                    document.body.style.overflow = 'hidden';

                    // Listen to messages (follow/unfollow)
                    window.portalHost.addEventListener('message', (evt) => {
                        const isFollowed = evt.data.isFollowed;
                        this._changeFollowStatus(!isFollowed);
                    });
                });

                this._resetRoot();
            }
        });
        document.querySelector('#follow').addEventListener('click', (evt) => {
            const isFollowed = evt.target.classList.contains('followed');
            this._changeFollowStatus(isFollowed);
        });
    }

    /**
     * Generate a transparent UI to control the embedded content via message
     * @returns {HTMLDivElement}
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
            this.portal.postMessage({ control: 'prev' }, this.origin);
        });
        play.addEventListener('click', (evt) => {
            const isPlaying = play.getAttribute('playing');
            if (isPlaying === 'true') {
                this.portal.postMessage({ control: 'pause' }, this.origin);
                play.setAttribute('playing', false);
            } else {
                this.portal.postMessage({ control: 'play' }, this.origin);
                play.setAttribute('playing', true);
            }
        });
        next.addEventListener('click', (evt) => {
            this.portal.postMessage({ control: 'next' }, this.origin);
        });

        controller.appendChild(prev);
        controller.appendChild(play);
        controller.appendChild(next);

        return controller;
    }

    /**
     * Removing an element
     * @param {HTMLElement} elm 
     */
    _remove(elm) {
        if (elm) {
            elm.parentNode.removeChild(elm);
        }
    }

    /**
     * Resetting root's style
     */
    _resetRoot() {
        this.root.style.transition = '';
        this.root.style.width = '100%';
        this.root.style.paddingTop = '65%';
        this.root.style.top = '0px';
        this.root.style.left = '0px';
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

let portalPort = 3001;
if(location.search) {
    const matchResult = location.search.match(/portalport=(\d{4})/);
    if(matchResult[1]){
        portalPort = matchResult[1];
    }
}

if('HTMLPortalElement' in window){
    // Create instance
    const portalsController = new PortalsController(
        document.querySelector('#embed'),
        `http://localhost:${portalPort}`,
        '/',
        170
    );

    // Embed portals and hook events
    portalsController.embed();
    portalsController.hookEvents();
} else {
    // iframe fallback
    const embedURL = `http://localhost:${portalPort}`;
    const iframe = document.createElement('iframe');
    const link = document.createElement('div');
    link.style.width = '100%';
    link.style.height = 'calc(100% - 80px)';
    link.style.position = 'absolute';
    link.style.top = '0px';
    link.style.backgroundColor = 'transparent';
    link.addEventListener('click', evt => {
        link.style.backgroundColor = 'skyblue';
        link.style.opacity = 0.4;
        location.href = embedURL;
    });
    iframe.src = embedURL;
    document.querySelector('#embed').appendChild(iframe);
    document.querySelector('#embed').appendChild(link);
    // show fallback message
    document.querySelector('#fallback-message').style.display = "block";

}

