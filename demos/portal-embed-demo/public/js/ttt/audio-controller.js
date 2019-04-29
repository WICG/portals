import {audioList} from './audio-list.js'

/**
 * Audio Controller
 * Controlling all the audio related features
 */
class AudioController extends HTMLElement {
    
    /**
     * Initiate the element
     */
    connectedCallback() {
        // Attach to Shadow DOM
        this.root = this.attachShadow({mode: 'open'});
        this.root.innerHTML = `<style>${this.css}</style>${this.template}`;

        // All the UI references
        this.player = this.root;
        this.playButton = this.root.querySelector('.play');
        this.nextButton = this.root.querySelector('.next');
        this.prevButton = this.root.querySelector('.prev');
        this.timeline = this.root.querySelector('.timeline');
        this.axis = this.root.querySelector('.axis');
        this.audioTitle = this.root.querySelector('.title');

        // Initiate the audio player
        const audioId = this.getAttribute('data-audioid');
        this._createNewAudio(audioId);
        this.playlist = [audioId];
        this.playlistIndex = 0;
        this.isPlaying = false;

        // Add event listeners
        this._hookEvents();
    }

    /**
     * CSS
     */
    get css() {
        return `
            :host {
                width: 100%;
                height: 80px;
                background-color: slategray;
                position: fixed;
                bottom: 0px;
                z-index: 999;
                display: block;
            }
            .controllers {
                margin: 0 auto;
                height:80%;
                width:180px;
            }
            .controller {
                width: 60px;
                height: 80%;
                text-align: center;
                float: left;
            }
            .controller img{
                height: 50%;
                cursor: pointer;
            }
            .flip-horizontal {
                transform: scale(-1, 1);
            }
            .title {
                width: 100%;
                height: 20%;
                text-align: center;
                margin-top: 8px;
                font-size: 0.8em;
                color: #FFF;
            }
            .timeline {
                width: 90%;
                max-width: 550px;
                border-top: 1px solid #FFF;
                margin: 8px auto 3px auto;
                cursor: pointer;
            }
            .axis{
                width: 10px;
                height: 10px;
                background-color: #FFF;
                position: relative;
                left: 0px;
                top: -5px;
                border-radius: 50%;
                cursor: pointer;
            }
            .prev {
                opacity: 0.3;
            }
            .next {
                opacity: 0.3;
            }
        `;
    }

    /**
     * HTML template
     */
    get template() {
        return `
            <div class='title'></div>
            <div class='timeline'>
                <div class='axis'></div>
            </div>
            <div class='controllers'>
                <div class='controller'>
                    <img class='prev flip-horizontal' src='/img/next.png'>
                </div>
                <div class='controller'>
                    <img class='play' src='/img/play.png'>
                </div>
                <div class='controller'>
                    <img class='next' src='/img/next.png'>
                </div>
            </div>
        `
    }

    /**
     * Controlling play button
     */
    play() {
        this.playButton.src = '/img/pause.png';
        const startAxis = _ => {
            // Start the progress bar
            const left = this.timeline.offsetWidth;
            this.axis.style.transition = `${this.durationSec}s linear`;
            this.axis.style.left = `${left}px`;
            this.isPlaying = true;
        }
        // https://developers.google.com/web/updates/2017/06/play-request-was-interrupted
        const promise = this.audio.play();
        if(promise !== undefined) {
            promise.then(_ => {
                startAxis();
            }).catch(e => {
                console.log(e);
            });
            return;
        }
        startAxis();
    }

    /**
     * Controlling pause button
     */
    pause() {
        if(!this._isPlaying()) {
            return;
        }
        this.playButton.src = '/img/play.png';
        this.isPlaying = false;
        this.audio.pause();
        // Stop the progress bar
        this.axis.style.left = `${this._getAxisCurrentLeft()}px`;
    }

    /**
     * Controlling next button
     */
    next() {
        if(!this._hasNext()){
            return;
        }
        this.playlistIndex++;
        this.prevButton.style.opacity = 1.0;
        this._createNewAudio(this.playlist[this.playlistIndex]);
        if(this._isPlaying()) {
            // If the controller was playing an audio, 
            // start playing the new audio
            this.play();
        }
        this._updateController();
    }

    /**
     * Controlling prev button
     */
    prev() {
        if(!this._hasPrev()){
            return;
        }
        this.playlistIndex--;
        this.prevButton.style.opacity = 1.0;
        this._createNewAudio(this.playlist[this.playlistIndex]);
        if(this._isPlaying()) {
            // If the controller was playing an audio, 
            // start playing the new audio
            this.play();
        }
        this._updateController();
    }

