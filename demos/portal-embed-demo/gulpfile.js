const {src, task} = require('gulp');
const eslint = require('gulp-eslint');
 
task('default', () => {
    return src(['**/*.js'])
        .pipe(eslint({fix: true}))
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});
