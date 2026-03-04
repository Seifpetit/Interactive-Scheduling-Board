export const R = {

  enginePhase: "boot", // "boot" | "ready" | "interaction"

  appState: {
    
  },

  input: {

    mouse: {
      x: 0,
      y: 0,
      pressed: false,
      prevPressed: false,
      justPressed: false,
      justReleased: false
    },

    keyboard: {
      pressed: false,
      prevPressed: false,
      justPressed: false,
      justReleased: false,
      key: null,
      code: null,
      shift: false,
      ctrl: false,
      alt: false
     },

    touch: {},
  },

  geometry: {
    window: {},
    schedule: {},
  },

  ui: {
    activeEmployeeCard: null,
  },

  assets: {
    fonts: {},
  }

};