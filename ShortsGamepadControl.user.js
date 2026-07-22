// ==UserScript==
// @name         YouTube Shorts Gamepad Control
// @version      2.0.0
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
    seek_time: 3,
    vibrate: true,
    debug: true,
  },

  state: {
    observer: null,
    gamepad_index: -1,
    pressed_button_index: -1,
    seen_reels: null,
  },

  DOM: {
    like_button:
      "#experiment-overlay > ytd-reel-player-overlay-renderer > yt-reel-player-overlay-view-model > div.ytReelPlayerOverlayViewModelActionsContainer > reel-action-bar-view-model > like-button-view-model > toggle-button-view-model > button-view-model > label > button > yt-touch-feedback-shape > div",
    shorts_inner_container: "shorts-inner-container",
    video: "#shorts-player > div.html5-video-container > video",
    reel_video_in_sequence_new: "reel-video-in-sequence-new",
    reel_video_renderer: "#reel-video-renderer",
  },

  Logger: {
    debug(message) {
      if (App.config.debug) console.log(`[SGC] ${message}`);
    },
    info(message) {
      console.info(`[SGC] ${message}`);
    },
    error(message) {
      console.error(`[SGC] ${message}`);
    },
  },

  Actions: {
    ValidateURL() {
      // Tampermonkey's @match not gonna work with SPA
      return location.href.startsWith(`https://www.youtube.com/shorts/`);
    },

    GetReels() {
      const reels = document.getElementsByClassName(
        App.DOM.reel_video_in_sequence_new,
      );
      if (!reels || reels.length === 0) {
        App.Logger.error("GetReels: !reels");
        return null;
      }

      App.state.seen_reels = new WeakSet();

      for (let i = 0; i < reels.length; i++) {
        const reel = reels[i];
        if (
          !App.state.seen_reels.has(reel) &&
          reel.querySelector(App.DOM.reel_video_renderer)
        ) {
          App.state.seen_reels.add(reel);

          return reel;
        }
      }

      return null;
    },

    GetCurrentVideo() {
      const current_container = App.Actions.GetReels();
      if (!current_container) {
        App.Logger.error("GetCurrentVideo: !current_container");
        return null;
      }

      const video = current_container.querySelector(App.DOM.video);
      if (!video) {
        App.Logger.error("GetCurrentVideo: !video");
        return null;
      }

      return video;
    },

    GetLikeButton() {
      const current_container = App.Actions.GetReels();
      if (!current_container) {
        App.Logger.error("GetLikeButton: !current_container");
        return null;
      }

      const button = current_container.querySelector(App.DOM.like_button);
      if (!button) {
        App.Logger.error("GetLikeButton: !button");
        return null;
      }

      return button;
    },

    InitApp() {
      if (App.state.observer) App.state.observer.disconnect();

      App.state.observer = new MutationObserver(() => {
        App.Logger.debug("MutationObserver: DOM Changed");
      });

      const WaitForShortsContainer = setInterval(() => {
        const container = document.getElementById(
          App.DOM.shorts_inner_container,
        );
        if (container) {
          clearInterval(WaitForShortsContainer);
          App.state.observer.observe(container, {
            childList: true,
            subtree: true,
          });
        }
      }, 200);
    },

    Vibrate() {
      if (!App.config.vibrate || App.state.gamepad_index === -1) return;

      const gamepad = navigator.getGamepads()[App.state.gamepad_index];
      if (!gamepad) {
        App.Logger.error("Vibrate: Gamepad not found");
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
      PlayPause() {
        const current_video = App.Actions.GetCurrentVideo();
        if (!current_video) {
          App.Logger.error("Player PlayPause: !current_video");
          return;
        }

        current_video.paused ? current_video.play() : current_video.pause();
        App.Actions.Vibrate();
      },

      SetTime(current_video, time) {
        let current_time = current_video.currentTime; // Default HTML5 Video/Audio API — https://www.w3schools.com/tags/ref_av_dom.asp
        current_video.currentTime = current_time + time;
      },

      Next() {
        const current_container = App.Actions.GetReels();
        if (!current_container) {
          App.Logger.error("Player Next: !current_container");
          return;
        }

        const currentId = Number(current_container.id);
        if (Number.isNaN(currentId)) {
          App.Logger.error(
            `Player Next: Invalid container id -> ${current_container.id}`,
          );
          return;
        }

        const next = document.getElementById(currentId + 1);
        if (!next) {
          App.Logger.error("Player Next: !next");
          return;
        }

        next.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });

        App.Actions.Vibrate();
      },

      Prev() {
        const current_container = App.Actions.GetReels();
        if (!current_container) {
          App.Logger.error("Player Prev: !current_container");
          return;
        }

        const currentId = Number(current_container.id);
        if (Number.isNaN(currentId) || currentId <= 0) {
          App.Logger.error(
            `Player Prev: Invalid container id -> ${current_container.id}`,
          );
          return;
        }

        const prev = document.getElementById(currentId - 1);
        if (!prev) {
          App.Logger.error("Player Prev: !prev");
          return;
        }

        App.state.seen_reels.delete(prev);

        prev.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });

        App.Actions.Vibrate();
      },

      Like() {
        const like_button = App.Actions.GetLikeButton();
        if (!like_button) {
          App.Logger.error("Player Like: !LikeButton");
          return;
        }

        like_button.click();
        App.Actions.Vibrate();
      },

      Seek(offset) {
        const current_video = App.Actions.GetCurrentVideo();
        if (!current_video) {
          App.Logger.error("Player Seek: !current_video");
          return;
        }

        App.Actions.Player.SetTime(current_video, offset);
        App.Actions.Vibrate();
      },
    },
  },
};

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
  "use strict";

  /////////////////////
  // Button Bindings //
  /////////////////////

  const buttonBindings = [];

  buttonBindings[Button_t.Y] = App.Actions.Player.Like;

  buttonBindings[Button_t.LT] = App.Actions.Player.PlayPause;
  buttonBindings[Button_t.RT] = App.Actions.Player.PlayPause;
  
  buttonBindings[Button_t.X] = App.Actions.Player.Prev;
  buttonBindings[Button_t.A] = App.Actions.Player.Next;

  buttonBindings[Button_t.ARROW_UP] = App.Actions.Player.Prev;
  buttonBindings[Button_t.ARROW_DOWN] = App.Actions.Player.Next;

  buttonBindings[Button_t.ARROW_LEFT] = () => App.Actions.Player.Seek(-App.config.seek_time);
  buttonBindings[Button_t.ARROW_RIGHT] = () => App.Actions.Player.Seek(+App.config.seek_time);

  buttonBindings[Button_t.LB] = () => App.Actions.Player.Seek(-App.config.seek_time);
  buttonBindings[Button_t.RB] = () => App.Actions.Player.Seek(+App.config.seek_time);

  function HandleButton(buttonIndex) {
    const Binding = buttonBindings[buttonIndex];
    if (Binding) Binding();
  }

  ////////////////////
  // Buttons Worker //
  ////////////////////

  setInterval(() => {
    if (App.state.gamepad_index === -1 || !App.Actions.ValidateURL()) return;

    const gamepad = navigator.getGamepads()[App.state.gamepad_index];
    if (!gamepad) {
      App.Logger.error("setInterval: Gamepad not found");
      return;
    }

    for (let index = 0; index < gamepad.buttons.length; index++) {
      const isPressed = gamepad.buttons[index].pressed;
      if (isPressed) {
        if (App.state.pressed_button_index === -1) {
          App.Logger.debug(`Pressed Button Index: ${index}`);
          App.state.pressed_button_index = index;
          HandleButton(index);
        }
      } else if (index === App.state.pressed_button_index) {
        App.state.pressed_button_index = -1;
      }
    }
  }, 50);

  ////////////////////
  // Event Listners //
  ////////////////////

  window.addEventListener("gamepadconnected", (event) => {
    if (!App.Actions.ValidateURL()) return;

    App.Logger.info(
      `Gamepad Connected; \nIndex: ${event.gamepad.index}; \nName: ${event.gamepad.id}`,
    );

    App.state.gamepad_index = event.gamepad.index;
    App.Actions.InitApp();
  });

  window.addEventListener("gamepaddisconnected", (event) => {
    if (!App.Actions.ValidateURL()) return;

    if (event.gamepad.index == App.state.gamepad_index) {
      App.Logger.info(
        `Gamepad Disconnected; \nIndex: ${event.gamepad.index}; \nName: ${event.gamepad.id}`,
      );

      App.state.gamepad_index = -1;
      if (App.state.observer) App.state.observer.disconnect();
    }
  });
})();
