// Mock for uuid ESM module — provides CJS-compatible interface
let counter = 0;
function uuidv4() {
  counter++;
  return `mock-uuid-${counter}-${Date.now()}`;
}
uuidv4.v4 = uuidv4;
uuidv4.v1 = uuidv4;
uuidv4.parse = (str) => str;
uuidv4.stringify = (arr) => arr;
uuidv4.validate = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str));
uuidv4.version = () => 4;

module.exports = uuidv4;
module.exports.v4 = uuidv4;
module.exports.v1 = uuidv4;
module.exports.default = uuidv4;
