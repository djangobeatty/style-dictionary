/* @web/test-runner snapshot v1 */
export const snapshots = {};
snapshots["integration > logging > config > property value collisions should not throw, but notify users by default"] = 
`Token collisions detected (4):
Use log.verbosity "verbose" or CLI option --verbose for more details.`;
/* end snapshot integration > logging > config > property value collisions should not throw, but notify users by default */

snapshots["integration > logging > config > property value collisions should list every collision and the file it came from when verbose"] = 
`Token collisions detected (4):

size.padding.small
Was: 0.5 (__integration__/tokens/size/padding.json)
Now: 0.5 (__integration__/tokens/size/_padding.json)
size.padding.medium
Was: 1 (__integration__/tokens/size/padding.json)
Now: 1 (__integration__/tokens/size/_padding.json)
size.padding.large
Was: 1 (__integration__/tokens/size/padding.json)
Now: 1 (__integration__/tokens/size/_padding.json)
size.padding.xl
Was: 1 (__integration__/tokens/size/padding.json)
Now: 1 (__integration__/tokens/size/_padding.json)`;
/* end snapshot integration > logging > config > property value collisions should list every collision and the file it came from when verbose */

snapshots["integration > logging > config > property value collisions should throw instead of warn if warnings are errors"] = 
`Token collisions detected (4):
Use log.verbosity "verbose" or CLI option --verbose for more details.`;
/* end snapshot integration > logging > config > property value collisions should throw instead of warn if warnings are errors */

