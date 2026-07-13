// ==UserScript==
// @name         YouTube Shorts Gamepad Control
// @version      1.1.4
// @description  Take a Full Control on Youtube Shorts with Gamepad
// @author       https://github.com/Wolf49406
// @match        http*://www.youtube.com/*
// @icon         https://raw.githubusercontent.com/Wolf49406/ShortsGamepadControl/main/gamepad.png
// @homepageURL  https://github.com/Wolf49406/ShortsGamepadControl
// @updateURL    https://github.com/Wolf49406/ShortsGamepadControl/raw/main/ShortsGamepadControl.user.js
// @downloadURL  https://github.com/Wolf49406/ShortsGamepadControl/raw/main/ShortsGamepadControl.user.js
// @grant        none
// ==/UserScript==

// Global objects
let g_currentContainer;
let g_currentVideo;
let g_observer;
let g_gamepadIndex;
let g_pressedButtonIndex;

// Config
const g_seekTime = 3;
const g_vibrate = true;
const g_debug = false;

// Buttons enum
const Button_t = {
    A: 0,
    B: 1,
    X: 2,
    Y: 3,
    LB: 4,
    RB: 5,
    LT: 6,
    RT: 7,
    SELECT: 8,
    START: 9,
    STICK_L: 10,
    STICK_R: 11,
    ARROW_UP: 12,
    ARROW_DOWN: 13,
    ARROW_LEFT: 14,
    ARROW_RIGHT: 15,
    HOME: 16,
};

