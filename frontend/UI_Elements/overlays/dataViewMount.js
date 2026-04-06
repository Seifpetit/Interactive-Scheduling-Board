// dataViewMount.js
// Mounts and unmounts the React DataView overlay over the grid area.
// React reads R.appState live via polling.

import { R } from "../../core/runtime.js";

let _root = null;
let _container = null;

export function mountDataView(gridRect) {
  if (_container) return; // already mounted

  _container = document.createElement("div");
  _container.id = "data-view-root";

  Object.assign(_container.style, {
    position:        "fixed",
    left:            gridRect.x + "px",
    top:             gridRect.y + "px",
    width:           gridRect.w + "px",
    height:          gridRect.h + "px",
    zIndex:          "500",
    pointerEvents:   "auto",
    overflow:        "hidden",
    borderRadius:    "12px",
  });

  document.body.appendChild(_container);

  // Dynamically import React + DataView to keep it out of the main bundle
  import("./DataView.jsx").then(({ DataView }) => {
    import("react-dom/client").then(({ createRoot }) => {
      _root = createRoot(_container);
      _root.render(
        window.React.createElement(DataView, { R })
      );
    });
  });
}

export function unmountDataView() {
  if (!_container) return;
  _root?.unmount();
  _container.remove();
  _root = null;
  _container = null;
}

export function resizeDataView(gridRect) {
  if (!_container) return;
  Object.assign(_container.style, {
    left:   gridRect.x + "px",
    top:    gridRect.y + "px",
    width:  gridRect.w + "px",
    height: gridRect.h + "px",
  });
}
