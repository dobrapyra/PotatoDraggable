import Point from './point';

class PotatoDraggable {
  constructor() {
    this.dragEl = null;
    this.dropEl = null;
    this.ghostEl = null;

    this.dragging = false;
    this.touchTimeout = null;
    this.startPoint = null;
    this.movePoint = null;

    this.onTouchTimeout = this.onTouchTimeout.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);

    this.eventOptions = this.getEventOptions();
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

  closest(el, match) {
    for (;el && el !== document;) {
      if (match(el)) return el;
      el = el.parentNode;
    }
    return null;
  }

  getPoint(e) {
    let point = e.touch || (e.touches ? e.touches[ 0 ] : false);
    if (!point) point = e;
    return new Point(point.clientX, point.clientY);
  }

  getRect(el) {
    return el.getBoundingClientRect();
  }

  getMidpoint(el) {
    const elRect = this.getRect(el);
    return new Point(elRect.width / 2 + elRect.x, elRect.height / 2 + elRect.y);
  }

  pointToEl(point) {
    return document.elementFromPoint(point.x, point.y);
  }

  closestContainer(el) {
    return this.closest(el, el => el.hasAttribute('data-pd-drop-container'));
  }

  closestDraggable(el) {
    return this.closest(el, el => el.hasAttribute('data-pd-draggable-item'));
  }

  bindPassiveEvents() {
    document.addEventListener('mousedown', this.onMouseDown, this.eventOptions);
    document.addEventListener('touchstart', this.onTouchStart, this.eventOptions);
  }

  bindActiveEvents() {
    document.addEventListener('mousemove', this.onMouseMove, this.eventOptions);
    document.addEventListener('mouseup', this.onMouseUp, this.eventOptions);
    document.addEventListener('touchmove', this.onTouchMove, this.eventOptions);
    document.addEventListener('touchend', this.onTouchEnd, this.eventOptions);
  }

  unbindActiveEvents() {
    document.removeEventListener('mousemove', this.onMouseMove, this.eventOptions);
    document.removeEventListener('mouseup', this.onMouseUp, this.eventOptions);
    document.removeEventListener('touchmove', this.onTouchMove, this.eventOptions);
    document.removeEventListener('touchend', this.onTouchEnd, this.eventOptions);
  }

  onMouseDown(e) {
    const point = this.getPoint(e);

    const dragEl = this.closestDraggable(this.pointToEl(point));
    if (!dragEl) return;

    this.dragEl = dragEl;
    this.startPoint = point;

    this.bindActiveEvents();
    this.dragStart(point);
  }

  onMouseMove(e) {
    const point = this.getPoint(e);

    this.movePoint = point;

    e.preventDefault();
    this.dragMove(point);
  }

  onMouseUp() {
    this.dragEnd();
    this.unbindActiveEvents();
  }

  onTouchTimeout() {
    this.dragStart(this.startPoint);
  }

  onTouchStart(e) {
    const point = this.getPoint(e);

    const dragEl = this.closestDraggable(this.pointToEl(point));
    if (!dragEl) return;

    this.dragEl = dragEl;
    this.startPoint = point;

    this.bindActiveEvents();
    this.touchTimeout = setTimeout(this.onTouchTimeout, 200);
  }

  onTouchMove(e) {
    const point = this.getPoint(e);

    if (!this.dragging) {
      if (this.startPoint.checkAxisOffset(point, 4)) {
        clearTimeout(this.touchTimeout);
        this.unbindActiveEvents();
      }
      this.movePoint = point;
      return;
    }

    e.preventDefault();
    this.dragMove(point);
  }

  onTouchEnd() {
    clearTimeout(this.touchTimeout);
    this.dragEnd();
    this.unbindActiveEvents();
  }

  createGhost() {
    const dragElRect = this.getRect(this.dragEl);
    this.ghostEl = this.dragEl.cloneNode(true);
    this.ghostEl.style.position = 'absolute';
    this.ghostEl.style.top = `${(dragElRect.y - this.startPoint.y)}px`;
    this.ghostEl.style.left = `${(dragElRect.x - this.startPoint.x)}px`;
    this.ghostEl.style.width = `${dragElRect.width}px`;
    this.ghostEl.style.height = `${dragElRect.height}px`;
    this.ghostEl.style.pointerEvents = 'none';

    this.updateGhostPosition(this.startPoint);

    document.body.appendChild(this.ghostEl);

    this.ghostEl.setAttribute('data-pd-ghost', '');
  }

  updateGhostPosition(point) {
    const newPoint = new Point(this.scrollEl.scrollLeft, this.scrollEl.scrollTop).add(point);
    this.ghostEl.style.transform = `translate(${newPoint.x}px, ${newPoint.y}px)`;
  }

  destroyGhost() {
    this.ghostEl.parentNode.removeChild(this.ghostEl);
  }

  dragStart() {
    this.dragging = true;

    this.dropEl = this.closestContainer(this.dragEl);
    if (this.movePoint) this.startPoint = this.movePoint;

    this.createGhost();

    this.dragEl.setAttribute('data-pd-drag', '');
  }

  dragMove(point) {
    this.updateGhostPosition(point);

    const overEl = this.pointToEl(point);

    const dropEl = this.closestContainer(overEl);
    if (!dropEl) return;

    // dropEl inside dragEl
    if (this.closest(dropEl, el => el === this.dragEl)) return;

    const dragEl = this.closestDraggable(overEl);
    if (!dragEl) {
      // the same dropEL
      if (dropEl === this.dropEl) return;

      this.dropEl = dropEl;
      this.dropEl.appendChild(this.dragEl);
      return;
    }

    // the same dragEl
    if (dragEl === this.dragEl) return;

    // assumption: dragEl.parentNode === dropEl 

    if (dropEl !== this.dropEl) {
      this.dropEl = dropEl;
    }

    // const otherDragRect = this.getRect(dragEl);
    const moveDiff = this.startPoint.diff(point);
    const axis = Math.abs(moveDiff.x) > Math.abs(moveDiff.y) ? 'x' : 'y';

    const dragMidpoint = this.getMidpoint(dragEl);
    if (point[axis] < dragMidpoint[axis]) {
      this.dropEl.insertBefore(this.dragEl, dragEl);
      return;
    }

    const nextDragEl = dragEl.nextSibling;
    if (nextDragEl) {
      this.dropEl.insertBefore(this.dragEl, nextDragEl);
      return;
    }

    this.dropEl.appendChild(this.dragEl);
  }

  dragEnd() {
    this.dragging = false;
    this.startPoint = null;
    this.movePoint = null;

    this.destroyGhost();

    this.dragEl.removeAttribute('data-pd-drag');
    this.dragEl = null;
    this.dropEl = null;
  }
}

export default PotatoDraggable;
