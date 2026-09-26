/* @web/test-runner snapshot v1 */
export const snapshots = {};

snapshots["integration logging platform should throw and notify users of unknown actions"] = 
`Cannot read properties of undefined (reading 'undo')`;
/* end snapshot integration logging platform should throw and notify users of unknown actions */

snapshots["integration logging platform should throw and notify users of unknown transforms"] = 
`
Unknown transforms "foo", "bar" found in platform "css":
None of "foo", "bar" match the name of a registered transform.
`;
/* end snapshot integration logging platform should throw and notify users of unknown transforms */

snapshots["integration logging platform should throw and notify users of unknown transformGroups"] = 
`
Unknown transformGroup "foo" found in platform "css":
"foo" does not match the name of a registered transformGroup.
`;
/* end snapshot integration logging platform should throw and notify users of unknown transformGroups */
snapshots["integration logging platform property reference errors should throw and notify users of unknown references"] = 
`Reference Errors:
Some token references (1) could not be found.
Use log.verbosity "verbose" or CLI option --verbose for more details.`;
/* end snapshot integration logging platform property reference errors should throw and notify users of unknown references */

snapshots["integration logging platform property reference errors circular references should throw and notify users"] = 
`Reference Errors:
Some token references (2) could not be found.
Use log.verbosity "verbose" or CLI option --verbose for more details.`;
/* end snapshot integration logging platform property reference errors circular references should throw and notify users */

snapshots["integration logging platform property reference errors should list every reference error, its chain and its file when verbose"] = 
`Reference Errors:
Some token references (3) could not be found.

Reference doesn't exist: color.brand.value tries to reference color.does.not.exist, which is not defined.
File: __integration__/tokens/broken/_base.json
Reference doesn't exist: color.danger.value tries to reference color.does.not.exist, which is not defined.
Reference chain: color.danger.value → color.brand → color.does.not.exist
File: __integration__/tokens/broken/_alias.json
Circular definition cycle: color.loop → color.loop
File: __integration__/tokens/broken/_base.json`;
/* end snapshot integration logging platform property reference errors should list every reference error, its chain and its file when verbose */

snapshots["integration logging platform property reference errors should only summarize reference errors by default"] = 
`Reference Errors:
Some token references (3) could not be found.
Use log.verbosity "verbose" or CLI option --verbose for more details.`;
/* end snapshot integration logging platform property reference errors should only summarize reference errors by default */

