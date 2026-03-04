// menuSchemas.js

export const MENU_TYPES = {
  SHIFT: "SHIFT",
  SLOT: "SLOT",
  ASSIGNMENT: "ASSIGNMENT",
  EMPLOYEE: "EMPLOYEE"
};

export const MENU_SCHEMAS = {

  [MENU_TYPES.SHIFT]: [
    {
      id: "changeSlotCount",
      label: "Change slot count",
      input: "number"
    },
    {
      id: "renameShift",
      label: "Rename shift",
      input: "text"
    },
    {
      id: "deleteShift",
      label: "Delete shift",
      input: null
    }
  ],

  [MENU_TYPES.SLOT]: [
    {
      id: "clearSlot",
      label: "Clear slot",
      input: null
    },
    {
      id: "toggleLock",
      label: "Lock / Unlock slot",
      input: null
    },
    {
      id: "toggleUnavailable",
      label: "Mark unavailable",
      input: null
    }
  ],

  [MENU_TYPES.ASSIGNMENT]: [
    {
      id: "removeAssignment",
      label: "Remove assignment",
      input: null
    },
    {
      id: "activateSwapMode",
      label: "Swap with...",
      input: null
    },
     {
      id: "setConstraint",
      label: "set constraint",
      input: true
    },
    
  ],

  [MENU_TYPES.EMPLOYEE]: [
    {
      id: "renameEmployee",
      label: "Rename employee",
      input: "text"
    },
    {
      id: "removeEmployee",
      label: "Remove employee",
      input: null
    }
  ]

};