class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  diff(point) {
    return new Point(point.x - this.x, point.y - this.y);
  }

  checkAxisOffset(point, limit) {
    return (Math.abs(point.x - this.x) > limit || Math.abs(point.y - this.y) > limit);
  }
}

export default Point;
