/* @web/test-runner snapshot v1 */
export const snapshots = {};

snapshots["integration > logging > config > property value collisions should not throw, but notify users by default"] = 
`
Property Value Collisions:
4 property value collisions found. Re-run with verbosity "verbose" (e.g. --verbose when using the CLI) to see details.

`;
/* end snapshot integration > logging > config > property value collisions should not throw, but notify users by default */

snapshots["integration > logging > config > property value collisions should not show warnings if given higher log level"] = 
`
Property Value Collisions:
4 property value collisions found. Re-run with verbosity "verbose" (e.g. --verbose when using the CLI) to see details.

`;
/* end snapshot integration > logging > config > property value collisions should not show warnings if given higher log level */

snapshots["integration > logging > config > property value collisions should show every collision and the files they come from with verbose logging"] = 
`
Property Value Collisions:
Collision detected at: size.padding.small! Original value: 0.5 (__integration__/tokens/size/padding.json), New value: 0.5 (__integration__/tokens/size/_padding.json)
Collision detected at: size.padding.medium! Original value: 1 (__integration__/tokens/size/padding.json), New value: 1 (__integration__/tokens/size/_padding.json)
Collision detected at: size.padding.large! Original value: 1 (__integration__/tokens/size/padding.json), New value: 1 (__integration__/tokens/size/_padding.json)
Collision detected at: size.padding.xl! Original value: 1 (__integration__/tokens/size/padding.json), New value: 1 (__integration__/tokens/size/_padding.json)

`;
/* end snapshot integration > logging > config > property value collisions should show every collision and the files they come from with verbose logging */

