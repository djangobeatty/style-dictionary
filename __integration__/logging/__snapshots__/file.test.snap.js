/* @web/test-runner snapshot v1 */
export const snapshots = {};
snapshots["integration logging file should warn user empty tokens"] = 
`
css
No tokens for empty.css. File not created.`;
/* end snapshot integration logging file should warn user empty tokens */

snapshots["integration logging file should warn user of name collisions"] = 
`
css
⚠️ __integration__/build/nameCollisions.css
While building nameCollisions.css, token collisions were found; output may be unexpected. 19 collisions detected. Use log.verbosity "verbose" or use the CLI --verbose option to see the full report.`;
/* end snapshot integration logging file should warn user of name collisions */

snapshots["integration logging file should not warn user of name collisions with log level set to error"] = 
`⚠️ __integration__/build/nameCollisions.css
While building nameCollisions.css, token collisions were found; output may be unexpected. 19 collisions detected. Use log.verbosity "verbose" or use the CLI --verbose option to see the full report.`;
/* end snapshot integration logging file should not warn user of name collisions with log level set to error */

snapshots["integration logging file should warn user of filtered references"] = 
`
css
⚠️ __integration__/build/filteredReferences.css
While building filteredReferences.css, filtered out token references were found; output may be unexpected. 7 references filtered out. Use log.verbosity "verbose" or use the CLI --verbose option to see the full report.`;
/* end snapshot integration logging file should warn user of filtered references */

snapshots["integration logging file should not warn user of filtered references with log level set to error"] = 
`⚠️ __integration__/build/filteredReferences.css
While building filteredReferences.css, filtered out token references were found; output may be unexpected. 7 references filtered out. Use log.verbosity "verbose" or use the CLI --verbose option to see the full report.`;
/* end snapshot integration logging file should not warn user of filtered references with log level set to error */

