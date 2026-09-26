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
`
Property Reference Errors: 1 reference error found. Use the --verbose flag to see all errors.

Problems were found when trying to resolve property references`;
/* end snapshot integration logging platform property reference errors should throw and notify users of unknown references */

snapshots["integration logging platform property reference errors circular references should throw and notify users"] =
`
Property Reference Errors: 2 reference errors found. Use the --verbose flag to see all errors.

Problems were found when trying to resolve property references`;
/* end snapshot integration logging platform property reference errors circular references should throw and notify users */

