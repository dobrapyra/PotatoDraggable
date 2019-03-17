import Point from './point';

class PotatoDraggable {
  constructor() {
    this.draggableAttr = 'data-pd-draggable-item';
    this.containerAttr = 'data-pd-drop-container';
    this.duration = 300;
    this.dragDelay = {
      mouse: 0,
      touch: 200,
    };
    this.cancelThreshold = 4;

    this.dragEl = null;
    this.dropEl = null;
    this.ghostEl = null;

    this.groupId = '';

    this.dragging = false;
    this.touchTimeout = null;
    this.startPoint = null;
    this.movePoint = null;

    
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);

    this.onDragTimeout = this.onDragTimeout.bind(this);

    this.eventOptions = this.getEventOptions();
    
    this.body = document.body;
    this.scrollEl = document.scrollingElement || document.documentElement || document;

    this.bindPassiveEvents();
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

  getMidpoint(el) {
    const elRect = this.getRect(el);
    return new Point(elRect.width / 2 + elRect.x, elRect.height / 2 + elRect.y);
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

  each(array, fn) {
    const length = array.length;
    for (let i = 0; i < length; i++) {
      const result = fn(array[i], i);
      if (result === true) continue;
      if (result === false) break;
    }
  }

  eachInContainers(containers, dropElFn, dragElFn) {
    this.each(containers, container => {
      dropElFn(container);
      this.each(container.children, el => {
        dragElFn(el);
      });
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
    return this.closestByAttr(el, this.containerAttr, groupId);
  }

  closestDraggable(el, groupId) {
    return this.closestByAttr(el, this.draggableAttr, groupId);
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

    this.bindActiveEvents();
    this.dragTimeout = setTimeout(this.onDragTimeout, this.dragDelay[type]);
  }

  onDragMove(e) {
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

    this.ghostEl.setAttribute('data-pd-ghost', '');
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
    this.groupId = this.dragEl.getAttribute(this.draggableAttr);
    if (this.groupId === null) return; // probably not necessary

    this.dragging = true;

    this.dropEl = this.closestContainer(this.dragEl);
    if (this.movePoint) this.startPoint = this.movePoint;

    this.createGhost();

    // reset after animation
    this.dropEl.style.transition = '';
    this.dropEl.style.height = '';
    this.dropEl.style.width = '';

    this.dragEl.setAttribute('data-pd-drag', '');
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

      this.beforeSwap([dropEl, prevDropEl]);
      this.dropEl.appendChild(this.dragEl);
      this.afterSwap([dropEl, prevDropEl]);
      return;
    }

    const dragEl = this.closestDraggable(overEl);
    if (!dragEl) return;

    // the same dragEl
    if (dragEl === this.dragEl) return;

    // other dropEl, it should be the same
    if (dragEl.parentElement !== this.dropEl ) return;

    const nextEl = dragEl.nextElementSibling;
    const siblingEl = nextEl || dragEl.previousElementSibling;
    if (!siblingEl) return;

    const dragMidpoint = this.getMidpoint(dragEl);
    const diff = this.getMidpoint(siblingEl).diff(dragMidpoint);
    const axis = Math.abs(diff.x) > Math.abs(diff.y) ? 'x' : 'y';

    if (this.movePoint[axis] < dragMidpoint[axis]) {
      // prevent unnecessary insert
      if (this.dragEl.nextElementSibling === dragEl) return;

      this.beforeSwap([dropEl]);
      this.dropEl.insertBefore(this.dragEl, dragEl);
      this.afterSwap([dropEl]);
      return;
    }

    if (nextEl) {
      // prevent unnecessary insert
      if (this.dragEl === nextEl) return;

      this.beforeSwap([dropEl]);
      this.dropEl.insertBefore(this.dragEl, nextEl);
      this.afterSwap([dropEl]);
      return;
    }

    // the last in container
    this.beforeSwap([dropEl]);
    this.dropEl.appendChild(this.dragEl);
    this.afterSwap([dropEl]);
  }

  dragEnd() {
    this.dragging = false;
    this.startPoint = null;
    this.movePoint = null;

    this.groupId = '';

    this.destroyGhost();

    this.dragEl.removeAttribute('data-pd-drag');
    this.dragEl = null;
    this.dropEl = null;
  }

  beforeSwap(containers) {
    const getRect = this.getRect.bind(this);

    this.eachInContainers(containers, dropEl => {
      dropEl._pd_elRect = getRect(dropEl);
    }, dragEl => {
      dragEl._pd_elRect = getRect(dragEl);
    });
  }

  afterSwap(containers) {
    const getRectDiff = this.getRectDiff.bind(this), getRect = this.getRect.bind(this);

    clearTimeout(this.animationTimeout);

    this.eachInContainers(containers, dropEl => {
      const elRect = getRect(dropEl);
      dropEl.style.transition = 'none';
      if (elRect.height !== dropEl._pd_elRect.height) {
        dropEl.style.height = `${dropEl._pd_elRect.height}px`;
        dropEl._pd_animation = true;
      }
      if (elRect.width !== dropEl._pd_elRect.width) {
        dropEl.style.width = `${dropEl._pd_elRect.width}px`;
        dropEl._pd_animation = true;
      }
      dropEl._pd_elRect = elRect;
    }, dragEl => {
      if (!dragEl._pd_elRect) return true;
      const elRectDiff = getRectDiff(dragEl, dragEl._pd_elRect);
      dragEl.style.transition = 'none';
      if (elRectDiff.y !== 0 || elRectDiff.x !== 0) {
        dragEl.style.transform = `translate(${elRectDiff.x}px, ${elRectDiff.y}px)`;
        dragEl._pd_animation = true;
      }
      dragEl._pd_elRect = undefined;
    });

    this.dropEl.offsetWidth; // force reflow

    this.eachInContainers(containers, dropEl => {
      if (dropEl._pd_animation) {
        dropEl.style.transition = `height ${this.duration}ms ease-out, width ${this.duration}ms ease-out`;
        dropEl.style.height = `${dropEl._pd_elRect.height}px`;
        dropEl.style.width = `${dropEl._pd_elRect.width}px`;
        dropEl._pd_animation = undefined;
      }
      dropEl._pd_elRect = undefined;
    }, dragEl => {
      if (dragEl._pd_animation) {
        dragEl.style.transition = `transform ${this.duration}ms ease-out`;
        dragEl.style.transform = 'translate(0, 0)';
        dragEl._pd_animation = undefined;
      }
    });

    this.animationTimeout = setTimeout(() => {
      this.eachInContainers(containers, dropEl => {
        dropEl.style.transition = '';
        dropEl.style.height = '';
        dropEl.style.width = '';
      }, dragEl => {
        dragEl.style.transition = '';
        dragEl.style.transform = '';
      });
    }, this.duration);
  }
}

export default PotatoDraggable;