    /**
     * Add audio to playlist
     * @param {String} id - audio ID
     */
    addPlaylist(id) {
        this.playlist.push(id);
        this._updateController();
    }

    /**
     * Remove audio from playlist
     * @param {String} id - audio ID
     */
    removePlaylist(id) {
        // Simply create new playlist filtering the ID to remove
        const newPlaylist = [];
        this.playlist
            .filter(audioId => audioId !== id)
            .map(audioId => newPlaylist.push(audioId));
        this.playlist = newPlaylist;

        // Simply decrement the current index. There could be more 
        // sophisticated UX to this but the quality of the audio 
        // controller is not the point for this demo.
        if(this.playlistIndex !== 0){
            this.playlistIndex--;
            this._createNewAudio(this.playlist[this.playlistIndex])
            if(this._isPlaying()) {
                // If the controller was playing an audio, 
                // start playing the new audio
                this.play();
            }
        }

        this._updateController();
    }

    /**
     * Hiding the controller with anmimation
     */
    hide() {
        this.style.transition = 'bottom 0.6s';
        this.style.bottom = '-80px';
    }

    /**
     * Showing the controller with anmimation
     */
    show() {
        this.style.transition = 'bottom 0.2s';
        this.style.bottom = '0px';
    }

    /**
     * Adding anything required to do on portal activate
     */
    handleActivation() {
        if(this._isPlaying()) {
            // change the left transition position
            const currentLeft = this._getAxisCurrentLeft();
            const left = this.timeline.offsetWidth;
            const duration = this.durationSec * (1 - currentLeft/left);
            this.axis.style.transition = `${duration}s linear`;
            this.axis.style.left = `${left}px`;
        }
    }

    /**
     * Adding event listeners for the buttons
     */
    _hookEvents() {
        this.playButton.addEventListener('click', evt => {
            if(this._isPlaying()){
                this.pause();
                return;
            }
            this.play();
        });
        this.nextButton.addEventListener('click', evt => this.next());
        this.prevButton.addEventListener('click', evt => this.prev());
        this.audio.addEventListener("ended", evt => {
            this.pause();
            this._createNewAudio(this.playlist[this.playlistIndex]);
       });
    }

    /**
     * Creating a new audio element
     * @param {String} id - audio ID
     */
    _createNewAudio(id) {

        // Simply replace the exisiting audio element with a new one
        if(this.root.querySelector('audio')){
            this.root.removeChild(this.root.querySelector('audio'));
        }
        const audio = document.createElement('audio');
        const source = document.createElement('source');

        // We could build streaming API for this in the future
        source.src = `/mp3/${id}.mp3`;
        audio.appendChild(source);
        this.root.appendChild(audio);
        this.audio = audio;

        // Resetting the progress bar
        this.durationSec = audioList[id].durationSec;
        this.audioTitle.innerHTML
            = `${audioList[id].title} - Totally Tooling Tips`;
        this.axis.style.transition = '';
        this.axis.style.left = '0px';
    }

    /**
     * Update the prev/next button status
     */
    _updateController() {
        if(this._hasPrev()) {
            this.prevButton.style.opacity = 1.0;
        } else {
            this.prevButton.style.opacity = 0.3;
        }
        if(this._hasNext()){
            this.nextButton.style.opacity = 1.0;
        } else {
            this.nextButton.style.opacity = 0.3;
        }
    }

    /**
     * Checks if the controller has a previous audio to play
     * @returns {boolean}
     */
    _hasPrev() {
        return this.playlistIndex !== 0;
    }

    /**
     * Checks if the controller has a next audio to play
     * @returns {boolean}
     */
    _hasNext() {
        return this.playlist.length > 1 
            && !(this.playlistIndex + 1 >= this.playlist.length);
    }

    /**
     * Calculates the current left position of the animated axis
     * @returns {Number}
     */
    _getAxisCurrentLeft() {
        const timelineWidth = this.timeline.offsetWidth;
        const playerWidth = this.audioTitle.offsetWidth;
        const offset = (playerWidth - timelineWidth)/2;
        const rectLeft = this.axis.getBoundingClientRect().left;
        return rectLeft - offset;
    }

    /**
     * Checks if the controller is currently playing an audio
     * @returns {boolean}
     */
    _isPlaying() {
        return this.isPlaying;
    }


}
customElements.define('audio-controller', AudioController);
