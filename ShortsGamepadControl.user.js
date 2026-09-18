// ==UserScript==
// @name         YouTube Shorts Gamepad Control
// @namespace    ytsgc
// @version      2.0.3
// @description  Take a Full Control on Youtube Shorts with Gamepad
// @author       https://github.com/Wolf49406
// @match        http*://www.youtube.com/*
// @icon         https://raw.githubusercontent.com/Wolf49406/ShortsGamepadControl/main/gamepad.png
// @homepageURL  https://github.com/Wolf49406/ShortsGamepadControl
// @updateURL    https://github.com/Wolf49406/ShortsGamepadControl/raw/main/ShortsGamepadControl.user.js
// @downloadURL  https://github.com/Wolf49406/ShortsGamepadControl/raw/main/ShortsGamepadControl.user.js
// @grant        none
// ==/UserScript==

const App = {
  config: {
    seekTime: 3,
    vibrate: true,
    debug: false,
  },

  state: {
    observer: null,
    gamepadIndex: -1,
    pressedButtonIndex: -1,
    seenReels: null,
  },

  DOM: {
    likeButton: "#experiment-overlay > ytd-reel-player-overlay-renderer > yt-reel-player-overlay-view-model > div.ytReelPlayerOverlayViewModelActionsContainer > reel-action-bar-view-model > like-button-view-model > toggle-button-view-model > button-view-model > label > button > yt-touch-feedback-shape > div",
    shortsInnerContainer: "shorts-inner-container",
    video: "#shorts-player > div.html5-video-container > video",
    reelVideoInSequenceNew: "reel-video-in-sequence-new",
    reelVideoRenderer: "#reel-video-renderer",
  },

  Logger: {
    debug(message) {
      if (App.config.debug) {
        console.log(`[SGC] ${message}`);
      }
    },
    info(message) {
      console.info(`[SGC] ${message}`);
    },
    error(message) {
      console.error(`[SGC] ${message}`);
    },
  },

  Actions: {
    validateURL: () => location.href.startsWith(`https://www.youtube.com/shorts/`),

    getContainer() {
      const reels = document.getElementsByClassName(App.DOM.reelVideoInSequenceNew);
      if (!reels || reels.length === 0) {
        App.Logger.error("getContainer: !reels");
        return null;
      }

      App.state.seenReels = new WeakSet();

      for (let i = 0; i < reels.length; i++) {
        const reel = reels[i];
        if (!App.state.seenReels.has(reel) && reel.querySelector(App.DOM.reelVideoRenderer)) {
          App.state.seenReels.add(reel);
          return reel;
        }
      }

      return null;
    },

    getCurrentVideo() {
      const currentContainer = App.Actions.getContainer();
      if (!currentContainer) {
        App.Logger.error("getCurrentVideo: !currentContainer");
        return null;
      }

      const video = currentContainer.querySelector(App.DOM.video);
      if (!video) {
        App.Logger.error("getCurrentVideo: !video");
        return null;
      }

      return video;
    },

    getLikeButton() {
      const currentContainer = App.Actions.getContainer();
      if (!currentContainer) {
        App.Logger.error("getLikeButton: !currentContainer");
        return null;
      }

      const button = currentContainer.querySelector(App.DOM.likeButton);
      if (!button) {
        App.Logger.error("getLikeButton: !button");
        return null;
      }

      return button;
    },

    initApp() {
      if (App.state.observer){
        App.state.observer.disconnect();
      }

      App.state.observer = new MutationObserver(() => {
        App.Logger.debug("MutationObserver: DOM Changed");
      });

      const waitForShortsContainer = setInterval(() => {
        const container = document.getElementById(
          App.DOM.shortsInnerContainer,
        );
        if (container) {
          clearInterval(waitForShortsContainer);
          App.state.observer.observe(container, {
            childList: true,
            subtree: true,
          });
        }
      }, 200);
    },

    vibrate() {
      if (!App.config.vibrate || App.state.gamepadIndex === -1) {
        return;
      }

      const gamepad = navigator.getGamepads()[App.state.gamepadIndex];
      if (!gamepad) {
        App.Logger.error("vibrate: Gamepad not found");
        return;
      }

      if (gamepad.vibrationActuator && gamepad.vibrationActuator.playEffect) {
        gamepad.vibrationActuator.playEffect("dual-rumble", {
          duration: 150, // duration in milliseconds
          weakMagnitude: 1, // intensity (0-1) of the small ERM
          strongMagnitude: 1, // intesity (0-1) of the bigger ERM
        });
      }
    },

    Player: {
      playPause() {
        const currentVideo = App.Actions.getCurrentVideo();
        if (!currentVideo) {
          App.Logger.error("Player playPause: !currentVideo");
          return;
        }

        currentVideo.paused ? currentVideo.play() : currentVideo.pause();
        App.Actions.vibrate();
      },

      setTime(currentVideo, time) {
        let currentTime = currentVideo.currentTime; // Default HTML5 Video/Audio API — https://www.w3schools.com/tags/ref_av_dom.asp
        currentVideo.currentTime = currentTime + time;
      },

      seek(offset) {
        const currentVideo = App.Actions.getCurrentVideo();
        if (!currentVideo) {
          App.Logger.error("Player seek: !currentVideo");
          return;
        }

        App.Actions.Player.setTime(currentVideo, offset);
        App.Actions.vibrate();
      },

      like() {
        const likeButton = App.Actions.getLikeButton();
        if (!likeButton) {
          App.Logger.error("Player like: !likeButton");
          return;
        }

        likeButton.click();
        App.Actions.vibrate();
      },

      prev() {
        const currentContainer = App.Actions.getContainer();
        if (!currentContainer) {
          App.Logger.error("Player prev: !currentContainer");
          return;
        }

        const currentId = Number(currentContainer.id);
        if (Number.isNaN(currentId) || currentId <= 0) {
          App.Logger.error(`Player prev: Invalid container id -> ${currentContainer.id}`);
          return;
        }

        const prev = document.getElementById(currentId - 1);
        if (!prev) {
          App.Logger.error("Player prev: !prev");
          return;
        }

        App.state.seenReels.delete(prev);

        prev.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });

        App.Actions.vibrate();
      },

      next() {
        const currentContainer = App.Actions.getContainer();
        if (!currentContainer) {
          App.Logger.error("Player next: !currentContainer");
          return;
        }

        const currentId = Number(currentContainer.id);
        if (Number.isNaN(currentId)) {
          App.Logger.error(`Player next: Invalid container id -> ${currentContainer.id}`);
          return;
        }

        const next = document.getElementById(currentId + 1);
        if (!next) {
          App.Logger.error("Player next: !next");
          return;
        }

        next.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });

        App.Actions.vibrate();
      },
    },
  },
};

