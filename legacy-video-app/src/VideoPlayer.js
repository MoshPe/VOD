// VideoPlayer.js - Compatible with React 0.14.7
import React from 'react';

class VideoPlayer extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            currentSpeed: 1.0,
            isPlaying: false,
            player: null,
            currentTime: 0,
            duration: 0,
            ended: false
        };

        this.speedOptions = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 10.0];

        // Bind methods
        this.skipBackward = this.skipBackward.bind(this);
        this.skipForward = this.skipForward.bind(this);
        this.changeSpeed = this.changeSpeed.bind(this);
        this.togglePlayPause = this.togglePlayPause.bind(this);
        this.formatTime = this.formatTime.bind(this);
    }

    componentDidMount() {
        if (this.videoWrapper && window.videojs) {
            const video = document.createElement('video');
            video.className = 'video-js vjs-default-skin w-full';
            video.setAttribute('controls', true);
            video.setAttribute('preload', 'auto');
            video.setAttribute('width', '800');
            video.setAttribute('height', '450');

            this.videoWrapper.appendChild(video);

            const player = window.videojs(video, {
                controls: true,
                responsive: true,
                fluid: true,
                playbackRates: this.speedOptions,
                controlBar: {
                    playToggle: {
                        replay: true
                    },
                    volumePanel: {
                        inline: false
                    },
                    skipButtons: {
                        forward: 5,
                        backward: 5,
                    },
                    children: [
                        'playToggle',
                        'skipForward',
                        'skipBackward',
                        'progressControl',
                        'PlaybackRateMenuButton',
                        'chaptersButton',
                        'fullscreenToggle',
                        'pictureInPictureToggle',

                    ]
                },
                sources: [{
                    src: 'http://localhost:3001/video/test_stream',
                    type: 'video/mp4'
                }]
            });

            // ✅ Define custom component
            const VjsComponent = window.videojs.getComponent('Component');

            class CustomTimeDisplay extends VjsComponent {
                constructor(player, options) {
                    super(player, options);
                    this.player = player;

                    this.el_ = window.videojs.dom.createEl('div', {
                        className: 'vjs-custom-time-display',
                        innerHTML: '⏱ 00:00 / 00:00',
                        style: 'padding-top: 11px;'
                    });

                    this.updateTime = this.updateTime.bind(this);
                    this.player.on('timeupdate', this.updateTime);
                }

                createEl() {
                    return this.el_;
                }

                updateTime() {
                    const current = this.formatTime(this.player.currentTime());
                    const duration = this.formatTime(this.player.duration());
                    this.el_.innerHTML = `⏱ ${current} / ${duration}`;
                }

                formatTime(seconds) {
                    const mins = Math.floor(seconds / 60);
                    const secs = Math.floor(seconds % 60);
                    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
                }
            }

            const MouseTimeDisplay  = window.videojs.getComponent('MouseTimeDisplay');

            class CustomMouseTimeDisplay extends MouseTimeDisplay  {
                constructor(player, options) {
                    super(player, options);
                    this.player_ = player;
                }

                update(seekBarRect, seekBarPoint) {
                    const VIRTUAL_DURATION = this.player_.duration(); // 30 minutes in seconds
                    const time = seekBarPoint * VIRTUAL_DURATION;
                    const label = this.formatTime(time);

                    if (this.timeTooltip) {
                        this.timeTooltip.write(`${label}`);
                    }

                    console.log(seekBarPoint)

                    this.el_.style.left = `${seekBarPoint * 100}%`;
                }
c
                formatTime(seconds) {
                    const mins = Math.floor(seconds / 60);
                    const secs = Math.floor(seconds % 60);
                    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
                }
            }

            const PlayProgressBar  = window.videojs.getComponent('PlayProgressBar');

            class CustomPlayProgressBar extends PlayProgressBar  {
                constructor(player, options) {
                    super(player, options);
                    this.player_ = player;
                    this.vidPlayer = options.vidPlayer;
                    this.player_.on('timeupdate', this.updateTime.bind(this));
                }

                update(seekBarRect, seekBarPoint, event) {
                }

                updateTime(seekBarRect, seekBarPoint, event) {
                    const timeTooltip = this.getChild('timeTooltip');

                    if (!timeTooltip) {
                        return;
                    }

                    // Combined logic: if an event with a valid pendingSeekTime getter exists, use it.
                    const VIRTUAL_DURATION = this.player_.duration(); // 30 minutes in seconds
                    const realTime = this.player_.currentTime();
                    const cappedTime = Math.min(realTime, VIRTUAL_DURATION);
                    const current = this.formatTime(cappedTime);

                    // Calculate percent based on capped duration
                    const percent = (cappedTime / VIRTUAL_DURATION) * 100;

                    this.el_.style.width = `${percent}%`;
                    timeTooltip.update(seekBarRect, seekBarPoint, current);
                }

                formatTime(seconds) {
                    const mins = Math.floor(seconds / 60);
                    const secs = Math.floor(seconds % 60);
                    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
                }
            }

            window.videojs.registerComponent('CustomTimeDisplay', CustomTimeDisplay);
            window.videojs.registerComponent('mouseTimeDisplay', CustomMouseTimeDisplay);
            window.videojs.registerComponent('playProgressBar', CustomPlayProgressBar);

            // ✅ Add to control bar
            player.getChild('controlBar').addChild('CustomTimeDisplay', {}, 3);

            const unavailableSegments = [
                { start: 60, end: 120 },
                { start: 300, end: 360 },
            ];

            player.duration = () => {
                return 420;
            }

            player.ready(() => {
                const chaptersTrack = player.addTextTrack('chapters', 'Chapters', 'en');
                chaptersTrack.mode = 'hidden'; // Important for Video.js to show the button

                // Add in-memory cues (chapters)
                // Time in seconds
                chaptersTrack.addCue(new VTTCue(0, 10, 'Introduction'));
                chaptersTrack.addCue(new VTTCue(10, 60, 'Getting Started'));
                chaptersTrack.addCue(new VTTCue(80*60, 120, 'Advanced Stuff'));


                const seekBar = player.controlBar.progressControl.seekBar;

                // Remove default MouseTimeDisplay child from seekBar
                const oldMouseTime = seekBar.getChild('mouseTimeDisplay');
                if (oldMouseTime) {
                    seekBar.removeChild(oldMouseTime);
                }

                // Add your custom one instead
                seekBar.addChild('mouseTimeDisplay');

                const oldProgressBar = seekBar.getChild('playProgressBar');
                if (oldProgressBar) {
                    seekBar.removeChild(oldProgressBar);
                }

                // Add your custom one instead
                seekBar.addChild('playProgressBar', { vidPlayer: this });


                const progressControl = player.controlBar.progressControl;
                const bar = progressControl.seekBar.el();

                unavailableSegments.forEach(segment => {
                    const left = (segment.start / player.duration()) * 100;
                    const width = ((segment.end - segment.start) / player.duration()) * 100;

                    const div = document.createElement('div');
                    div.className = 'vjs-unavailable-segment';
                    div.style.left = `${left}%`;
                    div.style.width = `${width}%`;

                    bar.appendChild(div);
                });
            });

            this.setState({ player });
            const MAX_DURATION = 7 * 60; // 30 minutes in seconds
            player.on('timeupdate', function (a,b,c) {
                if (!this.state.ended && player.currentTime() >= MAX_DURATION && !player.hasClass('vjs-ended')) {
                    player.pause();

                    // Simulate video end — show replay button
                    // player.addClass('vjs-ended');
                    player.ended(true); // this sets internal state
                    player.trigger('ended');
                    this.setState({ ended: true });
                }
                this.setState({ currentTime: player.currentTime() });

                const currentTime = player.currentTime();
                unavailableSegments.forEach(segment => {
                    if (currentTime >= segment.start && currentTime < segment.end) {
                        player.currentTime(segment.end); // jump over unavailable part
                    }
                });
            }.bind(this));

            player.on('play', () => {
                if (this.state.ended) {
                    this.setState({ ended: false });

                    player.pause();
                    player.currentTime(0);

                    player.one('seeked', () => {
                        player.play();
                    });
                }
            });
        }
    }


    componentWillUnmount() {
        if (this.state.player) {
            this.state.player.dispose();
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' + secs : secs}`;
    }

    skipBackward() {
        const {player} = this.state;
        if (player) {
            const time = Math.max(0, player.currentTime() - 5);
            player.currentTime(time);
        }
    }

    skipForward() {
        const {player} = this.state;
        if (player) {
            const time = Math.min(player.duration(), player.currentTime() + 5);
            player.currentTime(time);
        }
    }

    changeSpeed(speed) {
        const {player} = this.state;
        if (player) {
            player.playbackRate(speed);
            this.setState({currentSpeed: speed});
        }
    }

    togglePlayPause() {
        const {player, isPlaying} = this.state;
        if (player) {
            isPlaying ? player.pause() : player.play();
        }
    }

    renderSpeedButtons() {
        return this.speedOptions.map(speed => {
            const isActive = this.state.currentSpeed === speed;
            const className = isActive
                ? 'px-3 py-1 rounded text-sm font-medium transition-colors bg-orange-600 text-white'
                : 'px-3 py-1 rounded text-sm font-medium transition-colors bg-gray-700 hover:bg-gray-600 text-gray-300';

            return (
                <button
                    key={speed}
                    onClick={() => this.changeSpeed(speed)}
                    className={className}
                >
                    {speed}x
                </button>
            );
        });
    }

    render() {
        const {currentSpeed, isPlaying} = this.state;

        return (
            <div className="max-w-4xl mx-auto p-6 bg-gray-900 text-white min-h-screen">
                <h1 className="text-3xl font-bold mb-6 text-center">Video Player</h1>

                <div className="mb-6">
                    <div
                        data-vjs-player
                        ref={(el) => {
                            this.videoWrapper = el;
                        }}
                        className="video-container"
                    />
                    {/*<div data-vjs-player>*/}
                    {/*    <video*/}
                    {/*        ref={(el) => { this.videoElement = el; }}*/}
                    {/*        className="video-js vjs-default-skin w-full"*/}
                    {/*        controls*/}
                    {/*        preload="auto"*/}
                    {/*        width="800"*/}
                    {/*        height="450"*/}
                    {/*        data-setup="{}"*/}
                    {/*    >*/}
                    {/*        <p className="vjs-no-js">*/}
                    {/*            To view this video please enable JavaScript, and consider upgrading to a web browser that{' '}*/}
                    {/*            <a*/}
                    {/*                href="https://videojs.com/html5-video-support/"*/}
                    {/*                target="_blank"*/}
                    {/*                rel="noopener noreferrer"*/}
                    {/*            >*/}
                    {/*                supports HTML5 video*/}
                    {/*            </a>.*/}
                    {/*        </p>*/}
                    {/*    </video>*/}
                    {/*</div>*/}
                </div>

                <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="flex flex-wrap gap-4 items-center justify-center">
                        <div className="flex gap-2">
                            <button
                                onClick={this.skipBackward}
                                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                ⏪ -5s
                            </button>
                            <button
                                onClick={this.togglePlayPause}
                                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                            </button>
                            <button
                                onClick={this.skipForward}
                                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                +5s ⏩
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <span className="text-sm font-medium py-2">Speed:</span>
                            {this.renderSpeedButtons()}
                        </div>
                    </div>

                    <div className="mt-4 text-center text-sm text-gray-400">
                        Status: {isPlaying ? 'Playing' : 'Paused'} | Speed: {currentSpeed}x
                    </div>
                </div>

                <div className="mt-6 bg-gray-800 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Setup Instructions:</h3>
                    <div className="text-sm text-gray-300 space-y-1">
                        <div className="text-sm text-gray-300 text-center mt-2">
                            Time: {this.formatTime(this.state.currentTime)} / {this.formatTime(this.state.duration)}
                        </div>
                        <p>
                            1. Install Video.js: <code className="bg-gray-700 px-2 py-1 rounded">npm install
                            video.js</code>
                        </p>
                        <p>2. Add CSS to your HTML head:</p>
                        <code className="bg-gray-700 px-2 py-1 rounded block mt-1">
                            {'<link href="https://vjs.zencdn.net/8.0.4/video-js.css" rel="stylesheet">'}
                        </code>
                        <p>3. Add Video.js script to your HTML:</p>
                        <code className="bg-gray-700 px-2 py-1 rounded block mt-1">
                            {'<script src="https://vjs.zencdn.net/8.0.4/video.min.js"></script>'}
                        </code>
                        <p>4. Make sure your NestJS backend is running on port 3001</p>
                    </div>
                </div>
            </div>
        );
    }
}

export default VideoPlayer;
