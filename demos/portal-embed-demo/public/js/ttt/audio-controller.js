import { audioList } from './audio-list.js'

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
        this.root = this.attachShadow({ mode: 'open' });
        this.root.innerHTML = `<style>${this.css}</style>${this.template}`;

        // All the UI references
        this.player = this.root;
        this.playButton = this.root.querySelector('.play');
        this.nextButton = this.root.querySelector('.next');
        this.prevButton = this.root.querySelector('.prev');
        this.timeline = this.root.querySelector('.timeline');
        this.progressBar = this.root.querySelector('.progress-bar');
        this.audioTitle = this.root.querySelector('.title');

        // Initiate the audio player
        const audioId = this.getAttribute('data-audioid');
        this._createNewAudio(audioId);
        this.playlist = [audioId];
        this.playlistIndex = 0;
        this.isPlaying = false;
        this._updateController();

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
            .disable-controller {
                opacity: 0.3
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
            .progress-bar {
                width: 10px;
                height: 10px;
                background-color: #FFF;
                position: relative;
                left: 0px;
                top: -5px;
                border-radius: 50%;
                cursor: pointer;
            }
        `;
    }

    /**
     * HTML template
     */
    get template() {
        return `
            <div class="title"></div>
            <div class="timeline">
                <div class="progress-bar"></div>
            </div>
            <div class="controllers">
                <div class="controller">
                    <img class="prev flip-horizontal" src="/img/next.png">
                </div>
                <div class="controller">
                    <img class="play" src="/img/play.png">
                </div>
                <div class="controller">
                    <img class="next" src="/img/next.png">
                </div>
            </div>
        `
    }

    /**
     * Controlling play button
     */
    play() {
        this.playButton.src = '/img/pause.png';
        const startProgressBar = _ => {
            // Start the progress bar
            this.isPlaying = true;
            this.audio.addEventListener('timeupdate', evt => {
                this.progressBar.style.left =
                    `${this.timeline.offsetWidth
                        * this.audio.currentTime / this.audio.duration}px`;
            });
        }
        // https://developers.google.com/web/updates/2017/06/play-request-was-interrupted
        Promise.resolve(this.audio.play()).then(_ => {
            // Start the progress bar.
            startProgressBar();
        });
    }

    /**
     * Controlling pause button
     */
    pause() {
        if (!this.isPlaying) {
            return;
        }
        this.playButton.src = '/img/play.png';
        this.isPlaying = false;
        this.audio.pause();
    }

    /**
     * Controlling next button
     */
    next() {
        if (!this._hasNext()) {
            return;
        }
        this.playlistIndex++;
        this._createNewAudio(this.playlist[this.playlistIndex]);
        if (this.isPlaying) {
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
        if (!this._hasPrev()) {
            return;
        }
        this.playlistIndex--;
        this._createNewAudio(this.playlist[this.playlistIndex]);
        if (this.isPlaying) {
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
    addToPlaylist(id) {
        this.playlist.push(id);
        this._updateController();
    }

    /**
     * Remove audio from playlist
     * @param {String} id - audio ID
     */
    removeFromPlaylist(id) {
        // Remove given id from playlist
        const index = this.playlist.indexOf(id);
        if (index !== -1) this.playlist.splice(index, 1);

        // Simply decrement the current index. There could be more 
        // sophisticated UX to this but the quality of the audio 
        // controller is not the point for this demo.
        if (this.playlistIndex !== 0) {
            this.playlistIndex--;
            this._createNewAudio(this.playlist[this.playlistIndex])
            if (this.isPlaying) {
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
     * Adding event listeners for the buttons
     */
    _hookEvents() {
        this.playButton.addEventListener('click', evt => {
            if (this.isPlaying) {
                this.pause();
                return;
            }
            this.play();
        });
        this.nextButton.addEventListener('click', evt => this.next());
        this.prevButton.addEventListener('click', evt => this.prev());
    }

    /**
     * Creating a new audio element
     * @param {String} id - audio ID
     */
    _createNewAudio(id) {

        // Simply replace the exisiting audio element with a new one
        if (this.root.querySelector('audio')) {
            this.root.removeChild(this.root.querySelector('audio'));
        }
        const audio = document.createElement('audio');
        // We could build streaming API for this in the future
        audio.src = `/mp3/${id}.mp3`;
        this.root.appendChild(audio);
        this.audio = audio;
        this.audio.addEventListener("ended", evt => {
            this.pause();
            this._createNewAudio(this.playlist[this.playlistIndex]);
        });

        // Resetting the progress bar
        this.durationSec = audioList[id].durationSec;
        this.audioTitle.innerHTML
            = `${audioList[id].title} - Totally Tooling Tips`;
        this.progressBar.style.transition = '';
        this.progressBar.style.left = '0px';
    }

    /**
     * Update the prev/next button status
     */
    _updateController() {
        this.prevButton.classList.toggle('disable-controller', !this._hasPrev());
        this.nextButton.classList.toggle('disable-controller', !this._hasNext());
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
        return this.playlistIndex < this.playlist.length - 1;
    }

}
customElements.define('audio-controller', AudioController);
