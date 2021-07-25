export default class MatrixStack {
  constructor() {
    this.stack = [];
    this.restore();
  }

  restore() {
    this.stack.pop();
    if (this.stack.length < 1) {
      this.stack.push(m4.identity());
    }
  }

  save() {
    this.stack.push(this.getCurrentMatrix());
  }

  getCurrentMatrix() {
    return this.stack[this.stack.length - 1].slice();
  }

  setCurrentMatrix(matrix) {
    this.stack[this.stack.length - 1] = matrix;
  }

  translate(x, y, z = 0) {
    let m = this.getCurrentMatrix();
    this.setCurrentMatrix(m4.translate(m, x, y, z));
  }

  rotateZ(angleInRadians) {
    let m = this.getCurrentMatrix();
    this.setCurrentMatrix(m4.zRotate(m, angleInRadians));
  }

  scale(x, y, z = 1) {
    let m = this.getCurrentMatrix();
    this.setCurrentMatrix(m4.scale(m, x, y, z));
  }
}