(function () {
    'use strict';

    ///////////////////////
    // Helpers Functions //
    ///////////////////////

    function LOG(Message) {
        console.error(`[SGC] ${Message}`);
    }

    function GetCurrentVideo(Container) {
        if (!Container) {
            LOG("GetCurrentVideo: !Container");
            return undefined;
        }

        console.log(Container);

        const video = Container.querySelector("#shorts-player > div.html5-video-container > video")
        if (!video) {
            LOG("GetCurrentVideo: !video");
            return undefined;
        }

        return video;
    };

    function GetLikeButton(Container) {
        if (!Container) {
            LOG("GetLikeButton: !Container");
            return undefined;
        }

        const button = Container.querySelector("#experiment-overlay > ytd-reel-player-overlay-renderer > yt-reel-player-overlay-view-model > div.ytReelPlayerOverlayViewModelActionsContainer > reel-action-bar-view-model > like-button-view-model > toggle-button-view-model > button-view-model > label > button > yt-touch-feedback-shape > div");

        if (!button) {
            LOG("GetLikeButton: !button");
            return undefined;
        }

        return button;
    };

    function GetDisLikeButton(Container) {
        if (!Container) {
            LOG("GetDisLikeButton: !Container");
            return undefined;
        }

        const button = Container.querySelector("#experiment-overlay > ytd-reel-player-overlay-renderer > yt-reel-player-overlay-view-model > div.ytReelPlayerOverlayViewModelActionsContainer > reel-action-bar-view-model > dislike-button-view-model > toggle-button-view-model > button-view-model > label > button > yt-touch-feedback-shape > div");
        if (!button) {
            LOG("GetDisLikeButton: !button");
            return undefined;
        }

        return button;
    };

    function GetLikesCount() {
        const likesContainer = document.querySelector("#like-button > yt-button-shape > label > div > span");
        const likesCount = likesContainer.text;
        return likesCount;
    };

    function SetTime(video, time) {
        let currentTime = video.currentTime; // Default HTML5 Video\Audio API -- https://www.w3schools.com/tags/ref_av_dom.asp
        video.currentTime = currentTime + time;
    };

    // Tampermonkey's @match is such a headache
    function IsValidURL() {
        return location.href.startsWith(`https://www.youtube.com/shorts/`);
    };

    function Vibrate() {
        if (!g_vibrate) { return };

        const Gamepad = navigator.getGamepads()[g_gamepadIndex];
        if (Gamepad.vibrationActuator && Gamepad.vibrationActuator.playEffect) {
            Gamepad.vibrationActuator.playEffect('dual-rumble', {
                duration: 150, // Duration in milliseconds
                weakMagnitude: 1, // intensity (0-1) of the small ERM
                strongMagnitude: 1 // intesity (0-1) of the bigger ERM
            });
        }
    };

    //////////////////////////////
    // Player-Related Functions //
    //////////////////////////////

    function Player_PlayPause() {
        if (!g_currentVideo) {
            LOG("Player_PlayPause: !g_currentVideo");
            return;
        }

        g_currentVideo.paused ? g_currentVideo.play() : g_currentVideo.pause();
        Vibrate();
    };

    function Player_Next() {
        if (!g_currentContainer) {
            LOG("Player_Next: !g_currentContainer");
            return;
        }

        const nextId = parseInt(g_currentContainer.id) + 1;
        if (isNaN(nextId)) {
            LOG("Player_Next: isNaN(nextId)");
            return;
        }

        const next = document.getElementById(nextId);
        if (!next) {
            LOG("Player_Next: !next");
            return;
        }

        g_currentContainer = next;
        g_currentVideo = GetCurrentVideo(next);

        next.scrollIntoView({
            behavior: "smooth",
            block: "end",
        });
        Vibrate();
    }


    function Player_Prev() {
        if (!g_currentContainer) {
            LOG("Player_Prev: !g_currentContainer");
            return;
        }

        const prevId = parseInt(g_currentContainer.id) - 1;
        if (isNaN(prevId)) {
            LOG("Player_Prev: isNaN(prevId)");
            return;
        }

        const prev = document.getElementById(prevId);
        if (!prev) {
            LOG("Player_Prev: !prev");
            return;
        }

        seenReels.delete(prev);
        g_currentContainer = prev;
        g_currentVideo = GetCurrentVideo(prev);

        prev.scrollIntoView({
            behavior: "smooth",
            block: "end",
        });
        Vibrate();
    };

    function Player_Like() {
        const LikeButton = GetLikeButton(g_currentContainer);
        if (!LikeButton) {
            LOG("Player_Like: !LikeButton");
            return;
        }

        LikeButton.click();
        Vibrate();
    };

    function Player_Dislike() {
        const DisLikeButton = GetDisLikeButton(g_currentContainer);
        if (!DisLikeButton) {
            LOG("Player_Dislike: !DisLikeButton");
            return;
        }

        DisLikeButton.click();
        Vibrate();
    };

    function Player_SeekForward() {
        if (!g_currentVideo) {
            LOG("Player_SeekForward: !g_currentVideo");
            return;
        }

        SetTime(g_currentVideo, +g_seekTime);
        Vibrate();
    };

    function Player_SeekBack() {
        if (!g_currentVideo) {
            LOG("Player_SeekBack: !g_currentVideo");
            return;
        }

        SetTime(g_currentVideo, -g_seekTime);
        Vibrate();
    };

    /////////////////////////////
    // Button-Binded Functions //
    /////////////////////////////

    const buttonBindings = [];
    buttonBindings[Button_t.A] = Player_Next;
    buttonBindings[Button_t.X] = Player_Prev;

    buttonBindings[Button_t.Y] = Player_Like;
    // buttonBindings[Button_t.B] = Player_Dislike;

    buttonBindings[Button_t.ARROW_UP] = Player_Prev;
    buttonBindings[Button_t.ARROW_DOWN] = Player_Next;

    buttonBindings[Button_t.ARROW_LEFT] = Player_SeekBack;
    buttonBindings[Button_t.ARROW_RIGHT] = Player_SeekForward;

    buttonBindings[Button_t.LB] = Player_SeekBack;
    buttonBindings[Button_t.RB] = Player_SeekForward;

    buttonBindings[Button_t.LT] = Player_PlayPause;
    buttonBindings[Button_t.RT] = Player_PlayPause;

    // Call Button-Binded Function
    function HandleButton(buttonIndex) {
        let Binding = buttonBindings[buttonIndex];
        if (Binding) {
            Binding()
        };
    };

    ///////////////////////////////
    // Main Shorts Update Worker //
    ///////////////////////////////

    const seenReels = new WeakSet();

    function InitObserver() {
        if (g_observer) g_observer.disconnect();

        g_observer = new MutationObserver(() => {
            if (!IsValidURL()) return;

            const reels = document.getElementsByClassName("reel-video-in-sequence-new");
            for (let i = 0; i < reels.length; i++) {
                const reel = reels[i];
                if (!seenReels.has(reel) && reel.querySelector("#reel-video-renderer")) {
                    const CurrentVideo = GetCurrentVideo(reel);
                    if (CurrentVideo) {
                        seenReels.add(reel);

                        g_currentContainer = reel;
                        g_currentVideo = CurrentVideo;

                        LOG(`Observer: New Container -> ${g_currentContainer.id}`);
                        break;
                    }
                }
            }
        });

        const waitForShortsContainer = setInterval(() => {
            const container = document.getElementById("shorts-inner-container");
            if (container) {
                clearInterval(waitForShortsContainer);
                g_observer.observe(container, { childList: true, subtree: true });
                console.log("Наблюдение запущено");
            }
        }, 200);
    }

    /////////////////////////
    // Main Buttons Worker //
    /////////////////////////

    setInterval(() => {
        if (g_gamepadIndex == undefined || !IsValidURL()) { return };

        const Gamepad = navigator.getGamepads()[g_gamepadIndex];
        Gamepad.buttons.map(e => e.pressed).forEach((isPressed, buttonIndex) => {
            if (isPressed) {
                if (g_debug) { console.log(`[SGC] Pressed Button Index: ${buttonIndex}`) };
                // Prevent multiple triggering
                if (g_pressedButtonIndex == undefined) {
                    g_pressedButtonIndex = buttonIndex;
                    HandleButton(buttonIndex);
                };
            }
            else if (buttonIndex == g_pressedButtonIndex) {
                g_pressedButtonIndex = undefined;
            };
        })
    }, 50);

    ////////////////////
    // Event Listners //
    ////////////////////

    window.addEventListener('gamepadconnected', (event) => {
        console.log(`[SGC] Gamepad Connected \n[SGC] Index: ${event.gamepad.index} \n[SGC] Name: ${event.gamepad.id}`);
        g_gamepadIndex = event.gamepad.index;
    });

    window.addEventListener('gamepaddisconnected', (event) => {
        if (event.gamepad.index == g_gamepadIndex) {
            console.log(`[SGC] Gamepad Disconnected \n[SGC] Index: ${event.gamepad.index} \n[SGC] Name: ${event.gamepad.id}`);
            g_gamepadIndex = undefined;
        };
    });

    InitObserver();
})();
