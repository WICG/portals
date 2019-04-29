import {audioList} from './audio-list.js'

/**
 * An element for TTT recommendations
 */
class TTTReco extends HTMLElement {
    
    /**
     * Initiate the element
     */
    connectedCallback() {
        // The list of recommendations
        this.recommendationList = ['ssr', 'lighthouse', 'github'];
        
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
            :host {
                display: block;
                width: 95%;
                max-width: 640px;
                margin: 20px auto 0px auto;
                padding-bottom: 120px;
                background-color:#FFF;
            }
            .web-font {
                font-family: 'Poppins', sans-serif;
            }
            .header {
                font-size: 1.2em;
            }
            .pod {
                width: 100%;
                height: 80px;
                background-color: #FBFBFB;
                margin-top: 15px;
                border-radius: 2px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.12), 
                            0 1px 2px rgba(0,0,0,0.24);
            }
            .thumbnail {
                height: 100%;
                float:left;
            }
            .thumbnail img{
                height: 100%;
            }
            .description {
                float:left;
                margin:20px 0px 10px 20px;
            }
            .title{
                font-size: 1.0em;
            }
            .series{
                font-size: 0.8em;
                margin-top: 5px;
                font-weight: 700;
            }
            .add {
                height: 100%;
                float:right;
                border-left: 1px solid #DDD;
                width: 55px;
                text-align: center;
                position: relative;
            }
            .add-button {
                width: 100%;
                height: 100%;
                position: absolute;
                top: 0px;
                left: 0px;
            }
            .add img{
                height: 50%;
                margin-top:20px;
                margin-left:5px;
            }
            .ripple {
                background-position: center;
                transition: background 0.8s;
            }
            .ripple:hover {
                background: #FBFBFB radial-gradient(circle, 
                    transparent 2%, #FBFBFB 1%) center/15000%;
            }
            .ripple:active {
                background-color: #DDD;
                background-size: 100%;
                transition: background 0s;
            }
        `;
    }

    /**
     * HTML template
     */
    get template() {
        return `
                <div class='header web-font'>Listen more of TTT</div>
                ${this.recommendationList.map(key => {
                    const imgURL = audioList[key].imgURL;
                    const title = audioList[key].title;
                    return this._createItemTemplate(key, imgURL, title);
                }).join('')}
        `
    }

    /**
     * Generating HTML for each recommended auido
     * @param {String} key 
     * @param {String} imgURL 
     * @param {String} title 
     * @return {String}
     */
    _createItemTemplate(key, imgURL, title) {
        return `
            <div class='pod'>
                <div class='thumbnail'>
                    <img src=${imgURL}>
                </div>
                <div class='description'>
                    <div class='title'>${title}</div>
                    <div class='series'>Tottaly Tooling Tips</div>
                </div>
                <div class='add ripple'>
                    <img src='/img/add.png'>
                    <div class='add-button' added='false' id=${key}></div>
                </div>
            </div>
        `;
    }

    /**
     * Adding event listeners for the buttons
     */
    _hookEvents() {
        [...this.root.querySelectorAll('.add-button')].map(elm => {
            elm.addEventListener('click', evt => {
                if(evt.target.getAttribute('added')==='false'){
                    evt.target.parentNode.querySelector('img').src = '/img/added.png';
                    evt.target.setAttribute('added', true);
                    const id = evt.target.getAttribute('id');
                    // Add selected audio to the playlist
                    document.querySelector('audio-controller').addPlaylist(id)
                } else {
                    evt.target.parentNode.querySelector('img').src = '/img/add.png';
                    evt.target.setAttribute('added', false);
                    const id = evt.target.getAttribute('id');
                    // Remove selected audio to the playlist
                    document.querySelector('audio-controller').removePlaylist(id)
                }
            });
        })
    }

}
customElements.define('ttt-reco', TTTReco);
