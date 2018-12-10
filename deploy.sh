#!/bin/bash

# This is basically taken from
# https://gist.github.com/domenic/ec8b0fc8ab45f39403dd with minor
# modifications to support generating the spec and pushing to gh-pages

set -e # Exit with nonzero exit code if anything fails

TARGET_BRANCH="gh-pages"

# So we can see what we're doing
set -x

# Save some useful information
REPO=`git config remote.origin.url`
SSH_REPO=${REPO/https:\/\/github.com\//git@github.com:}
SHA=`git rev-parse --verify HEAD`

# Clone the existing gh-pages for this repo into out/
# Create a new empty branch if gh-pages doesn't exist yet (should only happen on first deply)
git clone $REPO out
cd out
git checkout $TARGET_BRANCH || git checkout --orphan $TARGET_BRANCH
cd ..

# Clean out existing contents
rm -rf out/**/* || exit 0
cp index.html out/

# Now let's go have some fun with the cloned repo
cd out

# If there are no changes to the compiled out (e.g. this is a README update) then just bail.
if git diff --quiet; then
    echo "No changes to the output on this push; exiting."
    exit 0
fi

# See what's changed (for debugging)
git status

# Commit the "changes", i.e. the new version.
# The delta will show diffs between new and old versions.
git add -A .
git commit -m "Deploy to GitHub Pages: ${SHA}" --author="Travis CI <deploy@travis-ci.org>"

eval `ssh-agent -s`
ssh-add ../deploy_key

# Now that we're all set up, we can push.
git push $SSH_REPO $TARGET_BRANCH
