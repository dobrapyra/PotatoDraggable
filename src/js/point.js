class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  clone() {
    return new Point(this.x, this.y);
  }

  add(point) {
    this.x += point.x;
    this.y += point.y;
    return this;
  }

  diff(point) {
    return new Point(point.x - this.x, point.y - this.y);
  }

  checkAxisOffset(point, limit) {
    return (Math.abs(point.x - this.x) > limit || Math.abs(point.y - this.y) > limit);
  }
}

export default Point;