const BUTTON_T = {
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
  "use strict";

  /////////////////////
  // Button Bindings //
  /////////////////////

  const buttonBindings = [];

  buttonBindings[BUTTON_T.Y] = App.Actions.Player.like;
  buttonBindings[BUTTON_T.B] = App.Actions.Player.like;

  buttonBindings[BUTTON_T.LT] = App.Actions.Player.playPause;
  buttonBindings[BUTTON_T.RT] = App.Actions.Player.playPause;

  buttonBindings[BUTTON_T.X] = App.Actions.Player.prev;
  buttonBindings[BUTTON_T.A] = App.Actions.Player.next ;

  buttonBindings[BUTTON_T.ARROW_UP] = App.Actions.Player.prev;
  buttonBindings[BUTTON_T.ARROW_DOWN] = App.Actions.Player.next;

  buttonBindings[BUTTON_T.ARROW_LEFT] = () => App.Actions.Player.seek(-App.config.seekTime);
  buttonBindings[BUTTON_T.ARROW_RIGHT] = () => App.Actions.Player.seek(+App.config.seekTime);

  buttonBindings[BUTTON_T.LB] = () => App.Actions.Player.seek(-App.config.seekTime);
  buttonBindings[BUTTON_T.RB] = () => App.Actions.Player.seek(+App.config.seekTime);

  function handleButton(buttonIndex) {
    const binding = buttonBindings[buttonIndex];
    if (binding) binding();
  }

  ////////////////////
  // Buttons Worker //
  ////////////////////

  setInterval(() => {
    if (App.state.gamepadIndex === -1 || !App.Actions.validateURL()) {
        return;
    }

    const gamepad = navigator.getGamepads()[App.state.gamepadIndex];
    if (!gamepad) {
      App.Logger.error("setInterval: Gamepad not found");
      return;
    }

    for (let index = 0; index < gamepad.buttons.length; index++) {
      const isPressed = gamepad.buttons[index].pressed;
      if (isPressed) {
        if (App.state.pressedButtonIndex === -1) {
          App.Logger.debug(`Pressed Button Index: ${index}`);
          App.state.pressedButtonIndex = index;
          handleButton(index);
        }
      } else if (index === App.state.pressedButtonIndex) {
        App.state.pressedButtonIndex = -1;
      }
    }
  }, 50);

  ////////////////////
  // Event Listners //
  ////////////////////

  window.addEventListener("gamepadconnected", (event) => {
    if (!App.Actions.validateURL()) {
        return;
    }

    App.Logger.info(`Gamepad Connected; \nIndex: ${event.gamepad.index}; \nName: ${event.gamepad.id}`);
    App.state.gamepadIndex = event.gamepad.index;
    App.Actions.InitApp();
  });

  window.addEventListener("gamepaddisconnected", (event) => {
    if (!App.Actions.validateURL()) {
        return;
    }

    if (event.gamepad.index == App.state.gamepadIndex) {
      App.Logger.info(`Gamepad Disconnected; \nIndex: ${event.gamepad.index}; \nName: ${event.gamepad.id}`);
      App.state.gamepadIndex = -1;
      if (App.state.observer) {
        App.state.observer.disconnect();
      }
    }
  });
})();
