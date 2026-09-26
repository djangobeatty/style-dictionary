/* @web/test-runner snapshot v1 */
export const snapshots = {};
snapshots["integration > logging > config > property value collisions should not show warnings if given higher log level"] = 
`
Property Value Collisions:
Collision detected at: size.padding.small! Original value: 0.5, New value: 0.5
Collision detected at: size.padding.small! Original value: dimension, New value: dimension
Collision detected at: size.padding.small! Original value: __integration__/tokens/size/padding.json, New value: __integration__/tokens/size/_padding.json
Collision detected at: size.padding.small! Original value: true, New value: true
Collision detected at: size.padding.medium! Original value: 1, New value: 1
Collision detected at: size.padding.medium! Original value: dimension, New value: dimension
Collision detected at: size.padding.medium! Original value: __integration__/tokens/size/padding.json, New value: __integration__/tokens/size/_padding.json
Collision detected at: size.padding.medium! Original value: true, New value: true
Collision detected at: size.padding.large! Original value: 1, New value: 1
Collision detected at: size.padding.large! Original value: dimension, New value: dimension
Collision detected at: size.padding.large! Original value: __integration__/tokens/size/padding.json, New value: __integration__/tokens/size/_padding.json
Collision detected at: size.padding.large! Original value: true, New value: true
Collision detected at: size.padding.xl! Original value: 1, New value: 1
Collision detected at: size.padding.xl! Original value: dimension, New value: dimension
Collision detected at: size.padding.xl! Original value: __integration__/tokens/size/padding.json, New value: __integration__/tokens/size/_padding.json
Collision detected at: size.padding.xl! Original value: true, New value: true

`;
/* end snapshot integration > logging > config > property value collisions should not show warnings if given higher log level */

snapshots["integration > logging > config > property value collisions should not throw, but notify users by default"] = 
`
Property Value Collisions:
size.padding.small (4 collisions)
size.padding.medium (4 collisions)
size.padding.large (4 collisions)
size.padding.xl (4 collisions)
Re-run the build with --verbose to see every colliding property.

`;
/* end snapshot integration > logging > config > property value collisions should not throw, but notify users by default */

