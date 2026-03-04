import { R } from "./runtime.js";

export const commands = {


  rename(employeeId, newName) {
    const employees = R.appState.employees;
   
    for(const emp of employees){
      if(emp.id === employeeId) emp.name = newName;
    }

  },

  assign(employeeId, slotId) {

    if (!R.appState.draft) {
      R.appState.draft = { assignments: {} };
    }

    R.appState.draft.assignments[slotId] = employeeId;

    console.log("Assigned:", employeeId, "→", slotId);
  },

  unassign(slotId) {

    if (!R.appState.draft?.assignments) return;

    delete R.appState.draft.assignments[slotId];
  },

  generate() {

    console.log("Generate clicked");

    // V0: dummy fill
    if (!R.appState.draft) {
      R.appState.draft = { assignments: {} };
    }

    const employees = R.appState.employees;

    let index = 0;

    for (let day = 0; day < 7; day++) {
      for (let shift of ["lunch", "dinner"]) {
        for (let slot = 0; slot < 3; slot++) {

          const slotId = `${day}_${shift}_${slot}`;

          const employee = employees[index % employees.length];

          R.appState.draft.assignments[slotId] = employee.id;

          index++;
        }
      }
    }
  }

};