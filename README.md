# PotatoDraggable
Drag & drop with touch devices support.

Demo: [https://dobrapyra.github.io/PotatoDraggable/](https://dobrapyra.github.io/PotatoDraggable/)

## Usage

### HTML

```html
<div data-pd-drop-container="group-name">
  <div data-pd-draggable-item="group-name">item 1</div>
  <div data-pd-draggable-item="group-name">Item 2</div>
</div>
```

### JS

```js
new Draggable();
```
  
## Options

All available options with their default values:

```js
new Draggable({
  attr: {
    draggable: 'data-pd-draggable-item',
    container: 'data-pd-drop-container',
    drag: 'data-pd-drag',
    ghost: 'data-pd-ghost',
  },
  duration: 300,
  dragDelay: {
    mouse: 0,
    touch: 200,
  },
  cancelThreshold: 4,
  events: {
    onGrab: (dropEl, dragEl) => {},
    onDrop: (dropEl, dragEl) => {},
    onSwap: (dropEl, dragEl, prevIndex, nextIndex) => {},
    onAppend: (dropEl, dragEl) => {},
    onRemove: (dropEl, dragEl, elIndex) => {},
    onAppendChild: (dropEl, dragEl) => {
      dropEl.appendChild(dragEl);
    },
    onRemoveChild: (dropEl, dragEl) => {
      dropEl.removeChild(dragEl);
    },
    onInsertBefore: (dropEl, dragEl, relEl) => {
      dropEl.insertBefore(dragEl, relEl);
    },
  },
});
```

## Events

### Custom events

These functions can be used to bind drag & drop actions with data manipulation.  
They can also be used to custom DOM manipulation.  

* onGrab
  ```js
  /**
   * @function onGrab
   * @param {Element} dropEl
   * @param {Element} dragEl
   * @param {object} dataTransfer
   */
  (dropEl, dragEl, dataTransfer) => {}
  ```

* onDrop
  ```js
  /**
   * @function onDrop
   * @param {Element} dropEl
   * @param {Element} dragEl
   * @param {object} dataTransfer
   */
  (dropEl, dragEl, dataTransfer) => {}
  ```

* onSwap
  ```js
  /**
   * @function onSwap
   * @param {Element} dropEl
   * @param {Element} dragEl
   * @param {object} dataTransfer
   * @param {number} prevIndex
   * @param {number} nextIndex
   */
  (dropEl, dragEl, dataTransfer, prevIndex, nextIndex) => {}
  ```

* onAppend
  ```js
  /**
   * @function onAppend
   * @param {Element} dropEl
   * @param {Element} dragEl
   * @param {object} dataTransfer
   */
  (dropEl, dragEl, dataTransfer) => {}
  ```

* onRemove
  ```js
  /**
   * @function onRemove
   * @param {Element} dropEl
   * @param {Element} dragEl
   * @param {object} dataTransfer
   * @param {number} elIndex
   */
  (dropEl, dragEl, dataTransfer, elIndex) => {}
  ```

### Internal DOM manipulation events

By default these functions are used internaly to manipulate DOM and animate items with CSS transitions.  

* onAppendChild
  ```js
  /**
   * @function onAppendChild
   * @param {Element} dropEl
   * @param {Element} dragEl
   */
  (dropEl, dragEl) => {
    dropEl.appendChild(dragEl);
  }
  ```

* onRemoveChild
  ```js
  /**
   * @function onRemoveChild
   * @param {Element} dropEl
   * @param {Element} dragEl
   */
  onRemoveChild: (dropEl, dragEl) => {
    dropEl.removeChild(dragEl);
  }
  ```

* onInsertBefore
  ```js
  /**
  * @function onInsertBefore
  * @param {Element} dropEl
  * @param {Element} dragEl
  * @param {Element} relEl
  */
  onInsertBefore: (dropEl, dragEl, relEl) => {
    dropEl.insertBefore(dragEl, relEl);
  }
  ```

If you don't need internal DOM manipulation overwrite these functions by empty function:  
```js
() => {}
```
If you do this then remember to set `duration: 0` to completely turn off internal CSS transition mechanism.  