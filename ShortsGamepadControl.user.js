// ==UserScript==
// @name         YouTube Shorts Gamepad Control
// @version      1.0.4
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
let g_gamepadIndex;
let g_pressedButtonIndex;
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

(function() {
    'use strict';

    ///////////////////////
    // Helpers Functions //
    ///////////////////////

    // There is a bunch of DIVs with class="reel-video-in-sequence style-scope ytd-shorts";
    function FindCurrentContainer(offset = 0) {
        let reels = document.getElementsByClassName("reel-video-in-sequence");
        if (!reels) { return undefined };

        for (let i = 0; i < reels.length; i++) { // So we need to iterate throw them;
            let isActive = reels[i].hasAttribute("is-active"); // To find active one.
            if (!isActive) { continue };

            return reels[i + offset];
        };

        return undefined;
    };

    // An actual HTML5-video
    function GetCurrentVideo(Container) {
        if (!Container) { return undefined };

        let video = Container.querySelector("#shorts-player > div.html5-video-container > video");
        if (!video) { return undefined };

        return video;
    };

    function GetLikeButton(Container) {
        if (!Container) { return undefined };

        let button = Container.querySelector("#like-button > yt-button-shape > label > button > yt-touch-feedback-shape > div");
        if (!button) { return undefined };

        return button;
    };

    function GetDisLikeButton(Container) {
        if (!Container) { return undefined };

        let button = Container.querySelector("#dislike-button > yt-button-shape > label > button > yt-touch-feedback-shape > div");
        if (!button) { return undefined };

        return button;
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
        Gamepad.vibrationActuator.playEffect('dual-rumble', {
            duration: 150, // Duration in milliseconds
            weakMagnitude: 1, // intensity (0-1) of the small ERM
            strongMagnitude: 1 // intesity (0-1) of the bigger ERM
        });
    };

    //////////////////////////////
    // Player-Related Functions //
    //////////////////////////////

    function Player_PlayPause() {
        let video = GetCurrentVideo(FindCurrentContainer());
        if (!video) { return };

        video.paused ? video.play() : video.pause();
        Vibrate();
    };

    function Player_Next() {
        let Container = FindCurrentContainer(+1);
        if (!Container) { return };

        Container.scrollIntoView({
            behavior: "smooth",
            block: "end",
        });
        Vibrate();
    };

    function Player_Prev() {
        let Container = FindCurrentContainer(-1);
        if (!Container) { return };

        Container.scrollIntoView({
            behavior: "smooth",
            block: "end",
        });
        Vibrate();
    };

    function Player_Like() {
        let LikeButton = GetLikeButton(FindCurrentContainer());
        if (!LikeButton) { return };
        
        LikeButton.click();
        Vibrate();
    };

    function Player_Dislike() {
        let DisLikeButton = GetDisLikeButton(FindCurrentContainer());
        if (!DisLikeButton) { return };

        DisLikeButton.click();
        Vibrate();
    };

    function Player_SeekForward() {
        let video = GetCurrentVideo(FindCurrentContainer());
        if (!video) { return };

        SetTime(video, +g_seekTime);
        Vibrate();
    };

    function Player_SeekBack() {
        let video = GetCurrentVideo(FindCurrentContainer());
        if (!video) { return };

        SetTime(video, -g_seekTime);
        Vibrate();
    };

    /////////////////////////////
    // Button-Binded Functions //
    /////////////////////////////

    const buttonBindings = [];
    buttonBindings[Button_t.A] = Player_Next;
    buttonBindings[Button_t.X] = Player_Prev;

    buttonBindings[Button_t.B] = Player_Like;
    buttonBindings[Button_t.Y] = Player_Dislike;

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

    /////////////////////////
    // Main Buttons Worker //
    /////////////////////////

    setInterval(() => {
        if (g_gamepadIndex == undefined || !IsValidURL()) { return };

        const Gamepad = navigator.getGamepads()[g_gamepadIndex];
        Gamepad.buttons.map(e => e.pressed).forEach((isPressed, buttonIndex) => {
            if (isPressed) {
                if (g_debug) { console.log(`[GPC] Pressed Button Index: ${buttonIndex}`) };
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
        console.log(`[GPC] Gamepad Connected \n[GPC] Index: ${event.gamepad.index} \n[GPC] Name: ${event.gamepad.id}`);
        g_gamepadIndex = event.gamepad.index;
    });

    window.addEventListener('gamepaddisconnected', (event) => {
        if (event.gamepad.index == g_gamepadIndex) {
            console.log(`[GPC] Gamepad Disconnected \n[GPC] Index: ${event.gamepad.index} \n[GPC] Name: ${event.gamepad.id}`);
            g_gamepadIndex = undefined;
        };
    });

})();
