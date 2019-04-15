import Point from './point';

class PotatoDraggable {
  constructor(props = {}) {
    this.setConfig(props);
    this.setEvents(props);

    this.dataTransfer = {};

    this.dragEl = null;
    this.dropEl = null;
    this.swapEl = null;
    this.ghostEl = null;

    this.swapDir = 0;
    this.groupId = '';

    this.dragging = false;
    this.touchTimeout = null;
    this.startPoint = null;
    this.movePoint = null;
    this.swapPoint = null;

    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);

    this.onDragTimeout = this.onDragTimeout.bind(this);

    this.beforeDropElAnim = this.beforeDropElAnim.bind(this);
    this.beforeDragElAnim = this.beforeDragElAnim.bind(this);
    this.prepareDropElAnim = this.prepareDropElAnim.bind(this);
    this.prepareDragElAnim = this.prepareDragElAnim.bind(this);
    this.startDropElAnim = this.startDropElAnim.bind(this);
    this.startDragElAnim = this.startDragElAnim.bind(this);

    this.eventOptions = this.getEventOptions();

    this.body = document.body;
    this.scrollEl = document.scrollingElement || document.documentElement || document;

    this.bindPassiveEvents();
  }

  setConfig(props) {
    this.attr = Object.assign({
      draggable: 'data-pd-draggable-item',
      container: 'data-pd-drop-container',
      drag: 'data-pd-drag',
      ghost: 'data-pd-ghost',
    }, props.attr);
    this.duration = props.duration !== undefined ? props.duration : 300;
    this.animate = this.duration > 0;
    this.dragDelay = Object.assign({
      mouse: 0,
      touch: 200,
    }, props.dragDelay);
    this.cancelThreshold = props.cancelThreshold || 4;
  }

  setEvents(props) {
    const events = props.events || {};
    const noop = () => {};

    /**
     * @function onGrab
     * @param {Element} dropEl
     * @param {Element} dragEl
     * @param {object} dataTransfer
     */
    this.handleGrab = events.onGrab || noop;

    /**
     * @function onDrop
     * @param {Element} dropEl
     * @param {Element} dragEl
     * @param {object} dataTransfer
     */
    this.handleDrop = events.onDrop || noop;

    /**
     * @function onSwap
     * @param {Element} dropEl
     * @param {Element} dragEl
     * @param {object} dataTransfer
     * @param {number} prevIndex
     * @param {number} nextIndex
     */
    this.handleSwap = events.onSwap || noop;

    /**
     * @function onAppend
     * @param {Element} dropEl
     * @param {Element} dragEl
     * @param {object} dataTransfer
     */
    this.handleAppend = events.onAppend || noop;

    /**
     * @function onRemove
     * @param {Element} dropEl
     * @param {Element} dragEl
     * @param {object} dataTransfer
     * @param {number} elIndex
     */
    this.handleRemove = events.onRemove || noop;

    /**
     * @function onAppendChild
     * @param {Element} dropEl
     * @param {Element} dragEl
     */
    this.handleAppendChild = events.onAppendChild || ((dropEl, dragEl) => {
      dropEl.appendChild(dragEl);
    });

    /**
     * @function onRemoveChild
     * @param {Element} dropEl
     * @param {Element} dragEl
     */
    this.handleRemoveChild = events.onRemoveChild || ((dropEl, dragEl) => {
      dropEl.removeChild(dragEl);
    });

    /**
     * @function onInsertBefore
     * @param {Element} dropEl
     * @param {Element} dragEl
     * @param {Element} relEl
     */
    this.handleInsertBefore = events.onInsertBefore || ((dropEl, dragEl, relEl) => {
      dropEl.insertBefore(dragEl, relEl);
    });
  }

  getEventOptions() {
    let passiveSupport = false;
    try {
      const cb = () => {};
      const opt = Object.defineProperty({}, 'passive', {
        get() { passiveSupport = true; return true; }
      });
      window.addEventListener('check-passive', cb, opt);
      window.removeEventListener('check-passive', cb, opt);
    } catch (e) { passiveSupport = false; }
    return passiveSupport ? { passive: false } : false;
  }

  getPoint(e) {
    let point = e.touch || (e.touches ? e.touches[ 0 ] : false);
    if (!point) point = e;
    return new Point(point.clientX, point.clientY);
  }

  getRect(el) {
    const rect = el.getBoundingClientRect();
    return {
      x: rect.x || rect.left,
      y: rect.y || rect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  getRectDiff(el, elRect) {
    const rect = this.getRect(el);
    return {
      x: elRect.x - rect.x,
      y: elRect.y - rect.y,
      width: elRect.width - rect.width,
      height: elRect.height - rect.height,
    };
  }

  pointToEl(point) {
    return document.elementFromPoint(point.x, point.y);
  }

  getIndex(el) {
    let index = -1;
    for (;el;) {
      index++;
      el = el.previousElementSibling;
    }
    return index;
  }

  each(array, fn) {
    const length = array.length;
    for (let i = 0; i < length; i++) {
      const result = fn(array[i], i);
      if (result === true) continue;
      if (result === false) break;
    }
  }

  eachInDropEl(dropEl, dropElFn, dragElFn) {
    dropElFn(dropEl);
    this.each(dropEl.children, dragEl => {
      dragElFn(dragEl);
    });
  }

  closest(el, match) {
    for (;el;) {
      if (match(el)) return el;
      el = el.parentElement;
    }
    return null;
  }

  closestByAttr(el, attrName, attrValue) {
    return this.closest(el, (el) => {
      const attr = el.getAttribute(attrName);
      return attrValue ? attr === attrValue : attr !== null;
    });
  }

  closestContainer(el, groupId) {
    return this.closestByAttr(el, this.attr.container, groupId);
  }

  closestDraggable(el, groupId) {
    return this.closestByAttr(el, this.attr.draggable, groupId);
  }

  addEvent(eventName, eventFunction) {
    document.addEventListener(eventName, eventFunction, this.eventOptions);
  }

  removeEvent(eventName, eventFunction) {
    document.removeEventListener(eventName, eventFunction, this.eventOptions);
  }

  bindPassiveEvents() {
    this.addEvent('mousedown', this.onMouseDown);
    this.addEvent('touchstart', this.onTouchStart);
  }

  bindActiveEvents() {
    this.addEvent('mousemove', this.onMouseMove);
    this.addEvent('mouseup', this.onMouseUp);
    this.addEvent('touchmove', this.onTouchMove);
    this.addEvent('touchend', this.onTouchEnd);
  }

  unbindActiveEvents() {
    this.removeEvent('mousemove', this.onMouseMove);
    this.removeEvent('mouseup', this.onMouseUp);
    this.removeEvent('touchmove', this.onTouchMove);
    this.removeEvent('touchend', this.onTouchEnd);
  }

  onMouseDown(e) {
    this.onDragStart(e, 'mouse');
  }

  onMouseMove(e) {
    this.onDragMove(e, 'mouse');
  }

  onMouseUp(e) {
    this.onDragEnd(e, 'mouse');
  }

  onTouchStart(e) {
    this.onDragStart(e, 'touch');
  }

  onTouchMove(e) {
    this.onDragMove(e, 'touch');
  }

  onTouchEnd(e) {
    this.onDragEnd(e, 'touch');
  }

  onDragTimeout() {
    this.dragStart();
  }

  onDragStart(e, type) {
    const point = this.getPoint(e);

    const dragEl = this.closestDraggable(this.pointToEl(point));
    if (!dragEl) return;

    this.dragEl = dragEl;
    this.startPoint = point;
    this.movePoint = point;

    this.bindActiveEvents();
    this.dragTimeout = setTimeout(this.onDragTimeout, this.dragDelay[type]);
  }

  onDragMove(e) {
    this.swapPoint = this.movePoint;
    this.movePoint = this.getPoint(e);

    if (!this.dragging) {
      if (this.startPoint.checkAxisOffset(this.movePoint, this.cancelThreshold)) {
        this.onDragEnd(e);
      }

      return;
    }

    e.preventDefault();
    this.dragMove();
  }

  onDragEnd() {
    clearTimeout(this.dragTimeout);
    this.unbindActiveEvents();
    this.dragEnd();
  }

  createGhost() {
    if (this.dragEl === null) return;

    const dragElRect = this.getRect(this.dragEl);
    this.ghostEl = this.dragEl.cloneNode(true);
    this.ghostEl.style.position = 'absolute';
    this.ghostEl.style.top = `${(dragElRect.y - this.startPoint.y)}px`;
    this.ghostEl.style.left = `${(dragElRect.x - this.startPoint.x)}px`;
    this.ghostEl.style.width = `${dragElRect.width}px`;
    this.ghostEl.style.height = `${dragElRect.height}px`;
    this.ghostEl.style.pointerEvents = 'none';

    // reset after animation
    this.ghostEl.style.transition = '';
    this.ghostEl.style.transform = '';

    this.updateGhostPosition(this.startPoint);

    this.body.appendChild(this.ghostEl);

    this.ghostEl.setAttribute(this.attr.ghost, '');
  }

  updateGhostPosition(point) {
    const newPoint = new Point(this.scrollEl.scrollLeft, this.scrollEl.scrollTop).add(point);
    this.ghostEl.style.transform = `translate(${newPoint.x}px, ${newPoint.y}px)`;
  }

  destroyGhost() {
    if (this.ghostEl === null) return;

    this.body.removeChild(this.ghostEl);

    this.ghostEl = null;
  }

  dragStart() {
    this.groupId = this.dragEl.getAttribute(this.attr.draggable);
    if (this.groupId === null) return; // probably not necessary

    this.dragging = true;

    this.dropEl = this.closestContainer(this.dragEl);
    if (this.movePoint) this.startPoint = this.movePoint;

    this.handleGrab(this.dropEl, this.dragEl, this.dataTransfer);

    this.createGhost();

    // reset after animation
    this.dropEl.style.transition = '';
    this.dropEl.style.height = '';
    this.dropEl.style.width = '';

    this.dragEl.setAttribute(this.attr.drag, '');
  }

  dragMove() {
    this.updateGhostPosition(this.movePoint);

    const overEl = this.pointToEl(this.movePoint);

    const dropEl = this.closestContainer(overEl, this.groupId);
    if (!dropEl) return;

    // dropEl inside dragEl
    if (this.closest(dropEl, el => el === this.dragEl)) return;

    // other dropEl
    if (dropEl !== this.dropEl) {
      const prevDropEl = this.dropEl;
      this.dropEl = dropEl;

      if (this.animate) this.beforeSwap(prevDropEl);
      if (this.animate) this.beforeSwap(dropEl);
      this.handleRemove(prevDropEl, this.dragEl, this.dataTransfer, this.getIndex(this.dragEl));
      this.handleRemoveChild(prevDropEl, this.dragEl);
      this.handleAppend(dropEl, this.dragEl, this.dataTransfer);
      this.handleAppendChild(dropEl, this.dragEl);
      if (this.animate) this.afterSwap(prevDropEl);
      if (this.animate) this.afterSwap(dropEl);
      return;
    }

    const dragEl = this.closestDraggable(overEl);
    if (!dragEl) return;

    // the same dragEl
    if (dragEl === this.dragEl) return;

    // other dropEl, it should be the same
    if (dragEl.parentElement !== this.dropEl) return;

    const rectDiff = this.getRectDiff(this.dragEl, this.getRect(dragEl));
    const axis = Math.abs(rectDiff.x) > Math.abs(rectDiff.y) ? 'x' : 'y';
    const diff = this.swapPoint.diff(this.movePoint);
    const dir = Math.abs(diff[axis]) / diff[axis];
    if (dragEl === this.swapEl && this.swapDir === dir) return;

    this.swapEl = dragEl;
    this.swapDir = dir;

    const prevIndex = this.getIndex(this.dragEl);
    const dragIndex = this.getIndex(dragEl);
    if (dragIndex < prevIndex) {
      // prevent unnecessary insert
      if (this.dragEl.nextElementSibling === dragEl) return;

      // move up
      if (this.animate) this.beforeSwap(dropEl);
      this.handleSwap(dropEl, this.dragEl, this.dataTransfer, prevIndex, dragIndex);
      this.handleInsertBefore(dropEl, this.dragEl, dragEl);
      if (this.animate) this.afterSwap(dropEl);
      return;
    }

    const nextEl = dragEl.nextElementSibling;
    if (nextEl) {
      // prevent unnecessary insert
      if (this.dragEl === nextEl) return;

      // move down
      if (this.animate) this.beforeSwap(dropEl);
      this.handleSwap(dropEl, this.dragEl, this.dataTransfer, prevIndex, dragIndex);
      this.handleInsertBefore(dropEl, this.dragEl, nextEl);
      if (this.animate) this.afterSwap(dropEl);
      return;
    }

    // the last in container
    if (this.animate) this.beforeSwap(dropEl);
    this.handleSwap(dropEl, this.dragEl, this.dataTransfer, prevIndex, dragIndex);
    this.handleAppendChild(dropEl, this.dragEl);
    if (this.animate) this.afterSwap(dropEl);
  }

  dragEnd() {
    this.dragging = false;
    this.startPoint = null;
    this.movePoint = null;
    this.swapPoint = null;

    this.swapDir = 0;
    this.groupId = '';

    this.dragEl.removeAttribute(this.attr.drag);

    this.destroyGhost();

    this.handleDrop(this.dropEl, this.dragEl, this.dataTransfer);

    this.dataTransfer = {};

    this.dragEl = null;
    this.dropEl = null;
    this.swapEl = null;
  }

  beforeSwap(dropEl) {
    this.eachInDropEl(dropEl, this.beforeDropElAnim, this.beforeDragElAnim);
  }

  afterSwap(dropEl) {
    this.eachInDropEl(dropEl, this.prepareDropElAnim, this.prepareDragElAnim);
    this.dropEl.offsetWidth; // force reflow
    this.eachInDropEl(dropEl, this.startDropElAnim, this.startDragElAnim);
  }

  beforeDropElAnim(dropEl) {
    clearTimeout(dropEl._pd_animTimeout);
    dropEl._pd_elRect = this.getRect(dropEl);
  }

  beforeDragElAnim(dragEl) {
    dragEl._pd_elRect = this.getRect(dragEl);
  }

  prepareDropElAnim(dropEl) {
    dropEl.style.transition = 'none';

    // reflow
    const elRect = this.getRect(dropEl);

    if (elRect.height !== dropEl._pd_elRect.height) {
      dropEl.style.height = `${dropEl._pd_elRect.height}px`;
      dropEl._pd_animation = true;
    }

    if (elRect.width !== dropEl._pd_elRect.width) {
      dropEl.style.width = `${dropEl._pd_elRect.width}px`;
      dropEl._pd_animation = true;
    }

    dropEl._pd_elRect = elRect;
  }

  prepareDragElAnim(dragEl) {
    if (!dragEl._pd_elRect) return true;

    dragEl.style.transition = 'none';
    dragEl.style.pointerEvents = '';

    // reflow
    const elRectDiff = this.getRectDiff(dragEl, dragEl._pd_elRect);

    if (elRectDiff.y !== 0 || elRectDiff.x !== 0) {
      dragEl.style.transform = `translate(${elRectDiff.x}px, ${elRectDiff.y}px)`;
      dragEl._pd_animation = true;
    }

    dragEl._pd_elRect = undefined;
  }

  startDropElAnim(dropEl) {
    if (dropEl._pd_animation) {
      dropEl.style.transition = `height ${this.duration}ms ease-out, width ${this.duration}ms ease-out`;
      dropEl.style.height = `${dropEl._pd_elRect.height}px`;
      dropEl.style.width = `${dropEl._pd_elRect.width}px`;
      dropEl._pd_animation = undefined;
    }

    dropEl._pd_animTimeout = setTimeout(this.getDropElAnimTimeout(dropEl), this.duration);
    dropEl._pd_elRect = undefined;
  }

  startDragElAnim(dragEl) {
    if (dragEl._pd_animation) {
      dragEl.style.transition = `transform ${this.duration}ms ease-out`;
      dragEl.style.transform = 'translate(0, 0)';
      dragEl.style.pointerEvents = 'none';
      dragEl._pd_animation = undefined;
    }
  }

  getDropElAnimTimeout(dropEl) {
    return () => {
      dropEl.style.transition = '';
      dropEl.style.height = '';
      dropEl.style.width = '';
      dropEl._pd_animTimeout = undefined;

      this.each(dropEl.children, dragEl => {
        dragEl.style.transition = '';
        dragEl.style.transform = '';
        dragEl.style.pointerEvents = '';
      });
    };
  }
}

export default PotatoDraggable;
