/**
 * An element for following/unfollowing
 */
class WriterFollow extends HTMLElement {
    
    /**
     * Initiate the element
     */
    connectedCallback() {
        // Retrieve element attributes
        this.photo = this.getAttribute('writer-photo-src');
        this.name = this.getAttribute('writer-name');

        // Attach to Shadow DOM
        this.root = this.attachShadow({mode: 'open'});
        this.root.innerHTML = `<style>${this.style}</style>${this.template}`;

        // Add event listeners
        this._hookEvents();
    }

    /**
     * CSS
     */
    get style() {
        return `
            :host{
                width: 100%;
                text-align: center;
                background-color: #F7F9F9;
                display: block;
            }
        
            .writer {
                height: 55px;
                display: inline-block;
                margin: 30px auto;
                border: 1px solid #EEE;
                padding: 20px;
                border-radius: 2px;
                background-color: #FFF;
            }
            .photo {
                height: 100%;
                float:left;
            }
            .photo img {
                height: 100%;
                border-radius: 50%;
            }
            .details {
                float:left;
                margin-left: 15px;
                margin-right:10px;
            }
            .name {
                font-size: 1.2em;
                line-height:1.0;
                height: 30px;
            }
            .follow {
                border: 1px solid #000;
                padding: 5px 15px;
                border-radius: 3px;
                cursor: pointer;
            }
            .followed {
                background-color: #27AA8A;
                border: none;
                color: #FFF;
            }
        `;
    }

    /**
     * HTML template
     */
    get template() {
        return `
            <div class='writer'>
                <div class='photo'>
                    <img src=${this.photo}>
                </div>
                <div class='details'>
                    <div class='name'>Shared by 
                        <span class='bold'>${this.name}</span>
                    </div>
                    <div class='follow'>Follow in PORTALOG</div>
                </div>
            </div>
        `
    }

    /**
     * Adding event listeners for the buttons
     */
    _hookEvents() {
        const follow = this.root.querySelector('.follow');
        const ORIGIN = 'http://localhost:3000';
        // On-click event for the follow button
        follow.addEventListener('click', evt => {
            const isFollowed = follow.classList.contains('followed');
            const portal = document.querySelector('portal');
            if(isFollowed){
                // Send message to the predecessor: unfollow
                portal.postMessage({isFollowed: false}, ORIGIN);
                follow.classList.remove('followed');
                follow.textContent = 'Follow in PORTALOG';                
            } else {
                // Send message to the predecessor: follow
                portal.postMessage({isFollowed: true}, ORIGIN)
                follow.classList.add('followed');
                follow.textContent = 'Following';
            }
        });
    }
}
customElements.define('writer-follow', WriterFollow);
