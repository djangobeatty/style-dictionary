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
Property Reference Errors: 1 broken reference found. Run with --verbose to see the details.

Problems were found when trying to resolve property references`;
/* end snapshot integration logging platform property reference errors should throw and notify users of unknown references */

snapshots["integration logging platform property reference errors circular references should throw and notify users"] = 
`
Property Reference Errors: 2 broken references found. Run with --verbose to see the details.

Problems were found when trying to resolve property references`;
/* end snapshot integration logging platform property reference errors circular references should throw and notify users */

snapshots["integration logging platform property reference errors should show every reference error and its file when verbose"] = 
`
Property Reference Errors:
Reference doesn't exist: color.broken.value tries to reference color.doesNotExist.value, which is not defined.
in file: __integration__/tokens/size/_brokenReferences.json

Problems were found when trying to resolve property references`;
/* end snapshot integration logging platform property reference errors should show every reference error and its file when verbose */

snapshots["integration logging platform property reference errors should trace the reference chain when verbose"] = 
`
Property Reference Errors:
Reference doesn't exist: color.two.value tries to reference color.missing.value, which is not defined.
in file: __integration__/tokens/size/_brokenReferenceChain.json
Reference doesn't exist: color.one.value tries to reference color.missing.value, which is not defined.
in file: __integration__/tokens/size/_brokenReferenceChain.json
reference chain: color.one.value -> color.two.value -> color.missing.value

Problems were found when trying to resolve property references`;
/* end snapshot integration logging platform property reference errors should trace the reference chain when verbose */

snapshots["integration logging platform property reference errors should log broken references instead of throwing when configured"] = 
`
css

Property Reference Errors: 1 broken reference found. Run with --verbose to see the details.

Problems were found when trying to resolve property references`;
/* end snapshot integration logging platform property reference errors should log broken references instead of throwing when configured */

