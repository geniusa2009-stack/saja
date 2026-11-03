// Compatibility barrel for compact simulation consumers and the unit-test suite.
export { normalizedInput, keyboardInput, mergeInput, joystickFromPointer } from './input';
export { canOccupy, resolveCollision } from './collision';
export { stepPlayer } from './controller';
export { fixedSteps } from './fixedStep';
export { cameraOffset, renderPoint } from './camera';
export { inInteractionRange } from './interactions';
export { isPlayerMoving, renderedFacing } from './animation';
