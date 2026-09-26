/* @web/test-runner snapshot v1 */
export const snapshots = {};

snapshots["integration name collisions should warn users of name collisions for flat files"] = 
`⚠️ __integration__/build/variables.css
While building variables.css, token collisions were found (1); output may be unexpected.
Use log.verbosity "verbose" or CLI option --verbose for more details.
This many-to-one issue is usually caused by some combination of:
* conflicting or similar paths/names in token definitions
* platform transforms/transformGroups affecting names, especially when removing specificity
* overly inclusive file filters`;
/* end snapshot integration name collisions should warn users of name collisions for flat files */

