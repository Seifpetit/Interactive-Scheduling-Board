export const MENU_TYPES = {
  // ── scheduler (existing) ──
  SHIFT:       "SHIFT",
  SLOT:        "SLOT",
  ASSIGNMENT:  "ASSIGNMENT",
  EMPLOYEE:    "EMPLOYEE",

  // ── planner (new) ──
  TASK_CARD:   "TASK_CARD",   // right-click a card in the tray
  PLACED_TASK: "PLACED_TASK", // right-click a task placed on the calendar
};

export const MENU_SCHEMAS = {

  // ── scheduler ────────────────────────────────────────────────────────────

  [MENU_TYPES.SHIFT]: [
    { id: "changeSlotCount",       label: "Change slot count",    input: "number"    },
    { id: "openRequirementsPanel", label: "Set requirements",     requirements: true },
    { id: "toggleShiftLock",       label: "Lock / Unlock shift",  input: null        },
    { id: "deleteShift",           label: "Delete shift",         input: null        },
  ],

  [MENU_TYPES.SLOT]: [
    { id: "toggleSlotLock",   label: "Lock / Unlock slot",  input: null },
  ],

  [MENU_TYPES.ASSIGNMENT]: [
    { id: "toggleSlotLock",   label: "Lock / Unlock slot",  input: null },
    { id: "removeAssignment", label: "Remove assignment",   input: null },
  ],

  [MENU_TYPES.EMPLOYEE]: [
    { id: "renameEmployee",   label: "Rename employee",      input: "text" },
    {
      label: "Set role",
      options: [
        { id: "_back",          label: "Set role"  },
        { id: "setRoleKitchen", label: "Kitchen"   },
        { id: "setRoleCourier", label: "Courier"   },
      ],
    },
    { id: "openRestrictMode", label: "Restrict from slots…", input: null },
    { id: "removeEmployee",   label: "Remove employee",      input: null },
  ],

  // ── planner ──────────────────────────────────────────────────────────────

  [MENU_TYPES.TASK_CARD]: [
    { id: "renameTask",      label: "Rename task",      input: "text"   },
    { id: "setTaskDuration", label: "Set duration (h)", input: "number" },
    {
      label: "Set energy",
      options: [
        { id: "_back",           label: "Set energy" },
        { id: "setEnergyHigh",   label: "🔴  High"   },
        { id: "setEnergyMedium", label: "🟠  Medium"  },
        { id: "setEnergyLow",    label: "🟢  Low"     },
      ],
    },
    {
      label: "Set category",
      options: [
        { id: "_back",              label: "Set category" },
        { id: "setCategoryStudy",   label: "Study"        },
        { id: "setCategoryGym",     label: "Gym"          },
        { id: "setCategoryErrands", label: "Errands"      },
        { id: "setCategoryWork",    label: "Work"         },
        { id: "setCategoryHealth",  label: "Health"       },
        { id: "setCategorySocial",  label: "Social"       },
        { id: "setCategoryOther",   label: "Other"        },
      ],
    },
    { id: "removeTask", label: "Delete task", input: null },
  ],

  [MENU_TYPES.PLACED_TASK]: [
    { id: "unplace", label: "Remove from calendar", input: null },
  ],

};
